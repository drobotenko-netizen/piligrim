import { Router, Request, Response } from 'express'
import { asyncHandler } from '../../utils/common-middleware'

/**
 * Import endpoints - импорт смен и других данных
 */
export function createIikoImportRouter(client: any) {
  const router = Router()

  // POST /shifts - Импорт смен из iiko
  router.post('/shifts', asyncHandler(async (req: Request, res: Response) => {
    const prisma = (req as any).prisma || (req as any).app.get('prisma')
    if (!prisma) {
      return res.status(503).json({ error: 'prisma not available' })
    }

    const { from, to } = req.body || {}
    
    if (!from || !to) {
      return res.status(400).json({ 
        error: 'from and to required',
        example: { from: '2025-01-01', to: '2025-01-31' }
      })
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
      return res.status(400).json({ error: 'from and to must be YYYY-MM-DD' })
    }

    // Получаем смены из iiko API
    const shifts = await client.getCashShifts(from, to)
    
    if (!shifts || !Array.isArray(shifts)) {
      return res.status(500).json({ error: 'failed to fetch shifts from iiko' })
    }

    // Импортируем в БД
    let imported = 0
    let skipped = 0
    
    for (const shift of shifts) {
      const existing = await prisma.iikoShift.findFirst({
        where: { 
          iikoId: shift.id || shift.iikoId,
          openDate: new Date(shift.openDate)
        }
      })

      if (existing) {
        skipped++
        continue
      }

      await prisma.iikoShift.create({
        data: {
          iikoId: shift.id || shift.iikoId,
          number: shift.number,
          openDate: new Date(shift.openDate),
          closeDate: shift.closeDate ? new Date(shift.closeDate) : null,
          status: shift.status || 'CLOSED',
          cashierName: shift.cashier || shift.cashierName,
          terminalName: shift.terminal || shift.terminalName,
          revenue: shift.revenue || 0,
          rawData: JSON.stringify(shift)
        }
      })
      
      imported++
    }

    res.json({ 
      success: true,
      imported,
      skipped,
      total: shifts.length
    })
  }))

  return router
}

