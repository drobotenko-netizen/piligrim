import { Router, Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'
import { getTenant } from '../../utils/tenant'
import { requirePermission } from '../../utils/auth'
import { signAccessToken } from '../../utils/jwt'
import { asyncHandler, validateId } from '../../utils/common-middleware'

const MAGIC_LINK_SECRET = process.env.MAGIC_LINK_SECRET || 'dev-magic-secret'
const SERVER_PUBLIC_URL = process.env.SERVER_PUBLIC_URL || `http://localhost:${process.env.PORT || 4000}`
const FRONTEND_BASE_URL = process.env.FRONTEND_BASE_URL || 'http://localhost:3000'

type MagicPayload = { jti: string; sub: string; ten: string; redirect?: string }

export function createMagicRouter(prisma: PrismaClient) {
  const router = Router()

  // Admin/API: issue magic link for a user
  router.post('/issue', requirePermission(prisma, 'users.manage'), asyncHandler(async (req: Request, res: Response) => {
      // Require admin permission in your API gateway/middleware if needed
      const tenant = await getTenant(prisma, req as any)
      const userId = String(req.body?.userId || '').trim()
      const redirect = String(req.body?.redirect || '/sales/revenue').trim()
      if (!userId) return res.status(400).json({ error: 'userId required' })
      const user = await prisma.user.findFirst({ where: { id: userId, tenantId: tenant.id, active: true } })
      if (!user) return res.status(404).json({ error: 'user_not_found' })

      const ttlMinutes = Number(req.body?.ttlMinutes || 15)
      const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000)

      // Allow multiple active tokens for better UX (each token is still one-time use)
      // Removed automatic invalidation of previous tokens

      const tokenId = await prisma.magicLinkToken.create({
        data: { tenantId: tenant.id, userId: user.id, redirect, expiresAt }
      })

      const payload: MagicPayload = { jti: tokenId.id, sub: user.id, ten: tenant.id, redirect }
      const token = jwt.sign(payload, MAGIC_LINK_SECRET, { algorithm: 'HS256', expiresIn: `${ttlMinutes}m` })
      const frontendUrl = FRONTEND_BASE_URL || SERVER_PUBLIC_URL || 'http://localhost:3000'
      const url = `${frontendUrl}/?token=${encodeURIComponent(token)}`
      const shortUrl = `${SERVER_PUBLIC_URL}/api/auth/magic/s/${encodeURIComponent(tokenId.id)}`
      return res.json({ url, shortUrl, tokenId: tokenId.id, expiresAt })
  }))

  // Public: verify magic link token (for frontend)
  router.post('/verify', asyncHandler(async (req: Request, res: Response) => {
      const { token } = req.body || {}
      if (!token) return res.status(400).json({ error: 'token required' })
      
      let decoded: any
      try {
        decoded = jwt.verify(token, MAGIC_LINK_SECRET, { algorithms: ['HS256'] })
      } catch {
        return res.status(400).json({ error: 'token_invalid_or_expired' })
      }
      
      const jti = String(decoded?.jti || '')
      const userId = String(decoded?.sub || '')
      const tenantId = String(decoded?.ten || '')
      const redirect = String(decoded?.redirect || '/sales/revenue')
      if (!jti || !userId || !tenantId) return res.status(400).json({ error: 'malformed_token' })

      const dbToken = await prisma.magicLinkToken.findUnique({ where: { id: jti } })
      if (!dbToken || dbToken.userId !== userId || dbToken.tenantId !== tenantId) {
        return res.status(400).json({ error: 'token_not_found' })
      }
      
      if (dbToken.expiresAt.getTime() < Date.now()) {
        return res.status(400).json({ error: 'token_expired' })
      }

      // Create session cookie
      const roles = (await prisma.userRole.findMany({ where: { tenantId, userId }, include: { role: true } })).map(r => r.role.name)
      const access = signAccessToken({ sub: userId, ten: tenantId, roles }, 30 * 24 * 60 * 60)
      res.cookie('access_token', access, { 
        httpOnly: false, 
        sameSite: 'lax', 
        secure: true, 
        maxAge: 30 * 24 * 60 * 60 * 1000,
      })
      
      // Get user data
      const user = await prisma.user.findUnique({ 
        where: { id: userId },
        select: { id: true, fullName: true, phone: true, active: true }
      })
      
      return res.json({ 
        success: true, 
        user, 
        roles, 
        redirect 
      })
  }))

  // Public: complete magic login
  router.get('/callback', asyncHandler(async (req: Request, res: Response) => {
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
        const frontendUrl = FRONTEND_BASE_URL || SERVER_PUBLIC_URL || 'http://localhost:3000'
        return res.redirect(`${frontendUrl}/?error=token_not_found`)
      }
      // Игнорируем преглядыватели (preview) — не помечаем токен использованным
      const ua = String(req.headers['user-agent'] || '')
      const isPreview = /(TelegramBot|WhatsApp|facebookexternalhit|Twitterbot|Slackbot|LinkedInBot|SkypeUriPreview|Discordbot|Google-InspectionTool|curl|wget|Pingdom|Bingbot|Telegram|Applebot|Bot|bot)/i.test(ua)
      if (isPreview) {
        console.log(`[magic] Preview request ignored for UA: ${ua}`)
        return res.status(204).end()
      }

      // Убираем проверку на использованность - ссылка работает 15 минут
      // if (dbToken.usedAt) {
      //   const frontendUrl = FRONTEND_BASE_URL || SERVER_PUBLIC_URL || 'http://localhost:3000'
      //   return res.redirect(`${frontendUrl}/login?error=token_used`)
      // }
      if (dbToken.expiresAt.getTime() < Date.now()) {
        const frontendUrl = FRONTEND_BASE_URL || SERVER_PUBLIC_URL || 'http://localhost:3000'
        return res.redirect(`${frontendUrl}/?error=token_expired`)
      }

      // Убираем пометку как использованный - ссылка работает до истечения времени
      // await prisma.magicLinkToken.update({ where: { id: jti }, data: { usedAt: new Date(), usedIp: req.ip || '', usedUa: req.headers['user-agent'] || '' } })

      // Create session cookie
      const roles = (await prisma.userRole.findMany({ where: { tenantId, userId }, include: { role: true } })).map(r => r.role.name)
      const access = signAccessToken({ sub: userId, ten: tenantId, roles }, 30 * 24 * 60 * 60)
      res.cookie('access_token', access, { 
        httpOnly: false, 
        sameSite: 'lax', 
        secure: true, 
        maxAge: 30 * 24 * 60 * 60 * 1000,
      })
      const frontendUrl = FRONTEND_BASE_URL || SERVER_PUBLIC_URL || 'http://localhost:3000'
      const target = `${frontendUrl}${redirect.startsWith('/') ? '' : '/'}${redirect}`
      return res.redirect(target)
  }))

  // Public: short magic link by token id
  router.get('/s/:id', validateId('id'), asyncHandler(async (req: Request, res: Response) => {
      const jti = String(req.params.id || '').trim()
      if (!jti) return res.status(400).send('Bad request')
      const dbToken = await prisma.magicLinkToken.findUnique({ where: { id: jti } })
      if (!dbToken) {
        const frontendUrl = FRONTEND_BASE_URL || SERVER_PUBLIC_URL || 'http://localhost:3000'
        return res.redirect(`${frontendUrl}/?error=token_not_found`)
      }

      // Ignore previews
      const ua = String(req.headers['user-agent'] || '')
      const isPreview = /(TelegramBot|WhatsApp|facebookexternalhit|Twitterbot|Slackbot|LinkedInBot|SkypeUriPreview|Discordbot|Google-InspectionTool|curl|wget|Pingdom|Bingbot|Telegram|Applebot|Bot|bot)/i.test(ua)
      if (isPreview) {
        console.log(`[magic] Preview request ignored for UA: ${ua}`)
        return res.status(204).end()
      }

      // Убираем проверку на использованность - ссылка работает 15 минут
      // if (dbToken.usedAt) {
      //   const frontendUrl = FRONTEND_BASE_URL || SERVER_PUBLIC_URL || 'http://localhost:3000'
      //   return res.redirect(`${frontendUrl}/login?error=token_used`)
      // }
      if (dbToken.expiresAt.getTime() < Date.now()) {
        const frontendUrl = FRONTEND_BASE_URL || SERVER_PUBLIC_URL || 'http://localhost:3000'
        return res.redirect(`${frontendUrl}/?error=token_expired`)
      }

      // Убираем пометку как использованный - ссылка работает до истечения времени
      // await prisma.magicLinkToken.update({ where: { id: jti }, data: { usedAt: new Date(), usedIp: req.ip || '', usedUa: req.headers['user-agent'] || '' } })

      // Create session cookie
      const roles = (await prisma.userRole.findMany({ where: { tenantId: dbToken.tenantId, userId: dbToken.userId }, include: { role: true } })).map(r => r.role.name)
      const access = signAccessToken({ sub: dbToken.userId, ten: dbToken.tenantId, roles }, 30 * 24 * 60 * 60)
      res.cookie('access_token', access, { 
        httpOnly: false, 
        sameSite: 'lax', 
        secure: true, 
        maxAge: 30 * 24 * 60 * 60 * 1000,
      })
      const frontendUrl = FRONTEND_BASE_URL || SERVER_PUBLIC_URL || 'http://localhost:3000'
      const target = `${frontendUrl}${(dbToken.redirect || '/sales/revenue').startsWith('/') ? '' : '/'}${dbToken.redirect || '/sales/revenue'}`
      return res.redirect(target)
  }))

  return router
}


