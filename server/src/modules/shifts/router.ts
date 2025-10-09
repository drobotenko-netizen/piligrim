import { Router, Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { getTenant } from '../../utils/tenant'
import { requireRole, getUserId } from '../../utils/auth'
import { asyncHandler, validateId, validateDateRange } from '../../utils/common-middleware'

export function createShiftsRouter(prisma: PrismaClient) {
  const router = Router()

  // GET / - список смен с детализацией из iiko чеков
  router.get('/', validateDateRange(false), asyncHandler(async (req: any, res: Response) => {
    const tenant = await getTenant(prisma, req as any)
    const { from, to } = req.query
    const where: any = { tenantId: tenant.id }
    
    if (from || to) {
      where.openAt = {}
      if (from) where.openAt.gte = new Date(String(from))
      if (to) where.openAt.lt = new Date(String(to))
    }

    const shifts = await prisma.shift.findMany({
      where,
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

    console.log(`📊 Found ${shifts.length} shifts in DB`)
    
    // Обогащаем данные статистикой из iiko чеков
    const items = await Promise.all(shifts.map(async (shift) => {
      const shiftDate = shift.openAt
      const dayStart = new Date(shiftDate.getFullYear(), shiftDate.getMonth(), shiftDate.getDate())
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000)
      
      let receipts = []
      
      if (shift.iikoSessionNum) {
        // Фильтруем чеки по номеру смены
        receipts = await prisma.iikoReceipt.findMany({
          where: {
            sessionNumber: shift.iikoSessionNum
          }
        })
      } else {
        // Fallback: фильтруем по дате (для старых смен без номера)
        receipts = await prisma.iikoReceipt.findMany({
          where: {
            date: { gte: dayStart, lt: dayEnd }
          }
        })
      }
      
      // Удаления относим к смене с максимальной выручкой за день
      let deletedReceipts: any[] = []
      
      // Находим все смены этого дня
      const dayShifts = await prisma.shift.findMany({
        where: {
          tenantId: shift.tenantId,
          openAt: { gte: dayStart, lt: dayEnd }
        },
        include: {
          sales: true
        }
      })
      
      // Вычисляем выручку каждой смены
      const shiftsRevenue = dayShifts.map(s => ({
        id: s.id,
        sessionNum: s.iikoSessionNum,
        revenue: s.sales.reduce((sum, sale) => sum + (sale.grossAmount - sale.discounts - sale.refunds), 0)
      }))
      
      // Смена с максимальной выручкой
      const maxRevenueShift = shiftsRevenue.sort((a, b) => b.revenue - a.revenue)[0]
      
      // Только для смены с макс выручкой показываем удаления
      if (maxRevenueShift && maxRevenueShift.id === shift.id) {
        deletedReceipts = await prisma.iikoReceipt.findMany({
          where: {
            date: { gte: dayStart, lt: dayEnd },
            isDeleted: true
          }
        })
      }

      // Статистика по чекам
      const receiptsTotal = receipts.filter(r => !r.isDeleted).length
      const receiptsReturns = receipts.filter(r => r.isReturn && !r.isDeleted).length
      const receiptsDeleted = deletedReceipts.length
      
      const receiptsRevenue = receipts
        .filter(r => !r.isDeleted)
        .reduce((sum, r) => sum + (r.net || 0), 0)
      
      const receiptsReturnsSum = receipts
        .filter(r => r.isReturn && !r.isDeleted)
        .reduce((sum, r) => sum + Math.abs(r.returnSum || 0), 0)
      
      const receiptsDeletedSum = deletedReceipts.reduce((sum, r) => sum + (r.net || 0), 0)

      return {
        ...shift,
        receipts: {
          total: receiptsTotal,
          returns: receiptsReturns,
          deleted: receiptsDeleted,
          revenue: receiptsRevenue,
          returnsSum: receiptsReturnsSum,
          deletedSum: receiptsDeletedSum
        }
      }
    }))

    res.json({ items })
  }))

  // POST / - создать смену
  router.post('/', requireRole(['ADMIN', 'ACCOUNTANT']), asyncHandler(async (req: Request, res: Response) => {
    const schema = z.object({
      openAt: z.string(),
      closeAt: z.string().optional(),
      iikoSessionNum: z.number().optional(),
      sales: z.array(z.object({
        channelId: z.string().optional(),
        tenderTypeId: z.string().optional(),
        grossAmount: z.number(),
        discounts: z.number().default(0),
        refunds: z.number().default(0)
      })).optional()
    })
    
    const parsed = schema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ 
        error: 'bad request', 
        details: parsed.error.flatten() 
      })
    }
    
    const { openAt, closeAt, iikoSessionNum, sales } = parsed.data
    const tenant = await getTenant(prisma, req as any)
    const userId = getUserId(req as any)
    
    const created = await prisma.shift.create({
      data: {
        tenantId: tenant.id,
        openAt: new Date(openAt),
        closeAt: closeAt ? new Date(closeAt) : null,
        iikoSessionNum: iikoSessionNum || null
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
    
    // Создаём связанные sales отдельно
    if (sales && sales.length > 0) {
      await Promise.all(sales.map(s => {
        const saleData: any = {
          shiftId: created.id,
          tenantId: tenant.id,
          grossAmount: s.grossAmount,
          discounts: s.discounts,
          refunds: s.refunds
        }
        if (s.channelId) saleData.channelId = s.channelId
        if (s.tenderTypeId) saleData.tenderTypeId = s.tenderTypeId
        
        return prisma.shiftSale.create({ data: saleData })
      }))
    }
    
    res.json({ data: created })
  }))

  // PATCH /:id - обновить смену
  router.patch('/:id', validateId(), requireRole(['ADMIN', 'ACCOUNTANT']), asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id
    const schema = z.object({
      openAt: z.string().optional(),
      closeAt: z.string().optional(),
      iikoSessionNum: z.number().optional()
    })
    
    const parsed = schema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ 
        error: 'bad request', 
        details: parsed.error.flatten() 
      })
    }
    
    const data: any = {}
    if (parsed.data.openAt) data.openAt = new Date(parsed.data.openAt)
    if (parsed.data.closeAt) data.closeAt = new Date(parsed.data.closeAt)
    if (parsed.data.iikoSessionNum !== undefined) {
      data.iikoSessionNum = parsed.data.iikoSessionNum
    }
    
    const updated = await prisma.shift.update({
      where: { id },
      data,
      include: {
        sales: {
          include: {
            channel: true,
            tenderType: true
          }
        }
      }
    })
    
    res.json({ data: updated })
  }))

  // DELETE /:id - удалить смену
  router.delete('/:id', validateId(), requireRole(['ADMIN']), asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id
    
    // Сначала удаляем связанные продажи
    await prisma.shiftSale.deleteMany({
      where: { shiftId: id }
    })
    
    // Затем саму смену
    await prisma.shift.delete({
      where: { id }
    })
    
    res.json({ ok: true })
  }))

  // POST /import-from-iiko - импорт смен из iiko
  router.post('/import-from-iiko', requireRole(['ADMIN']), asyncHandler(async (req: Request, res: Response) => {
    const schema = z.object({
      from: z.string(),
      to: z.string()
    })
    
    const parsed = schema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ 
        error: 'bad request', 
        details: parsed.error.flatten() 
      })
    }
    
    // TODO: Реализовать логику импорта из iiko API
    // Пока заглушка
    res.json({ 
      message: 'Import from iiko not yet implemented', 
      requested: parsed.data 
    })
  }))

  return router
}
