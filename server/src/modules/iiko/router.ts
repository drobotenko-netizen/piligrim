import { Router } from 'express'
import { IikoClient, buildDayRangeIso } from './client'
import { createIikoLocalRouter } from './local-router'
import { createIikoSalesRouter } from './sales-router'
import { createIikoReportsRouter } from './reports-router'
import { createIikoStoresRouter } from './stores-router'
import { createIikoRecipesRouter } from './recipes-router'
import { createIikoEntitiesRouter } from './entities-router'
import { createIikoReceiptsRouter } from './receipts-router'
import { importReceiptsForDate, importReceiptsRange } from './etl/receipts'

export function createIikoRouter() {
  const router = Router()
  const client = new IikoClient()

  // mount local subrouter (access prisma via app)
  router.use('/local', (req, _res, next) => { (req as any).prisma = (req as any).prisma || req.app.get('prisma'); next() }, createIikoLocalRouter({ buildDayRangeIso }))

  // mount receipts subrouter (access prisma via app)
  router.use('/local', (req, _res, next) => { (req as any).prisma = (req as any).prisma || req.app.get('prisma'); next() }, createIikoReceiptsRouter({ buildDayRangeIso, client }))

  // mount sales/report subrouters
  router.use('/sales', createIikoSalesRouter(client))
  router.use('/reports', createIikoReportsRouter(client))
  router.use('/stores', createIikoStoresRouter(client))
  router.use('/recipes', createIikoRecipesRouter(client))
  router.use('/entities', createIikoEntitiesRouter(client))

  router.get('/auth/test', async (_req, res) => {
    try {
      const key = await client.getToken()
      res.json({ ok: true, tokenSample: key.slice(0, 8) })
    } catch (e: any) {
      res.status(500).json({ ok: false, error: String(e?.message || e) })
    }
  })

  // GET /iiko/sales/summary?date=YYYY-MM-DD
  router.get('/sales/summary', async (req, res) => {
    const date = String(req.query.date || '').trim()
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: 'date=YYYY-MM-DD required' })
    try {
      const summary = await client.salesSummary(date)
      res.json({ date, ...summary })
    } catch (e: any) {
      res.status(500).json({ error: String(e?.message || e) })
    }
  })

  // GET /iiko/sales/revenue?year=YYYY&month=MM
  router.get('/sales/revenue', async (req, res) => {
    const year = Number(req.query.year)
    const month = Number(req.query.month)
    if (!year || !month || month < 1 || month > 12) {
      return res.status(400).json({ error: 'year=YYYY&month=MM required' })
    }
    try {
      const revenue = await client.salesRevenueByDay(year, month)
      res.json({ year, month, revenue })
    } catch (e: any) {
      res.status(500).json({ error: String(e?.message || e) })
    }
  })

  router.get('/sales/returns/month', async (req, res) => {
    const year = Number(req.query.year)
    const month = Number(req.query.month)
    if (!year || !month || month < 1 || month > 12) {
      return res.status(400).json({ error: 'year=YYYY&month=MM required' })
    }
    try {
      const returns = await client.salesReturnsByDay(year, month)
      res.json({ year, month, revenue: returns })
    } catch (e: any) {
      res.status(500).json({ error: String(e?.message || e) })
    }
  })

  router.get('/sales/deleted/month', async (req, res) => {
    const year = Number(req.query.year)
    const month = Number(req.query.month)
    if (!year || !month || month < 1 || month > 12) {
      return res.status(400).json({ error: 'year=YYYY&month=MM required' })
    }
    try {
      const deleted = await client.salesDeletedByDay(year, month)
      res.json({ year, month, revenue: deleted })
    } catch (e: any) {
      res.status(500).json({ error: String(e?.message || e) })
    }
  })

  router.get('/sales/total/month', async (req, res) => {
    const year = Number(req.query.year)
    const month = Number(req.query.month)
    if (!year || !month || month < 1 || month > 12) {
      return res.status(400).json({ error: 'year=YYYY&month=MM required' })
    }
    try {
      const total = await client.salesTotalByDay(year, month)
      res.json({ year, month, revenue: total })
    } catch (e: any) {
      res.status(500).json({ error: String(e?.message || e) })
    }
  })

  // GET /iiko/sales/hours?date=YYYY-MM-DD
  router.get('/sales/hours', async (req, res) => {
    const date = String(req.query.date || '').trim()
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: 'date=YYYY-MM-DD required' })
    try {
      const rows = await client.salesByHour(date)
      res.json({ date, rows })
    } catch (e: any) {
      res.status(500).json({ error: String(e?.message || e) })
    }
  })

  // GET /iiko/sales/paytypes?date=YYYY-MM-DD
  router.get('/sales/paytypes', async (req, res) => {
    const date = String(req.query.date || '').trim()
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: 'date=YYYY-MM-DD required' })
    try {
      const rows = await client.salesByPaytype(date)
      res.json({ date, rows })
    } catch (e: any) {
      res.status(500).json({ error: String(e?.message || e) })
    }
  })

  // ===== LOCAL (DB) endpoints =====
  // GET /iiko/local/sales/deleted/summary?date=YYYY-MM-DD
  router.get('/local/sales/deleted/summary', async (req, res) => {
    const prisma = (req as any).prisma || req.app.get('prisma')
    if (!prisma) return res.status(503).json({ error: 'prisma not available' })
    const date = String(req.query.date || '').trim()
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: 'date=YYYY-MM-DD required' })
    try {
      const day = new Date(date + 'T00:00:00.000Z')
      const next = new Date(day.getTime() + 24 * 60 * 60 * 1000)
      const receipts = await prisma.iikoReceipt.findMany({ 
        where: { 
          date: { gte: day, lt: next },
          isDeleted: true
        }, 
        select: { net: true, cost: true, deletedWithWriteoff: true } 
      })
      const net = receipts.reduce((a: number, r: any) => a + (r.net || 0), 0)
      const cost = receipts.reduce((a: number, r: any) => a + (r.cost || 0), 0)
      const deletedWithWriteoff = receipts.filter((r: any) => r.deletedWithWriteoff).length
      const deletedWithoutWriteoff = receipts.length - deletedWithWriteoff
      res.json({ 
        date, 
        totalDeleted: receipts.length,
        deletedWithWriteoff,
        deletedWithoutWriteoff,
        totalNet: net,
        totalCost: cost,
        avgNet: receipts.length > 0 ? Math.round(net / receipts.length) : 0
      })
    } catch (e: any) {
      res.status(500).json({ error: String(e?.message || e) })
    }
  })

  // GET /iiko/local/sales/summary?date=YYYY-MM-DD
  router.get('/local/sales/summary', async (req, res) => {
    const prisma = (req as any).prisma || req.app.get('prisma')
    if (!prisma) return res.status(503).json({ error: 'prisma not available' })
    const date = String(req.query.date || '').trim()
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: 'date=YYYY-MM-DD required' })
    try {
      const day = new Date(date + 'T00:00:00.000Z')
      const next = new Date(day.getTime() + 24 * 60 * 60 * 1000)
      const rows = await prisma.iikoReceipt.findMany({ where: { date: { gte: day, lt: next } }, select: { net: true, cost: true } })
      const net = rows.reduce((a: number, r: any) => a + (Number(r.net) || 0), 0)
      const cost = rows.reduce((a: number, r: any) => a + (Number(r.cost) || 0), 0)
      const gross = net // gross недоступен локально, подставляем net
      const discount = gross - net // 0
      res.json({ date, gross, net, discount, foodCost: cost })
    } catch (e: any) {
      res.status(500).json({ error: String(e?.message || e) })
    }
  })

  // GET /iiko/local/sales/paytypes?date=YYYY-MM-DD
  router.get('/local/sales/paytypes', async (req, res) => {
    const prisma = (req as any).prisma || req.app.get('prisma')
    if (!prisma) return res.status(503).json({ error: 'prisma not available' })
    const date = String(req.query.date || '').trim()
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: 'date=YYYY-MM-DD required' })
    try {
      const day = new Date(date + 'T00:00:00.000Z')
      const next = new Date(day.getTime() + 24 * 60 * 60 * 1000)
      const receipts = await prisma.iikoReceipt.findMany({ where: { date: { gte: day, lt: next } }, select: { net: true, payTypesJson: true } })
      const map = new Map<string, { gross: number; net: number; discount: number }>()
      for (const r of receipts) {
        const net = Number(r.net || 0)
        let pt: string[] = []
        try { pt = JSON.parse(r.payTypesJson || '[]') } catch {}
        const key = (pt[0] || '(не указано)') as string
        const cur = map.get(key) || { gross: 0, net: 0, discount: 0 }
        cur.net += net
        cur.gross += net
        map.set(key, cur)
      }
      const rows = Array.from(map.entries()).map(([payType, v]) => ({ payType, gross: v.gross, net: v.net, discount: v.discount }))
      res.json({ date, rows })
    } catch (e: any) {
      res.status(500).json({ error: String(e?.message || e) })
    }
  })

  // GET /iiko/local/sales/summary/month?year=YYYY&month=MM
  router.get('/local/sales/summary/month', async (req, res) => {
    const prisma = (req as any).prisma || req.app.get('prisma')
    if (!prisma) return res.status(503).json({ error: 'prisma not available' })
    const year = Number(String(req.query.year || ''))
    const month = Number(String(req.query.month || ''))
    if (!Number.isInteger(year) || year < 2000 || year > 2100) return res.status(400).json({ error: 'year invalid' })
    if (!Number.isInteger(month) || month < 1 || month > 12) return res.status(400).json({ error: 'month invalid' })
    try {
      const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0))
      const end = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0))
      const receipts = await prisma.iikoReceipt.findMany({
        where: { date: { gte: start, lt: end } },
        select: { date: true, net: true, orderType: true, deliveryServiceType: true, isReturn: true, returnSum: true, isDeleted: true }
      })
      const byDay = new Map<string, any>()
      const norm = (s?: string | null) => String(s || '').toLowerCase()
      const detectKind = (orderType?: string | null, serviceType?: string | null): 'courier' | 'pickup' | 'hall' => {
        const ot = norm(orderType)
        const st = norm(serviceType)
        if (st.includes('courier') || st.includes('курьер')) return 'courier'
        if (st.includes('pickup') || st.includes('самовывоз') || st.includes('self')) return 'pickup'
        if (ot.includes('курьер')) return 'courier'
        if (ot.includes('самовывоз')) return 'pickup'
        if (ot.includes('доставка')) return 'courier'
        return 'hall'
      }
      for (const r of receipts) {
        const d = new Date(r.date)
        const ymd = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())).toISOString().slice(0, 10)
        const e = byDay.get(ymd) || {
          date: ymd,
          net: 0,
          receipts: 0,
          returnsCount: 0,
          returnsSum: 0,
          deletedCount: 0,
          deletedSum: 0,
          deliveryNet: 0,
          deliveryCount: 0,
          deliveryCourierNet: 0,
          deliveryCourierCount: 0,
          deliveryPickupNet: 0,
          deliveryPickupCount: 0,
          hallNet: 0,
          hallCount: 0
        }
        const net = Number(r.net || 0)
        e.net += net
        e.receipts += 1
        if (r.isReturn) e.returnsCount += 1
        e.returnsSum += Number(r.returnSum || 0)
        if (r.isDeleted) {
          e.deletedCount += 1
          e.deletedSum += net
        }
        const kind = detectKind(r.orderType, (r as any).deliveryServiceType)
        if (kind === 'courier') {
          e.deliveryNet += net
          e.deliveryCount += 1
          e.deliveryCourierNet += net
          e.deliveryCourierCount += 1
        } else if (kind === 'pickup') {
          e.deliveryNet += net
          e.deliveryCount += 1
          e.deliveryPickupNet += net
          e.deliveryPickupCount += 1
        } else {
          e.hallNet += net
          e.hallCount += 1
        }
        byDay.set(ymd, e)
      }
      const rows = Array.from(byDay.values()).sort((a, b) => a.date.localeCompare(b.date))
      res.json({ year, month, rows })
    } catch (e: any) {
      res.status(500).json({ error: String(e?.message || e) })
    }
  })

  // GET /iiko/local/sales/revenue/month?year=YYYY&month=MM
  router.get('/local/sales/revenue/month', async (req, res) => {
    const prisma = (req as any).prisma || req.app.get('prisma')
    if (!prisma) return res.status(503).json({ error: 'prisma not available' })
    const year = Number(String(req.query.year || ''))
    const month = Number(String(req.query.month || ''))
    if (!Number.isInteger(year) || year < 2000 || year > 2100) return res.status(400).json({ error: 'year invalid' })
    if (!Number.isInteger(month) || month < 1 || month > 12) return res.status(400).json({ error: 'month invalid' })
    try {
      const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0))
      const end = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0))
      const receipts = await prisma.iikoReceipt.findMany({
        where: { 
          date: { gte: start, lt: end },
          AND: [
            {
              OR: [
                { isReturn: false },
                { isReturn: null }
              ]
            },
            {
              OR: [
                { isDeleted: false },
                { isDeleted: null }
              ]
            }
          ]
        },
        select: { date: true, net: true }
      })
      const byDay = new Map<string, any>()
      for (const r of receipts) {
        const d = new Date(r.date)
        const ymd = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())).toISOString().slice(0, 10)
        const e = byDay.get(ymd) || { date: ymd, net: 0, gross: 0, discount: 0, count: 0 }
        e.net += Number(r.net || 0)
        e.gross += Number(r.net || 0) // Для обычных чеков gross = net
        e.count += 1 // Считаем количество чеков
        byDay.set(ymd, e)
      }
      const revenue = Array.from(byDay.values()).sort((a, b) => a.date.localeCompare(b.date))
      res.json({ year, month, revenue })
    } catch (e: any) {
      res.status(500).json({ error: String(e?.message || e) })
    }
  })

  // GET /iiko/local/sales/hours?from=YYYY-MM-DD&to=YYYY-MM-DD
  router.get('/local/sales/hours', async (req, res) => {
    const prisma = (req as any).prisma || req.app.get('prisma')
    if (!prisma) return res.status(503).json({ error: 'prisma not available' })
    const from = String(req.query.from || '').trim()
    const to = String(req.query.to || '').trim()
    if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
      return res.status(400).json({ error: 'from/to must be YYYY-MM-DD' })
    }
    try {
      const start = new Date(from + 'T00:00:00.000Z')
      const end = new Date(to + 'T23:59:59.999Z')

      // Загружаем только актуальные (не возвраты и не удаленные) чеки
      const receipts = await prisma.iikoReceipt.findMany({
        where: {
          date: { gte: start, lt: end },
          AND: [
            { OR: [{ isReturn: false }, { isReturn: null }] },
            { OR: [{ isDeleted: false }, { isDeleted: null }] }
          ]
        },
        select: { date: true, net: true }
      })

      // Часовой пояс: локально используем UTC+7 как в остальных местах
      const TZ_OFFSET = 7
      const hours = new Array(24).fill(0).map((_, h) => ({ hour: h, count: 0, net: 0 }))
      for (const r of receipts) {
        const d = new Date(r.date)
        let h = d.getUTCHours() + TZ_OFFSET
        if (h >= 24) h -= 24
        if (h < 0) h += 24
        const e = hours[h]
        e.count += 1
        e.net += Number(r.net || 0)
      }

      // Округлим суммы до целого рубля для консистентности ответа
      const rows = hours.map(x => ({ hour: String(x.hour).padStart(2, '0'), count: x.count, net: Math.round(x.net) }))
      res.json({ from, to, rows })
    } catch (e: any) {
      res.status(500).json({ error: String(e?.message || e) })
    }
  })

  // GET /iiko/local/sales/hours/matrix?from=YYYY-MM-DD&to=YYYY-MM-DD
  router.get('/local/sales/hours/matrix', async (req, res) => {
    const prisma = (req as any).prisma || req.app.get('prisma')
    if (!prisma) return res.status(503).json({ error: 'prisma not available' })
    const from = String(req.query.from || '').trim()
    const to = String(req.query.to || '').trim()
    if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
      return res.status(400).json({ error: 'from/to must be YYYY-MM-DD' })
    }
    try {
      // Build date columns list (UTC, by YMD)
      const start = new Date(from + 'T00:00:00.000Z')
      const end = new Date(to + 'T23:59:59.999Z')
      const min = start.getTime() <= end.getTime() ? start : end
      const max = start.getTime() <= end.getTime() ? end : start
      const cols: string[] = []
      for (let d = new Date(Date.UTC(min.getUTCFullYear(), min.getUTCMonth(), min.getUTCDate())); d <= max; d = new Date(d.getTime() + 24 * 60 * 60 * 1000)) {
        cols.push(d.toISOString().slice(0, 10))
      }

      const HOURS = Array.from({ length: 24 }, (_, h) => String(h).padStart(2, '0'))
      const count: Record<string, Record<string, number>> = {}
      const net: Record<string, Record<string, number>> = {}
      const countW: Record<string, Record<string, number>> = {}
      const netW: Record<string, Record<string, number>> = {}
      for (const h of HOURS) {
        count[h] = Object.fromEntries(cols.map(c => [c, 0]))
        net[h] = Object.fromEntries(cols.map(c => [c, 0]))
        countW[h] = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0, '6': 0, '7': 0 }
        netW[h] = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0, '6': 0, '7': 0 }
      }

      // Load locally from DB (exclude returns and deleted) with stored times
      const receipts = await prisma.iikoReceipt.findMany({
        where: {
          date: { gte: min, lt: new Date(max.getTime() + 1) },
          AND: [
            { OR: [{ isReturn: false }, { isReturn: null }] },
            { OR: [{ isDeleted: false }, { isDeleted: null }] }
          ]
        },
        select: { date: true, net: true, orderNum: true, openTime: true, closeTime: true }
      })

      // Bucket using stored openTime/closeTime (no OLAP calls)
      for (const r of receipts) {
        const ts: Date = (r as any).openTime || (r as any).closeTime || r.date
        const d = new Date(ts)
        // Use local hour to match UI expectations
        const hour = String(d.getHours()).padStart(2, '0')
        const y = d.getFullYear()
        const m = String(d.getMonth() + 1).padStart(2, '0')
        const dd = String(d.getDate()).padStart(2, '0')
        const ymd = `${y}-${m}-${dd}`
        const wd = String((d.getDay() || 7))
        if (count[hour] && (ymd in count[hour])) count[hour][ymd] += 1
        if (net[hour] && (ymd in net[hour])) net[hour][ymd] += Number(r.net || 0)
        if (countW[hour] && (wd in countW[hour])) countW[hour][wd] += 1
        if (netW[hour] && (wd in netW[hour])) netW[hour][wd] += Number(r.net || 0)
      }

      // Round net
      for (const h of HOURS) {
        for (const c of cols) net[h][c] = Math.round(net[h][c])
        for (const w of ['1','2','3','4','5','6','7']) netW[h][w] = Math.round(netW[h][w])
      }

      res.json({ from, to, cols, hours: HOURS, count, net, countW, netW })
    } catch (e: any) {
      res.status(500).json({ error: String(e?.message || e) })
    }
  })

  // moved to local-router
  /*router.get('/local/sales/returns/month', async (req, res) => {
    const prisma = (req as any).prisma || req.app.get('prisma')
    if (!prisma) return res.status(503).json({ error: 'prisma not available' })
    const year = Number(String(req.query.year || ''))
    const month = Number(String(req.query.month || ''))
    if (!Number.isInteger(year) || year < 2000 || year > 2100) return res.status(400).json({ error: 'year invalid' })
    if (!Number.isInteger(month) || month < 1 || month > 12) return res.status(400).json({ error: 'month invalid' })
    try {
      const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0))
      const end = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0))
      const receipts = await prisma.iikoReceipt.findMany({
        where: { 
          date: { gte: start, lt: end },
          isReturn: true
        },
        select: { date: true, returnSum: true }
      })
      const byDay = new Map<string, any>()
      for (const r of receipts) {
        const d = new Date(r.date)
        const ymd = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())).toISOString().slice(0, 10)
        const e = byDay.get(ymd) || { date: ymd, net: 0, gross: 0, discount: 0 }
        e.net += Number(r.returnSum || 0)
        e.gross += Number(r.returnSum || 0) // Для возвратов gross = net
        byDay.set(ymd, e)
      }
      const revenue = Array.from(byDay.values()).sort((a, b) => a.date.localeCompare(b.date))
      res.json({ year, month, revenue })
    } catch (e: any) {
      res.status(500).json({ error: String(e?.message || e) })
    }
  })*/

  /*router.get('/local/sales/deleted/month', async (req, res) => {
    const prisma = (req as any).prisma || req.app.get('prisma')
    if (!prisma) return res.status(503).json({ error: 'prisma not available' })
    const year = Number(String(req.query.year || ''))
    const month = Number(String(req.query.month || ''))
    if (!Number.isInteger(year) || year < 2000 || year > 2100) return res.status(400).json({ error: 'year invalid' })
    if (!Number.isInteger(month) || month < 1 || month > 12) return res.status(400).json({ error: 'month invalid' })
    try {
      const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0))
      const end = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0))
      const receipts = await prisma.iikoReceipt.findMany({
        where: { 
          date: { gte: start, lt: end },
          isDeleted: true
        },
        select: { date: true, net: true }
      })
      const byDay = new Map<string, any>()
      for (const r of receipts) {
        const d = new Date(r.date)
        const ymd = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())).toISOString().slice(0, 10)
        const e = byDay.get(ymd) || { date: ymd, net: 0, gross: 0, discount: 0 }
        e.net += Number(r.net || 0)
        e.gross += Number(r.net || 0) // Для удаленных gross = net
        byDay.set(ymd, e)
      }
      const revenue = Array.from(byDay.values()).sort((a, b) => a.date.localeCompare(b.date))
      res.json({ year, month, revenue })
    } catch (e: any) {
      res.status(500).json({ error: String(e?.message || e) })
    }
  })*/

  router.get('/local/sales/dish-categories', async (req, res) => {
    const prisma = (req as any).prisma || req.app.get('prisma')
    if (!prisma) return res.status(503).json({ error: 'prisma not available' })
    
    try {
      const categories = await prisma.iikoReceiptItem.findMany({
        where: {
          dishCategory: { not: null },
          receipt: {
            AND: [
              {
                OR: [
                  { isDeleted: false },
                  { isDeleted: null }
                ]
              },
              {
                OR: [
                  { isReturn: false },
                  { isReturn: null }
                ]
              }
            ]
          }
        },
        select: {
          dishCategory: true
        },
        distinct: ['dishCategory']
      })
      
      const categoryList = categories
        .map((c: { dishCategory: string | null }) => c.dishCategory)
        .filter(Boolean)
        .sort()
      
      res.json({ categories: categoryList })
    } catch (e: any) {
      console.error('Error in /local/sales/dish-categories:', e)
      res.status(500).json({ error: String(e?.message || e) })
    }
  })

  router.get('/local/sales/dishes', async (req, res) => {
    const prisma = (req as any).prisma || req.app.get('prisma')
    if (!prisma) return res.status(503).json({ error: 'prisma not available' })
    
    const categoryFilter = req.query.category ? String(req.query.category) : null
    
    try {
      const whereClause: any = {
        receipt: {
          AND: [
            {
              OR: [
                { isDeleted: false },
                { isDeleted: null }
              ]
            },
            {
              OR: [
                { isReturn: false },
                { isReturn: null }
              ]
            }
          ]
        },
        dishId: { not: null },
        dishName: { not: null }
      }
      
      if (categoryFilter) {
        whereClause.dishCategory = categoryFilter
      }
      
      const items = await prisma.iikoReceiptItem.findMany({
        where: whereClause,
        select: {
          dishId: true,
          dishName: true,
          dishCategory: true,
          qty: true,
          net: true
        }
      })
      
      console.log(`Found ${items.length} receipt items`)
      
      // Группируем по блюдам
      const dishMap = new Map<string, { dishId: string; dishName: string; dishCategory: string | null; totalQty: number; totalRevenue: number }>()
      
      items.forEach((item: { dishId: string | null; dishName: string | null; dishCategory: string | null; qty: number | null; net: number | null }) => {
        if (!item.dishId || !item.dishName) return
        
        const key = item.dishId
        const existing = dishMap.get(key) || { 
          dishId: key, 
          dishName: item.dishName,
          dishCategory: item.dishCategory || null,
          totalQty: 0, 
          totalRevenue: 0 
        }
        
        existing.totalQty += item.qty || 0
        existing.totalRevenue += item.net || 0
        
        dishMap.set(key, existing)
      })
      
      console.log(`Grouped into ${dishMap.size} unique dishes`)
      
      // Сортируем по выручке
      const dishes = Array.from(dishMap.values()).sort((a, b) => b.totalRevenue - a.totalRevenue)
      
      res.json({ dishes })
    } catch (e: any) {
      console.error('Error in /local/sales/dishes:', e)
      res.status(500).json({ error: String(e?.message || e) })
    }
  })

  router.get('/local/sales/dish/:dishId', async (req, res) => {
    const prisma = (req as any).prisma || req.app.get('prisma')
    if (!prisma) return res.status(503).json({ error: 'prisma not available' })
    
    const dishId = req.params.dishId
    const from = req.query.from ? String(req.query.from) : null
    const to = req.query.to ? String(req.query.to) : null
    
    if (!from || !to) {
      return res.status(400).json({ error: 'from and to dates required (YYYY-MM-DD)' })
    }
    
    try {
      const start = new Date(from)
      const end = new Date(to)
      end.setDate(end.getDate() + 1) // Включаем последний день
      
      const items = await prisma.iikoReceiptItem.findMany({
        where: {
          dishId,
          receipt: {
            date: { gte: start, lt: end },
            AND: [
              {
                OR: [
                  { isDeleted: false },
                  { isDeleted: null }
                ]
              },
              {
                OR: [
                  { isReturn: false },
                  { isReturn: null }
                ]
              }
            ]
          }
        },
        select: {
          qty: true,
          net: true,
          cost: true,
          receipt: {
            select: {
              date: true
            }
          }
        }
      })
      
      // Группируем по дням
      const byDay = new Map<string, { date: string; qty: number; revenue: number; cost: number }>()
      
      items.forEach((item: { qty: number | null; net: number | null; cost: number | null; receipt: { date: Date } }) => {
        const d = new Date(item.receipt.date)
        const ymd = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())).toISOString().slice(0, 10)
        
        const existing = byDay.get(ymd) || { date: ymd, qty: 0, revenue: 0, cost: 0 }
        existing.qty += item.qty || 0
        existing.revenue += item.net || 0
        existing.cost += item.cost || 0
        
        byDay.set(ymd, existing)
      })
      
      const daily = Array.from(byDay.values()).sort((a, b) => a.date.localeCompare(b.date))
      
      res.json({ dishId, from, to, daily })
    } catch (e: any) {
      console.error('Error in /local/sales/dish/:dishId:', e)
      res.status(500).json({ error: String(e?.message || e) })
    }
  })

  router.get('/local/sales/category/:category', async (req, res) => {
    const prisma = (req as any).prisma || req.app.get('prisma')
    if (!prisma) return res.status(503).json({ error: 'prisma not available' })
    
    const category = req.params.category
    const from = req.query.from ? String(req.query.from) : null
    const to = req.query.to ? String(req.query.to) : null
    
    if (!from || !to) {
      return res.status(400).json({ error: 'from and to dates required (YYYY-MM-DD)' })
    }
    
    try {
      const start = new Date(from)
      const end = new Date(to)
      end.setDate(end.getDate() + 1) // Включаем последний день
      
      const items = await prisma.iikoReceiptItem.findMany({
        where: {
          dishCategory: category,
          receipt: {
            date: { gte: start, lt: end },
            AND: [
              {
                OR: [
                  { isDeleted: false },
                  { isDeleted: null }
                ]
              },
              {
                OR: [
                  { isReturn: false },
                  { isReturn: null }
                ]
              }
            ]
          }
        },
        select: {
          qty: true,
          net: true,
          cost: true,
          receipt: {
            select: {
              date: true
            }
          }
        }
      })
      
      // Группируем по дням
      const byDay = new Map<string, { date: string; qty: number; revenue: number; cost: number }>()
      
      items.forEach((item: any) => {
        const d = new Date(item.receipt.date)
        const ymd = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())).toISOString().slice(0, 10)
        
        const existing = byDay.get(ymd) || { date: ymd, qty: 0, revenue: 0, cost: 0 }
        existing.qty += item.qty || 0
        existing.revenue += item.net || 0
        existing.cost += item.cost || 0
        
        byDay.set(ymd, existing)
      })
      
      const daily = Array.from(byDay.values()).sort((a, b) => a.date.localeCompare(b.date))
      
      res.json({ category, from, to, daily })
    } catch (e: any) {
      console.error('Error in /local/sales/category/:category:', e)
      res.status(500).json({ error: String(e?.message || e) })
    }
  })

  /*router.get('/local/sales/total/month', async (req, res) => {
    const prisma = (req as any).prisma || req.app.get('prisma')
    if (!prisma) return res.status(503).json({ error: 'prisma not available' })
    const year = Number(String(req.query.year || ''))
    const month = Number(String(req.query.month || ''))
    if (!Number.isInteger(year) || year < 2000 || year > 2100) return res.status(400).json({ error: 'year invalid' })
    if (!Number.isInteger(month) || month < 1 || month > 12) return res.status(400).json({ error: 'month invalid' })
    try {
      const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0))
      const end = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0))
      const receipts = await prisma.iikoReceipt.findMany({
        where: { 
          date: { gte: start, lt: end }
        },
        select: { date: true, net: true, isReturn: true, returnSum: true, orderDeleted: true }
      })
      const byDay = new Map<string, any>()
      for (const r of receipts) {
        const d = new Date(r.date)
        const ymd = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())).toISOString().slice(0, 10)
        const e = byDay.get(ymd) || { date: ymd, net: 0, gross: 0, discount: 0 }
        
        // Для общего итога суммируем все: выручка + возвраты + удаленные
        if (r.isReturn) {
          e.net += Number(r.returnSum || 0)
        } else {
          e.net += Number(r.net || 0)
        }
        e.gross += Number(r.net || 0) // gross всегда из net
        byDay.set(ymd, e)
      }
      const revenue = Array.from(byDay.values()).sort((a, b) => a.date.localeCompare(b.date))
      res.json({ year, month, revenue })
    } catch (e: any) {
      res.status(500).json({ error: String(e?.message || e) })
    }
  })*/

  /*router.get('/local/sales/available-months', async (req, res) => {
    const prisma = (req as any).prisma || req.app.get('prisma')
    if (!prisma) return res.status(503).json({ error: 'prisma not available' })
    try {
      const receipts = await prisma.iikoReceipt.findMany({
        select: { date: true },
        orderBy: { date: 'desc' }
      })
      
      const months = new Set<string>()
      for (const receipt of receipts) {
        const date = new Date(receipt.date)
        const year = date.getUTCFullYear()
        const month = date.getUTCMonth() + 1
        months.add(`${year}-${month.toString().padStart(2, '0')}`)
      }
      
      const sortedMonths = Array.from(months).sort().reverse()
      res.json({ months: sortedMonths })
    } catch (e: any) {
      res.status(500).json({ error: String(e?.message || e) })
    }
  })*/

  // Функция для получения номера недели
  function getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
    const dayNum = d.getUTCDay() || 7
    d.setUTCDate(d.getUTCDate() + 4 - dayNum)
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  }

  router.get('/local/sales/customers', async (req, res) => {
    const prisma = (req as any).prisma || req.app.get('prisma')
    if (!prisma) return res.status(503).json({ error: 'prisma not available' })
    const from = String(req.query.from || '').trim()
    const to = String(req.query.to || '').trim()
    if (!from || !to) return res.status(400).json({ error: 'from=YYYY-MM-DD&to=YYYY-MM-DD required' })
    try {
      const start = new Date(from + 'T00:00:00.000Z')
      const end = new Date(to + 'T23:59:59.999Z')
      
      const receipts = await prisma.iikoReceipt.findMany({
        where: { 
          date: { gte: start, lt: end },
          customerName: { not: null },
          customerPhone: { not: null }
        },
        select: { 
          customerName: true, 
          customerPhone: true, 
          net: true, 
          date: true,
          orderNum: true,
          waiter: true,
          orderType: true,
          deliveryServiceType: true
        }
      })
      
      // Группируем по клиентам
      const customers = new Map<string, any>()
      
      for (const receipt of receipts) {
        const phone = receipt.customerPhone || ''
        const name = receipt.customerName || ''
        const key = phone || name
        
        if (!customers.has(key)) {
          customers.set(key, {
            name: name,
            phone: phone,
            totalOrders: 0,
            totalAmount: 0,
            firstOrder: receipt.date,
            lastOrder: receipt.date,
            orders: [],
            orderTypes: new Set(),
            waiters: new Set()
          })
        }
        
        const customer = customers.get(key)
        customer.totalOrders += 1
        customer.totalAmount += Number(receipt.net || 0)
        customer.firstOrder = customer.firstOrder < receipt.date ? customer.firstOrder : receipt.date
        customer.lastOrder = customer.lastOrder > receipt.date ? customer.lastOrder : receipt.date
        
        customer.orders.push({
          orderNum: receipt.orderNum,
          date: receipt.date,
          amount: Number(receipt.net || 0),
          waiter: receipt.waiter,
          orderType: receipt.orderType,
          deliveryServiceType: receipt.deliveryServiceType
        })
        
        if (receipt.orderType) customer.orderTypes.add(receipt.orderType)
        if (receipt.waiter) customer.waiters.add(receipt.waiter)
      }
      
      // Преобразуем в массив и добавляем аналитику
      const result = Array.from(customers.values()).map(customer => {
        // Сортируем заказы по дате
        const sortedOrders = customer.orders.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        
        // Считаем количество недель с заказами
        const weeksWithOrders = new Set<string>()
        sortedOrders.forEach(order => {
          const date = new Date(order.date)
          const year = date.getUTCFullYear()
          const week = getWeekNumber(date)
          weeksWithOrders.add(`${year}-W${week}`)
        })
        const weeksCount = weeksWithOrders.size
        
        // Считаем цикл заказа (дни между первым и последним заказом / количество недель)
        const firstOrderDate = new Date(customer.firstOrder)
        const lastOrderDate = new Date(customer.lastOrder)
        const totalDays = Math.ceil((lastOrderDate.getTime() - firstOrderDate.getTime()) / (1000 * 60 * 60 * 24))
        const orderCycle = weeksCount > 0 ? Math.round(totalDays / weeksCount) : 0
        
        // Считаем recency (дни с последнего заказа)
        const now = new Date()
        const recency = Math.ceil((now.getTime() - lastOrderDate.getTime()) / (1000 * 60 * 60 * 24))
        
        // Считаем давность (recency / цикл заказа)
        const recencyRatio = orderCycle > 0 ? (recency / orderCycle) : 0
        
        return {
          ...customer,
          orderTypes: Array.from(customer.orderTypes),
          waiters: Array.from(customer.waiters),
          avgOrderAmount: customer.totalOrders > 0 ? Math.round(customer.totalAmount / customer.totalOrders) : 0,
          weeksWithOrders: weeksCount,
          orderCycle: orderCycle,
          recency: recency,
          recencyRatio: Math.round(recencyRatio * 100) / 100
        }
      }).sort((a, b) => b.totalAmount - a.totalAmount)
      
      res.json({ customers: result, total: result.length })
    } catch (e: any) {
      res.status(500).json({ error: String(e?.message || e) })
    }
  })

  /*router.get('/local/returns', async (req, res) => {
    const prisma = (req as any).prisma || req.app.get('prisma')
    if (!prisma) return res.status(503).json({ error: 'prisma not available' })
    const from = String(req.query.from || '').trim()
    const to = String(req.query.to || '').trim()
    if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) return res.status(400).json({ error: 'from/to must be YYYY-MM-DD' })
    try {
      const start = new Date(from + 'T00:00:00.000Z')
      const end = new Date(to + 'T00:00:00.000Z')
      const group = String(req.query.group || 'waiter').toLowerCase()
      const groupField = group === 'register' ? 'register' : 'waiter'
      const receipts = await prisma.iikoReceipt.findMany({
        where: { date: { gte: start, lt: end }, isReturn: true },
        select: { id: true, date: true, orderNum: true, register: true, waiter: true, returnSum: true, items: { select: { dishId: true, dishName: true, returnSum: true, qty: true, net: true } } }
      })
      const byKey = new Map<string, { key: string; count: number; sum: number }>()
      for (const r of receipts) {
        const key = String((r as any)[groupField] || '(не указано)')
        const e = byKey.get(key) || { key, count: 0, sum: 0 }
        e.count += 1
        e.sum += Number(r.returnSum || 0)
        byKey.set(key, e)
      }
      // Агрегация по блюдам в возвратах
      const dishMap = new Map<string, { dishId: string | null; dishName: string; count: number; sum: number }>()
      for (const r of receipts) {
        for (const it of (r as any).items || []) {
          const sum = Number(it.returnSum || 0)
          if (!sum) continue
          const key = `${it.dishId || ''}|${it.dishName || ''}`
          const e = dishMap.get(key) || { dishId: it.dishId || null, dishName: it.dishName || '', count: 0, sum: 0 }
          e.count += 1
          e.sum += sum
          dishMap.set(key, e)
        }
      }
      const dishes = Array.from(dishMap.values()).sort((a, b) => b.sum - a.sum)
      res.json({ from, to, groupBy: groupField, rows: Array.from(byKey.values()).sort((a, b) => b.sum - a.sum), details: receipts, dishes })
    } catch (e: any) {
      res.status(500).json({ error: String(e?.message || e) })
    }
  })*/

  /*router.get('/local/sales/deleted', async (req, res) => {
    const prisma = (req as any).prisma || req.app.get('prisma')
    if (!prisma) return res.status(503).json({ error: 'prisma not available' })
    const date = String(req.query.date || '').trim()
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: 'date=YYYY-MM-DD required' })
    const includeItems = String(req.query.includeItems || '') === '1'
    try {
      const day = new Date(date + 'T00:00:00.000Z')
      const next = new Date(day.getTime() + 24 * 60 * 60 * 1000)
      const receipts = await prisma.iikoReceipt.findMany({
        where: { 
          date: { gte: day, lt: next },
          isDeleted: true
        },
        orderBy: { net: 'desc' },
        include: includeItems ? { items: true } : { items: false as any }
      })
      const rows = receipts.map((r: any) => ({
        orderNum: r.orderNum,
        net: r.net || 0,
        cost: r.cost || 0,
        foodCostPct: r.net ? Math.round(((r.cost || 0) / r.net) * 10000) / 100 : 0,
        dishes: r.items ? r.items.reduce((a: number, it: any) => a + (it.qty || 0), 0) : undefined,
        guests: r.guests || 0,
        payTypes: safeParseArray(r.payTypesJson),
        waiter: r.waiter,
        register: r.register,
        customerName: r.customerName,
        customerPhone: r.customerPhone,
        orderType: r.orderType || null,
        deliveryServiceType: r.deliveryServiceType || null,
        isReturn: !!r.isReturn || false,
        returnSum: r.returnSum || 0,
        isDeleted: !!r.isDeleted || false,
        deletedWithWriteoff: !!r.deletedWithWriteoff || false,
        items: includeItems ? (r.items || []).map((it: any) => ({
          dishId: it.dishId,
          dishName: it.dishName,
          size: it.size,
          qty: it.qty || 0,
          net: it.net || 0,
          cost: it.cost || 0,
          measureUnit: it.measureUnit || null
        })) : undefined
      }))
      res.json({ date, rows })
    } catch (e: any) {
      res.status(500).json({ error: String(e?.message || e) })
    }
  })*/

  // Функция для конвертации времени из UTC в правильный часовой пояс (UTC+7)
  function toCorrectTime(dateTime: any): string | null {
    if (!dateTime) return null
    if (typeof dateTime === 'string') {
      // Если это строка с Z (UTC), добавляем 7 часов
      if (dateTime.endsWith('Z')) {
        const d = new Date(dateTime)
        const correctTime = new Date(d.getTime() + 7 * 60 * 60 * 1000)
        return correctTime.toISOString().replace('Z', '')
      }
      return dateTime
    }
    if (dateTime instanceof Date) {
      // Добавляем 7 часов
      const correctTime = new Date(dateTime.getTime() + 7 * 60 * 60 * 1000)
      return correctTime.toISOString().replace('Z', '')
    }
    return null
  }

  /*router.get('/local/sales/receipts', async (req, res) => {
    const prisma = (req as any).prisma || req.app.get('prisma')
    if (!prisma) return res.status(503).json({ error: 'prisma not available' })
    const date = String(req.query.date || '').trim()
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: 'date=YYYY-MM-DD required' })
    const includeItems = String(req.query.includeItems || '') === '1'
    try {
      const day = new Date(date + 'T00:00:00.000Z')
      const next = new Date(day.getTime() + 24 * 60 * 60 * 1000)
      const receipts = await prisma.iikoReceipt.findMany({
        where: { date: { gte: day, lt: next } },
        orderBy: { net: 'desc' },
        include: includeItems ? { items: true } : { items: false as any }
      })
      // Enrich with times/source and returns mapping from OLAP for the day
      let timeMap = new Map<string, { openTime?: string | null; closeTime?: string | null; sourceOrderNum?: string | null; storned?: string | null }>()
      let returnsBySource = new Map<string, { returnOrderNum: string; returnOpenTime?: string | null; returnCloseTime?: string | null }>()
      try {
        const { from, to } = buildDayRangeIso(date)
        const body = {
          reportType: 'SALES',
          buildSummary: true,
          groupByRowFields: ['OrderNum','OpenTime','CloseTime','SourceOrderNum','Storned'],
          groupByColFields: [],
          aggregateFields: ['DishDiscountSumInt'],
          filters: {
            'OpenDate.Typed': { filterType: 'DateRange', periodType: 'CUSTOM', from, to }
            // Убираем фильтры по удаленным чекам - получаем все
          }
        } as any
        const j: any = await client.postOlap(body)
        for (const r of (Array.isArray(j?.data) ? j.data : [])) {
          const num = String(r?.OrderNum || '')
          if (!num) continue
          timeMap.set(num, {
            openTime: r?.OpenTime || null,
            closeTime: r?.CloseTime || null,
            sourceOrderNum: r?.SourceOrderNum ? String(r.SourceOrderNum) : null,
            storned: r?.Storned || null
          })
        }
        // Returns mapping: Storned TRUE rows to their SourceOrderNum
        const bodyRet = {
          reportType: 'SALES',
          buildSummary: true,
          groupByRowFields: ['OrderNum','OpenTime','CloseTime','SourceOrderNum','Storned'],
          groupByColFields: [],
          aggregateFields: ['DishReturnSum'],
          filters: {
            'OpenDate.Typed': { filterType: 'DateRange', periodType: 'CUSTOM', from, to },
            DeletedWithWriteoff: { filterType: 'IncludeValues', values: ['NOT_DELETED'] },
            OrderDeleted: { filterType: 'IncludeValues', values: ['NOT_DELETED'] },
            Storned: { filterType: 'IncludeValues', values: ['TRUE'] }
          }
        } as any
        const jr: any = await client.postOlap(bodyRet)
        for (const r of (Array.isArray(jr?.data) ? jr.data : [])) {
          const src = String(r?.SourceOrderNum || '')
          const ret = String(r?.OrderNum || '')
          if (!src || !ret) continue
          if (!returnsBySource.has(src)) returnsBySource.set(src, { returnOrderNum: ret, returnOpenTime: r?.OpenTime || null, returnCloseTime: r?.CloseTime || null })
        }
      } catch {}
      const rows = receipts.map((r: any) => {
        // Для возвратов используем returnSum вместо net
        const netAmount = r.isReturn ? (r.returnSum || 0) : (r.net || 0)
        return {
        orderNum: r.orderNum,
        net: netAmount,
        cost: r.cost || 0,
        foodCostPct: netAmount ? Math.round(((r.cost || 0) / netAmount) * 10000) / 100 : 0,
        dishes: r.items ? r.items.reduce((a: number, it: any) => a + (it.qty || 0), 0) : undefined,
        guests: r.guests || 0,
        payTypes: safeParseArray(r.payTypesJson),
        waiter: r.waiter,
        register: r.register,
        sessionNumber: r.sessionNumber,
        cashRegNumber: r.cashRegNumber,
        customerName: r.customerName,
        customerPhone: r.customerPhone,
        orderType: r.orderType || null,
        deliveryServiceType: r.deliveryServiceType || null,
        isReturn: !!r.isReturn || false,
        returnSum: r.returnSum || 0,
        isDeleted: !!r.isDeleted || false,
        deletedWithWriteoff: !!r.deletedWithWriteoff || false,
        openTime: toCorrectTime(r.openTime || timeMap.get(r.orderNum)?.openTime || null),
        closeTime: toCorrectTime(r.closeTime || timeMap.get(r.orderNum)?.closeTime || null),
        sourceOrderNum: timeMap.get(r.orderNum)?.sourceOrderNum || null,
        returnOrderNum: returnsBySource.get(r.orderNum)?.returnOrderNum || null,
        returnTime: toCorrectTime(returnsBySource.get(r.orderNum)?.returnOpenTime || returnsBySource.get(r.orderNum)?.returnCloseTime || null),
        items: includeItems ? (r.items || []).map((it: any) => {
          // Для позиций в возвратах используем returnSum вместо net
          const itemNet = r.isReturn ? (it.returnSum || 0) : (it.net || 0)
          return {
          dishId: it.dishId,
          dishName: it.dishName,
          size: it.size,
          qty: it.qty || 0,
          net: itemNet,
          cost: it.cost || 0,
          measureUnit: it.measureUnit || null
        }}) : undefined
      }}).sort((a, b) => {
        const ta = String(a.openTime || a.closeTime || '')
        const tb = String(b.openTime || b.closeTime || '')
        return ta.localeCompare(tb)
      })
      res.json({ date, rows })
    } catch (e: any) {
      res.status(500).json({ error: String(e?.message || e) })
    }
  })*/

  /*router.get('/local/import/status', async (req, res) => {
    const prisma = (req as any).prisma || req.app.get('prisma')
    if (!prisma) return res.status(503).json({ error: 'prisma not available' })
    const year = Number(String(req.query.year || ''))
    if (!Number.isInteger(year) || year < 2000 || year > 2100) return res.status(400).json({ error: 'year invalid' })
    try {
      const months = [] as Array<{ month: number; loaded: boolean; daysLoaded: number; daysInMonth: number }>
      for (let m = 1; m <= 12; m++) {
        const start = new Date(Date.UTC(year, m - 1, 1, 0, 0, 0, 0))
        const end = new Date(Date.UTC(year, m, 1, 0, 0, 0, 0))
        // SQLite может некорректно работать с distinct по DateTime. Вытащим все даты и посчитаем уникальные YYYY-MM-DD.
        const dates = await prisma.iikoReceipt.findMany({
          where: { date: { gte: start, lt: end } },
          select: { date: true }
        })
        const set = new Set<string>()
        for (const r of dates) {
          try { set.add(new Date(r.date).toISOString().slice(0, 10)) } catch {}
        }
        const daysLoaded = set.size
        const daysInMonth = Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000))
        const loaded = daysLoaded > 0 && daysLoaded === daysInMonth
        months.push({ month: m, loaded, daysLoaded, daysInMonth })
      }
      res.json({ year, months })
    } catch (e: any) {
      res.status(500).json({ error: String(e?.message || e) })
    }
  })*/

  // GET /iiko/sales/waiters?date=YYYY-MM-DD
  router.get('/sales/waiters', async (req, res) => {
    const date = String(req.query.date || '').trim()
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: 'date=YYYY-MM-DD required' })
    try {
      const rows = await client.salesByWaiter(date)
      res.json({ date, rows })
    } catch (e: any) {
      res.status(500).json({ error: String(e?.message || e) })
    }
  })

  // GET /iiko/reports/olap/columns?reportType=SALES|TRANSACTIONS|DELIVERIES
  router.get('/reports/olap/columns', async (req, res) => {
    try {
      const reportType = String(req.query.reportType || 'SALES').toUpperCase() as any
      const j = await client.getOlapColumns(reportType)
      res.json(j)
    } catch (e: any) {
      res.status(500).json({ error: String(e?.message || e) })
    }
  })

  // POST /iiko/reports/olap  { reportType, groupByRowFields, aggregateFields, filters, ... }
  router.post('/reports/olap', async (req, res) => {
    try {
      const body = req.body || {}
      const j = await client.postOlap(body)
      res.json(j)
    } catch (e: any) {
      res.status(500).json({ error: String(e?.message || e) })
    }
  })

  // POST /iiko/etl/receipts  { date?: 'YYYY-MM-DD', from?: 'YYYY-MM-DD', to?: 'YYYY-MM-DD' }
  // ВНИМАНИЕ: только ручной запуск. Никаких расписаний.
  router.post('/etl/receipts', async (req, res) => {
    try {
      const date = String(req.body?.date || '').trim()
      const from = String(req.body?.from || '').trim()
      const to = String(req.body?.to || '').trim()
      const prisma = (req as any).prisma || req.app.get('prisma')
      if (!prisma) return res.status(503).json({ error: 'prisma not available' })
      if (date) {
        const r = await importReceiptsForDate(prisma, client, date)
        return res.json(r)
      }
      if (from && to) {
        const r = await importReceiptsRange(prisma, client, from, to)
        return res.json(r)
      }
      return res.status(400).json({ error: 'pass date or from+to' })
    } catch (e: any) {
      res.status(500).json({ error: String(e?.message || e) })
    }
  })

  // GET /iiko/sales/receipts?date=YYYY-MM-DD
  router.get('/sales/receipts', async (req, res) => {
    const date = String(req.query.date || '').trim()
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: 'date=YYYY-MM-DD required' })
    try {
      const { from, to } = buildDayRangeIso(date)
      const body = {
        reportType: 'SALES',
        buildSummary: true,
        groupByRowFields: ['OrderNum','PayTypes','WaiterName','CashRegisterName','Delivery.CustomerName','Delivery.CustomerPhone','OrderType','Storned','OrderDeleted','DeletedWithWriteoff'],
        groupByColFields: [],
        aggregateFields: ['DishSumInt','DishDiscountSumInt','ProductCostBase.ProductCost','GuestNum','DishAmountInt','DishReturnSum'],
        filters: {
          'OpenDate.Typed': { filterType: 'DateRange', periodType: 'CUSTOM', from, to }
        }
      }
      const j: any = await client.postOlap(body)
      const map = new Map<string, any>()
      for (const r of (Array.isArray(j?.data) ? j.data : [])) {
        const num = String(r?.OrderNum || '')
        if (!num) continue
        const e = map.get(num) || {
          orderNum: num,
          net: 0,
          cost: 0,
          guests: 0,
          guestsMax: 0,
          dishes: 0,
          payTypes: new Set<string>(),
          waiter: r?.WaiterName || null,
          register: r?.CashRegisterName || null,
          customerName: r?.['Delivery.CustomerName'] || null,
          customerPhone: r?.['Delivery.CustomerPhone'] || null,
          orderType: r?.OrderType || null,
          deliveryServiceType: r?.['Delivery.ServiceType'] || null,
          isReturn: (String(r?.Storned || '').toUpperCase() === 'TRUE') || ((Number(r?.DishReturnSum) || 0) > 0),
          returnSum: Number(r?.DishReturnSum) || 0,
          orderDeleted: r?.OrderDeleted || 'NOT_DELETED',
          deletedWithWriteoff: r?.DeletedWithWriteoff || 'NOT_DELETED'
        }
        // Для возвратов используем оригинальную сумму (DishSumInt), а не сумму после скидок
        const originalSum = Number(r?.DishSumInt) || 0
        const discountSum = Number(r?.DishDiscountSumInt) || 0
        const isReturn = String(r?.Storned || '').toUpperCase() === 'TRUE'
        const isDeleted = String(r?.OrderDeleted || '').toUpperCase() === 'DELETED'
        const isDeletedWithWriteoff = String(r?.DeletedWithWriteoff || '').toUpperCase() === 'DELETED_WITH_WRITEOFF'
        const isDeletedWithoutWriteoff = String(r?.DeletedWithWriteoff || '').toUpperCase() === 'DELETED_WITHOUT_WRITEOFF'
        
        // Для возвратов используем только положительные DishReturnSum
        if (isReturn) {
          const returnSum = Number(r?.DishReturnSum) || 0
          if (returnSum > 0) {
            e.net += returnSum
          }
        } else {
          e.net += ((isDeleted || isDeletedWithWriteoff || isDeletedWithoutWriteoff) && originalSum > 0) ? originalSum : discountSum
        }
        e.cost += Number(r?.['ProductCostBase.ProductCost']) || 0
        e.guests += Number(r?.GuestNum) || 0
        e.guestsMax = Math.max(e.guestsMax, Number(r?.GuestNum) || 0)
        e.dishes += Number(r?.DishAmountInt) || 0
        if (r?.PayTypes) e.payTypes.add(r.PayTypes)
        if (r?.WaiterName && !e.waiter) e.waiter = r.WaiterName
        if (r?.CashRegisterName && !e.register) e.register = r.CashRegisterName
        if (r?.['Delivery.CustomerName'] && !e.customerName) e.customerName = r['Delivery.CustomerName']
        if (r?.['Delivery.CustomerPhone'] && !e.customerPhone) e.customerPhone = r['Delivery.CustomerPhone']
        if (r?.OrderType && !e.orderType) e.orderType = r.OrderType
        if (r?.['Delivery.ServiceType'] && !e.deliveryServiceType) e.deliveryServiceType = r['Delivery.ServiceType']
        if (isReturn) e.isReturn = true
        if ((Number(r?.DishReturnSum) || 0) > 0) e.returnSum = (Number(r?.DishReturnSum) || 0)
        map.set(num, e)
      }
      // Optionally fetch line items per receipt
      const includeItems = String(req.query.includeItems || '') === '1'
      if (includeItems) {
        const bodyItems = {
          reportType: 'SALES',
          buildSummary: true,
          groupByRowFields: ['OrderNum','DishId','DishName','DishSize.ShortName','Storned','OrderDeleted','DeletedWithWriteoff'],
          groupByColFields: [],
          aggregateFields: ['DishSumInt','DishDiscountSumInt','ProductCostBase.ProductCost','DishAmountInt','DishReturnSum'],
          filters: {
            'OpenDate.Typed': { filterType: 'DateRange', periodType: 'CUSTOM', from, to }
          }
        }
        const ji: any = await client.postOlap(bodyItems)
        for (const r of (Array.isArray(ji?.data) ? ji.data : [])) {
          const num = String(r?.OrderNum || '')
          if (!num) continue
          const e = map.get(num)
          if (!e) continue
          if (!e.items) e.items = []
          // Для возвратов используем только положительные DishReturnSum
          const originalSum = Number(r?.DishSumInt) || 0
          const discountSum = Number(r?.DishDiscountSumInt) || 0
          const isReturn = String(r?.Storned || '').toUpperCase() === 'TRUE'
          const isDeleted = String(r?.OrderDeleted || '').toUpperCase() === 'DELETED'
          const isDeletedWithWriteoff = String(r?.DeletedWithWriteoff || '').toUpperCase() === 'DELETED_WITH_WRITEOFF'
          const isDeletedWithoutWriteoff = String(r?.DeletedWithWriteoff || '').toUpperCase() === 'DELETED_WITHOUT_WRITEOFF'
          
          let netAmount = 0
          if (isReturn) {
            const returnSum = Number(r?.DishReturnSum) || 0
            if (returnSum > 0) {
              netAmount = returnSum
            }
          } else {
            netAmount = ((isDeleted || isDeletedWithWriteoff || isDeletedWithoutWriteoff) && originalSum > 0) ? originalSum : discountSum
          }
          
          e.items.push({
            dishId: r?.DishId || null,
            dishName: r?.DishName || '',
            size: r?.['DishSize.ShortName'] || null,
            qty: Number(r?.DishAmountInt) || 0,
            net: netAmount,
            cost: Math.round(((Number(r?.['ProductCostBase.ProductCost']) || 0)) * 100) / 100
          })
        }
      }

      const rows = Array.from(map.values()).map(e => ({
        orderNum: e.orderNum,
        net: e.net,
        cost: Math.round(e.cost * 100) / 100,
        foodCostPct: e.net ? Math.round((e.cost / e.net) * 10000) / 100 : 0,
        dishes: e.dishes,
        guests: e.guestsMax || e.guests, // корректный гость по чеку
        payTypes: Array.from(e.payTypes),
        waiter: e.waiter,
        register: e.register,
        customerName: e.customerName,
        customerPhone: e.customerPhone,
        orderType: e.orderType || null,
        deliveryServiceType: e.deliveryServiceType || null,
        isReturn: !!e.isReturn || false,
        returnSum: e.returnSum || 0,
        items: e.items || undefined
      })).sort((a, b) => b.net - a.net)
      res.json({ date, rows })
    } catch (e: any) {
      res.status(500).json({ error: String(e?.message || e) })
    }
  })

  // GET /iiko/sales/units?date=YYYY-MM-DD
  router.get('/sales/units', async (req, res) => {
    const date = String(req.query.date || '').trim()
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: 'date=YYYY-MM-DD required' })
    try {
      const { from, to } = buildDayRangeIso(date)
      const body = {
        reportType: 'SALES',
        buildSummary: false,
        groupByRowFields: ['DishName','DishSize.ShortName','DishMeasureUnit'],
        groupByColFields: [],
        aggregateFields: ['DishAmountInt'],
        filters: {
          'OpenDate.Typed': { filterType: 'DateRange', periodType: 'CUSTOM', from, to },
          DeletedWithWriteoff: { filterType: 'IncludeValues', values: ['NOT_DELETED'] },
          OrderDeleted: { filterType: 'IncludeValues', values: ['NOT_DELETED'] }
        }
      }
      const j: any = await client.postOlap(body)
      const rows = (Array.isArray(j?.data) ? j.data : []).map((r: any) => ({
        dish: r?.DishName || '',
        size: r?.['DishSize.ShortName'] || null,
        unit: r?.DishMeasureUnit || null,
        amount: r?.DishAmountInt || 0
      }))
      res.json({ date, rows })
    } catch (e: any) {
      res.status(500).json({ error: String(e?.message || e) })
    }
  })

  // GET /iiko/sales/receipt?date=YYYY-MM-DD&orderNum=...&includeDeleted=1
  router.get('/sales/receipt', async (req, res) => {
    const date = String(req.query.date || '').trim()
    const orderNum = String(req.query.orderNum || '').trim()
    const includeDeleted = String(req.query.includeDeleted || '') === '1'
    if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(date)) return res.status(400).json({ error: 'date=YYYY-MM-DD required' })
    if (!orderNum) return res.status(400).json({ error: 'orderNum required' })
    try {
      const { from, to } = buildDayRangeIso(date)
      const baseFilters: any = {
        'OpenDate.Typed': { filterType: 'DateRange', periodType: 'CUSTOM', from, to },
        DeletedWithWriteoff: { filterType: 'IncludeValues', values: ['NOT_DELETED'] },
      }
      if (!includeDeleted) baseFilters['OrderDeleted'] = { filterType: 'IncludeValues', values: ['NOT_DELETED'] }
      const filters = { ...baseFilters, OrderNum: { filterType: 'IncludeValues', values: [orderNum] } }
      const headBody = {
        reportType: 'SALES',
        buildSummary: true,
        groupByRowFields: ['OrderNum','PayTypes','WaiterName','CashRegisterName','Delivery.CustomerName','Delivery.CustomerPhone','OrderType','Storned','OpenTime','CloseTime','SourceOrderNum'],
        groupByColFields: [],
        aggregateFields: ['DishDiscountSumInt','ProductCostBase.ProductCost','GuestNum','DishAmountInt','DishReturnSum'],
        filters
      }
      const jh: any = await client.postOlap(headBody)
      const e: any = { orderNum, net: 0, cost: 0, guests: 0, dishes: 0, payTypes: [], waiter: null, register: null, customerName: null, customerPhone: null, orderType: null, isReturn: false, returnSum: 0, openTime: null, closeTime: null, sourceOrderNum: null, items: [] }
      for (const r of (Array.isArray(jh?.data) ? jh.data : [])) {
        e.net += Number(r?.DishDiscountSumInt) || 0
        e.cost += Number(r?.['ProductCostBase.ProductCost']) || 0
        e.guests = Math.max(e.guests, Number(r?.GuestNum) || 0)
        e.dishes += Number(r?.DishAmountInt) || 0
        if (r?.PayTypes) e.payTypes.push(r.PayTypes)
        if (r?.WaiterName && !e.waiter) e.waiter = r.WaiterName
        if (r?.CashRegisterName && !e.register) e.register = r.CashRegisterName
        if (r?.['Delivery.CustomerName'] && !e.customerName) e.customerName = r['Delivery.CustomerName']
        if (r?.['Delivery.CustomerPhone'] && !e.customerPhone) e.customerPhone = r['Delivery.CustomerPhone']
        if (r?.OrderType && !e.orderType) e.orderType = r.OrderType
        if (r?.OpenTime && !e.openTime) e.openTime = r.OpenTime
        if (r?.CloseTime && !e.closeTime) e.closeTime = r.CloseTime
        if (r?.SourceOrderNum && !e.sourceOrderNum) e.sourceOrderNum = String(r.SourceOrderNum)
        if ((Number(r?.DishReturnSum) || 0) > 0) e.returnSum += Number(r?.DishReturnSum) || 0
        if (String(r?.Storned || '').toUpperCase() === 'TRUE') e.isReturn = true
      }
      const itemsBody = {
        reportType: 'SALES',
        buildSummary: true,
        groupByRowFields: ['OrderNum','DishId','DishName','DishSize.ShortName','DishMeasureUnit'],
        groupByColFields: [],
        aggregateFields: ['DishDiscountSumInt','ProductCostBase.ProductCost','DishAmountInt','DishReturnSum'],
        filters
      }
      const ji: any = await client.postOlap(itemsBody)
      for (const r of (Array.isArray(ji?.data) ? ji.data : [])) {
        e.items.push({
          dishId: r?.DishId || null,
          dishName: r?.DishName || '',
          size: r?.['DishSize.ShortName'] || null,
          measureUnit: r?.DishMeasureUnit || null,
          qty: Number(r?.DishAmountInt) || 0,
          net: Number(r?.DishDiscountSumInt) || 0,
          returnSum: Number(r?.DishReturnSum) || 0,
          cost: Math.round(((Number(r?.['ProductCostBase.ProductCost']) || 0)) * 100) / 100
        })
      }
      res.json(e)
    } catch (e: any) {
      res.status(500).json({ error: String(e?.message || e) })
    }
  })

  // GET /iiko/sales/deleted?date=YYYY-MM-DD&includeItems=1
  router.get('/sales/deleted', async (req, res) => {
    const date = String(req.query.date || '').trim()
    const includeItems = String(req.query.includeItems || '') === '1'
    if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(date)) return res.status(400).json({ error: 'date=YYYY-MM-DD required' })
    try {
      const { from, to } = buildDayRangeIso(date)
      const body = {
        reportType: 'SALES',
        buildSummary: true,
        groupByRowFields: ['OrderNum','DishName','DishSize.ShortName','OpenTime','CloseTime','PayTypes','WaiterName','CashRegisterName','Delivery.CustomerName','Delivery.CustomerPhone','OrderType','OrderDeleted','DeletedWithWriteoff'],
        groupByColFields: [],
        aggregateFields: ['DishSumInt','DishDiscountSumInt','ProductCostBase.ProductCost','DishAmountInt'],
        filters: {
          'OpenDate.Typed': { filterType: 'DateRange', periodType: 'CUSTOM', from, to },
          OrderDeleted: { filterType: 'IncludeValues', values: ['DELETED'] }
        }
      }
      const j: any = await client.postOlap(body)
      const map = new Map<string, any>()
      for (const r of (Array.isArray(j?.data) ? j.data : [])) {
        const num = String(r?.OrderNum || '')
        if (!num) continue
        const e = map.get(num) || {
          orderNum: num,
          net: 0,
          cost: 0,
          dishes: 0,
          payTypes: new Set<string>(),
          waiter: r?.WaiterName || null,
          register: r?.CashRegisterName || null,
          customerName: r?.['Delivery.CustomerName'] || null,
          customerPhone: r?.['Delivery.CustomerPhone'] || null,
          orderType: r?.OrderType || null,
          openTime: r?.OpenTime || null,
          closeTime: r?.CloseTime || null,
          orderDeleted: r?.OrderDeleted || null,
          deletedWithWriteoff: r?.DeletedWithWriteoff || null,
          items: []
        }
        // Для удаленных чеков используем оригинальную сумму (DishSumInt), а не сумму после скидок
        const originalSum = Number(r?.DishSumInt) || 0
        const discountSum = Number(r?.DishDiscountSumInt) || 0
        e.net += originalSum > 0 ? originalSum : discountSum
        e.cost += Number(r?.['ProductCostBase.ProductCost']) || 0
        e.dishes += Number(r?.DishAmountInt) || 0
        if (r?.PayTypes) e.payTypes.add(r.PayTypes)
        if (r?.WaiterName && !e.waiter) e.waiter = r.WaiterName
        if (r?.CashRegisterName && !e.register) e.register = r.CashRegisterName
        if (r?.['Delivery.CustomerName'] && !e.customerName) e.customerName = r['Delivery.CustomerName']
        if (r?.['Delivery.CustomerPhone'] && !e.customerPhone) e.customerPhone = r['Delivery.CustomerPhone']
        if (r?.OrderType && !e.orderType) e.orderType = r.OrderType
        if (r?.OpenTime && !e.openTime) e.openTime = r.OpenTime
        if (r?.CloseTime && !e.closeTime) e.closeTime = r.CloseTime
        if (r?.OrderDeleted && !e.orderDeleted) e.orderDeleted = r.OrderDeleted
        if (r?.DeletedWithWriteoff && !e.deletedWithWriteoff) e.deletedWithWriteoff = r.DeletedWithWriteoff
        
        // Добавляем позицию если includeItems
        if (includeItems && r?.DishName) {
          const originalSum = Number(r?.DishSumInt) || 0
          const discountSum = Number(r?.DishDiscountSumInt) || 0
          e.items.push({
            dishName: r?.DishName || '',
            size: r?.['DishSize.ShortName'] || null,
            qty: Number(r?.DishAmountInt) || 0,
            net: originalSum > 0 ? originalSum : discountSum,
            cost: Math.round(((Number(r?.['ProductCostBase.ProductCost']) || 0)) * 100) / 100
          })
        }
        map.set(num, e)
      }
      
      const rows = Array.from(map.values()).map(e => ({
        orderNum: e.orderNum,
        net: e.net,
        cost: Math.round(e.cost * 100) / 100,
        foodCostPct: e.net ? Math.round((e.cost / e.net) * 10000) / 100 : 0,
        dishes: e.dishes,
        payTypes: Array.from(e.payTypes),
        waiter: e.waiter,
        register: e.register,
        customerName: e.customerName,
        customerPhone: e.customerPhone,
        orderType: e.orderType,
        openTime: e.openTime,
        closeTime: e.closeTime,
        orderDeleted: e.orderDeleted,
        deletedWithWriteoff: e.deletedWithWriteoff,
        items: includeItems ? e.items : undefined
      })).sort((a, b) => b.net - a.net)
      
      res.json({ date, rows })
    } catch (e: any) {
      res.status(500).json({ error: String(e?.message || e) })
    }
  })

  // GET /iiko/sales/returns?date=YYYY-MM-DD
  router.get('/sales/returns', async (req, res) => {
    const date = String(req.query.date || '').trim()
    if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(date)) return res.status(400).json({ error: 'date=YYYY-MM-DD required' })
    try {
      const { from, to } = buildDayRangeIso(date)
      // 1) Find returns (storned) for the day
      const bodyRet = {
        reportType: 'SALES',
        buildSummary: true,
        groupByRowFields: ['OrderNum','OpenTime','CloseTime','SourceOrderNum','Storned'],
        groupByColFields: [],
        aggregateFields: ['DishReturnSum'],
        filters: {
          'OpenDate.Typed': { filterType: 'DateRange', periodType: 'CUSTOM', from, to },
          DeletedWithWriteoff: { filterType: 'IncludeValues', values: ['NOT_DELETED'] },
          OrderDeleted: { filterType: 'IncludeValues', values: ['NOT_DELETED'] },
          Storned: { filterType: 'IncludeValues', values: ['TRUE'] }
        }
      } as any
      const jr: any = await client.postOlap(bodyRet)
      const retRows = (Array.isArray(jr?.data) ? jr.data : [])
        .map((r: any) => ({
          returnOrderNum: String(r?.OrderNum || ''),
          returnTime: r?.OpenTime || r?.CloseTime || null,
          sourceOrderNum: r?.SourceOrderNum ? String(r.SourceOrderNum) : null,
          returnSum: Number(r?.DishReturnSum) || 0
        }))
        .filter((x: any) => !!x.returnOrderNum)

      // 2) Load all receipts for the day to find sources by matching
      const allReceiptsBody = {
        reportType: 'SALES',
        buildSummary: true,
        groupByRowFields: ['OrderNum','PayTypes','WaiterName','CashRegisterName','Delivery.CustomerName','Delivery.CustomerPhone','OrderType','OpenTime','CloseTime'],
        groupByColFields: [],
        aggregateFields: ['DishDiscountSumInt','ProductCostBase.ProductCost','GuestNum','DishAmountInt'],
        filters: {
          'OpenDate.Typed': { filterType: 'DateRange', periodType: 'CUSTOM', from, to },
          DeletedWithWriteoff: { filterType: 'IncludeValues', values: ['NOT_DELETED'] }
        }
      }
      const allReceipts: any = await client.postOlap(allReceiptsBody)
      const allReceiptsMap = new Map<string, any>()
      for (const rr of (Array.isArray(allReceipts?.data) ? allReceipts.data : [])) {
        const orderNum = String(rr?.OrderNum || '')
        if (!orderNum) continue
        const existing = allReceiptsMap.get(orderNum) || { orderNum, net: 0, cost: 0, guests: 0, dishes: 0, payTypes: [], waiter: null, register: null, customerName: null, customerPhone: null, orderType: null, openTime: null, closeTime: null, items: [] }
        existing.net += Number(rr?.DishDiscountSumInt) || 0
        existing.cost += Number(rr?.['ProductCostBase.ProductCost']) || 0
        existing.guests = Math.max(existing.guests, Number(rr?.GuestNum) || 0)
        existing.dishes += Number(rr?.DishAmountInt) || 0
        if (rr?.PayTypes) existing.payTypes.push(rr.PayTypes)
        if (rr?.WaiterName && !existing.waiter) existing.waiter = rr.WaiterName
        if (rr?.CashRegisterName && !existing.register) existing.register = rr.CashRegisterName
        if (rr?.['Delivery.CustomerName'] && !existing.customerName) existing.customerName = rr['Delivery.CustomerName']
        if (rr?.['Delivery.CustomerPhone'] && !existing.customerPhone) existing.customerPhone = rr['Delivery.CustomerPhone']
        if (rr?.OrderType && !existing.orderType) existing.orderType = rr.OrderType
        if (rr?.OpenTime && !existing.openTime) existing.openTime = rr.OpenTime
        if (rr?.CloseTime && !existing.closeTime) existing.closeTime = rr.CloseTime
        allReceiptsMap.set(orderNum, existing)
      }

      // 3) Match returns with receipts by order number
      const bySource = new Map<string, any>()
      for (const r of retRows) {
        const key = r.sourceOrderNum || r.returnOrderNum
        if (bySource.has(key)) continue
        try {
          let bestMatch = null
          
          // If we have sourceOrderNum from iiko, use it directly
          if (r.sourceOrderNum) {
            bestMatch = allReceiptsMap.get(r.sourceOrderNum)
          }
          
          // If no direct match, try to find by amount (fallback)
          if (!bestMatch) {
            for (const [orderNum, receipt] of allReceiptsMap) {
              if (receipt.net === r.returnSum) {
                bestMatch = receipt
                break
              }
            }
          }
          if (bestMatch) {
            // Load items directly from iiko OLAP API (more reliable than local DB)
            try {
              const itemsBody = {
                reportType: 'SALES',
                buildSummary: true,
                groupByRowFields: ['OrderNum','DishId','DishName','DishSize.ShortName','DishMeasureUnit'],
                groupByColFields: [],
                aggregateFields: ['DishDiscountSumInt','ProductCostBase.ProductCost','DishAmountInt'],
                filters: {
                  'OpenDate.Typed': { filterType: 'DateRange', periodType: 'CUSTOM', from, to },
                  OrderNum: { filterType: 'IncludeValues', values: [bestMatch.orderNum] }
                }
              }
              const ji: any = await client.postOlap(itemsBody)
              bestMatch.items = []
              for (const rr of (Array.isArray(ji?.data) ? ji.data : [])) {
                bestMatch.items.push({
                  dishId: rr?.DishId || null,
                  dishName: rr?.DishName || '',
                  size: rr?.['DishSize.ShortName'] || null,
                  measureUnit: rr?.DishMeasureUnit || null,
                  qty: Number(rr?.DishAmountInt) || 0,
                  net: Number(rr?.DishDiscountSumInt) || 0,
                  cost: Math.round(((Number(rr?.['ProductCostBase.ProductCost']) || 0)) * 100) / 100
                })
              }
            } catch {}
            bySource.set(key, bestMatch)
          } else {
            // Fallback: create empty source
            bySource.set(key, { orderNum: r.sourceOrderNum || r.returnOrderNum, items: [] })
          }
        } catch {}
      }

      const rows = retRows.map((r: any) => ({
        source: bySource.get(r.sourceOrderNum || r.returnOrderNum) || { orderNum: r.sourceOrderNum || r.returnOrderNum, items: [] },
        returnOrderNum: r.returnOrderNum,
        returnTime: r.returnTime,
        returnSum: r.returnSum
      }))
      res.json({ date, rows })
    } catch (e: any) {
      res.status(500).json({ error: String(e?.message || e) })
    }
  })

  // GET /iiko/stores/balances?timestamp=YYYY-MM-DDTHH:mm:ss.SSS&store=...&product=...
  router.get('/stores/balances', async (req, res) => {
    const timestamp = String(req.query.timestamp || '').trim()
    if (!timestamp) return res.status(400).json({ error: 'timestamp required (yyyy-MM-ddTHH:mm:ss.SSS)' })
    try {
      const departments: string[] = ([] as any[]).concat(req.query.department || []).map(String)
      const stores: string[] = ([] as any[]).concat(req.query.store || []).map(String)
      const products: string[] = ([] as any[]).concat(req.query.product || []).map(String)
      const data = await client.getStoreBalances({ timestampIso: timestamp, departmentIds: departments, storeIds: stores, productIds: products })
      res.json({ timestamp, rows: data })
    } catch (e: any) {
      res.status(500).json({ error: String(e?.message || e) })
    }
  })

  // POST /iiko/stores/consumption  { from: 'YYYY-MM-DD', to: 'YYYY-MM-DD', storeIds?:[], productIds?:[] }
  // На базе OLAP TRANSACTIONS: суммарный расход по продуктам за период (отрицательные списания)
  router.post('/stores/consumption', async (req, res) => {
    try {
      const fromDate = String(req.body?.from || '').trim()
      const toDate = String(req.body?.to || '').trim()
      if (!/^\d{4}-\d{2}-\d{2}$/.test(fromDate) || !/^\d{4}-\d{2}-\d{2}$/.test(toDate)) {
        return res.status(400).json({ error: 'from/to must be YYYY-MM-DD' })
      }
      const from = `${fromDate}T00:00:00.000`
      const to = `${toDate}T00:00:00.000`
      const storeIds: string[] = Array.isArray(req.body?.storeIds) ? req.body.storeIds : []
      const productIds: string[] = Array.isArray(req.body?.productIds) ? req.body.productIds : []

      const filters: any = {
        'DateTime.Typed': { filterType: 'DateRange', periodType: 'CUSTOM', from, to },
      }
      // Фильтры по складу/продукту если заданы
      if (storeIds.length) filters['Store'] = { filterType: 'IncludeValues', values: storeIds }
      if (productIds.length) filters['Product.Id'] = { filterType: 'IncludeValues', values: productIds }

      const body = {
        reportType: 'TRANSACTIONS',
        buildSummary: false,
        groupByRowFields: ['Product.Id','Product.Name'],
        groupByColFields: [],
        // В колонках TRANSACTIONS денежная сумма может называться по-другому; начнем с Amount
        aggregateFields: ['Amount'],
        filters
      }
      const j: any = await client.postOlap(body)
      const rows = (Array.isArray(j?.data) ? j.data : []).map((r: any) => ({
        productId: r?.['Product.Id'] || null,
        productName: r?.['Product.Name'] || null,
        amount: Number(r?.Amount) || 0
      }))
      res.json({ from: fromDate, to: toDate, rows })
    } catch (e: any) {
      res.status(500).json({ error: String(e?.message || e) })
    }
  })

  // GET /iiko/recipes/tree?date=YYYY-MM-DD&productId=...&departmentId=...
  router.get('/recipes/tree', async (req, res) => {
    const date = String(req.query.date || '').trim()
    const productId = String(req.query.productId || '').trim()
    const departmentId = String(req.query.departmentId || '').trim() || undefined
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: 'date=YYYY-MM-DD required' })
    if (!productId) return res.status(400).json({ error: 'productId required' })
    try {
      const data = await client.getRecipeTree({ date, productId, departmentId })
      res.json(data)
    } catch (e: any) {
      res.status(500).json({ error: String(e?.message || e) })
    }
  })

  // GET /iiko/recipes/prepared?date=YYYY-MM-DD&productId=...&departmentId=...
  router.get('/recipes/prepared', async (req, res) => {
    const date = String(req.query.date || '').trim()
    const productId = String(req.query.productId || '').trim()
    const departmentId = String(req.query.departmentId || '').trim() || undefined
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: 'date=YYYY-MM-DD required' })
    if (!productId) return res.status(400).json({ error: 'productId required' })
    try {
      const data = await client.getRecipePrepared({ date, productId, departmentId })
      // enrich with units via a targeted products lookup if missing
      const items = Array.isArray(data?.preparedCharts?.[0]?.items) ? data.preparedCharts[0].items : []
      const ids = Array.from(new Set(items.map((it: any) => String(it?.productId || '')).filter(Boolean) as string[]))
      if (ids.length) {
        try {
          const plist: any = await client.listProductsByIds(ids)
          const arr = Array.isArray(plist) ? plist : (plist?.items || plist?.data || [])
          const unitMap: Record<string, string> = {}
          for (const p of arr) {
            if (p?.id) unitMap[p.id] = p?.measureUnit?.name || p?.measureUnitName || p?.unitName || p?.unit || ''
          }
          for (const it of items) {
            const id = String(it?.productId || '')
            if (id && !it.measureUnitName) it.measureUnitName = unitMap[id] || null
          }
        } catch {}
      }
      res.json(data)
    } catch (e: any) {
      res.status(500).json({ error: String(e?.message || e) })
    }
  })

  // GET /iiko/recipes/units?date=YYYY-MM-DD&id=...&id=...
  router.get('/recipes/units', async (req, res) => {
    const date = String(req.query.date || '').trim()
    const ids = ([] as string[])
      .concat(req.query.id as any || [])
      .concat(req.query.productId as any || [])
      .map(x => String(x)).filter(Boolean)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: 'date=YYYY-MM-DD required' })
    if (!ids.length) return res.json({ units: {} })
    try {
      const { from, to } = buildDayRangeIso(date)
      const filters: any = {
        'DateTime.Typed': { filterType: 'DateRange', periodType: 'CUSTOM', from, to },
      }
      // Если фильтрация по Product.Id поддерживается, добавим
      filters['Product.Id'] = { filterType: 'IncludeValues', values: ids }
      const body = {
        reportType: 'TRANSACTIONS',
        buildSummary: false,
        groupByRowFields: ['Product.Id','Product.MeasureUnit'],
        groupByColFields: [],
        aggregateFields: ['Amount'],
        filters
      }
      const j: any = await client.postOlap(body)
      const units: Record<string, string> = {}
      for (const r of (Array.isArray(j?.data) ? j.data : [])) {
        const id = String(r?.['Product.Id'] || '')
        const u = String(r?.['Product.MeasureUnit'] || '')
        if (id && u && !units[id]) units[id] = u
      }
      res.json({ units })
    } catch (e: any) {
      res.status(500).json({ error: String(e?.message || e) })
    }
  })

  // GET /iiko/entities/products?includeDeleted=false
  router.get('/entities/products', async (req, res) => {
    try {
      const includeDeleted = String(req.query.includeDeleted || '') === 'true'
      const rows = await client.listProducts({ includeDeleted })
      const items = Array.isArray(rows) ? rows : (rows?.items || rows?.data || [])
      const map = (Array.isArray(items) ? items : []).map((p: any) => ({
        id: p?.id,
        name: p?.name,
        type: p?.type || p?.productType || null,
        unitName: p?.measureUnit?.name || p?.measureUnitName || p?.unitName || p?.unit || null
      }))
      res.json({ items: map })
    } catch (e: any) {
      res.status(500).json({ error: String(e?.message || e) })
    }
  })

  // GET /iiko/entities/stores?includeDeleted=false
  router.get('/entities/stores', async (req, res) => {
    try {
      // Workaround: use a balances query to infer unique store ids with names if present
      const now = new Date()
      const yyyy = now.getUTCFullYear()
      const mm = String(now.getUTCMonth() + 1).padStart(2, '0')
      const dd = String(now.getUTCDate()).padStart(2, '0')
      const timestamp = `${yyyy}-${mm}-${dd}T00:00:00`
      const rows = await client.getStoreBalances({ timestampIso: timestamp })
      const uniq = new Map<string, string>()
      for (const r of rows) {
        const store = String(r?.store || '')
        const name = String(r?.storeName || '')
        if (store && !uniq.has(store)) uniq.set(store, name || store)
      }
      res.json({ items: Array.from(uniq.entries()).map(([id, name]) => ({ id, name })) })
    } catch (e: any) {
      res.status(500).json({ error: String(e?.message || e) })
    }
  })

  // GET /iiko/employees - список сотрудников из iiko
  router.get('/employees', async (req, res) => {
    try {
      const employees = await client.getEmployees()
      res.json({ items: employees, count: employees.length })
    } catch (e: any) {
      res.status(500).json({ error: String(e?.message || e) })
    }
  })

  // GET /iiko/cashshifts - прямой запрос к iiko API для просмотра смен
  router.get('/cashshifts', async (req, res) => {
    try {
      const { from, to } = req.query
      if (!from || !to) {
        return res.status(400).json({ error: 'from and to dates required (YYYY-MM-DD)' })
      }

      const shifts = await client.getCashShifts({
        openDateFrom: String(from),
        openDateTo: String(to),
        status: 'ANY'
      })

      // Получаем сотрудников для маппинга UUID → имя
      let employees: any[] = []
      try {
        employees = await client.getEmployees()
      } catch (e) {
        console.warn('Failed to load employees:', e)
      }

      const employeeMap = new Map(employees.map(e => [e.id, e]))

      // Обогащаем смены именами сотрудников
      const enriched = shifts.map(shift => ({
        ...shift,
        responsibleUserName: employeeMap.get(shift.responsibleUserId)?.name || shift.responsibleUserId,
        managerName: employeeMap.get(shift.managerId)?.name || shift.managerId
      }))

      res.json({ items: enriched, count: enriched.length })
    } catch (e: any) {
      res.status(500).json({ error: String(e?.message || e) })
    }
  })

  // POST /iiko/import/shifts - импорт смен из чеков iiko
  router.post('/import/shifts', async (req, res) => {
    try {
      const prisma = (req as any).prisma || req.app.get('prisma')
      if (!prisma) return res.status(503).json({ error: 'prisma not available' })

      const { fromDate, toDate, mergeByDay = true } = req.body
      console.log('📥 Import shifts request:', { fromDate, toDate, mergeByDay })
      
      if (!fromDate || !toDate) {
        return res.status(400).json({ error: 'fromDate and toDate required (YYYY-MM-DD)' })
      }

      // 1. УДАЛЯЕМ старые смены за период
      const from = new Date(fromDate)
      const to = new Date(toDate)
      to.setDate(to.getDate() + 1) // Включаем toDate
      
      console.log('🗑️  ШАГ 1: Удаляем старые смены за период:', fromDate, '-', toDate)
      // Удаляем смены по openAt (так же как группируем в P&L)
      // Важно: группируем по дате открытия, т.к. смена может закрыться после полуночи
      const shiftsToDelete = await prisma.shift.findMany({
        where: {
          openAt: {
            gte: from,
            lt: to
          }
        },
        select: { id: true }
      })
      
      const shiftIds = shiftsToDelete.map((s: any) => s.id)
      if (shiftIds.length > 0) {
        console.log(`   Найдено смен для удаления: ${shiftIds.length}`)
        await prisma.shiftSale.deleteMany({ where: { shiftId: { in: shiftIds } } })
        await prisma.shift.deleteMany({ where: { id: { in: shiftIds } } })
        console.log(`✅ Удалено ${shiftIds.length} смен и их продаж`)
      } else {
        console.log('   Смен для удаления не найдено')
      }

      // 2. ПРОВЕРЯЕМ что удалились
      console.log('🔍 ШАГ 2: Проверяем что смены удалились...')
      const remainingShifts = await prisma.shift.count({
        where: {
          openAt: {
            gte: from,
            lt: to
          }
        }
      })
      
      if (remainingShifts > 0) {
        console.error(`❌ ОШИБКА: Осталось ${remainingShifts} смен после удаления!`)
        return res.status(500).json({ 
          error: 'Failed to delete all shifts', 
          remaining: remainingShifts 
        })
      }
      
      console.log('✅ Все смены успешно удалены, можно импортировать')

      // 3. ИМПОРТИРУЕМ заново
      console.log('📥 ШАГ 3: Импортируем смены из iiko...')
      const { exec } = await import('child_process')
      const { promisify } = await import('util')
      const execAsync = promisify(exec)

      const mode = mergeByDay ? 'merge' : 'separate'
      const cmd = `npx tsx scripts/import-shifts-from-iiko.ts "${fromDate}" "${toDate}" "${mode}"`
      console.log('🔧 Запускаем команду:', cmd)
      
      const { stdout, stderr } = await execAsync(cmd, { cwd: process.cwd() })
      
      console.log('✅ Импорт завершён')

      res.json({ 
        ok: true, 
        deleted: shiftIds.length,
        output: stdout,
        errors: stderr || undefined
      })
    } catch (e: any) {
      res.status(500).json({ error: String(e?.message || e) })
    }
  })

  // GET /iiko/local/sales/all?from=YYYY-MM-DD&to=YYYY-MM-DD - общая статистика по всем блюдам
  router.get('/local/sales/all', async (req, res) => {
    const prisma = (req as any).prisma || req.app.get('prisma')
    if (!prisma) return res.status(503).json({ error: 'prisma not available' })
    
    const from = req.query.from ? String(req.query.from) : null
    const to = req.query.to ? String(req.query.to) : null
    
    if (!from || !to) {
      return res.status(400).json({ error: 'from and to dates required (YYYY-MM-DD)' })
    }
    
    try {
      const start = new Date(from)
      const end = new Date(to)
      end.setDate(end.getDate() + 1) // Включаем последний день
      
      const items = await prisma.iikoReceiptItem.findMany({
        where: {
          receipt: {
            date: { gte: start, lt: end },
            AND: [
              {
                OR: [
                  { isDeleted: false },
                  { isDeleted: null }
                ]
              },
              {
                OR: [
                  { isReturn: false },
                  { isReturn: null }
                ]
              }
            ]
          }
        },
        select: {
          qty: true,
          net: true,
          cost: true,
          receipt: {
            select: {
              date: true
            }
          }
        },
        orderBy: {
          receipt: {
            date: 'asc'
          }
        }
      })
      
      // Группируем по дням
      const byDay = new Map<string, { date: string; qty: number; revenue: number; cost: number }>()
      
      items.forEach((item: any) => {
        const d = new Date(item.receipt.date)
        const ymd = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())).toISOString().slice(0, 10)
        
        const existing = byDay.get(ymd) || { date: ymd, qty: 0, revenue: 0, cost: 0 }
        existing.qty += item.qty || 0
        existing.revenue += item.net || 0
        existing.cost += item.cost || 0
        
        byDay.set(ymd, existing)
      })
      
      const daily = Array.from(byDay.values()).sort((a, b) => a.date.localeCompare(b.date))
      
      res.json({ from, to, daily })
    } catch (e: any) {
      console.error('Error in /local/sales/all:', e)
      res.status(500).json({ error: String(e?.message || e) })
    }
  })

  return router
}

function safeParseArray(s?: string | null): string[] {
  if (!s) return []
  try {
    const j = JSON.parse(s)
    return Array.isArray(j) ? j.map(x => String(x)) : []
  } catch { return [] }
}


