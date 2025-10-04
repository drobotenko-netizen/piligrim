import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { getTenant } from '../../utils/tenant'
import { requireRole, getUserId } from '../../utils/auth'

export function createCounterpartiesRouter(prisma: PrismaClient) {
  const router = Router()

  router.get('/', async (req, res) => {
    if (!prisma.counterparty) return res.json({ items: [] })
    const tenant = await getTenant(prisma, req as any)
    const type = String(req.query.type || '').trim()
    const where: any = { tenantId: tenant.id }
    if (type && type.toLowerCase() !== 'all') {
      where.kind = type
    }
    const data = await prisma.counterparty.findMany({ where, orderBy: { name: 'asc' } })
    res.json({ items: data })
  })

  // Список доступных типов контрагентов (только с ненулевым количеством)
  router.get('/types', async (req, res) => {
    if (!prisma.counterparty) return res.json({ items: [] })
    const tenant = await getTenant(prisma, req as any)
    try {
      const grouped = await (prisma as any).counterparty.groupBy({
        by: ['kind'],
        where: { tenantId: tenant.id },
        _count: { _all: true },
        orderBy: { _count: { _all: 'desc' } }
      })
      const items = grouped
        .filter((g: any) => !!g.kind && (g._count?._all || 0) > 0)
        .map((g: any) => ({ kind: String(g.kind), count: Number(g._count?._all || 0) }))
      res.json({ items })
    } catch (e: any) {
      res.status(500).json({ error: String(e?.message || e) })
    }
  })

  router.post('/', requireRole(['ADMIN','ACCOUNTANT']), async (req, res) => {
    if (!prisma.counterparty) return res.status(503).json({ error: 'counterparty model not available (run prisma migrate/generate)' })
    const bodySchema = z.object({ name: z.string().trim().min(1), kind: z.string().trim().nullable().optional() })
    const parsed = bodySchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'bad request', details: parsed.error.flatten() })
    const { name, kind = null } = parsed.data
    const tenant = await getTenant(prisma, req as any)
    const created = await prisma.counterparty.create({ data: { tenantId: tenant.id, name, kind, createdBy: getUserId(req as any) } })
    res.json({ data: created })
  })

  router.patch('/:id', requireRole(['ADMIN','ACCOUNTANT']), async (req, res) => {
    if (!prisma.counterparty) return res.status(503).json({ error: 'counterparty model not available' })
    const id = req.params.id
    const bodySchema = z.object({ name: z.string().trim().optional(), kind: z.string().trim().nullable().optional() })
    const parsed = bodySchema.safeParse(req.body || {})
    if (!parsed.success) return res.status(400).json({ error: 'bad request', details: parsed.error.flatten() })
    const patch: any = { ...parsed.data, updatedBy: getUserId(req as any) }
    const updated = await prisma.counterparty.update({ where: { id }, data: patch })
    res.json({ data: updated })
  })

  router.delete('/:id', requireRole(['ADMIN','ACCOUNTANT']), async (req, res) => {
    if (!prisma.counterparty) return res.status(503).json({ error: 'counterparty model not available' })
    const id = req.params.id
    await prisma.counterparty.delete({ where: { id } })
    res.json({ ok: true })
  })

  return router
}
