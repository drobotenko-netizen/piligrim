import { PrismaClient } from '@prisma/client'
import fetch from 'node-fetch'
import jwt from 'jsonwebtoken'

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || ''

async function sendMessage(chatId: string, text: string, extra?: any) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`
  const body: any = { chat_id: chatId, text, parse_mode: 'HTML', ...extra }
  console.log(`[tg-polling] Sending message to ${chatId}: "${text}"`)
  try {
    const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const result: any = await response.json()
    console.log(`[tg-polling] Send result:`, result)
    if (!result.ok) {
      console.error(`[tg-polling] Failed to send message:`, result)
    }
  } catch (error) {
    console.error(`[tg-polling] Error sending message:`, error)
  }
}

export async function startTelegramPolling(prisma: PrismaClient) {
  if (!TELEGRAM_BOT_TOKEN) {
    console.warn('[tg-polling] TELEGRAM_BOT_TOKEN not set, polling disabled')
    return
  }
  console.log('[tg-polling] starting long polling…')
  let offset = 0
  async function loop() {
    try {
      const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates?timeout=30&offset=${offset}`
      const r = await fetch(url)
      const j: any = await r.json().catch(() => ({ result: [] }))
      const updates = Array.isArray(j.result) ? j.result : []
      for (const up of updates) {
        offset = Math.max(offset, (up.update_id || 0) + 1)
        const msg = up.message || up.edited_message || null
        const chatId = String(msg?.chat?.id || '')
        const text = String(msg?.text || '').trim()
        console.log(`[tg-polling] Received update: chatId=${chatId}, text="${text}", from=${msg?.from?.first_name}`)
        if (!chatId || !text) continue

        if (text.startsWith('/start')) {
          const parts = text.split(' ')
          const code = parts.length > 1 ? parts[1] : ''
          console.log(`[tg-polling] /start command with code: "${code}"`)
          if (!code) {
            console.log(`[tg-polling] No code provided, sending help message`)
            await sendMessage(chatId, 'Привет! Отправьте код привязки, который дал администратор.')
            continue
          }
          // Try one-time TelegramBindRequest first
          const req = await prisma.telegramBindRequest.findUnique({ where: { code } })
          let user = null as any
          if (req && (!req.expiresAt || req.expiresAt > new Date()) && !req.usedAt) {
            user = await prisma.user.findUnique({ where: { id: req.userId } })
          }
          if (!user) {
            console.log(`[tg-polling] Fallback: Looking for user by id: "${code}"`)
            user = await prisma.user.findUnique({ where: { id: code } })
          }
          console.log(`[tg-polling] Found user:`, user ? `${user.fullName} (active: ${user.active})` : 'null')
          if (!user || !user.active) {
            console.log(`[tg-polling] User not found or inactive, sending error message`)
            await sendMessage(chatId, 'Код привязки недействителен или пользователь неактивен. Попросите у администратора новый код.')
            continue
          }
          
          // Create or update Telegram binding
          console.log(`[tg-polling] Creating/updating Telegram binding for user ${user.id}`)
          try {
            await prisma.telegramBinding.upsert({
              where: { tenantId_userId: { tenantId: user.tenantId, userId: user.id } },
              update: { 
                chatId: chatId
              },
              create: { 
                tenantId: user.tenantId,
                userId: user.id,
                chatId: chatId
              }
            })
            // Mark code as used
            if (req) {
              await prisma.telegramBindRequest.update({ where: { code }, data: { usedAt: new Date() } })
            }
            console.log(`[tg-polling] Telegram binding created/updated successfully`)
          } catch (error) {
            console.error(`[tg-polling] Error creating Telegram binding:`, error)
            await sendMessage(chatId, 'Ошибка при привязке аккаунта. Попробуйте позже.')
            continue
          }
          
          console.log(`[tg-polling] Sending success message`)
          await sendMessage(chatId, `Привет, ${String(msg?.from?.first_name || 'пользователь')}! Ваш аккаунт успешно привязан. Теперь вы можете использовать команду /login для входа в систему.`)
          continue
        }

        if (text === '/login') {
          const binding = await (prisma as any).telegramBinding.findFirst({ where: { chatId } })
          if (!binding) {
            await sendMessage(chatId, 'Эта команда доступна только для привязанных аккаунтов. Получите код привязки у администратора.')
            continue
          }
          // issue magic link directly
          const ttlMinutes = 15
          const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000)
          
          try {
            // Invalidate any previous active tokens for this user
            await (prisma as any).magicLinkToken.updateMany({
              where: { userId: binding.userId, usedAt: null, expiresAt: { gt: new Date() } },
              data: { usedAt: new Date() }
            })

            const tokenId = await (prisma as any).magicLinkToken.create({
              data: { tenantId: binding.tenantId, userId: binding.userId, redirect: '/', expiresAt }
            })

            const MAGIC_LINK_SECRET = process.env.MAGIC_LINK_SECRET || 'dev-magic-secret'
            const payload = { jti: tokenId.id, sub: binding.userId, ten: binding.tenantId, redirect: '/' }
            const token = jwt.sign(payload, MAGIC_LINK_SECRET, { algorithm: 'HS256', expiresIn: `${ttlMinutes}m` })
            
            const SERVER_PUBLIC_URL = process.env.SERVER_PUBLIC_URL || 'http://localhost:4000'
            const FRONTEND_BASE_URL = process.env.FRONTEND_BASE_URL || SERVER_PUBLIC_URL || 'http://localhost:3000'
            const url = `${FRONTEND_BASE_URL}/?token=${encodeURIComponent(token)}`
            const shortUrl = `${SERVER_PUBLIC_URL}/api/auth/magic/s/${encodeURIComponent(tokenId.id)}`
            
            await sendMessage(chatId, `Ссылка для входа (действует ${ttlMinutes} мин):\n${shortUrl}`)
          } catch (error) {
            console.error(`[tg-polling] Error creating magic link:`, error)
            await sendMessage(chatId, 'Ошибка при выдаче ссылки. Попробуйте позже.')
          }
          continue
        }

        if (text === '/help') {
          await sendMessage(chatId, 'Команды:\n/start <код_привязки> — привязать аккаунт\n/login — получить ссылку для входа')
          continue
        }

        await sendMessage(chatId, 'Не понимаю. Напишите /login, или /start <код_привязки>.')
      }
    } catch (e) {
      // backoff on error
      await new Promise(r => setTimeout(r, 2000))
    } finally {
      setImmediate(loop)
    }
  }
  loop()
}


