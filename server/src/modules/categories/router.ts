import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { getTenant } from '../../utils/tenant'
import { requireRole, getUserId } from '../../utils/auth'

export function createCategoriesRouter(prisma: PrismaClient) {
  const router = Router()

  router.get('/', async (req, res) => {
    if (!prisma.category) return res.json({ items: [] })
    const tenant = await getTenant(prisma, req as any)
    const rows = await prisma.category.findMany({ where: { tenantId: tenant.id, active: true }, orderBy: [{ name: 'asc' }] })
    // формируем простое дерево по parentId
    const idToNode: Record<string, any> = {}
    rows.forEach((r: any) => (idToNode[r.id] = { ...r, children: [] }))
    const roots: any[] = []
    rows.forEach((r: any) => {
      if (r.parentId && idToNode[r.parentId]) idToNode[r.parentId].children.push(idToNode[r.id])
      else roots.push(idToNode[r.id])
    })
    res.json({ items: roots })
  })

  router.post('/', requireRole(['ADMIN','ACCOUNTANT']), async (req, res) => {
    if (!prisma.category) return res.status(503).json({ error: 'categories model not available (run prisma migrate/generate)' })
    const bodySchema = z.object({
      name: z.string().trim().min(1),
      type: z.enum(['expense','income']),
      kind: z.enum(['COGS','OPEX','CAPEX','TAX','FEE','OTHER']).optional().nullable(),
      activity: z.enum(['OPERATING','INVESTING','FINANCING']),
      parentId: z.string().optional().nullable(),
      fund: z.string().optional().nullable()
    })
    const parsed = bodySchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'bad request', details: parsed.error.flatten() })
    const { name, type, kind, activity, parentId, fund } = parsed.data
    
    // Проверяем: если есть parentId, то это статья и можно привязать фонд
    // Если нет parentId, то это корневая категория и фонд должен быть null
    if (!parentId && fund) {
      return res.status(400).json({ error: 'fund_not_allowed_for_root', message: 'Фонд можно привязать только к статьям (не к корневым категориям)' })
    }
    
    const tenant = await getTenant(prisma, req as any)
    const created = await prisma.category.create({ data: { tenantId: tenant.id, name, type, kind, activity, parentId, fund, createdBy: getUserId(req as any) } })
    res.json({ data: created })
  })

  router.patch('/:id', requireRole(['ADMIN','ACCOUNTANT']), async (req, res) => {
    if (!prisma.category) return res.status(503).json({ error: 'categories model not available (run prisma migrate/generate)' })
    const id = req.params.id
    const bodySchema = z.object({
      name: z.string().trim().optional(),
      type: z.enum(['expense','income']).optional(),
      kind: z.enum(['COGS','OPEX','CAPEX','TAX','FEE','OTHER']).nullable().optional(),
      activity: z.enum(['OPERATING','INVESTING','FINANCING']).optional(),
      parentId: z.string().nullable().optional(),
      fund: z.string().nullable().optional(),
      active: z.boolean().optional()
    })
    const parsed = bodySchema.safeParse(req.body || {})
    if (!parsed.success) return res.status(400).json({ error: 'bad request', details: parsed.error.flatten() })
    const body = parsed.data
    
    // Получаем текущую категорию
    const currentCategory = await prisma.category.findUnique({ where: { id } })
    if (!currentCategory) return res.status(404).json({ error: 'category_not_found' })
    
    // Проверяем: если это корневая категория (нет parentId), то фонд должен быть null
    const finalParentId = body.parentId !== undefined ? body.parentId : currentCategory.parentId
    if (!finalParentId && body.fund) {
      return res.status(400).json({ error: 'fund_not_allowed_for_root', message: 'Фонд можно привязать только к статьям (не к корневым категориям)' })
    }
    
    const patch: any = {}
    if (body.name !== undefined) patch.name = body.name
    if (body.type !== undefined) patch.type = body.type
    if (body.kind !== undefined) patch.kind = body.kind
    if (body.activity !== undefined) patch.activity = body.activity
    if (body.parentId !== undefined) patch.parentId = body.parentId
    if (body.fund !== undefined) patch.fund = body.fund
    if (body.active !== undefined) patch.active = body.active
    patch.updatedBy = getUserId(req as any)
    
    // Если меняется activity, обновляем все дочерние категории
    if (body.activity !== undefined && body.activity !== currentCategory.activity) {
      await prisma.category.updateMany({
        where: { 
          parentId: id,
          tenantId: currentCategory.tenantId
        },
        data: { 
          activity: body.activity,
          updatedBy: getUserId(req as any)
        }
      })
    }
    
    const updated = await prisma.category.update({ where: { id }, data: patch })
    res.json({ data: updated })
  })

  // мягкое удаление с проверками и переносом транзакций
  router.delete('/:id', requireRole(['ADMIN','ACCOUNTANT']), async (req, res) => {
    if (!prisma.category) return res.status(503).json({ error: 'categories model not available (run prisma migrate/generate)' })
    const id = req.params.id
    const body = req.body || {}

    // Запрещаем удаление, если есть активные дочерние
    const childrenCount = await prisma.category.count({ where: { parentId: id, active: true } })
    if (childrenCount > 0) {
      return res.status(400).json({ error: 'has_children', message: 'Нельзя удалить категорию: есть вложенные статьи.' })
    }

    // Если есть транзакции — нужна перенастройка
    const txCount = await prisma.transaction.count({ where: { categoryId: id } })
    if (txCount > 0) {
      const moveToCategoryId = body.moveToCategoryId ? String(body.moveToCategoryId) : null
      if (!moveToCategoryId) {
        return res.status(409).json({ error: 'has_transactions', count: txCount, message: 'Есть операции по этой статье. Выберите статью для переноса.' })
      }
      // проверяем совместимость type/activity
      const [fromCat, toCat] = await Promise.all([
        prisma.category.findUnique({ where: { id } }),
        prisma.category.findUnique({ where: { id: moveToCategoryId } })
      ])
      if (!toCat) return res.status(404).json({ error: 'move_target_not_found' })
      if (fromCat?.type && toCat.type && fromCat.type !== toCat.type) {
        return res.status(400).json({ error: 'incompatible_type', message: 'Нельзя переносить операции между доходами и расходами.' })
      }
      if (fromCat?.activity && toCat.activity && fromCat.activity !== toCat.activity) {
        return res.status(400).json({ error: 'incompatible_activity', message: 'Нельзя переносить операции между разными видами деятельности.' })
      }
      // переносим транзакции и деактивируем категорию
      await prisma.transaction.updateMany({ where: { categoryId: id }, data: { categoryId: moveToCategoryId } })
    }

    const updated = await prisma.category.update({ where: { id }, data: { active: false, updatedBy: getUserId(req as any) } })
    res.json({ data: updated })
  })

  // Получение списка фондов из Google Sheets
  router.get('/funds', async (req, res) => {
    try {
      const funds = await prisma.gsCashflowRow.findMany({
        where: { fund: { not: null } },
        select: { fund: true },
        distinct: ['fund'],
        orderBy: { fund: 'asc' }
      })
      const fundList = funds.map(f => f.fund).filter(Boolean)
      res.json({ funds: fundList })
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch funds' })
    }
  })

  // Фонды, не привязанные ни к одной статье (category.fund)
  router.get('/funds/unmapped', async (req, res) => {
    try {
      const funds = await prisma.gsCashflowRow.findMany({
        where: { fund: { not: null } },
        select: { fund: true },
        distinct: ['fund'],
        orderBy: { fund: 'asc' }
      })
      const fundList = funds.map(f => f.fund).filter(Boolean) as string[]
      if (fundList.length === 0) return res.json({ unmapped: [] })

      const mappedCats = await prisma.category.findMany({
        where: { fund: { in: fundList } },
        select: { fund: true }
      })
      const mappedSet = new Set((mappedCats.map(c => c.fund) as (string|null)[]).filter(Boolean) as string[])
      const unmapped = fundList.filter(f => !mappedSet.has(f))
      res.json({ unmapped })
    } catch (error: any) {
      res.status(500).json({ error: String(error?.message || error) })
    }
  })

  return router
}
