import { PrismaClient } from '@prisma/client'
import fetch from 'node-fetch'

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || ''

async function sendMessage(chatId: string, text: string, extra?: any) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`
  const body: any = { chat_id: chatId, text, parse_mode: 'HTML', ...extra }
  console.log(`[tg-polling] Sending message to ${chatId}: "${text}"`)
  try {
    const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const result = await response.json()
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
      const j = await r.json().catch(() => ({ result: [] }))
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
          // Find user by userId (which is used as binding code)
          console.log(`[tg-polling] Looking for user with id: "${code}"`)
          const user = await prisma.user.findUnique({ where: { id: code } })
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
            console.log(`[tg-polling] Telegram binding created/updated successfully`)
          } catch (error) {
            console.error(`[tg-polling] Error creating Telegram binding:`, error)
            await sendMessage(chatId, 'Ошибка при привязке аккаунта. Попробуйте позже.')
            continue
          }
          
          console.log(`[tg-polling] Sending success message`)
          await sendMessage(chatId, `Привет, ${msg.from?.first_name || 'пользователь'}! Ваш аккаунт успешно привязан. Теперь вы можете использовать команду /login для входа в систему.`)
          continue
        }

        if (text === '/login') {
          const binding = await (prisma as any).telegramBinding.findFirst({ where: { chatId } })
          if (!binding) {
            await sendMessage(chatId, 'Эта команда доступна только для привязанных аккаунтов. Получите код привязки у администратора.')
            continue
          }
          // issue via internal endpoint to get signed URL
          const ttlMinutes = 15
          const issueUrl = `${process.env.SERVER_PUBLIC_URL || 'http://localhost:4000'}/api/auth/magic/issue`
          try {
            const issueRes = await fetch(issueUrl, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-role': 'ADMIN' }, body: JSON.stringify({ userId: binding.userId, redirect: '/employees', ttlMinutes }) })
            const issueJson = await issueRes.json()
            if (issueRes.ok && issueJson?.url) {
              await sendMessage(chatId, `Ссылка для входа (действует ${ttlMinutes} мин):\n${issueJson.url}`)
            } else {
              await sendMessage(chatId, 'Не удалось выдать ссылку, попробуйте позже.')
            }
          } catch {
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


