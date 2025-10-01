import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { getTenant } from '../../utils/tenant'
import { requireRole, getUserId } from '../../utils/auth'

export function createAccountsRouter(prisma: PrismaClient) {
  const router = Router()

  router.get('/', async (req, res) => {
    if (!prisma.account) return res.json({ items: [] })
    const includeArchived = String(req.query.includeArchived || '') === '1'
    const tenant = await getTenant(prisma, req as any)
    const where: any = { tenantId: tenant.id, ...(includeArchived ? {} : { active: true }) }
    const data = await prisma.account.findMany({ where, orderBy: { name: 'asc' } })
    res.json({ items: data })
  })

  router.post('/', requireRole(['ADMIN','ACCOUNTANT']), async (req, res) => {
    if (!prisma.account) return res.status(503).json({ error: 'accounts model not available (run prisma migrate/generate)' })
    const bodySchema = z.object({
      name: z.string().trim().min(1, 'name required'),
      kind: z.enum(['cash','bank']).default('cash')
    })
    const parsed = bodySchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'bad request', details: parsed.error.flatten() })
    const { name, kind } = parsed.data
    const tenant = await getTenant(prisma, req)
    const created = await prisma.account.create({ data: { tenantId: tenant.id, name, kind, createdBy: getUserId(req as any) } })
    res.json({ data: created })
  })

  // Update account (name/kind/active)
  router.patch('/:id', requireRole(['ADMIN','ACCOUNTANT']), async (req, res) => {
    if (!prisma.account) return res.status(503).json({ error: 'accounts model not available (run prisma migrate/generate)' })
    const id = req.params.id
    const bodySchema = z.object({
      name: z.string().trim().optional(),
      kind: z.enum(['cash','bank']).optional(),
      active: z.boolean().optional()
    })
    const parsed = bodySchema.safeParse(req.body || {})
    if (!parsed.success) return res.status(400).json({ error: 'bad request', details: parsed.error.flatten() })
    const data: any = { ...parsed.data, updatedBy: getUserId(req as any) }
    const updated = await prisma.account.update({ where: { id }, data })
    res.json({ data: updated })
  })

  // Soft delete (archive)
  router.delete('/:id', requireRole(['ADMIN','ACCOUNTANT']), async (req, res) => {
    if (!prisma.account) return res.status(503).json({ error: 'accounts model not available (run prisma migrate/generate)' })
    const id = req.params.id
    await prisma.account.update({ where: { id }, data: { active: false, updatedBy: getUserId(req as any) } })
    res.json({ ok: true })
  })

  // Балансы по счетам за период (opening, inflow, outflow, closing)
  router.get('/balances', async (req, res) => {
    if (!prisma.transaction) return res.json({ items: [] })
    const y = Number(req.query.y)
    const m = Number(req.query.m)
    if (!y || !m) return res.status(400).json({ error: 'y/m required' })
    const tenant = await getTenant(prisma, req as any)
    const periodStart = new Date(Date.UTC(y, m - 1, 1))
    const nextStart = new Date(Date.UTC(y, m, 1))

    // Загружаем все транзакции до конца периода включительно (для opening и движения)
    const tx = await prisma.transaction.findMany({
      where: { tenantId: tenant.id, paymentDate: { lt: nextStart } },
      select: { accountId: true, paymentDate: true, amount: true, kind: true }
    })

    const map: Record<string, { opening: number; inflow: number; outflow: number; closing: number }> = {}
    function get(accId: string | null): { opening: number; inflow: number; outflow: number; closing: number } {
      const key = accId || 'null'
      if (!map[key]) map[key] = { opening: 0, inflow: 0, outflow: 0, closing: 0 }
      return map[key]
    }
    for (const t of tx) {
      const bucket = get(t.accountId)
      const isTransfer = t.kind === 'transfer'
      const isIncome = t.amount > 0
      const before = new Date(t.paymentDate) < periodStart
      if (before) {
        bucket.opening += t.amount
      } else {
        if (isIncome) bucket.inflow += t.amount
        else bucket.outflow += Math.abs(t.amount)
      }
    }
    for (const key of Object.keys(map)) {
      const b = map[key]
      b.closing = b.opening + b.inflow - b.outflow
    }

    const accounts = await prisma.account.findMany({ where: { tenantId: tenant.id } })
    const items = Object.entries(map).filter(([k]) => k !== 'null').map(([accountId, v]) => ({
      accountId,
      accountName: accounts.find((a: any) => a.id === accountId)?.name || '',
      opening: v.opening,
      inflow: v.inflow,
      outflow: v.outflow,
      closing: v.closing
    }))
    res.json({ items })
  })

  // Statements (basic)
  router.get('/statements', async (req, res) => {
    const accountId = String(req.query.accountId || '')
    const y = Number(req.query.y)
    const m = Number(req.query.m)
    if (!accountId) return res.status(400).json({ error: 'accountId required' })
    const tenant = await getTenant(prisma, req as any)
    const where: any = { accountId, tenantId: tenant.id }
    if (y && m) where.AND = [{ periodYear: y }, { periodMonth: m }]
    const items = await prisma.statement.findMany({ where, orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }] })
    res.json({ items })
  })

  router.post('/statements', async (req, res) => {
    const schema = z.object({ accountId: z.string().min(1), periodYear: z.number(), periodMonth: z.number(), opening: z.number(), closing: z.number().optional(), source: z.string().optional() })
    const parsed = schema.safeParse(req.body || {})
    if (!parsed.success) return res.status(400).json({ error: 'bad request', details: parsed.error.flatten() })
    const tenant = await getTenant(prisma, req as any)
    const { accountId, periodYear, periodMonth, opening, closing, source } = parsed.data
    const userId = getUserId(req as any)
    const created = await prisma.statement.upsert({
      where: { accountId_periodYear_periodMonth: { accountId, periodYear, periodMonth } },
      create: { tenantId: tenant.id, accountId, periodYear, periodMonth, opening, closing: closing ?? opening, source: source ?? null, createdBy: userId },
      update: { opening, closing: closing ?? opening, source: source ?? null, updatedBy: userId }
    })
    res.json({ data: created })
  })

  return router
}
