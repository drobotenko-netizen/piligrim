import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { signAccessToken, verifyAccessToken } from '../../utils/jwt'
import { getTenant } from '../../utils/tenant'

export function createAuthRouter(prisma: PrismaClient) {
  const router = Router()

  // Health check endpoint
  router.get('/_ping', (_req, res) => res.json({ ok: true }))

  // DEV: вход без Telegram — только для уже существующих пользователей (для разработки)
  router.post('/dev-login', async (req: any, res) => {
    try {
      const phone = String(req.body?.phone || '').trim()
      if (!phone) return res.status(400).json({ error: 'phone required' })
      const tenant = await getTenant(prisma, req as any)
      const user = await prisma.user.findFirst({ where: { tenantId: tenant.id, phone } })
      if (!user) return res.status(404).json({ error: 'user_not_found' })
      
      // Берём роли пользователя и добавляем ADMIN поверх для полного доступа
      const userRoles = await prisma.userRole.findMany({ where: { tenantId: tenant.id, userId: user.id }, include: { role: true } })
      const roles = Array.from(new Set(['ADMIN', ...userRoles.map(ur => ur.role.name)]))
      const token = signAccessToken({ sub: user.id, ten: tenant.id, roles }, 12 * 60 * 60)
      
      res.cookie('access_token', token, { 
        httpOnly: true, 
        sameSite: 'lax', 
        secure: process.env.NODE_ENV === 'production', 
        maxAge: 12 * 60 * 60 * 1000 
      })
      
      res.json({ ok: true, user: { id: user.id, fullName: user.fullName, phone: user.phone, roles } })
    } catch (e) {
      console.error('Dev login error:', e)
      res.status(500).json({ error: 'internal_error' })
    }
  })

  // Получить информацию о текущем пользователе
  router.get('/me', async (req: any, res) => {
    try {
      const raw = req.cookies?.access_token || ''
      console.log('[auth/me] cookie present:', Boolean(raw))
      
      if (!raw) return res.json({ user: null })
      
      const payload: any = verifyAccessToken(raw)
      const userId = String(payload?.sub || '').trim()
      console.log('[auth/me] payload.sub:', userId)
      
      if (!userId) return res.json({ user: null })
      
      const user = await prisma.user.findUnique({ 
        where: { id: userId }, 
        select: { id: true, fullName: true, phone: true } 
      })
      console.log('[auth/me] user resolved:', user?.id, user?.fullName)
      
      return res.json({ user, roles: payload?.roles || [] })
    } catch (e) {
      console.log('[auth/me] error while resolving user:', e)
      return res.json({ user: null })
    }
  })

  // Выход из системы
  router.post('/logout', async (_req, res) => {
    res.clearCookie('access_token', { 
      httpOnly: true, 
      sameSite: 'lax', 
      secure: process.env.NODE_ENV === 'production' 
    })
    res.json({ ok: true })
  })

  // DEV: создать привязку Telegram напрямую (для тестирования)
  router.post('/telegram-bind', async (req: any, res) => {
    try {
      const phone = String(req.body?.phone || '').trim()
      const chatId = String(req.body?.chatId || '').trim()
      
      if (!phone || !chatId) {
        return res.status(400).json({ error: 'phone and chatId required' })
      }
      
      const tenant = await getTenant(prisma, req as any)
      const user = await prisma.user.findFirst({ where: { tenantId: tenant.id, phone } })
      
      if (!user) {
        return res.status(404).json({ error: 'user_not_found' })
      }
      
      // Создаем привязку
      await prisma.telegramBinding.upsert({
        where: { tenantId_chatId: { tenantId: tenant.id, chatId } },
        update: { userId: user.id },
        create: { tenantId: tenant.id, userId: user.id, chatId }
      })
      
      return res.json({ ok: true, message: 'Telegram binding created' })
    } catch (e) {
      console.error('Telegram bind error:', e)
      return res.status(500).json({ error: 'internal_error' })
    }
  })

  return router
}
