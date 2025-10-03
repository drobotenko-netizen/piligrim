import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { getTenant } from '../../utils/tenant'
import { requirePermission } from '../../utils/auth'
import { writeAudit } from '../../utils/audit'
import crypto from 'crypto'

export function createAdminUsersRouter(prisma: PrismaClient) {
  const router = Router()

  router.get('/', requirePermission(prisma, 'users.manage'), async (req, res) => {
    const tenant = await getTenant(prisma, req as any)
    const q = String(req.query.q || '').trim()
    const where: any = { tenantId: tenant.id }
    if (q) where.OR = [{ fullName: { contains: q } }, { phone: { contains: q } }]
    const users = await prisma.user.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }],
      include: { roles: { include: { role: true } } }
    })
    const items = users.map(u => ({
      id: u.id,
      fullName: u.fullName,
      phone: u.phone,
      active: u.active,
      roles: (u.roles || []).map(r => r.role?.name).filter(Boolean)
    }))
    res.json({ items })
  })

  router.post('/', requirePermission(prisma, 'users.manage'), async (req, res) => {
    try {
      const tenant = await getTenant(prisma, req as any)
      const schema = z.object({ fullName: z.string().trim().min(1), phone: z.string().trim().min(5) })
      const parsed = schema.safeParse(req.body)
      if (!parsed.success) return res.status(400).json({ error: 'bad request', details: parsed.error.flatten() })
      const data = parsed.data
      
      // Check if user with this phone already exists
      const existing = await prisma.user.findUnique({ where: { phone: data.phone } })
      if (existing) {
        return res.status(409).json({ error: 'user_already_exists', message: 'Пользователь с таким номером телефона уже существует' })
      }
      
      const created = await prisma.user.create({ data: { tenantId: tenant.id, fullName: data.fullName, phone: data.phone } })
      await writeAudit(prisma, req as any, { action: 'user.create', entity: 'User', entityId: created.id, after: created })
      res.json({ data: created })
    } catch (error) {
      console.error('Error creating user:', error)
      res.status(500).json({ error: 'internal_error' })
    }
  })

  router.patch('/:id', requirePermission(prisma, 'users.manage'), async (req, res) => {
    const id = req.params.id
    const schema = z.object({ fullName: z.string().trim().optional(), phone: z.string().trim().optional(), active: z.boolean().optional() })
    const parsed = schema.safeParse(req.body || {})
    if (!parsed.success) return res.status(400).json({ error: 'bad request', details: parsed.error.flatten() })
    const before = await prisma.user.findUnique({ where: { id } })
    const updated = await prisma.user.update({ where: { id }, data: parsed.data })
    await writeAudit(prisma, req as any, { action: 'user.update', entity: 'User', entityId: id, before, after: updated })
    res.json({ data: updated })
  })

  router.post('/:id/roles', requirePermission(prisma, 'users.manage'), async (req, res) => {
    const tenant = await getTenant(prisma, req as any)
    const id = req.params.id
    const schema = z.object({ roles: z.array(z.string()).min(1) })
    const parsed = schema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'bad request', details: parsed.error.flatten() })
    const roleNames = parsed.data.roles
    const roleList = await prisma.role.findMany({ where: { name: { in: roleNames } } })
    const before = await prisma.userRole.findMany({ where: { tenantId: tenant.id, userId: id } })
    await prisma.userRole.deleteMany({ where: { tenantId: tenant.id, userId: id } })
    for (const r of roleList) {
      await prisma.userRole.create({ data: { tenantId: tenant.id, userId: id, roleId: r.id } })
    }
    const after = await prisma.userRole.findMany({ where: { tenantId: tenant.id, userId: id } })
    await writeAudit(prisma, req as any, { action: 'user.roles.set', entity: 'UserRole', entityId: id, before, after })
    res.json({ ok: true })
  })

  // Generate Telegram binding code (deep-link) for a user
  router.post('/:id/telegram-binding-code', requirePermission(prisma, 'users.manage'), async (req, res) => {
    try {
      const tenant = await getTenant(prisma, req as any)
      const id = String(req.params.id)
      const user = await prisma.user.findFirst({ where: { id, tenantId: tenant.id } })
      if (!user) return res.status(404).json({ error: 'user_not_found' })
      
      // For simplicity, using userId as binding code for now
      const bindingCode = user.id
      const botUsername = process.env.TELEGRAM_BOT_USERNAME || 'piligrim_app_bot'
      const deepLink = `https://t.me/${botUsername}?start=${bindingCode}`
      
      return res.json({ deepLink, bindingCode })
    } catch (e) {
      console.error('Error generating telegram binding code:', e)
      return res.status(500).json({ error: 'internal_error' })
    }
  })

  return router
}


