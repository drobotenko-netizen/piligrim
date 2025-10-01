import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { getTenant } from '../../utils/tenant'

export function createEmployeesRouter(prisma: PrismaClient) {
  const router = Router()

  router.get('/', async (_req, res) => {
    const data = await prisma.employee.findMany({ orderBy: { fullName: 'asc' }, include: { position: true } })
    res.json({ data })
  })

  router.post('/', async (req, res) => {
    const fullName = String(req.body?.fullName || '').trim()
    const positionId = req.body?.positionId || null
    if (!fullName) return res.status(400).json({ error: 'fullName required' })
    const tenant = await getTenant(prisma, req as any)
    const created = await prisma.employee.create({ data: { fullName, positionId, tenantId: tenant.id } })
    res.json({ data: created })
  })

  router.patch('/:id', async (req, res) => {
    const id = req.params.id
    const body = req.body || {}
    if (body.action === 'fire') {
      const updated = await prisma.employee.update({ where: { id }, data: { active: false, firedAt: new Date() } })
      return res.json({ data: updated })
    }
    if (body.action === 'hire') {
      const updated = await prisma.employee.update({ where: { id }, data: { active: true, hiredAt: new Date(), firedAt: null } })
      return res.json({ data: updated })
    }
    const patch: any = {}
    if ('fullName' in body) patch.fullName = String(body.fullName)
    if ('positionId' in body) patch.positionId = body.positionId || null
    const updated = await prisma.employee.update({ where: { id }, data: patch })
    return res.json({ data: updated })
  })

  return router
}


