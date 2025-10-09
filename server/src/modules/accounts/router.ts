import { Router, Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { getTenant } from '../../utils/tenant'
import { requireRole, getUserId } from '../../utils/auth'
import { asyncHandler, validateId, validateYearMonth } from '../../utils/common-middleware'

export function createAccountsRouter(prisma: PrismaClient) {
  const router = Router()

  // GET / - список счетов
  router.get('/', asyncHandler(async (req: Request, res: Response) => {
    if (!prisma.account) {
      return res.json({ items: [] })
    }
    
    const includeArchived = String(req.query.includeArchived || '') === '1'
    const tenant = await getTenant(prisma, req as any)
    
    const where: any = { 
      tenantId: tenant.id, 
      ...(includeArchived ? {} : { active: true }) 
    }
    
    const data = await prisma.account.findMany({ 
      where, 
      orderBy: { name: 'asc' } 
    })
    
    res.json({ items: data })
  }))

  // POST / - создать счёт
  router.post('/', requireRole(['ADMIN', 'ACCOUNTANT']), asyncHandler(async (req: Request, res: Response) => {
    if (!prisma.account) {
      return res.status(503).json({ 
        error: 'accounts model not available (run prisma migrate/generate)' 
      })
    }
    
    const bodySchema = z.object({
      name: z.string().trim().min(1, 'name required'),
      kind: z.enum(['cash', 'bank']).default('cash')
    })
    
    const parsed = bodySchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ 
        error: 'bad request', 
        details: parsed.error.flatten() 
      })
    }
    
    const { name, kind } = parsed.data
    const tenant = await getTenant(prisma, req)
    
    const created = await prisma.account.create({ 
      data: { 
        tenantId: tenant.id, 
        name, 
        kind, 
        createdBy: getUserId(req as any) 
      } 
    })
    
    res.json({ data: created })
  }))

  // PATCH /:id - обновить счёт
  router.patch('/:id', validateId(), requireRole(['ADMIN', 'ACCOUNTANT']), asyncHandler(async (req: Request, res: Response) => {
    if (!prisma.account) {
      return res.status(503).json({ 
        error: 'accounts model not available (run prisma migrate/generate)' 
      })
    }
    
    const id = req.params.id
    const bodySchema = z.object({
      name: z.string().trim().optional(),
      kind: z.enum(['cash', 'bank']).optional(),
      active: z.boolean().optional()
    })
    
    const parsed = bodySchema.safeParse(req.body || {})
    if (!parsed.success) {
      return res.status(400).json({ 
        error: 'bad request', 
        details: parsed.error.flatten() 
      })
    }
    
    const data: any = { 
      ...parsed.data, 
      updatedBy: getUserId(req as any) 
    }
    
    const updated = await prisma.account.update({ 
      where: { id }, 
      data 
    })
    
    res.json({ data: updated })
  }))

  // DELETE /:id - архивировать счёт (soft delete)
  router.delete('/:id', validateId(), requireRole(['ADMIN', 'ACCOUNTANT']), asyncHandler(async (req: Request, res: Response) => {
    if (!prisma.account) {
      return res.status(503).json({ 
        error: 'accounts model not available (run prisma migrate/generate)' 
      })
    }
    
    const id = req.params.id
    await prisma.account.update({ 
      where: { id }, 
      data: { 
        active: false, 
        updatedBy: getUserId(req as any) 
      } 
    })
    
    res.json({ ok: true })
  }))

  // GET /balances - балансы по счетам за период
  router.get('/balances', validateYearMonth(), asyncHandler(async (req: any, res: Response) => {
    if (!prisma.transaction) {
      return res.json({ items: [] })
    }
    
    const { year: y, month: m } = req
    const tenant = await getTenant(prisma, req as any)
    const periodStart = new Date(Date.UTC(y, m - 1, 1))
    const nextStart = new Date(Date.UTC(y, m, 1))

    // Загружаем все транзакции до конца периода включительно
    const tx = await prisma.transaction.findMany({
      where: { 
        tenantId: tenant.id, 
        paymentDate: { lt: nextStart } 
      },
      select: { 
        accountId: true, 
        paymentDate: true, 
        amount: true, 
        kind: true 
      }
    })

    // Все счета
    const accounts = await prisma.account.findMany({ 
      where: { tenantId: tenant.id } 
    })

    // Группируем по счетам
    const balances = accounts.map(acc => {
      const txForAcc = tx.filter(t => t.accountId === acc.id)
      
      // opening: сумма до periodStart
      const txBefore = txForAcc.filter(t => new Date(t.paymentDate) < periodStart)
      const opening = txBefore.reduce((sum, t) => {
        return sum + (t.kind === 'inflow' ? t.amount : -t.amount)
      }, 0)

      // inflow/outflow за период
      const txPeriod = txForAcc.filter(t => {
        const d = new Date(t.paymentDate)
        return d >= periodStart && d < nextStart
      })
      
      const inflow = txPeriod
        .filter(t => t.kind === 'inflow')
        .reduce((sum, t) => sum + t.amount, 0)
      
      const outflow = txPeriod
        .filter(t => t.kind === 'outflow')
        .reduce((sum, t) => sum + t.amount, 0)

      const closing = opening + inflow - outflow

      return {
        accountId: acc.id,
        accountName: acc.name,
        opening,
        inflow,
        outflow,
        closing
      }
    })

    res.json({ items: balances })
  }))

  return router
}
