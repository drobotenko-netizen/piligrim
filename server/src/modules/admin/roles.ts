import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { requirePermission } from '../../utils/auth'
import { writeAudit } from '../../utils/audit'

export function createAdminRolesRouter(prisma: PrismaClient) {
  const router = Router()

  router.get('/roles', requirePermission(prisma, 'users.manage'), async (_req, res) => {
    const items = await prisma.role.findMany({ orderBy: [{ name: 'asc' }], include: { rolePerms: { include: { permission: true } } } })
    res.json({ items: items.map(r => ({ id: r.id, name: r.name, permissions: r.rolePerms.map(rp => rp.permission.name) })) })
  })

  router.get('/permissions', requirePermission(prisma, 'users.manage'), async (_req, res) => {
    const items = await prisma.permission.findMany({ orderBy: [{ name: 'asc' }] })
    res.json({ items })
  })

  router.post('/roles', requirePermission(prisma, 'users.manage'), async (req, res) => {
    const schema = z.object({ name: z.string().trim().min(1) })
    const parsed = schema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'bad request', details: parsed.error.flatten() })
    const created = await prisma.role.create({ data: { name: parsed.data.name } })
    await writeAudit(prisma, req as any, { action: 'role.create', entity: 'Role', entityId: created.id, after: created })
    res.json({ data: created })
  })

  router.patch('/roles/:id', requirePermission(prisma, 'users.manage'), async (req, res) => {
    const id = req.params.id
    const schema = z.object({ name: z.string().trim().min(1) })
    const parsed = schema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'bad request', details: parsed.error.flatten() })
    const before = await prisma.role.findUnique({ where: { id } })
    const updated = await prisma.role.update({ where: { id }, data: { name: parsed.data.name } })
    await writeAudit(prisma, req as any, { action: 'role.update', entity: 'Role', entityId: id, before, after: updated })
    res.json({ data: updated })
  })

  router.post('/roles/:id/permissions', requirePermission(prisma, 'users.manage'), async (req, res) => {
    const id = req.params.id
    const schema = z.object({ permissions: z.array(z.string()).min(0) })
    const parsed = schema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'bad request', details: parsed.error.flatten() })
    const before = await prisma.rolePermission.findMany({ where: { roleId: id } })
    await prisma.rolePermission.deleteMany({ where: { roleId: id } })
    const perms = await prisma.permission.findMany({ where: { name: { in: parsed.data.permissions } } })
    for (const p of perms) {
      await prisma.rolePermission.create({ data: { roleId: id, permissionId: p.id } })
    }
    const after = await prisma.rolePermission.findMany({ where: { roleId: id } })
    await writeAudit(prisma, req as any, { action: 'role.permissions.set', entity: 'RolePermission', entityId: id, before, after })
    res.json({ ok: true })
  })

  return router
}


