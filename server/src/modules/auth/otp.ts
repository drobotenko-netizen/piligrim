import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import fetch from 'node-fetch'
import { signAccessToken, verifyAccessToken } from '../../utils/jwt'
import { getTenant } from '../../utils/tenant'

const MESSAGGIO_BASE_URL = process.env.MESSAGGIO_BASE_URL || 'https://otp.messaggio.com/api/v1'
const MESSAGGIO_API_KEY = process.env.MESSAGGIO_API_KEY || ''

export function createOtpRouter(prisma: PrismaClient) {
  const router = Router()

  router.get('/_ping', (_req, res) => res.json({ ok: true }))

  router.post('/send', async (req, res) => {
    try {
      const phone = String(req.body?.phone || req.body?.to || '').trim()
      if (!phone) return res.status(400).json({ error: 'phone required' })
      const channel = req.body?.channel ? String(req.body.channel) : undefined
      const code = req.body?.code ? String(req.body.code) : undefined

      // Пускаем только зарегистрированных пользователей
      const tenant = await getTenant(prisma, req as any)
      const exists = await prisma.user.findFirst({ where: { tenantId: tenant.id, phone } })
      if (!exists) return res.status(404).json({ error: 'user_not_found' })

      // DEV override: для локального теста не обращаемся к внешнему API
      if (process.env.NODE_ENV !== 'production') {
        const devAuthId = `dev-${Date.now()}`
        return res.status(202).json({ ok: true, auth_id: devAuthId })
      }

      const url = `${MESSAGGIO_BASE_URL}/code`
      const r = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${MESSAGGIO_API_KEY}`
        },
        body: JSON.stringify({ to: phone, ...(channel ? { channel } : {}), ...(code ? { code } : {}) })
      })
      const json = await r.json().catch(() => ({}))
      if (!r.ok) return res.status(r.status).json(json)
      return res.status(202).json(json)
    } catch (e) {
      res.status(500).json({ error: 'internal_error' })
    }
  })

  router.post('/verify', async (req, res) => {
    try {
      const authId = String(req.body?.auth_id || req.body?.requestId || '').trim()
      const code = String(req.body?.code || '').trim()
      const phone = String(req.body?.phone || '').trim()
      if (!authId || !code) return res.status(400).json({ error: 'auth_id/code required' })

      // DEV override: принимаем любой dev-* auth_id и фиксированный код
      if (process.env.NODE_ENV !== 'production' && authId.startsWith('dev-')) {
        const tenant = await getTenant(prisma, req as any)
        const user = await prisma.user.findFirst({ where: { tenantId: tenant.id, phone } })
        if (!user) return res.status(403).json({ error: 'user_not_found' })
        const userRoles = await prisma.userRole.findMany({ where: { tenantId: tenant.id, userId: user.id }, include: { role: true } })
        const roles = userRoles.map(ur => ur.role.name)
        const token = signAccessToken({ sub: user.id, ten: tenant.id, roles }, 12 * 60 * 60)
        res.cookie('access_token', token, { httpOnly: true, sameSite: 'lax', secure: !!process.env.NODE_ENV && process.env.NODE_ENV !== 'development', maxAge: 12 * 60 * 60 * 1000 })
        return res.json({ ok: true })
      }

      const url = `${MESSAGGIO_BASE_URL}/code/verify`
      const r = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${MESSAGGIO_API_KEY}`
        },
        body: JSON.stringify({ auth_id: authId, code })
      })
      const json: any = await r.json().catch(() => ({}))
      if (!r.ok) return res.status(r.status).json(json)
      if (String(json?.status || '').toUpperCase() !== 'CODE_VERIFIED') return res.status(400).json(json)
      const tenant = await getTenant(prisma, req as any)
      // Пользователь должен существовать в системе
      const user = await prisma.user.findFirst({ where: { tenantId: tenant.id, phone } })
      if (!user) return res.status(403).json({ error: 'user_not_found' })
      // Роли пользователя
      const userRoles = await prisma.userRole.findMany({ where: { tenantId: tenant.id, userId: user.id }, include: { role: true } })
      const roles = userRoles.map(ur => ur.role.name)
      // JWT теперь содержит userId в sub
      const token = signAccessToken({ sub: user.id, ten: tenant.id, roles }, 12 * 60 * 60)
      res.cookie('access_token', token, { httpOnly: true, sameSite: 'lax', secure: !!process.env.NODE_ENV && process.env.NODE_ENV !== 'development', maxAge: 12 * 60 * 60 * 1000 })
      res.json({ ok: true })
    } catch (e) {
      res.status(500).json({ error: 'internal_error' })
    }
  })

  // DEV: вход без СМС — только для уже существующих пользователей
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
      res.cookie('access_token', token, { httpOnly: true, sameSite: 'lax', secure: !!process.env.NODE_ENV && process.env.NODE_ENV !== 'development', maxAge: 12 * 60 * 60 * 1000 })
      res.json({ ok: true, roles, user: { id: user.id, fullName: user.fullName, phone: user.phone } })
    } catch {
      res.status(500).json({ error: 'internal_error' })
    }
  })

  router.get('/me', async (req: any, res) => {
    try {
      const raw = req.cookies?.access_token || ''
      console.log('[auth/me] cookie present:', Boolean(raw))
      if (!raw) return res.json({ user: null })
      const payload: any = verifyAccessToken(raw)
      const userId = String(payload?.sub || '').trim()
      console.log('[auth/me] payload.sub:', userId)
      if (!userId) return res.json({ user: null })
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, fullName: true, phone: true } })
      console.log('[auth/me] user resolved:', user?.id, user?.fullName)
      return res.json({ user, roles: payload?.roles || [] })
    } catch {
      console.log('[auth/me] error while resolving user')
      return res.json({ user: null })
    }
  })

  router.post('/logout', async (_req, res) => {
    res.clearCookie('access_token', { httpOnly: true, sameSite: 'lax', secure: !!process.env.NODE_ENV && process.env.NODE_ENV !== 'development' })
    res.json({ ok: true })
  })

  return router
}
