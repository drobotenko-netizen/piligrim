import { Router, Request, Response } from 'express'
import { IikoClient } from './client'
import { asyncHandler } from '../../utils/common-middleware'

/**
 * Sales summary endpoints - данные сводки продаж из iiko API
 */
export function createIikoSummaryRouter(client: IikoClient) {
  const router = Router()

  // GET /summary?date=YYYY-MM-DD
  router.get('/summary', asyncHandler(async (req: Request, res: Response) => {
    const date = String(req.query.date || '').trim()
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'date=YYYY-MM-DD required' })
    }
    const summary = await client.salesSummary(date)
    res.json({ date, ...summary })
  }))

  // GET /revenue?year=YYYY&month=MM
  router.get('/revenue', asyncHandler(async (req: Request, res: Response) => {
    const year = Number(req.query.year)
    const month = Number(req.query.month)
    if (!year || !month || month < 1 || month > 12) {
      return res.status(400).json({ error: 'year=YYYY&month=MM required' })
    }
    const revenue = await client.salesRevenueByDay(year, month)
    res.json({ year, month, revenue })
  }))

  // GET /returns/month?year=YYYY&month=MM
  router.get('/returns/month', asyncHandler(async (req: Request, res: Response) => {
    const year = Number(req.query.year)
    const month = Number(req.query.month)
    if (!year || !month || month < 1 || month > 12) {
      return res.status(400).json({ error: 'year=YYYY&month=MM required' })
    }
    const returns = await client.salesReturnsByDay(year, month)
    res.json({ year, month, revenue: returns })
  }))

  // GET /deleted/month?year=YYYY&month=MM
  router.get('/deleted/month', asyncHandler(async (req: Request, res: Response) => {
    const year = Number(req.query.year)
    const month = Number(req.query.month)
    if (!year || !month || month < 1 || month > 12) {
      return res.status(400).json({ error: 'year=YYYY&month=MM required' })
    }
    const deleted = await client.salesDeletedByDay(year, month)
    res.json({ year, month, revenue: deleted })
  }))

  // GET /total/month?year=YYYY&month=MM
  router.get('/total/month', asyncHandler(async (req: Request, res: Response) => {
    const year = Number(req.query.year)
    const month = Number(req.query.month)
    if (!year || !month || month < 1 || month > 12) {
      return res.status(400).json({ error: 'year=YYYY&month=MM required' })
    }
    const total = await client.salesTotalByDay(year, month)
    res.json({ year, month, revenue: total })
  }))

  // GET /hours?date=YYYY-MM-DD
  router.get('/hours', asyncHandler(async (req: Request, res: Response) => {
    const date = String(req.query.date || '').trim()
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'date=YYYY-MM-DD required' })
    }
    const rows = await client.salesByHour(date)
    res.json({ date, rows })
  }))

  // GET /paytypes?date=YYYY-MM-DD
  router.get('/paytypes', asyncHandler(async (req: Request, res: Response) => {
    const date = String(req.query.date || '').trim()
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'date=YYYY-MM-DD required' })
    }
    const rows = await client.salesByPaytype(date)
    res.json({ date, rows })
  }))

  // GET /waiters (список официантов)
  router.get('/waiters', asyncHandler(async (_req: Request, res: Response) => {
    // Получаем список официантов из sales by waiter
    const waitersData = await client.salesByWaiter('2025-01-01') // TODO: использовать актуальную дату
    res.json({ waiters: waitersData })
  }))

  return router
}

