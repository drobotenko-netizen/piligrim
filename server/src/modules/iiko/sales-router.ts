import { Router } from 'express'

export function createIikoSalesRouter(client: any) {
  const router = Router()

  router.get('/summary', async (req, res) => {
    const date = String(req.query.date || '').trim()
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: 'date=YYYY-MM-DD required' })
    try {
      const summary = await client.salesSummary(date)
      res.json({ date, ...summary })
    } catch (e: any) {
      res.status(500).json({ error: String(e?.message || e) })
    }
  })

  router.get('/revenue', async (req, res) => {
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

  router.get('/hours', async (req, res) => {
    const date = String(req.query.date || '').trim()
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: 'date=YYYY-MM-DD required' })
    try {
      const rows = await client.salesByHour(date)
      res.json({ date, rows })
    } catch (e: any) {
      res.status(500).json({ error: String(e?.message || e) })
    }
  })

  router.get('/paytypes', async (req, res) => {
    const date = String(req.query.date || '').trim()
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: 'date=YYYY-MM-DD required' })
    try {
      const rows = await client.salesByPaytype(date)
      res.json({ date, rows })
    } catch (e: any) {
      res.status(500).json({ error: String(e?.message || e) })
    }
  })

  router.get('/receipts', async (req, res) => {
    const date = String(req.query.date || '').trim()
    if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(date)) return res.status(400).json({ error: 'date=YYYY-MM-DD required' })
    try {
      const data = await client.getSalesReceipts(date, req.query)
      res.json(data)
    } catch (e: any) {
      res.status(500).json({ error: String(e?.message || e) })
    }
  })

  return router
}


