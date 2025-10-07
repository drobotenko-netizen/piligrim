import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import fetch from 'node-fetch'
import crypto from 'crypto'

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || ''
const TELEGRAM_WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || 'dev-secret'
const SERVER_PUBLIC_URL = process.env.SERVER_PUBLIC_URL || `http://localhost:${process.env.PORT || 4000}`

async function sendMessage(chatId: string, text: string, extra?: any) {
  if (!TELEGRAM_BOT_TOKEN) throw new Error('TELEGRAM_BOT_TOKEN not set')
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`
  const body: any = { chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true, ...extra }
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const j: any = await r.json().catch(() => ({}))
  if (!j.ok) throw new Error('telegram_send_failed')
  return j
}

function randomCode(len = 8) {
  return crypto.randomBytes(Math.ceil(len / 2)).toString('hex').slice(0, len)
}

export function createTelegramWebhook(prisma: PrismaClient) {
  const router = Router()

  router.post(`/webhook/${TELEGRAM_WEBHOOK_SECRET}`, async (req: any, res) => {
    try {
      const update: any = req.body || {}
      const msg = update.message || update.edited_message || null
      const chatId = String(msg?.chat?.id || '')
      const text = String(msg?.text || '').trim()
      const from: any = msg?.from
      if (!chatId) return res.json({ ok: true })

      // Log all messages to find chat_id
      console.log(`[telegram] Message from chatId: ${chatId}, text: "${text}", from:`, from)

      // Commands
      if (text.startsWith('/start')) {
        const parts = text.split(' ')
        const code = parts.length > 1 ? parts[1] : ''
        if (!code) {
          await sendMessage(chatId, 'Привет! Отправьте код привязки, который дал администратор.')
          return res.json({ ok: true })
        }
        // Find bind request by code, not used and not expired
        const bind = await (prisma as any).telegramBindRequest.findFirst({ where: { code, usedAt: null, expiresAt: { gt: new Date() } } })
        if (!bind) {
          await sendMessage(chatId, 'Код привязки недействителен или истёк. Попросите у администратора новый код.')
          return res.json({ ok: true })
        }
        // Create/Upsert binding
        await (prisma as any).telegramBinding.upsert({
          where: { tenantId_chatId: { tenantId: bind.tenantId, chatId } },
          update: { userId: bind.userId },
          create: { tenantId: bind.tenantId, userId: bind.userId, chatId }
        })
        await (prisma as any).telegramBindRequest.update({ where: { id: bind.id }, data: { usedAt: new Date() } })
        await sendMessage(chatId, 'Готово! Аккаунт привязан. Напишите /login, чтобы получить ссылку для входа.')
        return res.json({ ok: true })
      }

      if (text === '/login') {
        // Resolve binding
        const binding = await (prisma as any).telegramBinding.findFirst({ where: { chatId } })
        if (!binding) {
          await sendMessage(chatId, 'Эта команда доступна только для привязанных аккаунтов. Получите код привязки у администратора.')
          return res.json({ ok: true })
        }
        // Issue magic link directly (like in polling.ts)
        const ttlMinutes = 15
        const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000)
        try {
          // Create magic link token directly
          const tokenId = await (prisma as any).magicLinkToken.create({
            data: { tenantId: binding.tenantId, userId: binding.userId, redirect: '/sales/revenue', expiresAt }
          })

          const jwt = require('jsonwebtoken')
          const MAGIC_LINK_SECRET = process.env.MAGIC_LINK_SECRET || 'dev-magic-secret'
          const payload = { jti: tokenId.id, sub: binding.userId, ten: binding.tenantId, redirect: '/sales/revenue' }
          const token = jwt.sign(payload, MAGIC_LINK_SECRET, { algorithm: 'HS256', expiresIn: `${ttlMinutes}m` })
          
          const FRONTEND_BASE_URL = process.env.FRONTEND_BASE_URL || SERVER_PUBLIC_URL || 'http://localhost:3000'
          const url = `${FRONTEND_BASE_URL}/?token=${encodeURIComponent(token)}`
          
          await sendMessage(chatId, `Ссылка для входа (действует ${ttlMinutes} мин):\n${url}\n\nЕсли видите Token already used — скопируйте ссылку и откройте в браузере вручную.`)
        } catch (error) {
          console.error(`[telegram-webhook] Error creating magic link:`, error)
          await sendMessage(chatId, 'Ошибка при выдаче ссылки. Попробуйте позже.')
        }
        return res.json({ ok: true })
      }

      // Fallback: help
      if (text === '/help') {
        await sendMessage(chatId, 'Команды:\n/start <код_привязки> — привязать аккаунт\n/login — получить ссылку для входа')
        return res.json({ ok: true })
      }

      // default reply
      await sendMessage(chatId, 'Не понимаю. Напишите /login, или /start <код_привязки>.')
      return res.json({ ok: true })
    } catch (e) {
      return res.json({ ok: true })
    }
  })

  return router
}


