import { Router, Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { asyncHandler } from '../../utils/common-middleware'

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

  // ОПиУ (P&L): начисленный результат по posting_period с разбивкой на COGS/Валовую/OPEX
  router.get('/pnl', async (req, res) => {
    try {
      const yFrom = Number(req.query.yFrom)
      const mFrom = Number(req.query.mFrom)
      const yTo = Number(req.query.yTo)
      const mTo = Number(req.query.mTo)
      
      if (!yFrom || !mFrom || !yTo || !mTo) {
        return res.status(400).json({ error: 'yFrom/mFrom/yTo/mTo required' })
      }

      const start = new Date(Date.UTC(yFrom, mFrom - 1, 1))
      const end = new Date(Date.UTC(yTo, mTo, 1))

      // Генерируем список месяцев
      const months: Array<{ year: number; month: number; key: string; label: string }> = []
      const cur = new Date(start)
      while (cur < end) {
        const yy = cur.getUTCFullYear()
        const mm = cur.getUTCMonth() + 1
        months.push({ year: yy, month: mm, key: `${yy}-${String(mm).padStart(2,'0')}`, label: `${String(mm).padStart(2,'0')}.${yy}` })
        cur.setUTCMonth(cur.getUTCMonth() + 1)
      }

      // 1. Выручка из смен (по месяцам ОТКРЫТИЯ - т.к. смена может закрыться после полуночи)
      const shifts = await prisma.shift.findMany({
        where: {
          openAt: {
            gte: start,
            lt: end
          }
        },
        include: {
          sales: {
            include: {
              channel: true,
              tenderType: true
            }
          }
        }
      })

      const revenueByChannelByMonth: Record<string, Map<string, number>> = {}
      const revenueByMonth = new Map<string, number>()

      shifts.forEach(shift => {
        // Группируем по дате ОТКРЫТИЯ смены
        const yy = shift.openAt.getUTCFullYear()
        const mm = shift.openAt.getUTCMonth() + 1
        const monthKey = `${yy}-${String(mm).padStart(2,'0')}`

        shift.sales.forEach(sale => {
          const netto = sale.grossAmount - sale.discounts - sale.refunds
          const channelName = sale.channel.name

          if (!revenueByChannelByMonth[channelName]) {
            revenueByChannelByMonth[channelName] = new Map()
          }
          revenueByChannelByMonth[channelName].set(monthKey, (revenueByChannelByMonth[channelName].get(monthKey) || 0) + netto)
          revenueByMonth.set(monthKey, (revenueByMonth.get(monthKey) || 0) + netto)
        })
      })

      // 2. Расходы из ExpenseDoc по posting_period (по месяцам)
      const expenses = await prisma.expenseDoc.findMany({
        where: {
          postingPeriod: {
            gte: start,
            lt: end
          },
          status: { not: 'void' }
        },
        include: {
          category: true,
          vendor: true
        }
      })

      // Получаем все категории для построения иерархии
      const allCategories = await prisma.category.findMany({ 
        select: { id: true, name: true, parentId: true, kind: true } 
      })
      const catById = new Map(allCategories.map(c => [c.id, c]))
      
      // Функция для получения родительской категории с kind
      function resolveParentCategory(catId: string | null): { id: string; name: string; kind: string } | null {
        if (!catId) return null
        const cat = catById.get(catId)
        if (!cat) return null
        
        // Если есть kind - это категория
        if (cat.kind) {
          return { id: cat.id, name: cat.name, kind: cat.kind }
        }
        
        // Поднимаемся к родителю
        if (cat.parentId) {
          return resolveParentCategory(cat.parentId)
        }
        
        return null
      }

      // Структура: kind → categoryId → articleId → monthKey → amount
      type ExpenseRow = { 
        kind: string;
        categoryId: string; 
        categoryName: string; 
        articleId: string; 
        articleName: string; 
        year: number; 
        month: number; 
        amount: number 
      }
      const expenseRows: ExpenseRow[] = []

      expenses.forEach(exp => {
        const parentCat = resolveParentCategory(exp.categoryId)
        if (!parentCat) return // Пропускаем если нет категории с kind
        
        const yy = exp.postingPeriod.getUTCFullYear()
        const mm = exp.postingPeriod.getUTCMonth() + 1
        
        expenseRows.push({
          kind: parentCat.kind,
          categoryId: parentCat.id,
          categoryName: parentCat.name,
          articleId: exp.categoryId,
          articleName: exp.category.name,
          year: yy,
          month: mm,
          amount: exp.amount
        })
      })
      
      // Группируем по kind для старой структуры ответа
      const expensesByKindByMonth: Record<string, Map<string, Map<string, number>>> = {
        COGS: new Map(),
        OPEX: new Map(),
        CAPEX: new Map(),
        TAX: new Map(),
        FEE: new Map(),
        OTHER: new Map()
      }

      for (const row of expenseRows) {
        const parentCat = catById.get(row.categoryId)
        const kind = parentCat?.kind || 'OTHER'
        const monthKey = `${row.year}-${String(row.month).padStart(2,'0')}`
        
        if (!expensesByKindByMonth[kind].has(row.categoryName)) {
          expensesByKindByMonth[kind].set(row.categoryName, new Map())
        }
        const catMap = expensesByKindByMonth[kind].get(row.categoryName)!
        catMap.set(monthKey, (catMap.get(monthKey) || 0) + row.amount)
      }

      // 3. Подсчёт итогов
      const cogsByMonth = new Map<string, number>()
      const opexByMonth = new Map<string, number>()
      const capexByMonth = new Map<string, number>()
      const taxByMonth = new Map<string, number>()
      const feeByMonth = new Map<string, number>()
      const otherByMonth = new Map<string, number>()

      months.forEach(mo => {
        for (const [_, itemMap] of expensesByKindByMonth.COGS.entries()) {
          cogsByMonth.set(mo.key, (cogsByMonth.get(mo.key) || 0) + (itemMap.get(mo.key) || 0))
        }
        for (const [_, itemMap] of expensesByKindByMonth.OPEX.entries()) {
          opexByMonth.set(mo.key, (opexByMonth.get(mo.key) || 0) + (itemMap.get(mo.key) || 0))
        }
        for (const [_, itemMap] of expensesByKindByMonth.CAPEX.entries()) {
          capexByMonth.set(mo.key, (capexByMonth.get(mo.key) || 0) + (itemMap.get(mo.key) || 0))
        }
        for (const [_, itemMap] of expensesByKindByMonth.TAX.entries()) {
          taxByMonth.set(mo.key, (taxByMonth.get(mo.key) || 0) + (itemMap.get(mo.key) || 0))
        }
        for (const [_, itemMap] of expensesByKindByMonth.FEE.entries()) {
          feeByMonth.set(mo.key, (feeByMonth.get(mo.key) || 0) + (itemMap.get(mo.key) || 0))
        }
        for (const [_, itemMap] of expensesByKindByMonth.OTHER.entries()) {
          otherByMonth.set(mo.key, (otherByMonth.get(mo.key) || 0) + (itemMap.get(mo.key) || 0))
        }
      })

      res.json({
        months,
        revenue: {
          byMonth: Object.fromEntries(revenueByMonth),
          byChannelByMonth: Object.fromEntries(
            Object.entries(revenueByChannelByMonth).map(([ch, map]) => [ch, Object.fromEntries(map)])
          )
        },
        expenses: {
          cogs: { byMonth: Object.fromEntries(cogsByMonth), items: Array.from(expensesByKindByMonth.COGS.entries()).map(([name, map]) => ({ name, byMonth: Object.fromEntries(map) })) },
          opex: { byMonth: Object.fromEntries(opexByMonth), items: Array.from(expensesByKindByMonth.OPEX.entries()).map(([name, map]) => ({ name, byMonth: Object.fromEntries(map) })) },
          capex: { byMonth: Object.fromEntries(capexByMonth), items: Array.from(expensesByKindByMonth.CAPEX.entries()).map(([name, map]) => ({ name, byMonth: Object.fromEntries(map) })) },
          tax: { byMonth: Object.fromEntries(taxByMonth), items: Array.from(expensesByKindByMonth.TAX.entries()).map(([name, map]) => ({ name, byMonth: Object.fromEntries(map) })) },
          fee: { byMonth: Object.fromEntries(feeByMonth), items: Array.from(expensesByKindByMonth.FEE.entries()).map(([name, map]) => ({ name, byMonth: Object.fromEntries(map) })) },
          other: { byMonth: Object.fromEntries(otherByMonth), items: Array.from(expensesByKindByMonth.OTHER.entries()).map(([name, map]) => ({ name, byMonth: Object.fromEntries(map) })) }
        },
        expenseDetails: expenseRows // Детализация: категория → статья → месяц
      })
    } catch (e: any) {
      res.status(500).json({ error: String(e?.message || e) })
    }
  })

  // Отчёт Aging: долги по поставщикам с bucket'ами по срокам
  router.get('/aging', async (req, res) => {
    try {
      const asOfDate = req.query.asOfDate 
        ? new Date(String(req.query.asOfDate)) 
        : new Date()
      const vendorId = req.query.vendorId ? String(req.query.vendorId) : undefined
      const categoryId = req.query.categoryId ? String(req.query.categoryId) : undefined

      const where: any = {
        status: { in: ['unpaid', 'partial'] }
      }
      if (vendorId) where.vendorId = vendorId
      if (categoryId) where.categoryId = categoryId

      const docs = await prisma.expenseDoc.findMany({
        where,
        include: {
          vendor: true,
          category: true
        },
        orderBy: [
          { vendor: { name: 'asc' } },
          { operationDate: 'asc' }
        ]
      })

      // Группируем по bucket'ам
      const items = docs.map(doc => {
        const balance = doc.amount - doc.paidAmount
        const ageDays = Math.floor(
          (asOfDate.getTime() - new Date(doc.operationDate).getTime()) / (1000 * 60 * 60 * 24)
        )
        
        let bucket = '90+'
        if (ageDays <= 30) bucket = '0-30'
        else if (ageDays <= 60) bucket = '31-60'
        else if (ageDays <= 90) bucket = '61-90'

        return {
          id: doc.id,
          vendorName: doc.vendor?.name || 'Без поставщика',
          vendorId: doc.vendorId,
          operationDate: doc.operationDate,
          postingPeriod: doc.postingPeriod,
          categoryName: doc.category.name,
          amount: doc.amount,
          paidAmount: doc.paidAmount,
          balance,
          ageDays,
          bucket
        }
      })

      // Сводка по bucket'ам
      const summary = {
        '0-30': 0,
        '31-60': 0,
        '61-90': 0,
        '90+': 0,
        total: 0
      }

      items.forEach(item => {
        summary[item.bucket as keyof typeof summary] += item.balance
        summary.total += item.balance
      })

      res.json({ items, summary })
    } catch (e: any) {
      res.status(500).json({ error: String(e?.message || e) })
    }
  })

  // Дневная сводка по сменам
  router.get('/shift-summary', async (req, res) => {
    try {
      const from = req.query.from ? new Date(String(req.query.from)) : null
      const to = req.query.to ? new Date(String(req.query.to)) : null

      if (!from || !to) {
        return res.status(400).json({ error: 'from and to dates required' })
      }

      const shifts = await prisma.shift.findMany({
        where: {
          openAt: { gte: from, lt: to }
        },
        include: {
          sales: {
            include: {
              channel: true,
              tenderType: true
            }
          }
        },
        orderBy: { openAt: 'desc' }
      })

      const items = []
      for (const shift of shifts) {
        for (const sale of shift.sales) {
          const nettoAmount = sale.grossAmount - sale.discounts - sale.refunds
          items.push({
            shiftId: shift.id,
            date: shift.openAt,
            channel: sale.channel.name,
            tenderType: sale.tenderType.name,
            grossAmount: sale.grossAmount,
            discounts: sale.discounts,
            refunds: sale.refunds,
            nettoAmount,
            cashToCollect: sale.tenderType.name === 'Наличные' ? nettoAmount : 0
          })
        }
      }

      // Итоги
      const totals = {
        grossAmount: items.reduce((sum, i) => sum + i.grossAmount, 0),
        discounts: items.reduce((sum, i) => sum + i.discounts, 0),
        refunds: items.reduce((sum, i) => sum + i.refunds, 0),
        nettoAmount: items.reduce((sum, i) => sum + i.nettoAmount, 0),
        cashToCollect: items.reduce((sum, i) => sum + i.cashToCollect, 0)
      }

      res.json({ items, totals })
    } catch (e: any) {
      res.status(500).json({ error: String(e?.message || e) })
    }
  })

  // Сверка смен с чеками iiko
  router.get('/shifts-reconciliation', async (req, res) => {
    try {
      // Получаем последние 30 дней
      const to = new Date()
      const from = new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000)

      // Группируем чеки iiko по датам
      const receipts = await prisma.iikoReceipt.findMany({
        where: {
          date: { gte: from, lt: to },
          OR: [{ isDeleted: false }, { isDeleted: null }]
        }
      })

      const receiptsMap = new Map<string, { count: number; total: number }>()
      for (const r of receipts) {
        const day = r.date.toISOString().slice(0, 10)
        const current = receiptsMap.get(day) || { count: 0, total: 0 }
        current.count++
        // ВАЖНО: iiko.net в целых рублях, умножаем на 100 для копеек!
        // Возвраты тоже учитываем - у них net > 0 в некоторых случаях
        const netAmount = (r.net || 0) * 100 // в копейки
        current.total += netAmount
        receiptsMap.set(day, current)
      }

      // Группируем смены по датам
      const shifts = await prisma.shift.findMany({
        where: {
          openAt: { gte: from, lt: to }
        },
        include: {
          sales: true
        }
      })

      const shiftsMap = new Map<string, { count: number; total: number }>()
      for (const s of shifts) {
        const day = s.openAt.toISOString().slice(0, 10)
        const current = shiftsMap.get(day) || { count: 0, total: 0 }
        current.count++
        const shiftTotal = s.sales.reduce((sum, sale) => 
          sum + (sale.grossAmount - sale.discounts - sale.refunds), 0
        )
        current.total += shiftTotal
        shiftsMap.set(day, current)
      }

      // Объединяем для сверки
      const allDays = new Set([...receiptsMap.keys(), ...shiftsMap.keys()])
      const items = Array.from(allDays).map(day => {
        const receiptsData = receiptsMap.get(day) || { count: 0, total: 0 }
        const shiftsData = shiftsMap.get(day) || { count: 0, total: 0 }
        
        return {
          date: day,
          receiptsCount: receiptsData.count,
          receiptsTotal: receiptsData.total,
          shiftsCount: shiftsData.count,
          shiftsTotal: shiftsData.total,
          diff: shiftsData.total - receiptsData.total
        }
      }).sort((a, b) => b.date.localeCompare(a.date))

      res.json({ items })
    } catch (e: any) {
      res.status(500).json({ error: String(e?.message || e) })
    }
  })

  return router
}
