import { Router, Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { requirePermission } from '../../utils/auth'
import { writeAudit } from '../../utils/audit'
import { asyncHandler, validateId } from '../../utils/common-middleware'

export function createAdminRolesRouter(prisma: PrismaClient) {
  const router = Router()

  // GET /roles - список ролей
  router.get('/roles', requirePermission(prisma, 'users.manage'), asyncHandler(async (_req: Request, res: Response) => {
    const items = await prisma.role.findMany({ 
      orderBy: [{ name: 'asc' }], 
      include: { rolePerms: { include: { permission: true } } } 
    })
    res.json({ 
      items: items.map(r => ({ 
        id: r.id, 
        name: r.name, 
        permissions: r.rolePerms.map(rp => rp.permission.name) 
      })) 
    })
  }))

  // GET /permissions - список разрешений
  router.get('/permissions', requirePermission(prisma, 'users.manage'), asyncHandler(async (_req: Request, res: Response) => {
    const items = await prisma.permission.findMany({ 
      orderBy: [{ name: 'asc' }] 
    })
    res.json({ items })
  }))

  // POST /roles - создать роль
  router.post('/roles', requirePermission(prisma, 'users.manage'), asyncHandler(async (req: Request, res: Response) => {
    const schema = z.object({ name: z.string().trim().min(1) })
    const parsed = schema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'bad request', details: parsed.error.flatten() })
    }
    const created = await prisma.role.create({ data: { name: parsed.data.name } })
    await writeAudit(prisma, req as any, { 
      action: 'role.create', 
      entity: 'Role', 
      entityId: created.id, 
      after: created 
    })
    res.json({ data: created })
  }))

  // PATCH /roles/:id - обновить роль
  router.patch('/roles/:id', validateId(), requirePermission(prisma, 'users.manage'), asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id
    const schema = z.object({ name: z.string().trim().min(1) })
    const parsed = schema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'bad request', details: parsed.error.flatten() })
    }
    const before = await prisma.role.findUnique({ where: { id } })
    const updated = await prisma.role.update({ 
      where: { id }, 
      data: { name: parsed.data.name } 
    })
    await writeAudit(prisma, req as any, { 
      action: 'role.update', 
      entity: 'Role', 
      entityId: id, 
      before, 
      after: updated 
    })
    res.json({ data: updated })
  }))

  // POST /roles/:id/permissions - установить разрешения для роли
  router.post('/roles/:id/permissions', validateId(), requirePermission(prisma, 'users.manage'), asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id
    const schema = z.object({ permissions: z.array(z.string()).min(0) })
    const parsed = schema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'bad request', details: parsed.error.flatten() })
    }
    const before = await prisma.rolePermission.findMany({ where: { roleId: id } })
    await prisma.rolePermission.deleteMany({ where: { roleId: id } })
    const perms = await prisma.permission.findMany({ 
      where: { name: { in: parsed.data.permissions } } 
    })
    for (const p of perms) {
      await prisma.rolePermission.create({ 
        data: { roleId: id, permissionId: p.id } 
      })
    }
    const after = await prisma.rolePermission.findMany({ where: { roleId: id } })
    await writeAudit(prisma, req as any, { 
      action: 'role.permissions.set', 
      entity: 'RolePermission', 
      entityId: id, 
      before, 
      after 
    })
    res.json({ ok: true })
  }))

  return router
}
