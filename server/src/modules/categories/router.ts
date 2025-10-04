import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { getTenant } from '../../utils/tenant'
import { requireRole, getUserId } from '../../utils/auth'

export function createCategoriesRouter(prisma: PrismaClient) {
  const router = Router()

  router.get('/', async (req, res) => {
    const tenant = await getTenant(prisma, req as any)
    const roots = await prisma.category.findMany({ where: { tenantId: tenant.id, active: true }, orderBy: [{ name: 'asc' }] })
    const rootIds = roots.map(r => r.id)
    const articles = await prisma.article.findMany({ where: { tenantId: tenant.id, active: true, categoryId: { in: rootIds } }, orderBy: [{ name: 'asc' }] })
    const byCat: Record<string, any[]> = {}
    for (const a of articles as any[]) {
      (byCat[a.categoryId] = byCat[a.categoryId] || []).push({
        id: a.id,
        name: a.name,
        parentId: a.categoryId,
        fund: a.fund,
        active: a.active,
      })
    }
    const items = (roots as any[]).map(r => ({
      ...r,
      parentId: null,
      fund: null,
      children: (byCat[r.id] || []).map((ch: any) => ({ ...ch, activity: r.activity }))
    }))
    res.json({ items })
  })

  router.post('/', requireRole(['ADMIN','ACCOUNTANT']), async (req, res) => {
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
    const tenant = await getTenant(prisma, req as any)
    if (parentId) {
      // создаём статью под категорией parentId
      const article = await prisma.article.create({ data: { tenantId: tenant.id, categoryId: parentId, name, fund: fund || null } })
      return res.json({ data: { id: article.id, name: article.name, parentId: article.categoryId, fund: article.fund, active: article.active } })
    } else {
      // создаём корневую категорию
      if (fund) return res.status(400).json({ error: 'fund_not_allowed_for_root' })
      const created = await prisma.category.create({ data: { tenantId: tenant.id, name, type, kind, activity, createdBy: getUserId(req as any) } })
      return res.json({ data: { ...created, parentId: null, fund: null } })
    }
  })

  router.patch('/:id', requireRole(['ADMIN','ACCOUNTANT']), async (req, res) => {
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
    // Попытка как категория (root)
    const cat = await prisma.category.findUnique({ where: { id } })
    if (cat) {
      if (body.fund) return res.status(400).json({ error: 'fund_not_allowed_for_root' })
      const patch: any = {}
      if (body.name !== undefined) patch.name = body.name
      if (body.type !== undefined) patch.type = body.type
      if (body.kind !== undefined) patch.kind = body.kind
      if (body.activity !== undefined) patch.activity = body.activity
      if (body.active !== undefined) patch.active = body.active
      patch.updatedBy = getUserId(req as any)
      const updated = await prisma.category.update({ where: { id }, data: patch })
      return res.json({ data: { ...updated, parentId: null, fund: null } })
    }
    // Попытка как статья
    const art = await prisma.article.findUnique({ where: { id } })
    if (!art) return res.status(404).json({ error: 'not_found' })
    const patchA: any = {}
    if (body.name !== undefined) patchA.name = body.name
    if (body.fund !== undefined) patchA.fund = body.fund
    if (body.parentId !== undefined && body.parentId) patchA.categoryId = body.parentId
    if (body.active !== undefined) patchA.active = body.active
    const updatedA = await prisma.article.update({ where: { id }, data: patchA })
    return res.json({ data: { id: updatedA.id, name: updatedA.name, parentId: updatedA.categoryId, fund: updatedA.fund, active: updatedA.active } })
  })

  // мягкое удаление с проверками и переносом транзакций
  router.delete('/:id', requireRole(['ADMIN','ACCOUNTANT']), async (req, res) => {
    const id = req.params.id
    const body = req.body || {}
    // Если это корневая категория
    const cat = await prisma.category.findUnique({ where: { id } })
    if (cat) {
      const childrenCount = await prisma.article.count({ where: { categoryId: id, active: true } })
      if (childrenCount > 0) {
        return res.status(400).json({ error: 'has_children', message: 'Нельзя удалить категорию: есть вложенные статьи.' })
      }
      const txCount = await prisma.transaction.count({ where: { categoryId: id } })
      if (txCount > 0) {
        const moveToCategoryId = body.moveToCategoryId ? String(body.moveToCategoryId) : null
        if (!moveToCategoryId) {
          return res.status(409).json({ error: 'has_transactions', count: txCount, message: 'Есть операции по этой статье. Выберите статью для переноса.' })
        }
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
        await prisma.transaction.updateMany({ where: { categoryId: id }, data: { categoryId: moveToCategoryId } })
      }
      const updated = await prisma.category.update({ where: { id }, data: { active: false, updatedBy: getUserId(req as any) } })
      return res.json({ data: updated })
    }
    // иначе — статья
    const art = await prisma.article.findUnique({ where: { id } })
    if (!art) return res.status(404).json({ error: 'not_found' })
    const updatedA = await prisma.article.update({ where: { id }, data: { active: false } })
    return res.json({ data: { id: updatedA.id, name: updatedA.name, parentId: updatedA.categoryId, fund: updatedA.fund, active: updatedA.active } })
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

  // Фонды, не привязанные ни к одной статье
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

      const mappedArts = await prisma.article.findMany({
        where: { fund: { in: fundList } },
        select: { fund: true }
      })
      const mappedSet = new Set((mappedArts.map(a => a.fund) as (string|null)[]).filter(Boolean) as string[])
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
    const rc = await prisma.category.updateMany({ where: { tenantId: tenant.id, active: true }, data: { active: false } })
    const ra = await prisma.article.updateMany({ where: { tenantId: tenant.id, active: true }, data: { active: false } })
    res.json({ deactivatedCategories: rc.count, deactivatedArticles: ra.count })
  })

  // Нормализация: убрать fund у всех корневых категорий (parentId=null)
  router.post('/normalize-roots', requireRole(['ADMIN']), async (req, res) => {
    const tenant = await getTenant(prisma, req as any)
    // В новой модели fund у категорий не хранится
    res.json({ rootsFundCleared: 0 })
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
        { name: 'Коммунальные услуги', activity: 'OPERATING', type: 'expense', kind: 'OPEX' },
        { name: 'Связь', activity: 'OPERATING', type: 'expense', kind: 'OPEX' },
        { name: 'Маркетинг', activity: 'OPERATING', type: 'expense', kind: 'OPEX' },
        { name: 'Логистика', activity: 'OPERATING', type: 'expense', kind: 'OPEX' },
        { name: 'Аренда', activity: 'OPERATING', type: 'expense', kind: 'OPEX' },
        { name: 'Хозяйственные расходы', activity: 'OPERATING', type: 'expense', kind: 'OPEX' },
        { name: 'Налоги', activity: 'OPERATING', type: 'expense', kind: 'TAX' },
        { name: 'Прочее (OPEX)', activity: 'OPERATING', type: 'expense', kind: 'OPEX' },
        { name: 'Переводы — Поступления', activity: 'FINANCING', type: 'income' },
        { name: 'Переводы — Выбытия', activity: 'FINANCING', type: 'expense' },
        { name: 'Капитальные расходы', activity: 'INVESTING', type: 'expense', kind: 'CAPEX' },
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
      'ВЫРУЧКА ДОСТАВКА': 'Выручка',
      'ВЫРУЧКА ПРОЧЕЕ': 'Выручка',
      'ИЗЛИШКИ': 'Выручка',
      'Эквайринг (процент)': 'Банковские комиссии',
      'Комиссия банка': 'Банковские комиссии',
      'Халва': 'Банковские комиссии',
      'Расходы на такси': 'Транспорт',
      'Доставка': 'Логистика',
      'Доставка из Владивостока': 'Логистика',
      'Доставка по городу': 'Логистика',
      'Вебсайт': 'IT и сервисы',
      'Консалтинг / обучение': 'IT и сервисы',
      'ДоксИнБокс': 'IT и сервисы',
      'Прочие программы': 'IT и сервисы',
      'Смартомато': 'IT и сервисы',
      'IIKO': 'IT и сервисы',
      'Оргтехника и обслуживание': 'IT и сервисы',
      'Подарки персоналу / дни рождения': 'Персонал',
      'Еда под ЗП': 'Персонал',
      'ЗП курьеры': 'Персонал',
      'ЗП кухня': 'Персонал',
      'ЗП посуда': 'Персонал',
      'ЗП гардеробщик': 'Персонал',
      'ЗП офис': 'Персонал',
      'ЗП бармены': 'Персонал',
      'ЗП дворник': 'Персонал',
      'ЗП операторы': 'Персонал',
      'ЗП официанты': 'Персонал',
      'ЗП прочий персонал': 'Персонал',
      'HR / Human Resources / отдел кадров': 'Персонал',
      'Премия ( бонусы )': 'Персонал',
      'Интернет': 'Связь',
      'Телефон': 'Связь',
      'Коммунальные услуги': 'Коммунальные услуги',
      'Электричество': 'Коммунальные услуги',
      'Аренда': 'Аренда',
      'Аренда оборудования': 'Аренда',
      'Упаковка/хозка': 'Хозяйственные расходы',
      'Канцтовары': 'Хозяйственные расходы',
      'Вывоз мусора': 'Хозяйственные расходы',
      'Стирка': 'Хозяйственные расходы',
      'бой посуды': 'Хозяйственные расходы',
      'Охрана': 'Хозяйственные расходы',
      'Покупка мелкого инвентаря и мелочей': 'Хозяйственные расходы',
      'Резервный фонд': 'Прочее (OPEX)',
      'Командировки': 'Прочее (OPEX)',
      'НЕДОСДАЧА': 'Прочее (OPEX)',
      'Поставщики': 'Себестоимость',
      'Налоги на зп': 'Налоги',
      'Налоги патент': 'Налоги',
      'Маркетинг': 'Маркетинг',
      'Реклама': 'Маркетинг',
      'СМС-рассылка': 'Маркетинг',
      'Фотограф': 'Маркетинг',
      'Дизайн макетов': 'Маркетинг',
      'Полиграфия/наружка': 'Маркетинг',
      'Организация мероприятий': 'Маркетинг',
      'Покупка оборудования и мебели': 'Капитальные расходы',
      'Ремонт оборудования': 'Капитальные расходы',
      'Ремонт помещения': 'Капитальные расходы',
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
      // Поиск/создание статьи
      const existing = await prisma.article.findFirst({ where: { tenantId: tenant.id, name: articleName, categoryId: parentId } })
      if (existing) {
        const needUpdate = (!existing.active) || (existing.fund !== originalFund)
        if (needUpdate) {
          await prisma.article.update({ where: { id: existing.id }, data: { active: true, fund: originalFund } })
          if (!existing.active) reactivated++
          else updated++
        }
      } else {
        await prisma.article.create({ data: { tenantId: tenant.id, categoryId: parentId, name: articleName, fund: originalFund } })
        created++
      }
    }

    res.json({ ok: true, categories: baseCategories.length, created, reactivated, updated })
  })
  
  // Переклассификация фондов: перенос статей (fund) под правильные корни
  router.post('/reclassify-funds', requireRole(['ADMIN']), async (req, res) => {
    const tenant = await getTenant(prisma, req as any)
    function normalizeFund(input: string): string {
      return String(input || '')
        .replace(/\u00A0|\u200B|\uFEFF/g, ' ')
        .replace(/[–—−]/g, '-')
        .replace(/\s+/g, ' ')
        .trim()
        .toUpperCase()
    }
    const plan: Record<string, { parent: string; type: 'income'|'expense'; kind?: 'COGS'|'OPEX'|'CAPEX'|'TAX'|'FEE'|'OTHER' }> = {
      'ВЫРУЧКА': { parent: 'Выручка', type: 'income' },
      'ВЫРУЧКА ДОСТАВКА': { parent: 'Выручка', type: 'income' },
      'ВЫРУЧКА ПРОЧЕЕ': { parent: 'Выручка', type: 'income' },
      'ИЗЛИШКИ': { parent: 'Выручка', type: 'income' },
      'ПОСТАВЩИКИ': { parent: 'Себестоимость', type: 'expense', kind: 'COGS' },
      'ЭКВАЙРИНГ (ПРОЦЕНТ)': { parent: 'Банковские комиссии', type: 'expense', kind: 'FEE' },
      'КОММИССИЯ БАНКА': { parent: 'Банковские комиссии', type: 'expense', kind: 'FEE' },
      'ДОСТАВКА': { parent: 'Логистика', type: 'expense', kind: 'OPEX' },
      'ДОСТАВКА ИЗ ВЛАДИВОСТОКА': { parent: 'Логистика', type: 'expense', kind: 'OPEX' },
      'ДОСТАВКА ПО ГОРОДУ': { parent: 'Логистика', type: 'expense', kind: 'OPEX' },
      'РАСХОДЫ НА ТАКСИ': { parent: 'Транспорт', type: 'expense', kind: 'OPEX' },
      'IT И СЕРВИСЫ': { parent: 'IT и сервисы', type: 'expense', kind: 'OPEX' },
      'ВЕБСАЙТ': { parent: 'IT и сервисы', type: 'expense', kind: 'OPEX' },
      'ДОКСИНБОКС': { parent: 'IT и сервисы', type: 'expense', kind: 'OPEX' },
      'ПРОЧИЕ ПРОГРАММЫ': { parent: 'IT и сервисы', type: 'expense', kind: 'OPEX' },
      'СМАРТОМАТО': { parent: 'IT и сервисы', type: 'expense', kind: 'OPEX' },
      'IIKO': { parent: 'IT и сервисы', type: 'expense', kind: 'OPEX' },
      'ОРГТЕХНИКА И ОБСЛУЖИВАНИЕ': { parent: 'IT и сервисы', type: 'expense', kind: 'OPEX' },
      'НАЛОГИ НА ЗП': { parent: 'Налоги', type: 'expense', kind: 'TAX' },
      'НАЛОГИ ПАТЕНТ': { parent: 'Налоги', type: 'expense', kind: 'TAX' },
      'ИНТЕРНЕТ': { parent: 'Связь', type: 'expense', kind: 'OPEX' },
      'ТЕЛЕФОН': { parent: 'Связь', type: 'expense', kind: 'OPEX' },
      'КОММУНАЛЬНЫЕ УСЛУГИ': { parent: 'Коммунальные услуги', type: 'expense', kind: 'OPEX' },
      'ЭЛЕКТРИЧЕСТВО': { parent: 'Коммунальные услуги', type: 'expense', kind: 'OPEX' },
      'АРЕНДА': { parent: 'Аренда', type: 'expense', kind: 'OPEX' },
      'АРЕНДА ОБОРУДОВАНИЯ': { parent: 'Аренда', type: 'expense', kind: 'OPEX' },
      'УПАКОВКА/ХОЗКА': { parent: 'Хозяйственные расходы', type: 'expense', kind: 'OPEX' },
      'КАНЦТОВАРЫ': { parent: 'Хозяйственные расходы', type: 'expense', kind: 'OPEX' },
      'ВЫВОЗ МУСОРА': { parent: 'Хозяйственные расходы', type: 'expense', kind: 'OPEX' },
      'СТИРКА': { parent: 'Хозяйственные расходы', type: 'expense', kind: 'OPEX' },
      'БОЙ ПОСУДЫ': { parent: 'Хозяйственные расходы', type: 'expense', kind: 'OPEX' },
      'ОХРАНА': { parent: 'Хозяйственные расходы', type: 'expense', kind: 'OPEX' },
      'ПОКУПКА МЕЛКОГО ИНВЕНТАРЯ И МЕЛОЧЕЙ': { parent: 'Хозяйственные расходы', type: 'expense', kind: 'OPEX' },
      'РЕЗЕРВНЫЙ ФОНД': { parent: 'Прочее (OPEX)', type: 'expense', kind: 'OPEX' },
      'КОМАНДИРОВКИ': { parent: 'Прочее (OPEX)', type: 'expense', kind: 'OPEX' },
      'НЕДОСДАЧА': { parent: 'Прочее (OPEX)', type: 'expense', kind: 'OPEX' },
      'МАРКЕТИНГ': { parent: 'Маркетинг', type: 'expense', kind: 'OPEX' },
      'РЕКЛАМА': { parent: 'Маркетинг', type: 'expense', kind: 'OPEX' },
      'СМС-РАССЫЛКА': { parent: 'Маркетинг', type: 'expense', kind: 'OPEX' },
      'ФОТОГРАФ': { parent: 'Маркетинг', type: 'expense', kind: 'OPEX' },
      'ДИЗАЙН МАКЕТОВ': { parent: 'Маркетинг', type: 'expense', kind: 'OPEX' },
      'ПОЛИГРАФИЯ/НАРУЖКА': { parent: 'Маркетинг', type: 'expense', kind: 'OPEX' },
      'ОРГАНИЗАЦИЯ МЕРОПРИЯТИЙ': { parent: 'Маркетинг', type: 'expense', kind: 'OPEX' }
    }
    let moved = 0
    for (const art of await prisma.category.findMany({ where: { tenantId: tenant.id, parentId: { not: null }, active: true } })) {
      const nf = art.fund ? normalizeFund(art.fund) : ''
      if (!nf) continue
      const target = plan[nf]
      if (!target) continue
      const root = await prisma.category.findFirst({ where: { tenantId: tenant.id, parentId: null, name: target.parent } })
      if (!root) continue
      if (art.parentId !== root.id) {
        await prisma.category.update({ where: { id: art.id }, data: { parentId: root.id } })
        moved++
      }
    }
    res.json({ ok: true, moved })
  })
  return router
}
