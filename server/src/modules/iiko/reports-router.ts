import { Router, Request, Response } from 'express'
import { asyncHandler } from '../../utils/common-middleware'

export function createIikoReportsRouter(client: any) {
  const router = Router()

  router.get('/olap/columns', asyncHandler(async (req: Request, res: Response) => {
    const reportType = String(req.query.reportType || 'SALES').toUpperCase() as any
    const j = await client.getOlapColumns(reportType)
    res.json(j)
  }))

  router.post('/olap', asyncHandler(async (req: Request, res: Response) => {
    const body = req.body || {}
    const j = await client.postOlap(body)
    res.json(j)
  }))

  return router
}

