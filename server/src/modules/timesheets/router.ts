import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { getTenant } from '../../utils/tenant'

export function createTimesheetsRouter(prisma: PrismaClient) {
  const router = Router()

  // GET list by month
  router.get('/', async (req, res) => {
    const y = Number(req.query.y)
    const m = Number(req.query.m)
    if (!y || !m) return res.status(400).json({ error: 'y/m required' })
    const start = new Date(Date.UTC(y, m - 1, 1))
    const end = new Date(Date.UTC(y, m, 1))
    const [employees, entries] = await Promise.all([
      prisma.employee.findMany({
        where: { active: true },
        orderBy: { fullName: 'asc' },
        include: { position: { select: { department: true } } }
      }),
      prisma.timesheet.findMany({ where: { workDate: { gte: start, lt: end } } })
    ])
    res.json({ employees, entries })
  })

  // POST upsert one day entry
  router.post('/', async (req, res) => {
    const { employeeId, workDate, minutes, status } = req.body || {}
    if (!employeeId || !workDate) return res.status(400).json({ error: 'employeeId/workDate required' })
    const date = new Date(workDate)
    const tenant = await getTenant(prisma, req as any)
    const saved = await prisma.timesheet.upsert({
      where: { employeeId_workDate: { employeeId, workDate: date } },
      update: { minutes: Number.isFinite(minutes) ? Math.max(0, Math.trunc(minutes)) : 0, status: status || 'draft' },
      create: { tenantId: tenant.id, employeeId, workDate: date, minutes: Number.isFinite(minutes) ? Math.max(0, Math.trunc(minutes)) : 0, status: status || 'draft' }
    })
    res.json({ data: saved })
  })

  router.patch('/:id', async (req, res) => {
    const id = req.params.id
    const { status, minutes } = req.body || {}
    const patch: any = {}
    if (status) patch.status = status
    if (minutes !== undefined) patch.minutes = Number.isFinite(minutes) ? Math.max(0, Math.trunc(minutes)) : 0
    const updated = await prisma.timesheet.update({ where: { id }, data: patch })
    res.json({ data: updated })
  })

  return router
}


