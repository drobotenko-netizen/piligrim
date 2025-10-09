import { Router, Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { getTenant } from '../../utils/tenant'
import { requireRole, getUserId } from '../../utils/auth'
import { asyncHandler } from '../../utils/common-middleware'
import { PaymentAllocationService } from '../../services/payment-allocation.service'
import { GsheetsPaymentImporter } from '../../services/gsheets-payment-importer'

export function createPaymentsRouter(prisma: PrismaClient) {
  const router = Router()

  // GET /api/payments - список платежей
  router.get('/', async (req, res) => {
    try {
      const tenant = await getTenant(prisma, req as any)
      const { from, to, accountId, counterpartyId } = req.query as any
      const counterpartyType = String((req.query as any).type || (req.query as any).counterpartyType || '').trim()
      
      const where: any = { tenantId: tenant.id }
      if (accountId) where.accountId = String(accountId)
      
      if (from || to) {
        where.date = {}
        if (from) (where.date as any).gte = new Date(String(from))
        if (to) (where.date as any).lt = new Date(String(to))
      }

      // Фильтрация по контрагенту (поставщику)
      if (counterpartyId) {
        where.OR = [
          // Прямые платежи поставщику
          { 
            expenseDoc: { 
              vendorId: String(counterpartyId) 
            } 
          },
          // Платежи через аллокации
          {
            allocations: {
              some: {
                expenseDoc: {
                  vendorId: String(counterpartyId)
                }
              }
            }
          }
        ]
      } else if (counterpartyType) {
        // Фильтрация по типу контрагента для агрегата "Все"
        where.OR = [
          { expenseDoc: { vendor: { kind: counterpartyType } } },
          { allocations: { some: { expenseDoc: { vendor: { kind: counterpartyType } } } } }
        ]
      }

      const items = await prisma.payment.findMany({
        where,
        include: {
          account: true,
          expenseDoc: {
            include: {
              vendor: true,
              category: true
            }
          },
          allocations: {
            include: {
              expenseDoc: {
                include: {
                  vendor: true
                }
              }
            }
          }
        },
        orderBy: { date: 'desc' }
      })

      // Если запрашивается анализ поставщика, возвращаем данные в специальном формате
      if (counterpartyId) {
        const payments = items.map(item => ({
          id: item.id,
          date: item.date.toISOString().slice(0, 10),
          amount: item.amount,
          description: (item as any).description ?? item.memo ?? null,
          vendor: item.expenseDoc?.vendor?.name || 'Неизвестный поставщик'
        }))
        
        res.json({ payments })
      } else {
        res.json({ items })
      }
    } catch (e: any) {
      res.status(500).json({ error: String(e?.message || e) })
    }
  })

  // POST /api/payments - создать платёж с распределением
  router.post('/', requireRole(['ADMIN', 'ACCOUNTANT']), asyncHandler(async (req: Request, res: Response) => {
    const schema = z.object({
      expenseDocId: z.string().optional(),
      accountId: z.string().min(1),
      date: z.string().min(1),
      amount: z.number(),
      activity: z.enum(['operating', 'investing', 'financing']).optional(),
      memo: z.string().optional(),
      allocations: z.array(z.object({
        expenseDocId: z.string(),
        amount: z.number()
      })).optional()
    })
    
    const parsed = schema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'bad request', details: parsed.error.flatten() })
    }

    const tenant = await getTenant(prisma, req as any)
    const userId = getUserId(req as any)

    // Используем сервис для создания платежа с allocations
    const service = new PaymentAllocationService(prisma)
    const result = await service.createPaymentWithAllocations(
      parsed.data,
      tenant.id,
      userId
    )

    res.json({ data: result })
  }))

  // DELETE /api/payments/:id - отменить платёж (с пересчётом paid_amount)
  router.delete('/:id', requireRole(['ADMIN', 'ACCOUNTANT']), asyncHandler(async (req: Request, res: Response) => {
    const userId = getUserId(req as any)

    // Используем сервис для удаления платежа
    const service = new PaymentAllocationService(prisma)
    await service.deletePayment(req.params.id, userId)

    res.json({ ok: true })
  }))

  // POST /api/payments/load-from-gsheets - импорт из Google Sheets в ExpenseDoc + Payment
  router.post('/load-from-gsheets', requireRole(['ADMIN']), asyncHandler(async (req: Request, res: Response) => {
    const { spreadsheetId, gid } = req.body || {}
    if (!spreadsheetId) {
      return res.status(400).json({ error: 'spreadsheetId required' })
    }
    
    const tenant = await getTenant(prisma, req as any)
    const userId = getUserId(req as any) || 'system'

    // Используем сервис для импорта платежей из GSheets
    const importer = new GsheetsPaymentImporter(prisma)
    const result = await importer.importPayments(
      spreadsheetId,
      tenant.id,
      userId,
      gid as any
    )

    res.json({
      createdDocs: result.createdDocs,
      createdPayments: result.createdPayments,
      createdTransfers: result.createdTransfers,
      skipped: result.skipped
    })
  }))

  return router
}

