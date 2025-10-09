import { Router, Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { getTenant } from '../../utils/tenant'
import { getUserId, requireRole } from '../../utils/auth'
import { asyncHandler, validateId, validateYearMonth } from '../../utils/common-middleware'

export function createPayoutsRouter(prisma: PrismaClient) {
  const router = Router()

  // GET / - список выплат по месяцу
  router.get('/', validateYearMonth(), asyncHandler(async (req: any, res: Response) => {
    if (!prisma.payout) {
      return res.json({ items: [] })
    }
    
    const { year: y, month: m } = req
    const tenant = await getTenant(prisma, req as any)
    
    const items = await prisma.payout.findMany({
      where: { tenantId: tenant.id, year: y, month: m },
      include: { employee: true, account: true },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }]
    })
    
    res.json({ items })
  }))

  // POST / - создать выплату
  router.post('/', requireRole(['ADMIN', 'ACCOUNTANT']), asyncHandler(async (req: Request, res: Response) => {
    if (!prisma.payout) {
      return res.status(503).json({ 
        error: 'payouts model not available (run prisma migrate/generate)' 
      })
    }
    
    const bodySchema = z.object({
      employeeId: z.string().min(1),
      date: z.string().min(1),
      year: z.number(),
      month: z.number(),
      amount: z.number(),
      method: z.string().optional(),
      accountId: z.string().nullable().optional(),
      note: z.string().nullable().optional()
    })
    
    const parsed = bodySchema.safeParse(req.body || {})
    if (!parsed.success) {
      return res.status(400).json({ 
        error: 'bad request', 
        details: parsed.error.flatten() 
      })
    }
    
    const { 
      employeeId, 
      date, 
      year, 
      month, 
      amount, 
      method: methodIn, 
      accountId, 
      note 
    } = parsed.data
    
    const tenant = await getTenant(prisma, req as any)
    
    // Определяем способ по счёту, если явно не указан
    let method = methodIn
    if (!method) {
      if (accountId) {
        try {
          const acc = await prisma.account.findUnique({ where: { id: accountId } })
          const kind = acc?.kind || 'cash'
          method = kind === 'cash' ? 'cash' : 'bank'
        } catch { 
          method = 'cash' 
        }
      } else {
        method = 'cash'
      }
    }
    
    console.log('[payouts] create', { 
      tenantId: tenant.id, 
      employeeId, 
      date, 
      year, 
      month, 
      amount, 
      method, 
      accountId, 
      note 
    })
    
    const userId = getUserId(req as any)
    
    // 1) создаём выплату (вне интерактивной транзакции, чтобы избежать таймаута)
    const createdPayout = await (prisma as any).payout.create({ 
      data: { 
        tenantId: tenant.id, 
        createdBy: userId, 
        employeeId, 
        date: new Date(date), 
        year, 
        month, 
        amount: Math.trunc(Math.abs(amount)), 
        method, 
        accountId: accountId || null, 
        note 
      } 
    })

    // 2) обеспечиваем наличие категории «Заработная плата»
    let salaryCategory: any = null
    if ((prisma as any).category) {
      salaryCategory = await (prisma as any).category.findFirst({ 
        where: { 
          tenantId: tenant.id, 
          name: 'Заработная плата', 
          type: 'expense' 
        } 
      })
      
      if (!salaryCategory) {
        // Если ранее существовала «Зарплата», переиспользуем/переименовываем
        const legacy = await (prisma as any).category.findFirst({ 
          where: { 
            tenantId: tenant.id, 
            name: 'Зарплата', 
            type: 'expense' 
          } 
        })
        
        if (legacy) {
          salaryCategory = await (prisma as any).category.update({ 
            where: { id: legacy.id }, 
            data: { name: 'Заработная плата' } 
          })
        } else {
          salaryCategory = await (prisma as any).category.create({ 
            data: { 
              tenantId: tenant.id, 
              name: 'Заработная плата', 
              type: 'expense', 
              activity: 'OPERATING' 
            } 
          })
        }
      }
    }

    // 3) создаём связанную транзакцию (best-effort)
    if ((prisma as any).transaction) {
      await (prisma as any).transaction.create({ 
        data: {
          tenantId: tenant.id,
          createdBy: userId,
          kind: 'expense',
          paymentDate: new Date(date),
          accrualYear: year,
          accrualMonth: month,
          accountId: accountId || null,
          categoryId: salaryCategory?.id || null,
          employeeId: employeeId,
          activity: 'OPERATING',
          method: method,
          amount: Math.trunc(Math.abs(amount)),
          note: note ?? null,
          source: 'payout'
        } 
      })
    }

    res.json({ data: createdPayout })
  }))

  // DELETE /:id - удалить выплату
  router.delete('/:id', validateId(), asyncHandler(async (req: Request, res: Response) => {
    if (!(prisma as any).payout) {
      return res.status(503).json({ 
        error: 'payouts model not available (run prisma migrate/generate)' 
      })
    }
    
    const id = req.params.id
    await (prisma as any).payout.delete({ where: { id } })
    
    res.json({ ok: true })
  }))

  return router
}
