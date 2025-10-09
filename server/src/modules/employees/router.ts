import { Router, Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { getTenant } from '../../utils/tenant'
import { asyncHandler, validateId } from '../../utils/common-middleware'

export function createEmployeesRouter(prisma: PrismaClient) {
  const router = Router()

  // GET / - список всех сотрудников
  router.get('/', asyncHandler(async (_req: Request, res: Response) => {
    const data = await prisma.employee.findMany({ 
      orderBy: { fullName: 'asc' }, 
      include: { position: true } 
    })
    res.json({ data })
  }))

  // POST / - создать нового сотрудника
  router.post('/', asyncHandler(async (req: Request, res: Response) => {
    const fullName = String(req.body?.fullName || '').trim()
    const positionId = req.body?.positionId || null
    
    if (!fullName) {
      return res.status(400).json({ error: 'fullName required' })
    }
    
    const tenant = await getTenant(prisma, req as any)
    const created = await prisma.employee.create({ 
      data: { fullName, positionId, tenantId: tenant.id } 
    })
    
    res.json({ data: created })
  }))

  // PATCH /:id - обновить сотрудника
  router.patch('/:id', validateId(), asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id
    const body = req.body || {}
    
    // Специальные действия
    if (body.action === 'fire') {
      const updated = await prisma.employee.update({ 
        where: { id }, 
        data: { active: false, firedAt: new Date() } 
      })
      return res.json({ data: updated })
    }
    
    if (body.action === 'hire') {
      const updated = await prisma.employee.update({ 
        where: { id }, 
        data: { active: true, hiredAt: new Date(), firedAt: null } 
      })
      return res.json({ data: updated })
    }
    
    // Обычное обновление
    const patch: any = {}
    if ('fullName' in body) patch.fullName = String(body.fullName)
    if ('positionId' in body) patch.positionId = body.positionId || null
    
    const updated = await prisma.employee.update({ 
      where: { id }, 
      data: patch 
    })
    
    res.json({ data: updated })
  }))

  return router
}
