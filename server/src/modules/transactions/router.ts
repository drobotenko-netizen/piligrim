import { Router, Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { getTenant } from '../../utils/tenant'
import { getUserId, requireRole } from '../../utils/auth'
import { asyncHandler } from '../../utils/common-middleware'
import { GsheetsTransactionImporter } from '../../services/gsheets-transaction-importer'

export function createTransactionsRouter(prisma: PrismaClient) {
  const router = Router()

  // POST /transactions/clear
  router.post('/clear', requireRole(['ADMIN']), async (req, res) => {
    try {
      const tenant = await getTenant(prisma, req as any)
      // Удаляем транзакции с 01.01.2025, оставляя начальные остатки на 31.12.2024
      const deleted = await prisma.transaction.deleteMany({
        where: { 
          tenantId: tenant.id,
          paymentDate: { gte: new Date('2025-01-01T00:00:00.000Z') }
        }
      })
      res.json({ deleted: deleted.count })
    } catch (e: any) {
      res.status(500).json({ error: String(e?.message || e) })
    }
  })



  // POST /transactions/load-from-gsheets - Импортировать транзакции из Google Sheets
  router.post('/load-from-gsheets', requireRole(['ADMIN']), asyncHandler(async (req: Request, res: Response) => {
    const { spreadsheetId, gid: rawGid } = req.body || {}
    if (!spreadsheetId) {
      return res.status(400).json({ error: 'spreadsheetId required' })
    }
      
    const tenant = await getTenant(prisma, req as any)
    const userId = getUserId(req as any) || 'system'
    
    // Используем сервис для импорта транзакций
    const importer = new GsheetsTransactionImporter(prisma)
    const result = await importer.importTransactions(
      String(spreadsheetId),
      tenant.id,
      userId,
      rawGid as any
    )
    
    // Финальная нормализация типов контрагентов
      try {
        const vendorIds: Array<{ id: string }> = await (prisma as any).$queryRawUnsafe(
          `SELECT DISTINCT t.counterpartyId AS id
           FROM Transaction t
           LEFT JOIN Category c ON c.id = t.categoryId
           LEFT JOIN Category r ON r.id = c.parentId
           WHERE t.tenantId = ? AND t.counterpartyId IS NOT NULL AND t.kind = 'expense'
             AND (
               c.name = 'Поставщики' OR
               (r.kind = 'COGS') OR
               (r.name = 'Себестоимость')
             )`,
          tenant.id
        )
        const ids = vendorIds.map(v => String(v.id)).filter(Boolean)
        if (ids.length > 0) {
        await prisma.counterparty.updateMany({ 
          where: { id: { in: ids } }, 
          data: { kind: 'supplier' } 
        })
        }
      } catch {}

      res.json({ 
      created: result.created,
      fullPairs: result.fullPairs,
      incompletePairs: result.incompletePairs,
      skipped: result.skipped
    })
  }))


  router.get('/', async (req, res) => {
    if (!prisma.transaction) return res.json({ items: [] })
    const { kind, accountId, categoryId, counterpartyId, from, to, startDate, endDate, activity, orderBy = 'paymentDate', orderDir = 'desc', page = '1', pageSize = '50', view } = req.query as any
    const tenant = await getTenant(prisma, req as any)
    const where: any = { tenantId: tenant.id }
    if (kind) where.kind = String(kind)
    if (accountId) where.accountId = String(accountId)
    if (categoryId) where.categoryId = String(categoryId)
    if (activity) where.category = { activity: String(activity) }
    if (counterpartyId) where.counterpartyId = String(counterpartyId)
    const gteDate = startDate || from
    const lteDate = endDate || to
    if (gteDate || lteDate) where.paymentDate = {
      ...(gteDate ? { gte: new Date(String(gteDate)) } : {}),
      ...(lteDate ? { lt: new Date(String(lteDate)) } : {}), // Используем lt вместо lte
    }
    const safeOrderBy = ['paymentDate','createdAt','amount'].includes(String(orderBy)) ? String(orderBy) : 'paymentDate'
    const safeOrderDir = String(orderDir).toLowerCase() === 'asc' ? 'asc' : 'desc'
    const take = Math.max(1, Math.min(10000, Number(pageSize) || 50))
    const currentPage = Math.max(1, Number(page) || 1)
    const skip = (currentPage - 1) * take

    // aggregated view for transfers
    if (view === 'transfer-aggregated' && (!kind || kind === 'transfer')) {
      const tx = await prisma.transaction.findMany({ where: { ...where, kind: 'transfer' }, orderBy: [{ [safeOrderBy]: safeOrderDir as any }, { createdAt: safeOrderDir as any }] })
      // build pairs: negative + positive with same date and abs(amount)
      const used = new Set<string>()
      const items: any[] = []
      for (const t of tx) {
        if (used.has(t.id) || t.amount >= 0) continue
        const pair = tx.find(x => !used.has(x.id) && x.paymentDate.getTime() === t.paymentDate.getTime() && x.amount === -t.amount)
        items.push({
          id: t.id,
          kind: 'transfer',
          paymentDate: t.paymentDate,
          amount: Math.abs(t.amount),
          fromAccountId: t.accountId,
          toAccountId: pair?.accountId || null,
          note: t.note || pair?.note || null
        })
        used.add(t.id)
        if (pair) used.add(pair.id)
      }
      const total = items.length
      const paged = items.slice(skip, skip + take)
      return res.json({ items: paged, meta: { page: currentPage, pageSize: take, total } })
    }

    const [total, items] = await Promise.all([
      prisma.transaction.count({ where }),
      prisma.transaction.findMany({ where, include: { account: true, category: true, employee: true, counterparty: true }, orderBy: [{ [safeOrderBy]: safeOrderDir as any }, { createdAt: safeOrderDir as any }], skip, take })
    ])
    res.json({ items, meta: { page: currentPage, pageSize: take, total } })
  })

  router.post('/', requireRole(['ADMIN','ACCOUNTANT']), async (req, res) => {
    if (!prisma.transaction) return res.status(503).json({ error: 'transactions model not available (run prisma migrate/generate)' })
    const bodySchema = z.object({
      kind: z.enum(['expense','income','adjustment']),
      paymentDate: z.string().min(1),
      accrualYear: z.number().nullable().optional(),
      accrualMonth: z.number().nullable().optional(),
      accountId: z.string().min(1),
      categoryId: z.string().nullable().optional(),
      employeeId: z.string().nullable().optional(),
      counterpartyId: z.string().nullable().optional(),
      method: z.string().nullable().optional(),
      amount: z.number(),
      note: z.string().nullable().optional(),
      source: z.string().nullable().optional(),
      activity: z.enum(['operating','investing','financing']).nullable().optional(),
    })
    const parsed = bodySchema.safeParse(req.body || {})
    if (!parsed.success) return res.status(400).json({ error: 'bad request', details: parsed.error.flatten() })
    const body = parsed.data
    const tenant = await getTenant(prisma, req as any)
    if (!['expense','income','adjustment'].includes(body.kind)) return res.status(400).json({ error: 'invalid kind' })
    if (!body.paymentDate || !body.accountId || !Number.isFinite(body.amount)) return res.status(400).json({ error: 'bad request' })
    // Наследование activity из категории, если не задано явно
    let activity: string | null = (body as any).activity ?? null
    if (!activity && body.categoryId && (prisma as any).category) {
      const cat = await prisma.category.findUnique({ where: { id: body.categoryId } })
      activity = cat?.activity ?? null
    }
    const created = await prisma.transaction.create({ data: {
      tenantId: tenant.id,
      createdBy: getUserId(req as any),
      kind: body.kind,
      paymentDate: new Date(body.paymentDate),
      accrualYear: body.accrualYear ?? null,
      accrualMonth: body.accrualMonth ?? null,
      accountId: body.accountId,
      categoryId: body.categoryId ?? null,
      employeeId: body.employeeId ?? null,
      counterpartyId: body.counterpartyId ?? null,
      activity,
      method: body.method ?? null,
      amount: Math.trunc(Math.abs(body.amount)),
      note: body.note ?? null,
      source: body.source ?? null,
    } })
    res.json({ data: created })
  })

  // PATCH update transaction (expense/income/adjustment) — transfers not supported here
  router.patch('/:id', requireRole(['ADMIN','ACCOUNTANT']), async (req, res) => {
    if (!prisma.transaction) return res.status(503).json({ error: 'transactions model not available (run prisma migrate/generate)' })
    const id = req.params.id
    const bodySchema = z.object({
      kind: z.enum(['expense','income','adjustment']).optional(),
      paymentDate: z.string().min(1).optional(),
      accrualYear: z.number().nullable().optional(),
      accrualMonth: z.number().nullable().optional(),
      accountId: z.string().min(1).optional(),
      categoryId: z.string().nullable().optional(),
      employeeId: z.string().nullable().optional(),
      counterpartyId: z.string().nullable().optional(),
      method: z.string().nullable().optional(),
      amount: z.number().optional(),
      note: z.string().nullable().optional(),
      activity: z.enum(['operating','investing','financing']).nullable().optional(),
    })
    const parsed = bodySchema.safeParse(req.body || {})
    if (!parsed.success) return res.status(400).json({ error: 'bad request', details: parsed.error.flatten() })
    const body = parsed.data
    // forbid editing transfer via this endpoint
    const existing = await prisma.transaction.findUnique({ where: { id } })
    if (!existing) return res.status(404).json({ error: 'not_found' })
    if (existing.kind === 'transfer') return res.status(400).json({ error: 'unsupported', message: 'Use dedicated transfer edit endpoint' })

    // inherit activity from category if explicitly null and categoryId provided
    let activity: string | undefined
    if (Object.prototype.hasOwnProperty.call(body, 'activity')) {
      activity = body.activity === null ? null as any : body.activity
    }
    if (activity == null && body.categoryId && (prisma as any).category) {
      const cat = await prisma.category.findUnique({ where: { id: body.categoryId } })
      activity = cat?.activity ?? undefined
    }

    const patch: any = {}
    if (body.kind) patch.kind = body.kind
    if (body.paymentDate) patch.paymentDate = new Date(body.paymentDate)
    if (Object.prototype.hasOwnProperty.call(body, 'accrualYear')) patch.accrualYear = body.accrualYear ?? null
    if (Object.prototype.hasOwnProperty.call(body, 'accrualMonth')) patch.accrualMonth = body.accrualMonth ?? null
    if (body.accountId) patch.accountId = body.accountId
    if (Object.prototype.hasOwnProperty.call(body, 'categoryId')) patch.categoryId = body.categoryId ?? null
    if (Object.prototype.hasOwnProperty.call(body, 'employeeId')) patch.employeeId = body.employeeId ?? null
    if (Object.prototype.hasOwnProperty.call(body, 'counterpartyId')) patch.counterpartyId = body.counterpartyId ?? null
    if (Object.prototype.hasOwnProperty.call(body, 'method')) patch.method = body.method ?? null
    if (Object.prototype.hasOwnProperty.call(body, 'amount') && Number.isFinite((body as any).amount)) patch.amount = Math.trunc(Math.abs((body as any).amount as number))
    if (Object.prototype.hasOwnProperty.call(body, 'note')) patch.note = body.note ?? null
    if (activity !== undefined) patch.activity = activity

    const updated = await prisma.transaction.update({ where: { id }, data: patch })
    res.json({ data: updated })
  })

  router.post('/transfer', async (req, res) => {
    if (!prisma.transaction) return res.status(503).json({ error: 'transactions model not available (run prisma migrate/generate)' })
    const bodySchema = z.object({
      paymentDate: z.string().min(1),
      fromAccountId: z.string().min(1),
      toAccountId: z.string().min(1),
      amount: z.number(),
      note: z.string().nullable().optional(),
    })
    const parsed = bodySchema.safeParse(req.body || {})
    if (!parsed.success) return res.status(400).json({ error: 'bad request', details: parsed.error.flatten() })
    const body = parsed.data as any
    const tenant = await getTenant(prisma, req as any)
    const date = new Date(body.paymentDate)
    const amount = Math.trunc(Math.abs(body.amount))
    const userId = getUserId(req as any)
    const transferNote = body.note || `Перевод: ${body.fromAccountId} → ${body.toAccountId}`
    
    // Находим СТАТЬИ для переводов (не категории!)
    const expenseTransferArticle = await prisma.category.findFirst({
      where: { 
        tenantId: tenant.id, 
        name: 'Переводы между счетами', 
        type: 'expense',
        parentId: { not: null } // Это статья, у нее есть родитель
      }
    })
    const incomeTransferArticle = await prisma.category.findFirst({
      where: { 
        tenantId: tenant.id, 
        name: 'Переводы между счетами', 
        type: 'income',
        parentId: { not: null } // Это статья, у нее есть родитель
      }
    })
    
    const [outTxn, inTxn] = await prisma.$transaction([
      prisma.transaction.create({ data: { tenantId: tenant.id, createdBy: userId, kind: 'expense', paymentDate: date, accountId: body.fromAccountId, amount: -amount, note: transferNote, fromAccountId: body.fromAccountId, toAccountId: body.toAccountId, categoryId: expenseTransferArticle?.id } }),
      prisma.transaction.create({ data: { tenantId: tenant.id, createdBy: userId, kind: 'income', paymentDate: date, accountId: body.toAccountId, amount, note: transferNote, fromAccountId: body.fromAccountId, toAccountId: body.toAccountId, categoryId: incomeTransferArticle?.id } })
    ])
    res.json({ data: { outTxn, inTxn } })
  })

  router.delete('/:id', async (req, res) => {
    if (!prisma.transaction) return res.status(503).json({ error: 'transactions model not available (run prisma migrate/generate)' })
    const id = req.params.id
    await prisma.transaction.delete({ where: { id } })
    res.json({ ok: true })
  })

  return router
}
