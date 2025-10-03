import { Router } from 'express'

export function createIikoReportsRouter(client: any) {
  const router = Router()

  router.get('/olap/columns', async (req, res) => {
    try {
      const reportType = String(req.query.reportType || 'SALES').toUpperCase() as any
      const j = await client.getOlapColumns(reportType)
      res.json(j)
    } catch (e: any) {
      res.status(500).json({ error: String(e?.message || e) })
    }
  })

  router.post('/olap', async (req, res) => {
    try {
      const body = req.body || {}
      const j = await client.postOlap(body)
      res.json(j)
    } catch (e: any) {
      res.status(500).json({ error: String(e?.message || e) })
    }
  })

  return router
}


