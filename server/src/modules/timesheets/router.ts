import { Router, Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { getTenant } from '../../utils/tenant'
import { asyncHandler, validateId, validateYearMonth } from '../../utils/common-middleware'

export function createTimesheetsRouter(prisma: PrismaClient) {
  const router = Router()

  // GET / - список записей табеля по месяцу
  router.get('/', validateYearMonth(), asyncHandler(async (req: any, res: Response) => {
    const { year: y, month: m } = req
    const start = new Date(Date.UTC(y, m - 1, 1))
    const end = new Date(Date.UTC(y, m, 1))
    
    const [employees, entries] = await Promise.all([
      prisma.employee.findMany({
        where: { active: true },
        orderBy: { fullName: 'asc' },
        include: { position: { select: { department: true } } }
      }),
      prisma.timesheet.findMany({ 
        where: { workDate: { gte: start, lt: end } } 
      })
    ])
    
    res.json({ employees, entries })
  }))

  // POST / - создать/обновить запись табеля на день
  router.post('/', asyncHandler(async (req: Request, res: Response) => {
    const { employeeId, workDate, minutes, status } = req.body || {}
    
    if (!employeeId || !workDate) {
      return res.status(400).json({ error: 'employeeId/workDate required' })
    }
    
    const date = new Date(workDate)
    const tenant = await getTenant(prisma, req as any)
    
    const saved = await prisma.timesheet.upsert({
      where: { employeeId_workDate: { employeeId, workDate: date } },
      update: { 
        minutes: Number.isFinite(minutes) ? Math.max(0, Math.trunc(minutes)) : 0, 
        status: status || 'draft' 
      },
      create: { 
        tenantId: tenant.id, 
        employeeId, 
        workDate: date, 
        minutes: Number.isFinite(minutes) ? Math.max(0, Math.trunc(minutes)) : 0, 
        status: status || 'draft' 
      }
    })
    
    res.json({ data: saved })
  }))

  // PATCH /:id - обновить запись табеля
  router.patch('/:id', validateId(), asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id
    const { status, minutes } = req.body || {}
    
    const patch: any = {}
    if (status) patch.status = status
    if (minutes !== undefined) {
      patch.minutes = Number.isFinite(minutes) ? Math.max(0, Math.trunc(minutes)) : 0
    }
    
    const updated = await prisma.timesheet.update({ 
      where: { id }, 
      data: patch 
    })
    
    res.json({ data: updated })
  }))

  return router
}
