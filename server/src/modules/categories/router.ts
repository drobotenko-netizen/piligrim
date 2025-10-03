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

  // Покрытие фондов по плану (проверяем, на все ли фонды есть маппинг)
  router.get('/funds/plan-coverage', async (req, res) => {
    function normalizeFund(input: string): string {
      const replaced = String(input || '')
        .replace(/\u00A0|\u200B|\uFEFF/g, ' ')
        .replace(/[–—−]/g, '-')
        .replace(/\s+/g, ' ')
        .trim()
      return replaced
    }
    // План: фонд -> { activity, categoryName, type }
    const plan: Record<string, { activity: 'OPERATING'|'FINANCING'|'INVESTING'; category: string; type: 'income'|'expense' }> = {
      'ВЫРУЧКА': { activity: 'OPERATING', category: 'Выручка', type: 'income' },
      'Эквайринг (процент)': { activity: 'OPERATING', category: 'Банковские комиссии', type: 'expense' },
      'Комиссия банка': { activity: 'OPERATING', category: 'Банковские комиссии', type: 'expense' },
      'Расходы на такси': { activity: 'OPERATING', category: 'Транспорт', type: 'expense' },
      'Вебсайт': { activity: 'OPERATING', category: 'IT и сервисы', type: 'expense' },
      'Консалтинг / обучение': { activity: 'OPERATING', category: 'IT и сервисы', type: 'expense' },
      'Подарки персоналу / дни рождения': { activity: 'OPERATING', category: 'Персонал', type: 'expense' },
      'Еда под ЗП': { activity: 'OPERATING', category: 'Персонал', type: 'expense' },
      'ЗП курьеры': { activity: 'OPERATING', category: 'Персонал', type: 'expense' },
      'ЗП кухня': { activity: 'OPERATING', category: 'Персонал', type: 'expense' },
      'ЗП посуда': { activity: 'OPERATING', category: 'Персонал', type: 'expense' },
      'ЗП гардеробщик': { activity: 'OPERATING', category: 'Персонал', type: 'expense' },
      'ЗП офис': { activity: 'OPERATING', category: 'Персонал', type: 'expense' },
      'Поступление - Перевод между счетами': { activity: 'FINANCING', category: 'Переводы между счетами', type: 'income' },
      'Выбытие - Перевод между счетами': { activity: 'FINANCING', category: 'Переводы между счетами', type: 'expense' },
    }
    try {
      const funds = await prisma.gsCashflowRow.findMany({
        where: { fund: { not: null } },
        select: { fund: true },
        distinct: ['fund'],
        orderBy: { fund: 'asc' }
      })
      const rawFunds = (funds.map(f => f.fund).filter(Boolean) as string[])
      const uniqNormalized = Array.from(new Set(rawFunds.map(normalizeFund)))
      const covered = uniqNormalized.filter(f => !!plan[f])
      const uncovered = uniqNormalized.filter(f => !plan[f])
      res.json({ total: uniqNormalized.length, covered: covered.length, uncovered, planKeys: Object.keys(plan) })
    } catch (e: any) {
      res.status(500).json({ error: String(e?.message || e) })
    }
  })

  return router
}

export function createAdminCategoriesTools(prisma: PrismaClient) {
  const router = Router()
  // Soft-clear: деактивировать все категории текущего tenant
  router.post('/clear', requireRole(['ADMIN']), async (req, res) => {
    const tenant = await getTenant(prisma, req as any)
    const r = await prisma.category.updateMany({ where: { tenantId: tenant.id, active: true }, data: { active: false } })
    res.json({ deactivated: r.count })
  })

  // Seed план: создать категории и статьи, привязать фонды (двухуровневая структура)
  router.post('/seed-plan', requireRole(['ADMIN']), async (req, res) => {
    const tenant = await getTenant(prisma, req as any)
    const { spreadsheetId, gid } = req.body || {}

    function normalizeFund(input: string): string {
      return String(input || '')
        .replace(/\u00A0|\u200B|\uFEFF/g, ' ')
        .replace(/[–—−]/g, '-')
        .replace(/\s+/g, ' ')
        .trim()
    }

    // 1) Обеспечиваем базовые категории (двухуровневая схема)
    const baseCategories: Array<{ name: string; activity: 'OPERATING'|'FINANCING'|'INVESTING'; type: 'income'|'expense'; kind?: 'COGS'|'OPEX'|'CAPEX'|'TAX'|'FEE'|'OTHER' }>
      = [
        { name: 'Выручка', activity: 'OPERATING', type: 'income' },
        { name: 'Себестоимость', activity: 'OPERATING', type: 'expense', kind: 'COGS' },
        { name: 'Банковские комиссии', activity: 'OPERATING', type: 'expense', kind: 'FEE' },
        { name: 'Транспорт', activity: 'OPERATING', type: 'expense', kind: 'OPEX' },
        { name: 'IT и сервисы', activity: 'OPERATING', type: 'expense', kind: 'OPEX' },
        { name: 'Персонал', activity: 'OPERATING', type: 'expense', kind: 'OPEX' },
        { name: 'Прочее (OPEX)', activity: 'OPERATING', type: 'expense', kind: 'OPEX' },
        { name: 'Переводы — Поступления', activity: 'FINANCING', type: 'income' },
        { name: 'Переводы — Выбытия', activity: 'FINANCING', type: 'expense' },
      ]

    const nameToCategoryId = new Map<string, string>()
    for (const c of baseCategories) {
      const existing = await prisma.category.findFirst({ where: { tenantId: tenant.id, name: c.name, parentId: null } })
      if (existing) {
        if (!existing.active || existing.activity !== c.activity || existing.type !== c.type || existing.kind !== (c.kind || null)) {
          const updated = await prisma.category.update({ where: { id: existing.id }, data: { active: true, activity: c.activity, type: c.type, kind: c.kind || null } })
          nameToCategoryId.set(c.name, updated.id)
        } else {
          nameToCategoryId.set(c.name, existing.id)
        }
      } else {
        const created = await prisma.category.create({ data: { tenantId: tenant.id, name: c.name, activity: c.activity, type: c.type, kind: c.kind || null } })
        nameToCategoryId.set(c.name, created.id)
      }
    }

    // 2) Список фондов: либо из БД (если уже импортировано), либо напрямую из Google Sheets
    let funds: string[] = []
    try {
      const fundRows = await prisma.gsCashflowRow.findMany({
        where: { fund: { not: null } },
        select: { fund: true },
        distinct: ['fund'],
        orderBy: { fund: 'asc' }
      })
      funds = (fundRows.map(r => r.fund).filter(Boolean) as string[])
    } catch {}
    if ((!funds || funds.length === 0) && spreadsheetId && (gid || gid === 0)) {
      // Забираем CSV напрямую и извлекаем колонку фонда (индекс 8)
      const url = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(String(spreadsheetId))}/export?format=csv&gid=${encodeURIComponent(String(gid))}`
      const r = await fetch(url)
      if (!r.ok) return res.status(500).json({ error: `gsheets export failed ${r.status}` })
      const csv = await r.text()
      // Простой CSV-парсер (поддержка кавычек)
      const rows: string[][] = []
      {
        let i = 0, field = '', cur: string[] = [], inQuotes = false
        const pushField = () => { cur.push(field); field = '' }
        const pushRow = () => { rows.push(cur); cur = [] }
        while (i < csv.length) {
          const ch = csv[i]
          if (inQuotes) {
            if (ch === '"') {
              if (csv[i+1] === '"') { field += '"'; i += 2; continue }
              inQuotes = false; i++; continue
            }
            field += ch; i++; continue
          } else {
            if (ch === '"') { inQuotes = true; i++; continue }
            if (ch === ',') { pushField(); i++; continue }
            if (ch === '\n') { pushField(); pushRow(); i++; continue }
            if (ch === '\r') { i++; continue }
            field += ch; i++; continue
          }
        }
        pushField(); if (cur.length) pushRow()
      }
      const uniq = new Set<string>()
      for (let idx = 0; idx < rows.length; idx++) {
        const row = rows[idx]
        if (!row || row.length < 11) continue
        const f = normalizeFund(row[8] || '')
        if (!f || /^фонд$/i.test(f)) continue
        uniq.add(f)
      }
      funds = Array.from(uniq)
    }

    // 3) План маппинга фондов -> категория
    const toCategory: Record<string, string> = {
      'ВЫРУЧКА': 'Выручка',
      'Эквайринг (процент)': 'Банковские комиссии',
      'Комиссия банка': 'Банковские комиссии',
      'Расходы на такси': 'Транспорт',
      'Вебсайт': 'IT и сервисы',
      'Консалтинг / обучение': 'IT и сервисы',
      'Подарки персоналу / дни рождения': 'Персонал',
      'Еда под ЗП': 'Персонал',
      'ЗП курьеры': 'Персонал',
      'ЗП кухня': 'Персонал',
      'ЗП посуда': 'Персонал',
      'ЗП гардеробщик': 'Персонал',
      'ЗП офис': 'Персонал',
      'Поступление - Перевод между счетами': 'Переводы — Поступления',
      'Выбытие - Перевод между счетами': 'Переводы — Выбытия',
    }

    const payrollSet = new Set([
      'ЗП курьеры','ЗП кухня','ЗП посуда','ЗП гардеробщик','ЗП офис','Еда под ЗП','Подарки персоналу / дни рождения'
    ])

    // 4) Создаём статьи под нужными категориями и привязываем фонд
    let created = 0, reactivated = 0, updated = 0
    for (const originalFund of funds) {
      const nf = normalizeFund(originalFund)
      const categoryName = toCategory[nf] || 'Прочее (OPEX)'
      const parentId = nameToCategoryId.get(categoryName) as string
      if (!parentId) continue

      // Имя статьи: для выручки — "Выручка", для переводов — как в фонде, иначе по фонду
      let articleName = nf
      if (nf === 'ВЫРУЧКА') articleName = 'Выручка'
      // Для персонала имена статей = фондам (ЗП ..., Еда под ЗП, Подарки ...)

      // Тип статьи: берём из категории (родителя)
      const parent = await prisma.category.findUnique({ where: { id: parentId } })
      const type = parent?.type === 'income' ? 'income' : 'expense'
      const activity = parent?.activity || 'OPERATING'

      const existing = await prisma.category.findFirst({ where: { tenantId: tenant.id, name: articleName, parentId } })
      if (existing) {
        const needUpdate = (!existing.active) || (existing.fund !== originalFund) || (existing.type !== type) || (existing.activity !== activity)
        if (needUpdate) {
          await prisma.category.update({ where: { id: existing.id }, data: { active: true, fund: originalFund, type, activity } })
          if (!existing.active) reactivated++
          else updated++
        }
      } else {
        await prisma.category.create({ data: { tenantId: tenant.id, name: articleName, parentId, fund: originalFund, type, activity } })
        created++
      }
    }

    res.json({ ok: true, categories: baseCategories.length, created, reactivated, updated })
  })
  return router
}
