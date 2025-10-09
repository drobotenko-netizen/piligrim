import { Router } from 'express'
import { PrismaClient } from '@prisma/client'

export function createPositionsRouter(prisma: PrismaClient) {
  const router = Router()

  router.get('/', async (_req, res) => {
    const data = await prisma.position.findMany({ orderBy: { name: 'asc' } })
    res.json({ data })
  })

  // RATES for all positions by month
  router.get('/rates', async (req, res) => {
    const y = Number(req.query.y)
    const m = Number(req.query.m)
    if (!y || !m) return res.status(400).json({ error: 'y/m required' })
    if (!(prisma as any).positionRate) return res.json({ data: [] })
    const rates = await (prisma as any).positionRate.findMany({
      where: {
        OR: [
          { year: { lt: y } },
          { AND: [{ year: y }, { month: { lte: m } }] }
        ]
      },
      orderBy: [
        { positionId: 'asc' },
        { year: 'desc' },
        { month: 'desc' }
      ]
    })
    const map: Record<string, any> = {}
    for (const r of rates as any[]) {
      if (!map[r.positionId]) map[r.positionId] = r
    }
    res.json({ data: Object.values(map) })
  })

  router.post('/', async (req, res) => {
    const name = String(req.body?.name || '').trim()
    const kind = String(req.body?.kind || '').trim()
    const department = req.body?.department ? String(req.body.department) : null
    const revenuePercentBps = Number.isFinite(req.body?.revenuePercentBps) ? Math.max(0, Math.min(10000, Math.trunc(req.body.revenuePercentBps))) : null
    const salaryAmount = Number.isFinite(req.body?.salaryAmount) ? Math.max(0, Math.trunc(req.body.salaryAmount)) : null
    const baseHourRate = Number.isFinite(req.body?.baseHourRate) ? Math.max(0, Math.trunc(req.body.baseHourRate)) : null
    if (!name) return res.status(400).json({ error: 'name required' })
    if (!['SHIFTS_PLUS_REVENUE','SALARY','SALARY_PLUS_TASKS'].includes(kind)) return res.status(400).json({ error: 'invalid kind' })
    const tenant = (await prisma.tenant.findFirst()) ?? (await prisma.tenant.create({ data: { name: 'Default' } }))
    if (department && !['KITCHEN','HALL','OFFICE','BAR','OPERATORS'].includes(department)) return res.status(400).json({ error: 'invalid department' })
    const created = await prisma.position.create({ data: { name, kind, department, revenuePercentBps, salaryAmount, baseHourRate, tenantId: tenant.id } })
    res.json({ data: created })
  })

  router.patch('/:id', async (req, res) => {
    const id = req.params.id
    const body = req.body || {}
    const patch: any = {}

    if (typeof body.name === 'string') patch.name = String(body.name).trim()
    if (typeof body.kind === 'string') {
      const kind = String(body.kind)
      if (!['SHIFTS_PLUS_REVENUE','SALARY','SALARY_PLUS_TASKS'].includes(kind)) return res.status(400).json({ error: 'invalid kind' })
      patch.kind = kind
    }
    if (body.baseHourRate !== undefined) {
      patch.baseHourRate = Number.isFinite(body.baseHourRate) ? Math.max(0, Math.trunc(body.baseHourRate)) : null
    }
    if (body.department !== undefined) {
      if (body.department && !['KITCHEN','HALL','OFFICE','BAR','OPERATORS'].includes(body.department)) return res.status(400).json({ error: 'invalid department' })
      patch.department = body.department ?? null
    }
    if (body.salaryAmount !== undefined) {
      patch.salaryAmount = Number.isFinite(body.salaryAmount) ? Math.max(0, Math.trunc(body.salaryAmount)) : null
    }
    if (body.revenuePercentBps !== undefined) {
      patch.revenuePercentBps = Number.isFinite(body.revenuePercentBps) ? Math.max(0, Math.min(10000, Math.trunc(body.revenuePercentBps))) : null
    }
    const updated = await prisma.position.update({ where: { id }, data: patch })
    res.json({ data: updated })
  })

  // RATES per position
  router.get('/:id/rates', async (req, res) => {
    const id = req.params.id
    if (!(prisma as any).positionRate) return res.json({ data: [] })
    const rates = await (prisma as any).positionRate.findMany({ where: { positionId: id }, orderBy: [{ year: 'desc' }, { month: 'desc' }] })
    res.json({ data: rates })
  })

  router.post('/:id/rates', async (req, res) => {
    const id = req.params.id
    if (!(prisma as any).positionRate) return res.status(503).json({ error: 'positionRate not available (run prisma migrate/generate)' })
    const y = Number(req.body?.year)
    const mo = Number(req.body?.month)
    if (!y || !mo) return res.status(400).json({ error: 'year/month required' })
    const baseHourRate = Number.isFinite(req.body?.baseHourRate) ? Math.max(0, Math.trunc(req.body.baseHourRate)) : null
    const revenuePercentBps = Number.isFinite(req.body?.revenuePercentBps) ? Math.max(0, Math.min(10000, Math.trunc(req.body.revenuePercentBps))) : null
    const salaryAmount = Number.isFinite(req.body?.salaryAmount) ? Math.max(0, Math.trunc(req.body.salaryAmount)) : null
    const position = await prisma.position.findUnique({ where: { id } })
    if (!position) return res.status(404).json({ error: 'position not found' })
    const tenant = (await prisma.tenant.findFirst()) ?? (await prisma.tenant.create({ data: { name: 'Default' } }))
    const created = await (prisma as any).positionRate.upsert({
      where: { positionId_year_month: { positionId: id, year: y, month: mo } },
      update: { baseHourRate, revenuePercentBps, salaryAmount },
      create: { tenantId: tenant.id, positionId: id, year: y, month: mo, baseHourRate, revenuePercentBps, salaryAmount }
    })
    res.json({ data: created })
  })

  return router
}


