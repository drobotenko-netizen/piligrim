import { Router } from 'express'
import { PrismaClient } from '@prisma/client'

export function createReportsRouter(prisma: PrismaClient) {
  const router = Router()

  // ДДС (Cashflow): агрегирование по видам деятельности / категориям / статьям, помесячно за диапазон дат
  // Параметры: либо y&m (один месяц), либо from/to (ISO) или yFrom/mFrom/yTo/mTo
  router.get('/cashflow', async (req, res) => {
    if (!prisma.transaction) return res.json({ items: [], months: [], total: 0 })
    const y = Number(req.query.y)
    const m = Number(req.query.m)
    let start: Date | null = null
    let end: Date | null = null
    const from = req.query.from ? new Date(String(req.query.from)) : null
    const to = req.query.to ? new Date(String(req.query.to)) : null
    if (from && to) { start = from; end = to }
    else if (Number.isFinite(y) && Number.isFinite(m) && y && m) {
      start = new Date(Date.UTC(y, m - 1, 1))
      end = new Date(Date.UTC(y, m, 1))
    } else {
      const yFrom = Number((req.query as any).yFrom)
      const mFrom = Number((req.query as any).mFrom)
      const yTo = Number((req.query as any).yTo)
      const mTo = Number((req.query as any).mTo)
      if (yFrom && mFrom && yTo && mTo) {
        start = new Date(Date.UTC(yFrom, mFrom - 1, 1))
        end = new Date(Date.UTC(yTo, mTo, 1))
      }
    }
    if (!start || !end) return res.status(400).json({ error: 'range required' })

    // подготовим список месяцев (YYYY-MM) в диапазоне [start, end)
    const months: Array<{ year: number; month: number; key: string; label: string }> = []
    {
      const cur = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1))
      while (cur < end) {
        const yy = cur.getUTCFullYear()
        const mm = cur.getUTCMonth() + 1
        months.push({ year: yy, month: mm, key: `${yy}-${String(mm).padStart(2,'0')}`, label: `${String(mm).padStart(2,'0')}.${yy}` })
        cur.setUTCMonth(cur.getUTCMonth() + 1)
      }
    }

    // Получаем все категории для построения родителя (категории/статьи)
    const categories = await prisma.category.findMany({ select: { id: true, name: true, parentId: true, activity: true } })
    const catById = new Map<string, { id: string; name: string; parentId: string | null; activity: string }>(categories.map(c => [c.id, { id: c.id, name: c.name, parentId: c.parentId || null, activity: c.activity }]))
    function resolveParent(catId: string | null): { id: string | null; name: string } {
      if (!catId) return { id: null, name: '' }
      let cur = catById.get(catId) || null
      if (!cur) return { id: catId, name: '' }
      // Берём непосредственного родителя, если есть; если нет — сама категория и будет разделом
      if (cur.parentId) {
        const p = catById.get(cur.parentId)
        return { id: p?.id || cur.parentId, name: p?.name || '' }
      }
      return { id: cur.id, name: cur.name }
    }

    const tx = await prisma.transaction.findMany({
      where: { paymentDate: { gte: start, lt: end }, kind: { in: ['income','expense'] } },
      include: { category: { select: { id: true, name: true, parentId: true, activity: true, type: true } } }
    })

    type Key = string
    type Row = { activity: string; categoryId: string | null; categoryName: string; articleId: string | null; articleName: string; year: number; month: number; type: 'income'|'expense'; amount: number }
    const map = new Map<Key, Row>()
    let totalNet = 0
    for (const t of tx) {
      const dt = t.paymentDate
      const yy = dt.getUTCFullYear()
      const mm = dt.getUTCMonth() + 1
      const act = t.category?.activity || 'OPERATING'
      const parent = resolveParent(t.categoryId || null)
      const articleName = t.category?.name || ''
      const articleId = t.categoryId || null
      const type = (t.kind === 'income') ? 'income' : 'expense'
      const k: Key = `${act}__${parent.id || ''}__${articleId || ''}__${yy}-${String(mm).padStart(2,'0')}__${type}`
      const row = map.get(k) || { activity: act, categoryId: parent.id, categoryName: parent.name, articleId, articleName, year: yy, month: mm, type, amount: 0 }
      row.amount += Math.abs(t.amount)
      map.set(k, row)
      if (t.kind === 'income') totalNet += t.amount; else totalNet -= t.amount
    }

    res.json({ items: Array.from(map.values()), months, total: totalNet })
  })

  // ОПиУ: агрегирование по accrualYear/Month, fallback на paymentDate при отсутствии
  router.get('/pnl', async (req, res) => {
    if (!prisma.transaction) return res.json({ items: [], totals: { income: 0, expense: 0, net: 0 } })
    const y = Number(req.query.y)
    const m = Number(req.query.m)
    if (!y || !m) return res.status(400).json({ error: 'y/m required' })
    const start = new Date(Date.UTC(y, m - 1, 1))
    const end = new Date(Date.UTC(y, m, 1))
    const tx = await prisma.transaction.findMany({
      where: {
        kind: { in: ['income', 'expense', 'adjustment'] },
        OR: [
          { AND: [{ accrualYear: y }, { accrualMonth: m }] },
          { AND: [{ accrualYear: null }, { accrualMonth: null }, { paymentDate: { gte: start, lt: end } }] }
        ]
      },
      include: { category: true }
    })
    type Row = { activity: string; type: 'income'|'expense'; categoryId: string | null; categoryName: string; amount: number }
    const rows: Row[] = []
    for (const t of tx) {
      const activity = t.activity || t.category?.activity || 'OPERATING'
      const type: 'income'|'expense' = t.kind === 'income' ? 'income' : 'expense'
      const amount = t.kind === 'income' ? t.amount : t.amount
      rows.push({ activity, type, categoryId: t.categoryId || null, categoryName: t.category?.name || '', amount })
    }
    const map = new Map<string, { activity: string; type: string; categoryName: string; sum: number }>()
    let totalIncome = 0, totalExpense = 0
    for (const r of rows) {
      const key = `${r.activity}__${r.type}__${r.categoryName}`
      const agg = map.get(key) || { activity: r.activity, type: r.type, categoryName: r.categoryName, sum: 0 }
      agg.sum += r.amount
      map.set(key, agg)
      if (r.type === 'income') totalIncome += r.amount; else totalExpense += r.amount
    }
    res.json({ items: Array.from(map.values()), totals: { income: totalIncome, expense: totalExpense, net: totalIncome - totalExpense } })
  })

  return router
}
