import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { getTenant } from '../../utils/tenant'
import { getUserId, requireRole } from '../../utils/auth'

export function createTransactionsRouter(prisma: PrismaClient) {
  const router = Router()

  // POST /transactions/clear
  router.post('/clear', requireRole('ADMIN'), async (req, res) => {
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

  // POST /transactions/load-from-gsheets
  router.post('/load-from-gsheets', requireRole('ADMIN'), async (req, res) => {
    try {
      const { spreadsheetId, gid } = req.body || {}
      if (!spreadsheetId) return res.status(400).json({ error: 'spreadsheetId required' })
      
      const tenant = await getTenant(prisma, req as any)
      const userId = getUserId(req as any)
      
      // Очищаем старые отметки incompleteTransfer в GsCashflowRow
      await prisma.gsCashflowRow.updateMany({
        where: { 
          spreadsheet: spreadsheetId,
          ...(gid ? { sheet: 'ДДС месяц' } : {}),
          raw: { contains: '"incompleteTransfer":true' }
        },
        data: { raw: null }
      })
      
      // Получаем все записи из GsCashflowRow
      const gsRows = await prisma.gsCashflowRow.findMany({
        where: { 
          spreadsheet: spreadsheetId,
          ...(gid ? { sheet: 'ДДС месяц' } : {})
        },
        orderBy: { date: 'asc' }
      })
      
      let created = 0
      let skipped = 0
      
      // Сначала группируем переводы по сумме (без привязки к дате)
      const transferGroups = new Map<string, any[]>()
      const nonTransferRows: any[] = []
      
      for (const row of gsRows) {
        if (!row.amount || !row.date) {
          skipped++
          continue
        }
        
        if (row.fund?.includes('Перевод')) {
          const amountKey = Math.abs(row.amount)
          const groupKey = `${amountKey}` // Только сумма, без даты
          
          if (!transferGroups.has(groupKey)) {
            transferGroups.set(groupKey, [])
          }
          transferGroups.get(groupKey)?.push(row)
        } else {
          nonTransferRows.push(row)
        }
      }
      
      // Обрабатываем переводы - создаем одну транзакцию для каждой пары
      let fullPairs = 0
      let incompletePairs = 0
      
      for (const [groupKey, group] of transferGroups.entries()) {
        const outgoing = group.filter(r => r.amount < 0)
        const incoming = group.filter(r => r.amount > 0)
        
        // Ищем пары в соседних днях (±2 дня)
        const pairedOutgoing: any[] = []
        const pairedIncoming: any[] = []
        const unpairedOutgoing: any[] = []
        const unpairedIncoming: any[] = []
        
        for (const outRow of outgoing) {
          let foundPair = false
          for (const inRow of incoming) {
            if (pairedIncoming.includes(inRow)) continue
            
            const daysDiff = Math.abs(
              (outRow.date.getTime() - inRow.date.getTime()) / (1000 * 60 * 60 * 24)
            )
            
            if (daysDiff <= 2) { // В пределах 2 дней
              pairedOutgoing.push(outRow)
              pairedIncoming.push(inRow)
              foundPair = true
              break
            }
          }
          
          if (!foundPair) {
            unpairedOutgoing.push(outRow)
          }
        }
        
        // Добавляем неспаренные поступления
        for (const inRow of incoming) {
          if (!pairedIncoming.includes(inRow)) {
            unpairedIncoming.push(inRow)
          }
        }
        
        // Создаем транзакции для найденных пар
        for (let i = 0; i < pairedOutgoing.length; i++) {
          const fromRow = pairedOutgoing[i]
          const toRow = pairedIncoming[i]
          fullPairs++
          
          // Находим или создаем счета
          let fromAccount = await prisma.account.findFirst({
            where: { tenantId: tenant.id, name: fromRow.wallet }
          })
          if (!fromAccount && fromRow.wallet) {
            fromAccount = await prisma.account.create({
              data: {
                tenantId: tenant.id,
                name: fromRow.wallet,
                kind: fromRow.wallet.toLowerCase().includes('наличн') ? 'cash' : 'bank',
                createdBy: userId
              }
            })
          }
          
          let toAccount = await prisma.account.findFirst({
            where: { tenantId: tenant.id, name: toRow.wallet }
          })
          if (!toAccount && toRow.wallet) {
            toAccount = await prisma.account.create({
              data: {
                tenantId: tenant.id,
                name: toRow.wallet,
                kind: toRow.wallet.toLowerCase().includes('наличн') ? 'cash' : 'bank',
                createdBy: userId
              }
            })
          }
          
          // Создаем ДВЕ транзакции для перевода: расход и доход
          const transferAmount = Math.abs(fromRow.amount)
          const transferNote = `Перевод: ${fromRow.wallet} → ${toRow.wallet}`
          
          // Находим СТАТЬИ для переводов (не категории!)
          const expenseTransferArticle = await prisma.category.findFirst({
            where: { 
              tenantId: tenant.id, 
              name: 'Переводы между счетами', 
              type: 'expense',
              parentId: { not: null }
            }
          })
          const incomeTransferArticle = await prisma.category.findFirst({
            where: { 
              tenantId: tenant.id, 
              name: 'Переводы между счетами', 
              type: 'income',
              parentId: { not: null }
            }
          })
          
          // Расход со счета-источника
          await prisma.transaction.create({
            data: {
              tenantId: tenant.id,
              kind: 'expense',
              paymentDate: fromRow.date,
              accrualYear: fromRow.date.getFullYear(),
              accrualMonth: fromRow.date.getMonth() + 1,
              accountId: fromAccount?.id,
              fromAccountId: fromAccount?.id,
              toAccountId: toAccount?.id,
              categoryId: expenseTransferArticle?.id,
              amount: -transferAmount, // Отрицательная сумма для расхода
              note: transferNote,
              source: 'gsheets',
              createdBy: userId
            }
          })
          
          // Доход на счет-получатель
          await prisma.transaction.create({
            data: {
              tenantId: tenant.id,
              kind: 'income',
              paymentDate: toRow.date,
              accrualYear: toRow.date.getFullYear(),
              accrualMonth: toRow.date.getMonth() + 1,
              accountId: toAccount?.id,
              fromAccountId: fromAccount?.id,
              toAccountId: toAccount?.id,
              categoryId: incomeTransferArticle?.id,
              amount: transferAmount, // Положительная сумма для дохода
              note: transferNote,
              source: 'gsheets',
              createdBy: userId
            }
          })
          
          created += 2
        }
        
        // Отмечаем неспаренные записи
        const allUnpaired = [...unpairedOutgoing, ...unpairedIncoming]
        if (allUnpaired.length > 0) {
          incompletePairs++
          // Неполный перевод - НЕ создаем транзакции, только отмечаем в GsCashflowRow
          for (const row of allUnpaired) {
            // Отмечаем запись в GsCashflowRow как неполный перевод
            const originalData = JSON.parse(row.raw || '[]')
            const newRawData = {
              originalData: originalData,
              incompleteTransfer: true,
              transferType: row.amount < 0 ? 'outgoing_only' : 'incoming_only'
            }
            
            await prisma.gsCashflowRow.update({
              where: { id: row.id },
              data: { raw: JSON.stringify(newRawData) }
            })
          }
        }
      }
      
      // Обрабатываем остальные транзакции (не переводы)
      for (const row of nonTransferRows) {
        // Находим или создаем счет
        let account = null
        if (row.wallet) {
          account = await prisma.account.findFirst({
            where: { 
              tenantId: tenant.id, 
              name: row.wallet 
            }
          })
          
          if (!account) {
            account = await prisma.account.create({
              data: {
                tenantId: tenant.id,
                name: row.wallet,
                kind: row.wallet.toLowerCase().includes('наличн') ? 'cash' : 'bank',
                createdBy: userId
              }
            })
          }
        }
        
        // Находим категорию по фонду
        let category = null
        if (row.fund) {
          category = await prisma.category.findFirst({
            where: { 
              tenantId: tenant.id, 
              fund: row.fund 
            }
          })
        }
        
        // Находим контрагента
        let counterparty = null
        if (row.supplier) {
          counterparty = await prisma.counterparty.findFirst({
            where: { 
              tenantId: tenant.id, 
              name: row.supplier 
            }
          })
        }
        
        // Специальная логика для эквайрингов - привязываем к Сбербанку
        if (row.fund?.includes('Эквайринг') || row.comment?.toLowerCase().includes('эквайринг')) {
          counterparty = await prisma.counterparty.findFirst({
            where: { 
              tenantId: tenant.id, 
              name: 'Сбербанк' 
            }
          })
          
          // Если Сбербанк не найден, создаем его
          if (!counterparty) {
            counterparty = await prisma.counterparty.create({
              data: {
                tenantId: tenant.id,
                name: 'Сбербанк',
                kind: 'bank',
                createdBy: userId
              }
            })
          }
        }
        
        // Определяем тип транзакции
        let kind = 'expense'
        if (row.flowType === 'Поступление') {
          kind = 'income'
        }
        
        // Создаем транзакцию
        await prisma.transaction.create({
          data: {
            tenantId: tenant.id,
            kind,
            paymentDate: row.date,
            accrualYear: row.date.getFullYear(),
            accrualMonth: row.date.getMonth() + 1,
            accountId: account?.id,
            categoryId: category?.id,
            counterpartyId: counterparty?.id,
            activity: 'Операционная',
            amount: row.amount,
            note: row.comment || undefined,
            source: 'gsheets',
            createdBy: userId
          }
        })
        
        created++
      }
      
      res.json({ 
        created, 
        skipped, 
        total: gsRows.length
      })
    } catch (e: any) {
      res.status(500).json({ error: String(e?.message || e) })
    }
  })

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
    })
    const parsed = bodySchema.safeParse(req.body || {})
    if (!parsed.success) return res.status(400).json({ error: 'bad request', details: parsed.error.flatten() })
    const body = parsed.data
    const tenant = await getTenant(prisma, req as any)
    if (!['expense','income','adjustment'].includes(body.kind)) return res.status(400).json({ error: 'invalid kind' })
    if (!body.paymentDate || !body.accountId || !Number.isFinite(body.amount)) return res.status(400).json({ error: 'bad request' })
    // Наследование activity из категории, если не задано явно
    let activity: string | null = body.activity ?? null
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
    if (Object.prototype.hasOwnProperty.call(body, 'amount') && Number.isFinite(body.amount)) patch.amount = Math.trunc(Math.abs(body.amount as number))
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
