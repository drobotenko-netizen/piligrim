import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { PrismaClient } from '@prisma/client'
import { createPositionsRouter } from './modules/positions/router'
import { createEmployeesRouter } from './modules/employees/router'
import { createTimesheetsRouter } from './modules/timesheets/router'
import { createAdjustmentsRouter } from './modules/adjustments/router'
import { createPayrollRouter } from './modules/payroll/router'
import { createAccountsRouter } from './modules/accounts/router'
import { createPayoutsRouter } from './modules/payouts/router'
import { createCategoriesRouter, createAdminCategoriesTools } from './modules/categories/router'
import { createTransactionsRouter } from './modules/transactions/router'
import { createReportsRouter } from './modules/reports/router'
import { createCounterpartiesRouter } from './modules/counterparties/router'
import { createCounterpartyTypesRouter } from './modules/counterparty-types/router'
import { Request, Response, NextFunction } from 'express'
import { createAuthRouter } from './modules/auth/auth'
import cookieParser from 'cookie-parser'
import { verifyAccessToken } from './utils/jwt'
import { als } from './utils/als'
import { createAdminUsersRouter } from './modules/admin/users'
import { createAdminRolesRouter } from './modules/admin/roles'
import { createAdminAuditRouter } from './modules/admin/audit'
import { installPrismaAuditMiddleware } from './utils/prisma-audit-mw'
import { createIikoRouter } from './modules/iiko/router'
import { createGSheetsRouter, createGSheetsImportRouter } from './modules/gsheets/router'
import balancesRouter from './modules/balances/router'
import { createChannelsRouter } from './modules/channels/router'
import { createTenderTypesRouter } from './modules/tender-types/router'
import { createShiftsRouter } from './modules/shifts/router'
import { createExpenseDocsRouter } from './modules/expense-docs/router'
import { createPaymentsRouter } from './modules/payments/router'
import { createMagicRouter } from './modules/auth/magic'
import { createTelegramWebhook } from './modules/telegram/webhook'
import { startTelegramPolling } from './modules/telegram/polling'

const prisma = new PrismaClient()
installPrismaAuditMiddleware(prisma)
const app = express()
// expose prisma on app, so routers can access it when needed
app.set('prisma', prisma)
// CORS: ограничиваем при наличии ALLOWED_ORIGINS (через запятую)
// Временно отключаем CORS для разработки
app.use(cors({
  origin: true,
  credentials: true
}))
app.use(express.json())
app.use(cookieParser())

// Basic auth context from JWT (cookie) with optional role header override (no insecure defaults)
app.use((req: Request, res: Response, next: NextFunction) => {
  const raw = req.cookies?.access_token || ''
  try {
    if (raw) {
      const payload: any = verifyAccessToken(raw)
      ;(req as any).auth = { userId: payload.sub, tenantId: payload.ten, roles: payload.roles || [] }
      ;(req as any).role = Array.isArray(payload.roles) && payload.roles[0] ? String(payload.roles[0]).toUpperCase() : undefined
    }
  } catch {}
  // Allow explicit role override via header only if provided (no default admin)
  if (!(req as any).role) {
    const headerRole = String(req.get('x-role') || '')
    if (headerRole) (req as any).role = headerRole.toUpperCase()
  }
  als.run({
    userId: (req as any).auth?.userId || null,
    tenantId: (req as any).auth?.tenantId || null,
    ip: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '',
    ua: req.headers['user-agent'] || ''
  }, () => next())
})

// Global API guard: deny by default for /api, allowlist for public endpoints
app.use((req: Request, res: Response, next: NextFunction) => {
  if (!req.path.startsWith('/api')) return next()
  const publicAllowlist = [
    '/api/health',
    '/api/auth/_ping',
    '/api/auth/dev-login',
    '/api/auth/magic/callback',
    // short magic link
    '/api/auth/magic/s',
    // telegram webhook may be public
    '/api/telegram/webhook',
    // temporary endpoint for checking telegram binding
    '/api/admin/users'
  ]
  // allowlist exact or prefix match for short route
  const isPublic = publicAllowlist.some(p => req.path === p || (p.endsWith('/s') && req.path.startsWith(p + '/')))
  if (isPublic) return next()
  const authed = (req as any).auth && (req as any).auth.userId
  if (!authed) return res.status(401).json({ error: 'unauthorized' })
  return next()
})

app.get('/api/health', (_req, res) => res.json({ ok: true }))

app.use('/api/positions', createPositionsRouter(prisma))
app.use('/api/employees', createEmployeesRouter(prisma))
app.use('/api/timesheets', createTimesheetsRouter(prisma))
app.use('/api/adjustments', createAdjustmentsRouter(prisma))
app.use('/api/payroll', createPayrollRouter(prisma))
app.use('/api/accounts', createAccountsRouter(prisma))
app.use('/api/payouts', createPayoutsRouter(prisma))
app.use('/api/categories', createCategoriesRouter(prisma))
app.use('/api/admin/categories', createAdminCategoriesTools(prisma))
app.use('/api/transactions', createTransactionsRouter(prisma))
app.use('/api/reports', createReportsRouter(prisma))
app.use('/api/iiko', createIikoRouter())
app.use('/api/gsheets', createGSheetsRouter())
app.use('/api/gsheets', createGSheetsImportRouter(prisma))
app.use('/api/counterparties', createCounterpartiesRouter(prisma))
app.use('/api/counterparty-types', createCounterpartyTypesRouter(prisma))
app.use('/api/channels', createChannelsRouter(prisma))
app.use('/api/tender-types', createTenderTypesRouter(prisma))
app.use('/api/shifts', createShiftsRouter(prisma))
app.use('/api/expense-docs', createExpenseDocsRouter(prisma))
app.use('/api/payments', createPaymentsRouter(prisma))
app.use('/api/balances', balancesRouter)
app.use('/api/auth', createAuthRouter(prisma))
app.use('/api/auth/magic', createMagicRouter(prisma))
app.use('/api/telegram', createTelegramWebhook(prisma))
app.use('/api/admin/users', createAdminUsersRouter(prisma))
app.use('/api/admin', createAdminRolesRouter(prisma))
app.use('/api/admin/audit', createAdminAuditRouter(prisma))

const PORT = process.env.PORT || 4000
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`)
  if (process.env.TELEGRAM_POLLING === '1') {
    startTelegramPolling(prisma)
  }
})


