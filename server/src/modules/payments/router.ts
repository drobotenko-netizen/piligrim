import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { getTenant } from '../../utils/tenant'
import { requireRole, getUserId } from '../../utils/auth'

export function createPaymentsRouter(prisma: PrismaClient) {
  const router = Router()

  // GET /api/payments - список платежей
  router.get('/', async (req, res) => {
    try {
      const tenant = await getTenant(prisma, req as any)
      const { from, to, accountId } = req.query
      
      const where: any = { tenantId: tenant.id }
      if (accountId) where.accountId = String(accountId)
      
      if (from || to) {
        where.date = {}
        if (from) where.date.gte = new Date(String(from))
        if (to) where.date.lt = new Date(String(to))
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

      res.json({ items })
    } catch (e: any) {
      res.status(500).json({ error: String(e?.message || e) })
    }
  })

  // POST /api/payments - создать платёж с распределением
  router.post('/', requireRole(['ADMIN', 'ACCOUNTANT']), async (req, res) => {
    try {
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

      const paymentAmount = Math.round(parsed.data.amount * 100) // в копейки

      // Валидация: сумма allocations не должна превышать сумму платежа
      if (parsed.data.allocations) {
        const totalAllocated = parsed.data.allocations.reduce(
          (sum, a) => sum + Math.round(a.amount * 100), 
          0
        )
        if (totalAllocated > paymentAmount) {
          return res.status(400).json({ 
            error: 'invalid_allocations', 
            message: 'Сумма распределения превышает сумму платежа' 
          })
        }
      }

      // Создаём платёж и распределения в транзакции
      const result = await prisma.$transaction(async (tx) => {
        // Создаем платёж
        const payment = await tx.payment.create({
          data: {
            tenantId: tenant.id,
            expenseDocId: parsed.data.expenseDocId || null,
            accountId: parsed.data.accountId,
            date: new Date(parsed.data.date),
            amount: paymentAmount,
            activity: parsed.data.activity || null,
            memo: parsed.data.memo,
            createdBy: userId
          }
        })

        // Создаём распределения и обновляем документы
        const allocations = []
        if (parsed.data.allocations) {
          for (const alloc of parsed.data.allocations) {
            const allocAmount = Math.round(alloc.amount * 100)
            
            // Проверяем, что сумма не превышает остаток документа
            const doc = await tx.expenseDoc.findUnique({
              where: { id: alloc.expenseDocId }
            })
            
            if (!doc) {
              throw new Error(`Документ ${alloc.expenseDocId} не найден`)
            }

            const remaining = doc.amount - doc.paidAmount
            if (allocAmount > remaining) {
              throw new Error(
                `Сумма распределения (${allocAmount/100}) превышает остаток документа (${remaining/100})`
              )
            }

            // Создаем распределение
            const allocation = await tx.paymentAllocation.create({
              data: {
                paymentId: payment.id,
                expenseDocId: alloc.expenseDocId,
                amount: allocAmount
              }
            })
            allocations.push(allocation)

            // Обновляем paidAmount документа
            const newPaidAmount = doc.paidAmount + allocAmount
            let newStatus = doc.status
            if (newPaidAmount >= doc.amount) {
              newStatus = 'paid'
            } else if (newPaidAmount > 0) {
              newStatus = 'partial'
            }

            await tx.expenseDoc.update({
              where: { id: alloc.expenseDocId },
              data: { 
                paidAmount: newPaidAmount,
                status: newStatus,
                updatedBy: userId
              }
            })
          }
        }

        // Создаем CashTx для платежа
        await tx.cashTx.create({
          data: {
            tenantId: tenant.id,
            accountId: parsed.data.accountId,
            date: new Date(parsed.data.date),
            direction: 'out',
            amount: paymentAmount,
            sourceType: 'payment',
            sourceId: payment.id,
            activity: parsed.data.activity || 'operating',
            paymentId: payment.id,
            memo: parsed.data.memo
          }
        })

        return { payment, allocations }
      })

      res.json({ data: result })
    } catch (e: any) {
      res.status(500).json({ error: String(e?.message || e) })
    }
  })

  // DELETE /api/payments/:id - отменить платёж (с пересчётом paid_amount)
  router.delete('/:id', requireRole(['ADMIN', 'ACCOUNTANT']), async (req, res) => {
    try {
      const userId = getUserId(req as any)

      await prisma.$transaction(async (tx) => {
        // Получаем платёж с распределениями
        const payment = await tx.payment.findUnique({
          where: { id: req.params.id },
          include: { allocations: true }
        })

        if (!payment) {
          throw new Error('Платёж не найден')
        }

        // Обновляем документы - вычитаем суммы распределений
        for (const alloc of payment.allocations) {
          const doc = await tx.expenseDoc.findUnique({
            where: { id: alloc.expenseDocId }
          })

          if (doc) {
            const newPaidAmount = doc.paidAmount - alloc.amount
            let newStatus = doc.status
            if (newPaidAmount === 0) {
              newStatus = 'unpaid'
            } else if (newPaidAmount < doc.amount) {
              newStatus = 'partial'
            }

            await tx.expenseDoc.update({
              where: { id: alloc.expenseDocId },
              data: { 
                paidAmount: Math.max(0, newPaidAmount),
                status: newStatus,
                updatedBy: userId
              }
            })
          }
        }

        // Удаляем распределения
        await tx.paymentAllocation.deleteMany({
          where: { paymentId: req.params.id }
        })

        // Удаляем связанные CashTx
        await tx.cashTx.deleteMany({
          where: { paymentId: req.params.id }
        })

        // Удаляем платёж
        await tx.payment.delete({
          where: { id: req.params.id }
        })
      })

      res.json({ ok: true })
    } catch (e: any) {
      res.status(500).json({ error: String(e?.message || e) })
    }
  })

  return router
}

