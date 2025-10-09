import { Router, Request, Response } from 'express'
import { asyncHandler } from '../../utils/common-middleware'
import { importReceiptsForDate, importReceiptsRange } from './etl/receipts'
import { IikoClient } from './client'

/**
 * ETL endpoints - импорт и обработка данных
 */
export function createIikoEtlRouter() {
  const router = Router()
  const client = new IikoClient()

  // POST /receipts - Импорт чеков из iiko
  router.post('/receipts', asyncHandler(async (req: Request, res: Response) => {
    const prisma = (req as any).prisma || (req as any).app.get('prisma')
    if (!prisma) {
      return res.status(503).json({ error: 'prisma not available' })
    }

    const { date, from, to } = req.body || {}
    
    if (date) {
      // Single date import
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ error: 'date must be YYYY-MM-DD' })
      }
      const result = await importReceiptsForDate(prisma, client, date)
      return res.json(result)
    }
    
    if (from && to) {
      // Range import
      if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
        return res.status(400).json({ error: 'from and to must be YYYY-MM-DD' })
      }
      const result = await importReceiptsRange(prisma, client, from, to)
      return res.json(result)
    }
    
    return res.status(400).json({ 
      error: 'either date or from+to required',
      example: { date: '2025-01-01' }
    })
  }))

  return router
}

