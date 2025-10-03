import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { getTenant } from '../../utils/tenant'
import { requireRole, getUserId } from '../../utils/auth'

export function createPaymentsRouter(prisma: PrismaClient) {
  const router = Router()

  // GET /api/payments - список платежей
  router.get('/', async (req, res) => {
    try {
      const tenant = await getTenant(prisma, req as any)
      const { from, to, accountId, counterpartyId } = req.query as any
      
      const where: any = { tenantId: tenant.id }
      if (accountId) where.accountId = String(accountId)
      
      if (from || to) {
        where.date = {}
        if (from) (where.date as any).gte = new Date(String(from))
        if (to) (where.date as any).lt = new Date(String(to))
      }

      // Фильтрация по контрагенту (поставщику)
      if (counterpartyId) {
        where.OR = [
          // Прямые платежи поставщику
          { 
            expenseDoc: { 
              vendorId: String(counterpartyId) 
            } 
          },
          // Платежи через аллокации
          {
            allocations: {
              some: {
                expenseDoc: {
                  vendorId: String(counterpartyId)
                }
              }
            }
          }
        ]
      }

      const items = await prisma.payment.findMany({
        where,
        include: {
          account: true,
          expenseDoc: {
            include: {
              vendor: true,
              category: true
            }
          },
          allocations: {
            include: {
              expenseDoc: {
                include: {
                  vendor: true
                }
              }
            }
          }
        },
        orderBy: { date: 'desc' }
      })

      // Если запрашивается анализ поставщика, возвращаем данные в специальном формате
      if (counterpartyId) {
        const payments = items.map(item => ({
          id: item.id,
          date: item.date.toISOString().slice(0, 10),
          amount: item.amount,
          description: (item as any).description ?? item.memo ?? null,
          vendor: item.expenseDoc?.vendor?.name || 'Неизвестный поставщик'
        }))
        
        res.json({ payments })
      } else {
        res.json({ items })
      }
    } catch (e: any) {
      res.status(500).json({ error: String(e?.message || e) })
    }
  })

  // POST /api/payments - создать платёж с распределением
  router.post('/', requireRole(['ADMIN', 'ACCOUNTANT']), async (req, res) => {
    try {
      const schema = z.object({
        expenseDocId: z.string().optional(),
        accountId: z.string().min(1),
        date: z.string().min(1),
        amount: z.number(),
        activity: z.enum(['operating', 'investing', 'financing']).optional(),
        memo: z.string().optional(),
        allocations: z.array(z.object({
          expenseDocId: z.string(),
          amount: z.number()
        })).optional()
      })
      
      const parsed = schema.safeParse(req.body)
      if (!parsed.success) {
        return res.status(400).json({ error: 'bad request', details: parsed.error.flatten() })
      }

      const tenant = await getTenant(prisma, req as any)
      const userId = getUserId(req as any)

      const paymentAmount = Math.round(parsed.data.amount * 100) // в копейки

      // Валидация: сумма allocations не должна превышать сумму платежа
      if (parsed.data.allocations) {
        const totalAllocated = parsed.data.allocations.reduce(
          (sum, a) => sum + Math.round(a.amount * 100), 
          0
        )
        if (totalAllocated > paymentAmount) {
          return res.status(400).json({ 
            error: 'invalid_allocations', 
            message: 'Сумма распределения превышает сумму платежа' 
          })
        }
      }

      // Создаём платёж и распределения в транзакции
      const result = await prisma.$transaction(async (tx) => {
        // Создаем платёж
        const payment = await tx.payment.create({
          data: {
            tenantId: tenant.id,
            expenseDocId: parsed.data.expenseDocId || null,
            accountId: parsed.data.accountId,
            date: new Date(parsed.data.date),
            amount: paymentAmount,
            activity: parsed.data.activity || null,
            memo: parsed.data.memo,
            createdBy: userId
          }
        })

        // Создаём распределения и обновляем документы
        const allocations = []
        if (parsed.data.allocations) {
          for (const alloc of parsed.data.allocations) {
            const allocAmount = Math.round(alloc.amount * 100)
            
            // Проверяем, что сумма не превышает остаток документа
            const doc = await tx.expenseDoc.findUnique({
              where: { id: alloc.expenseDocId }
            })
            
            if (!doc) {
              throw new Error(`Документ ${alloc.expenseDocId} не найден`)
            }

            const remaining = doc.amount - doc.paidAmount
            if (allocAmount > remaining) {
              throw new Error(
                `Сумма распределения (${allocAmount/100}) превышает остаток документа (${remaining/100})`
              )
            }

            // Создаем распределение
            const allocation = await tx.paymentAllocation.create({
              data: {
                paymentId: payment.id,
                expenseDocId: alloc.expenseDocId,
                amount: allocAmount
              }
            })
            allocations.push(allocation)

            // Обновляем paidAmount документа
            const newPaidAmount = doc.paidAmount + allocAmount
            let newStatus = doc.status
            if (newPaidAmount >= doc.amount) {
              newStatus = 'paid'
            } else if (newPaidAmount > 0) {
              newStatus = 'partial'
            }

            await tx.expenseDoc.update({
              where: { id: alloc.expenseDocId },
              data: { 
                paidAmount: newPaidAmount,
                status: newStatus,
                updatedBy: userId
              }
            })
          }
        }

        // Создаем CashTx для платежа
        await tx.cashTx.create({
          data: {
            tenantId: tenant.id,
            accountId: parsed.data.accountId,
            date: new Date(parsed.data.date),
            direction: 'out',
            amount: paymentAmount,
            sourceType: 'payment',
            sourceId: payment.id,
            activity: parsed.data.activity || 'operating',
            paymentId: payment.id,
            memo: parsed.data.memo
          }
        })

        return { payment, allocations }
      })

      res.json({ data: result })
    } catch (e: any) {
      res.status(500).json({ error: String(e?.message || e) })
    }
  })

  // DELETE /api/payments/:id - отменить платёж (с пересчётом paid_amount)
  router.delete('/:id', requireRole(['ADMIN', 'ACCOUNTANT']), async (req, res) => {
    try {
      const userId = getUserId(req as any)

      await prisma.$transaction(async (tx) => {
        // Получаем платёж с распределениями
        const payment = await tx.payment.findUnique({
          where: { id: req.params.id },
          include: { allocations: true }
        })

        if (!payment) {
          throw new Error('Платёж не найден')
        }

        // Обновляем документы - вычитаем суммы распределений
        for (const alloc of payment.allocations) {
          const doc = await tx.expenseDoc.findUnique({
            where: { id: alloc.expenseDocId }
          })

          if (doc) {
            const newPaidAmount = doc.paidAmount - alloc.amount
            let newStatus = doc.status
            if (newPaidAmount === 0) {
              newStatus = 'unpaid'
            } else if (newPaidAmount < doc.amount) {
              newStatus = 'partial'
            }

            await tx.expenseDoc.update({
              where: { id: alloc.expenseDocId },
              data: { 
                paidAmount: Math.max(0, newPaidAmount),
                status: newStatus,
                updatedBy: userId
              }
            })
          }
        }

        // Удаляем распределения
        await tx.paymentAllocation.deleteMany({
          where: { paymentId: req.params.id }
        })

        // Удаляем связанные CashTx
        await tx.cashTx.deleteMany({
          where: { paymentId: req.params.id }
        })

        // Удаляем платёж
        await tx.payment.delete({
          where: { id: req.params.id }
        })
      })

      res.json({ ok: true })
    } catch (e: any) {
      res.status(500).json({ error: String(e?.message || e) })
    }
  })

  // POST /api/payments/load-from-gsheets - импорт из Google Sheets в ExpenseDoc + Payment
  router.post('/load-from-gsheets', requireRole(['ADMIN']), async (req, res) => {
    try {
      const { spreadsheetId, gid } = req.body || {}
      if (!spreadsheetId) return res.status(400).json({ error: 'spreadsheetId required' })
      
      const tenant = await getTenant(prisma, req as any)
      const userId = getUserId(req as any)
      
      // 1. Удаляем все старые Payment и ExpenseDoc
      const deletedPayments = await prisma.payment.deleteMany({
        where: { tenantId: tenant.id }
      })
      const deletedDocs = await prisma.expenseDoc.deleteMany({
        where: { tenantId: tenant.id }
      })
      
      // 2. Очищаем ВСЕ отметки (notImported и incompleteTransfer) в GsCashflowRow
      await prisma.gsCashflowRow.updateMany({
        where: { 
          spreadsheet: spreadsheetId,
          OR: [
            { raw: { contains: '"notImported":true' } },
            { raw: { contains: '"incompleteTransfer":true' } }
          ]
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
      
      let createdDocs = 0
      let createdPayments = 0
      let createdTransfers = 0
      let skipped = 0
      
      // Сначала группируем переводы для спаривания
      const transferGroups = new Map<string, any[]>()
      const expenseRows: any[] = []
      
      for (const row of gsRows) {
        if (!row.amount || !row.date) {
          skipped++
          const originalData = row.raw ? JSON.parse(row.raw) : {}
          await prisma.gsCashflowRow.update({
            where: { id: row.id },
            data: { raw: JSON.stringify({ ...originalData, notImported: true, notImportedReason: 'no_amount_or_date' }) }
          })
          continue
        }
        
        // ПЕРЕВОДЫ - группируем для спаривания
        if (row.fund?.includes('Перевод')) {
          const amountKey = Math.abs(row.amount)
          const groupKey = `${amountKey}` // Только сумма, без даты
          
          if (!transferGroups.has(groupKey)) {
            transferGroups.set(groupKey, [])
          }
          transferGroups.get(groupKey)?.push(row)
        } 
        // ДОХОДЫ (определяется по flowType!) - пропускаем, это не ExpenseDoc
        else if (row.flowType === 'Поступление') {
          skipped++
          const originalData = row.raw ? JSON.parse(row.raw) : {}
          await prisma.gsCashflowRow.update({
            where: { id: row.id },
            data: { raw: JSON.stringify({ ...originalData, notImported: true, notImportedReason: 'income_not_expense' }) }
          })
        } 
        // РАСХОДЫ (flowType === 'Выбытие' или пусто) - обрабатываем
        else {
          expenseRows.push(row)
        }
      }
      
      // Обрабатываем переводы - создаем Transaction для каждой пары
      let fullPairs = 0
      let incompletePairs = 0
      
      for (const [groupKey, group] of transferGroups.entries()) {
        const outgoing = group.filter(r => r.amount < 0)
        const incoming = group.filter(r => r.amount > 0)
        
        // Массивы для отслеживания спаренных записей
        const pairedOutgoing: any[] = []
        const pairedIncoming: any[] = []
        const unpairedOutgoing: any[] = []
        const unpairedIncoming: any[] = []
        
        // СПЕЦИАЛЬНЫЙ СЛУЧАЙ: Один расход разделен на несколько поступлений
        // Проверяем, есть ли outgoing, сумма которого равна сумме нескольких incoming
        const multiIncomingPairs: Array<{ out: any, ins: any[] }> = []
        
        for (const outRow of outgoing) {
          // Ищем комбинации incoming, которые в сумме дают outgoing
          const candidates = incoming.filter(inRow => 
            !pairedIncoming.includes(inRow) && 
            inRow.wallet !== outRow.wallet &&
            Math.abs((outRow.date.getTime() - inRow.date.getTime()) / (1000 * 60 * 60 * 24)) <= 3
          )
          
          // Попытка найти 2 incoming, которые в сумме дают outgoing
          for (let i = 0; i < candidates.length - 1; i++) {
            for (let j = i + 1; j < candidates.length; j++) {
              const sum = candidates[i].amount + candidates[j].amount
              if (Math.abs(sum + outRow.amount) < 100) { // допустимая погрешность в 1 рубль
                multiIncomingPairs.push({ out: outRow, ins: [candidates[i], candidates[j]] })
                pairedIncoming.push(candidates[i], candidates[j])
                pairedOutgoing.push(outRow) // ВАЖНО: отмечаем outRow как использованный!
                break
              }
            }
            if (multiIncomingPairs.some(p => p.out === outRow)) break
          }
        }
        
        // Обрабатываем multi-incoming переводы
        for (const pair of multiIncomingPairs) {
          const outRow = pair.out
          const transferAmount = Math.abs(outRow.amount)
          
          // Создаем outgoing транзакцию один раз
          let fromAccount = await prisma.account.findFirst({
            where: { tenantId: tenant.id, name: outRow.wallet }
          })
          if (!fromAccount && outRow.wallet) {
            fromAccount = await prisma.account.create({
              data: { tenantId: tenant.id, name: outRow.wallet, kind: outRow.wallet.toLowerCase().includes('наличн') ? 'cash' : 'bank', createdBy: userId }
            })
          }
          
          const expenseTransferArticle = await prisma.category.findFirst({
            where: { tenantId: tenant.id, name: 'Переводы между счетами', type: 'expense', parentId: { not: null } }
          })
          
          // Создаем расход один раз на полную сумму
          await prisma.transaction.create({
            data: {
              tenantId: tenant.id,
              kind: 'expense',
              paymentDate: outRow.date,
              accrualYear: outRow.date.getFullYear(),
              accrualMonth: outRow.date.getMonth() + 1,
              accountId: fromAccount?.id,
              fromAccountId: fromAccount?.id,
              categoryId: expenseTransferArticle?.id,
              amount: -transferAmount,
              note: `Перевод (разделенный): ${outRow.wallet} → несколько счетов`,
              source: 'gsheets',
              createdBy: userId
            }
          })
          
          // Создаем доходы для каждого incoming
          for (const inRow of pair.ins) {
            let toAccount = await prisma.account.findFirst({
              where: { tenantId: tenant.id, name: inRow.wallet }
            })
            if (!toAccount && inRow.wallet) {
              toAccount = await prisma.account.create({
                data: { tenantId: tenant.id, name: inRow.wallet, kind: inRow.wallet.toLowerCase().includes('наличн') ? 'cash' : 'bank', createdBy: userId }
              })
            }
            
            const incomeTransferArticle = await prisma.category.findFirst({
              where: { tenantId: tenant.id, name: 'Переводы между счетами', type: 'income', parentId: { not: null } }
            })
            
            await prisma.transaction.create({
              data: {
                tenantId: tenant.id,
                kind: 'income',
                paymentDate: inRow.date,
                accrualYear: inRow.date.getFullYear(),
                accrualMonth: inRow.date.getMonth() + 1,
                accountId: toAccount?.id,
                fromAccountId: fromAccount?.id,
                toAccountId: toAccount?.id,
                categoryId: incomeTransferArticle?.id,
                amount: inRow.amount,
                note: `Перевод (часть): ${outRow.wallet} → ${inRow.wallet}`,
                source: 'gsheets',
                createdBy: userId
              }
            })
          }
          
          createdTransfers += (1 + pair.ins.length)
          fullPairs++
        }
        
        // Обычное спаривание 1:1
        for (const outRow of outgoing) {
          // Пропускаем, если уже обработан в multi-incoming
          if (multiIncomingPairs.some(p => p.out === outRow)) continue
          
          let foundPair = false
          for (const inRow of incoming) {
            if (pairedIncoming.includes(inRow)) continue // ВАЖНО: не используем одну запись дважды
            
            // КРИТИЧНО: Пропускаем перевод на тот же счет (это ошибка данных)
            if (outRow.wallet === inRow.wallet) continue
            
            const daysDiff = Math.abs(
              (outRow.date.getTime() - inRow.date.getTime()) / (1000 * 60 * 60 * 24)
            )
            
            // ИСКЛЮЧЕНИЕ: Если есть комментарий "на лс" - разрешаем до 5 дней
            const maxDays = outRow.comment?.includes('на лс') || inRow.comment?.includes('на лс') ? 5 : 2
            
            if (daysDiff <= maxDays) {
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
        
        // Создаем транзакции для найденных обычных 1:1 пар
        for (let i = 0; i < pairedOutgoing.length; i++) {
          const fromRow = pairedOutgoing[i]
          const toRow = pairedIncoming[i]
          
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
              amount: -transferAmount,
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
              amount: transferAmount,
              note: transferNote,
              source: 'gsheets',
              createdBy: userId
            }
          })
          
          createdTransfers++
          fullPairs++
        }
        
        // Отмечаем неспаренные записи как incompleteTransfer
        const allUnpaired = [...unpairedOutgoing, ...unpairedIncoming]
        if (allUnpaired.length > 0) {
          incompletePairs++
          for (const row of allUnpaired) {
            const originalData = JSON.parse(row.raw || '{}')
            const newRawData = {
              ...originalData,
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
      
      // Обрабатываем обычные расходы
      for (const row of expenseRows) {
        
        // Находим или создаем счет
        let account = null
        if (row.wallet) {
          account = await prisma.account.findFirst({
            where: { tenantId: tenant.id, name: row.wallet }
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
            where: { tenantId: tenant.id, fund: row.fund }
          })
        }
        
        // Если категория не найдена, отмечаем и пропускаем
        if (!category) {
          skipped++
          const originalData = row.raw ? JSON.parse(row.raw) : {}
          await prisma.gsCashflowRow.update({
            where: { id: row.id },
            data: { 
              raw: JSON.stringify({ 
                ...originalData, 
                notImported: true, 
                notImportedReason: 'category_not_found' 
              }) 
            }
          })
          continue
        }
        
        // Находим контрагента (vendor)
        let vendor = null
        if (row.supplier) {
          vendor = await prisma.counterparty.findFirst({
            where: { tenantId: tenant.id, name: row.supplier }
          })
          if (!vendor) {
            vendor = await prisma.counterparty.create({
              data: {
                tenantId: tenant.id,
                name: row.supplier,
                kind: 'vendor',
                createdBy: userId
              }
            })
          }
        }
        
        // СПЕЦИАЛЬНАЯ ЛОГИКА для эквайрингов - привязываем к Сбербанку
        if (row.fund?.includes('Эквайринг') || row.comment?.toLowerCase().includes('эквайринг')) {
          vendor = await prisma.counterparty.findFirst({
            where: { tenantId: tenant.id, name: 'Сбербанк' }
          })
          
          if (!vendor) {
            vendor = await prisma.counterparty.create({
              data: {
                tenantId: tenant.id,
                name: 'Сбербанк',
                kind: 'bank',
                createdBy: userId
              }
            })
          }
        }
        
        const amount = Math.abs(row.amount) // уже в копейках, делаем положительным
        
        // Создаем документ расхода
        const expenseDoc = await prisma.expenseDoc.create({
          data: {
            tenantId: tenant.id,
            vendorId: vendor?.id || null,
            categoryId: category.id,
            operationDate: row.date,
            postingPeriod: new Date(Date.UTC(row.date.getFullYear(), row.date.getMonth(), 1)), // первое число месяца в UTC
            amount,
            status: 'paid', // сразу оплачен
            paidAmount: amount,
            activity: category.activity || 'operating', // берем из категории
            memo: row.comment || `Импорт из GSheets: ${row.fund}`,
            createdBy: userId
          }
        })
        
        createdDocs++
        
        // Создаем платеж, если есть счет
        if (account) {
          await prisma.payment.create({
            data: {
              tenantId: tenant.id,
              expenseDocId: expenseDoc.id,
              accountId: account.id,
              date: row.date,
              amount,
              memo: row.comment || undefined,
              createdBy: userId
            }
          })
          
          createdPayments++
        }
      }
      
      res.json({ 
        deletedPayments: deletedPayments.count,
        deletedDocs: deletedDocs.count,
        createdDocs, 
        createdPayments,
        createdTransfers,
        fullPairs,
        incompletePairs,
        skipped, 
        total: gsRows.length 
      })
    } catch (e: any) {
      res.status(500).json({ error: String(e?.message || e) })
    }
  })

  return router
}

