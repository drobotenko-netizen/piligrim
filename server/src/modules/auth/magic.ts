import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'
import { getTenant } from '../../utils/tenant'
import { requirePermission } from '../../utils/auth'
import { signAccessToken } from '../../utils/jwt'

const MAGIC_LINK_SECRET = process.env.MAGIC_LINK_SECRET || 'dev-magic-secret'
const SERVER_PUBLIC_URL = process.env.SERVER_PUBLIC_URL || `http://localhost:${process.env.PORT || 4000}`
const FRONTEND_BASE_URL = process.env.FRONTEND_BASE_URL || 'http://localhost:3000'

type MagicPayload = { jti: string; sub: string; ten: string; redirect?: string }

export function createMagicRouter(prisma: PrismaClient) {
  const router = Router()

  // Admin/API: issue magic link for a user
  router.post('/issue', requirePermission(prisma, 'users.manage'), async (req: any, res) => {
    try {
      // Require admin permission in your API gateway/middleware if needed
      const tenant = await getTenant(prisma, req as any)
      const userId = String(req.body?.userId || '').trim()
      const redirect = String(req.body?.redirect || '/sales/revenue').trim()
      if (!userId) return res.status(400).json({ error: 'userId required' })
      const user = await prisma.user.findFirst({ where: { id: userId, tenantId: tenant.id, active: true } })
      if (!user) return res.status(404).json({ error: 'user_not_found' })

      const ttlMinutes = Number(req.body?.ttlMinutes || 15)
      const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000)

      // Invalidate any previous active tokens for this user (strict one-time links)
      await prisma.magicLinkToken.updateMany({
        where: { tenantId: tenant.id, userId: user.id, usedAt: null, expiresAt: { gt: new Date() } },
        data: { usedAt: new Date() }
      })

      const tokenId = await prisma.magicLinkToken.create({
        data: { tenantId: tenant.id, userId: user.id, redirect, expiresAt }
      })

      const payload: MagicPayload = { jti: tokenId.id, sub: user.id, ten: tenant.id, redirect }
      const token = jwt.sign(payload, MAGIC_LINK_SECRET, { algorithm: 'HS256', expiresIn: `${ttlMinutes}m` })
      const url = `${SERVER_PUBLIC_URL}/api/auth/magic/callback?token=${encodeURIComponent(token)}`
      return res.json({ url, tokenId: tokenId.id, expiresAt })
    } catch (e) {
      return res.status(500).json({ error: 'internal_error' })
    }
  })

  // Public: complete magic login
  router.get('/callback', async (req: any, res) => {
    try {
      const raw = String(req.query?.token || '').trim()
      if (!raw) return res.status(400).send('Bad request')
      let decoded: any
      try {
        decoded = jwt.verify(raw, MAGIC_LINK_SECRET, { algorithms: ['HS256'] })
      } catch {
        return res.status(400).send('Token invalid or expired')
      }
      const jti = String(decoded?.jti || '')
      const userId = String(decoded?.sub || '')
      const tenantId = String(decoded?.ten || '')
      const redirect = String(decoded?.redirect || '/sales/revenue')
      if (!jti || !userId || !tenantId) return res.status(400).send('Malformed token')

      const dbToken = await prisma.magicLinkToken.findUnique({ where: { id: jti } })
      if (!dbToken || dbToken.userId !== userId || dbToken.tenantId !== tenantId) {
        return res.status(400).send('Token not found')
      }
      if (dbToken.usedAt) return res.status(400).send('Token already used')
      if (dbToken.expiresAt.getTime() < Date.now()) return res.status(400).send('Token expired')

      // Mark used
      await prisma.magicLinkToken.update({ where: { id: jti }, data: { usedAt: new Date(), usedIp: req.ip || '', usedUa: req.headers['user-agent'] || '' } })

      // Create session cookie
      const roles = (await prisma.userRole.findMany({ where: { tenantId, userId }, include: { role: true } })).map(r => r.role.name)
      const access = signAccessToken({ sub: userId, ten: tenantId, roles }, 30 * 24 * 60 * 60)
      res.cookie('access_token', access, { httpOnly: true, sameSite: 'lax', secure: !!process.env.NODE_ENV && process.env.NODE_ENV !== 'development', maxAge: 30 * 24 * 60 * 60 * 1000 })
      const target = `${FRONTEND_BASE_URL}${redirect.startsWith('/') ? '' : '/'}${redirect}`
      return res.redirect(target)
    } catch (e) {
      return res.status(500).send('Internal error')
    }
  })

  return router
}


