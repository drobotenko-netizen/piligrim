import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { getTenant } from '../../utils/tenant'
import { requireRole, getUserId } from '../../utils/auth'

export function createShiftsRouter(prisma: PrismaClient) {
  const router = Router()

  // GET /api/shifts - список смен
  router.get('/', async (req, res) => {
    try {
      const tenant = await getTenant(prisma, req as any)
      const { from, to } = req.query
      const where: any = { tenantId: tenant.id }
      
      if (from || to) {
        where.openAt = {}
        if (from) where.openAt.gte = new Date(String(from))
        if (to) where.openAt.lt = new Date(String(to))
      }

      const items = await prisma.shift.findMany({
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

      res.json({ items })
    } catch (e: any) {
      res.status(500).json({ error: String(e?.message || e) })
    }
  })

  // GET /api/shifts/:id - детали смены
  router.get('/:id', async (req, res) => {
    try {
      const item = await prisma.shift.findUnique({
        where: { id: req.params.id },
        include: {
          sales: {
            include: {
              channel: true,
              tenderType: true
            }
          }
        }
      })

      if (!item) {
        return res.status(404).json({ error: 'not_found' })
      }

      res.json({ data: item })
    } catch (e: any) {
      res.status(500).json({ error: String(e?.message || e) })
    }
  })

  // POST /api/shifts - открыть смену
  router.post('/', requireRole(['ADMIN', 'MANAGER']), async (req, res) => {
    try {
      const schema = z.object({
        openAt: z.string().min(1),
        openedBy: z.string().optional(),
        note: z.string().optional()
      })
      const parsed = schema.safeParse(req.body)
      if (!parsed.success) {
        return res.status(400).json({ error: 'bad request', details: parsed.error.flatten() })
      }

      const tenant = await getTenant(prisma, req as any)
      const userId = getUserId(req as any)

      const created = await prisma.shift.create({
        data: {
          tenantId: tenant.id,
          openAt: new Date(parsed.data.openAt),
          openedBy: parsed.data.openedBy || userId,
          note: parsed.data.note
        }
      })

      res.json({ data: created })
    } catch (e: any) {
      res.status(500).json({ error: String(e?.message || e) })
    }
  })

  // PATCH /api/shifts/:id/close - закрыть смену с продажами
  router.patch('/:id/close', requireRole(['ADMIN', 'MANAGER']), async (req, res) => {
    try {
      const schema = z.object({
        closeAt: z.string().min(1),
        closedBy: z.string().optional(),
        note: z.string().optional(),
        sales: z.array(z.object({
          channelId: z.string().min(1),
          tenderTypeId: z.string().min(1),
          grossAmount: z.number(),
          discounts: z.number().optional(),
          refunds: z.number().optional()
        }))
      })
      const parsed = schema.safeParse(req.body)
      if (!parsed.success) {
        return res.status(400).json({ error: 'bad request', details: parsed.error.flatten() })
      }

      const userId = getUserId(req as any)

      // Обновляем смену и создаем продажи в транзакции
      const result = await prisma.$transaction(async (tx) => {
        // Закрываем смену
        const shift = await tx.shift.update({
          where: { id: req.params.id },
          data: {
            closeAt: new Date(parsed.data.closeAt),
            closedBy: parsed.data.closedBy || userId,
            note: parsed.data.note
          }
        })

        // Создаем продажи
        const sales = await Promise.all(
          parsed.data.sales.map(sale =>
            tx.shiftSale.create({
              data: {
                shiftId: shift.id,
                channelId: sale.channelId,
                tenderTypeId: sale.tenderTypeId,
                grossAmount: Math.round(sale.grossAmount * 100), // в копейки
                discounts: Math.round((sale.discounts || 0) * 100),
                refunds: Math.round((sale.refunds || 0) * 100)
              }
            })
          )
        )

        return { shift, sales }
      })

      res.json({ data: result })
    } catch (e: any) {
      res.status(500).json({ error: String(e?.message || e) })
    }
  })

  return router
}

