import { Router } from 'express'

function safeParseArray(s?: string | null): string[] {
  if (!s) return []
  try {
    const j = JSON.parse(s)
    return Array.isArray(j) ? j.map(x => String(x)) : []
  } catch { return [] }
}

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

export function createIikoLocalRouter(deps: { buildDayRangeIso: (d: string) => { from: string; to: string } }) {
  const router = Router()

  router.get('/sales/hours/matrix', async (req, res) => {
    const from = String(req.query.from || '').trim()
    const to = String(req.query.to || '').trim()
    if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
      return res.status(400).json({ error: 'from/to must be YYYY-MM-DD' })
    }
    try {
      const prisma = (req as any).prisma || req.app.get('prisma')
      if (!prisma) return res.status(503).json({ error: 'prisma not available' })
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
      const receipts = await prisma.iikoReceipt.findMany({
        where: {
          date: { gte: min, lt: new Date(max.getTime() + 1) },
          AND: [
            { OR: [{ isReturn: false }, { isReturn: null }] },
            { OR: [{ isDeleted: false }, { isDeleted: null }] }
          ]
        },
        select: { date: true, net: true, openTime: true, closeTime: true }
      })
      for (const r of receipts) {
        const ts: Date = (r as any).openTime || (r as any).closeTime || r.date
        const d = new Date(ts)
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
      res.json({ from, to, cols, hours: HOURS, count, net, countW, netW })
    } catch (e: any) {
      res.status(500).json({ error: String(e?.message || e) })
    }
  })

  // Monthly revenue (actual, excludes returns/deleted)
  router.get('/sales/revenue/month', async (req, res) => {
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
            { OR: [{ isReturn: false }, { isReturn: null }] },
            { OR: [{ isDeleted: false }, { isDeleted: null }] }
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
        e.gross += Number(r.net || 0)
        e.count += 1
        byDay.set(ymd, e)
      }
      const revenue = Array.from(byDay.values()).sort((a, b) => a.date.localeCompare(b.date))
      res.json({ year, month, revenue })
    } catch (e: any) {
      res.status(500).json({ error: String(e?.message || e) })
    }
  })

  // Monthly returns
  router.get('/sales/returns/month', async (req, res) => {
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
        where: { date: { gte: start, lt: end }, isReturn: true },
        select: { date: true, returnSum: true }
      })
      const byDay = new Map<string, any>()
      for (const r of receipts) {
        const d = new Date(r.date)
        const ymd = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())).toISOString().slice(0, 10)
        const e = byDay.get(ymd) || { date: ymd, net: 0, gross: 0, discount: 0, count: 0 }
        e.net += Number(r.returnSum || 0)
        e.gross += Number(r.returnSum || 0)
        e.count += 1
        byDay.set(ymd, e)
      }
      const revenue = Array.from(byDay.values()).sort((a, b) => a.date.localeCompare(b.date))
      res.json({ year, month, revenue })
    } catch (e: any) {
      res.status(500).json({ error: String(e?.message || e) })
    }
  })

  // Monthly deleted
  router.get('/sales/deleted/month', async (req, res) => {
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
        where: { date: { gte: start, lt: end }, isDeleted: true },
        select: { date: true, net: true }
      })
      const byDay = new Map<string, any>()
      for (const r of receipts) {
        const d = new Date(r.date)
        const ymd = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())).toISOString().slice(0, 10)
        const e = byDay.get(ymd) || { date: ymd, net: 0, gross: 0, discount: 0, count: 0 }
        e.net += Number(r.net || 0)
        e.gross += Number(r.net || 0)
        e.count += 1
        byDay.set(ymd, e)
      }
      const revenue = Array.from(byDay.values()).sort((a, b) => a.date.localeCompare(b.date))
      res.json({ year, month, revenue })
    } catch (e: any) {
      res.status(500).json({ error: String(e?.message || e) })
    }
  })

  // Monthly total (revenue + returns + deleted)
  router.get('/sales/total/month', async (req, res) => {
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
        select: { date: true, net: true, isReturn: true, returnSum: true, orderDeleted: true }
      })
      const byDay = new Map<string, any>()
      for (const r of receipts) {
        const d = new Date(r.date)
        const ymd = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())).toISOString().slice(0, 10)
        const e = byDay.get(ymd) || { date: ymd, net: 0, gross: 0, discount: 0, count: 0 }
        if (r.isReturn) e.net += Number(r.returnSum || 0); else e.net += Number(r.net || 0)
        e.gross += Number(r.net || 0)
        e.count += 1
        byDay.set(ymd, e)
      }
      const revenue = Array.from(byDay.values()).sort((a, b) => a.date.localeCompare(b.date))
      res.json({ year, month, revenue })
    } catch (e: any) {
      res.status(500).json({ error: String(e?.message || e) })
    }
  })

  // Available months (from local receipts)
  router.get('/sales/available-months', async (req, res) => {
    const prisma = (req as any).prisma || req.app.get('prisma')
    if (!prisma) return res.status(503).json({ error: 'prisma not available' })
    try {
      const receipts = await prisma.iikoReceipt.findMany({ select: { date: true }, orderBy: { date: 'desc' } })
      const months = new Set<string>()
      for (const r of receipts) {
        const d = new Date(r.date)
        const y = d.getUTCFullYear()
        const m = d.getUTCMonth() + 1
        months.add(`${y}-${String(m).padStart(2, '0')}`)
      }
      res.json({ months: Array.from(months).sort().reverse() })
    } catch (e: any) {
      res.status(500).json({ error: String(e?.message || e) })
    }
  })

  // Import status by year
  router.get('/import/status', async (req, res) => {
    const prisma = (req as any).prisma || req.app.get('prisma')
    if (!prisma) return res.status(503).json({ error: 'prisma not available' })
    const year = Number(String(req.query.year || ''))
    if (!Number.isInteger(year) || year < 2000 || year > 2100) return res.status(400).json({ error: 'year invalid' })
    try {
      const months = [] as Array<{ month: number; loaded: boolean; receipts: number }>
      for (let m = 1; m <= 12; m++) {
        const start = new Date(Date.UTC(year, m - 1, 1, 0, 0, 0, 0))
        const end = new Date(Date.UTC(year, m, 1, 0, 0, 0, 0))
        const rows = await prisma.iikoReceipt.findMany({ where: { date: { gte: start, lt: end } }, select: { id: true } })
        const receipts = rows.length
        const loaded = receipts > 0
        months.push({ month: m, loaded, receipts })
      }
      res.json({ year, months })
    } catch (e: any) {
      res.status(500).json({ error: String(e?.message || e) })
    }
  })

  return router
}


