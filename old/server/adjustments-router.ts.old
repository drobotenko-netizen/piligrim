import { Router } from 'express'
import { PrismaClient } from '@prisma/client'

export function createAdjustmentsRouter(prisma: PrismaClient) {
  const router = Router()

  router.get('/', async (req, res) => {
    // Если Prisma Client ещё не сгенерирован с моделью Adjustment — не роняем сервер
    if (!(prisma as any).adjustment) {
      return res.json({ items: [] })
    }
    const y = Number(req.query.y)
    const m = Number(req.query.m)
    if (!y || !m) return res.status(400).json({ error: 'y/m required' })
    const start = new Date(Date.UTC(y, m - 1, 1))
    const end = new Date(Date.UTC(y, m, 1))
    const items = await prisma.adjustment.findMany({
      where: { date: { gte: start, lt: end } },
      include: { employee: true },
      orderBy: [{ date: 'asc' }, { createdAt: 'asc' }]
    })
    res.json({ items })
  })

  router.post('/', async (req, res) => {
    if (!(prisma as any).adjustment) {
      return res.status(503).json({ error: 'adjustments model not available (run prisma migrate/generate)' })
    }
    const { employeeId, date, kind, amount, reason } = req.body || {}
    if (!employeeId || !date || !kind || !Number.isFinite(amount)) return res.status(400).json({ error: 'bad request' })
    if (!['bonus','fine','deduction'].includes(kind)) return res.status(400).json({ error: 'invalid kind' })
    const tenant = (await prisma.tenant.findFirst()) ?? (await prisma.tenant.create({ data: { name: 'Default' } }))
    const created = await prisma.adjustment.create({ data: { tenantId: tenant.id, employeeId, date: new Date(date), kind, amount: Math.trunc(Math.abs(amount)), reason } })
    res.json({ data: created })
  })

  router.patch('/:id', async (req, res) => {
    if (!(prisma as any).adjustment) {
      return res.status(503).json({ error: 'adjustments model not available (run prisma migrate/generate)' })
    }
    const id = req.params.id
    const body = req.body || {}
    const patch: any = {}
    if (typeof body.employeeId === 'string') patch.employeeId = String(body.employeeId)
    if (typeof body.date === 'string') patch.date = new Date(body.date)
    if (typeof body.kind === 'string') {
      if (!['bonus','fine','deduction'].includes(body.kind)) return res.status(400).json({ error: 'invalid kind' })
      patch.kind = body.kind
    }
    if (body.amount !== undefined) patch.amount = Number.isFinite(body.amount) ? Math.trunc(Math.abs(body.amount)) : undefined
    if (body.reason !== undefined) patch.reason = body.reason ?? null
    const updated = await prisma.adjustment.update({ where: { id }, data: patch })
    res.json({ data: updated })
  })

  router.delete('/:id', async (req, res) => {
    if (!(prisma as any).adjustment) {
      return res.status(503).json({ error: 'adjustments model not available (run prisma migrate/generate)' })
    }
    const id = req.params.id
    await prisma.adjustment.delete({ where: { id } })
    res.json({ ok: true })
  })

  return router
}


