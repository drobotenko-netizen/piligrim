import { PrismaClient } from '@prisma/client'

/**
 * Результат импорта транзакций из GSheets
 */
export interface ImportResult {
  created: number
  skipped: number
  fullPairs: number
  incompletePairs: number
}

/**
 * Сервис для импорта транзакций из Google Sheets
 * 
 * Содержит сложную логику:
 * - Группировка переводов между счетами
 * - Сп

аривание входящих и исходящих переводов
 * - Обработка multi-incoming переводов (1 расход → несколько поступлений)
 * - Создание транзакций, счетов, категорий
 */
export class GsheetsTransactionImporter {
  constructor(private prisma: PrismaClient) {}

  /**
   * Импортировать транзакции из GSheets в БД
   */
  async importTransactions(
    spreadsheetId: string,
    tenantId: string,
    userId: string,
    gid?: string | null | undefined
  ): Promise<ImportResult> {
    // Очищаем старые отметки incompleteTransfer
    await this.clearIncompleteTransferMarks(spreadsheetId, gid)
    
    // Получаем все записи из GSheets
    const gsRows = await this.fetchGSheetsRows(spreadsheetId, gid)
    
    let created = 0
    let skipped = 0
    let fullPairs = 0
    let incompletePairs = 0
    
    // Группируем переводы и обычные транзакции
    const { transferGroups, nonTransferRows, skippedCount } = this.groupRows(gsRows)
    skipped += skippedCount
    
    // Обрабатываем переводы
    const transferResult = await this.processTransfers(
      transferGroups,
      tenantId,
      userId
    )
    created += transferResult.created
    fullPairs += transferResult.fullPairs
    incompletePairs += transferResult.incompletePairs
    
    // Обрабатываем обычные транзакции
    const regularResult = await this.processRegularTransactions(
      nonTransferRows,
      tenantId,
      userId
    )
    created += regularResult.created
    skipped += regularResult.skipped
    
    return { created, skipped, fullPairs, incompletePairs }
  }

  /**
   * Очистить старые отметки неполных переводов
   */
  private async clearIncompleteTransferMarks(spreadsheetId: string, gid?: string | null | undefined) {
    await this.prisma.gsCashflowRow.updateMany({
      where: { 
        spreadsheet: spreadsheetId,
        ...(gid ? { sheet: 'ДДС месяц' } : {}),
        raw: { contains: '"incompleteTransfer":true' }
      },
      data: { raw: null }
    })
  }

  /**
   * Получить записи из GSheets
   */
  private async fetchGSheetsRows(spreadsheetId: string, gid?: string | null | undefined) {
    return await this.prisma.gsCashflowRow.findMany({
      where: { 
        spreadsheet: spreadsheetId,
        ...(gid ? { sheet: 'ДДС месяц' } : {})
      },
      orderBy: { date: 'asc' }
    })
  }

  /**
   * Группировать записи на переводы и обычные транзакции
   */
  private groupRows(gsRows: any[]) {
    const transferGroups = new Map<string, any[]>()
    const nonTransferRows: any[] = []
    let skippedCount = 0
    
    for (const row of gsRows) {
      if (!row.amount || !row.date) {
        skippedCount++
        continue
      }
      
      if (row.fund?.includes('Перевод')) {
        const amountKey = Math.abs(row.amount)
        const groupKey = `${amountKey}`
        
        if (!transferGroups.has(groupKey)) {
          transferGroups.set(groupKey, [])
        }
        transferGroups.get(groupKey)?.push(row)
      } else {
        nonTransferRows.push(row)
      }
    }
    
    return { transferGroups, nonTransferRows, skippedCount }
  }

  /**
   * Обработать переводы между счетами
   */
  private async processTransfers(
    transferGroups: Map<string, any[]>,
    tenantId: string,
    userId: string
  ) {
    let created = 0
    let fullPairs = 0
    let incompletePairs = 0
    
    for (const [groupKey, group] of Array.from(transferGroups.entries())) {
      const result = await this.processTransferGroup(group, tenantId, userId)
      created += result.created
      fullPairs += result.fullPairs
      incompletePairs += result.incompletePairs
    }
    
    return { created, fullPairs, incompletePairs }
  }

  /**
   * Обработать группу переводов с одинаковой суммой
   */
  private async processTransferGroup(group: any[], tenantId: string, userId: string) {
    const outgoing = group.filter(r => r.amount < 0)
    const incoming = group.filter(r => r.amount > 0)
    
    const pairedOutgoing: any[] = []
    const pairedIncoming: any[] = []
    let created = 0
    let fullPairs = 0
    let incompletePairs = 0
    
    // 1. Обработка multi-incoming (один расход → несколько поступлений)
    const multiResult = await this.processMultiIncomingTransfers(
      outgoing, 
      incoming, 
      pairedOutgoing, 
      pairedIncoming,
      tenantId,
      userId
    )
    created += multiResult.created
    fullPairs += multiResult.pairs
    
    // 2. Обычное спаривание 1:1
    const pairingResult = this.pairRegularTransfers(
      outgoing,
      incoming,
      pairedOutgoing,
      pairedIncoming
    )
    
    // 3. Создание транзакций для 1:1 пар
    const regularResult = await this.createRegularTransferTransactions(
      pairedOutgoing,
      pairedIncoming,
      tenantId,
      userId
    )
    created += regularResult.created
    fullPairs += regularResult.pairs
    
    // 4. Отметка неспаренных переводов
    const unpairedOutgoing = outgoing.filter(r => !pairedOutgoing.includes(r))
    const unpairedIncoming = incoming.filter(r => !pairedIncoming.includes(r))
    
    if (unpairedOutgoing.length > 0 || unpairedIncoming.length > 0) {
      await this.markIncompleteTransfers([...unpairedOutgoing, ...unpairedIncoming])
      incompletePairs++
    }
    
    return { created, fullPairs, incompletePairs }
  }

  /**
   * Обработать multi-incoming переводы (1 расход разделен на несколько поступлений)
   */
  private async processMultiIncomingTransfers(
    outgoing: any[],
    incoming: any[],
    pairedOutgoing: any[],
    pairedIncoming: any[],
    tenantId: string,
    userId: string
  ) {
    const multiIncomingPairs: Array<{ out: any, ins: any[] }> = []
    
    // Ищем комбинации incoming, которые в сумме дают outgoing
    for (const outRow of outgoing) {
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
            pairedOutgoing.push(outRow)
            break
          }
        }
        if (multiIncomingPairs.some(p => p.out === outRow)) break
      }
    }
    
    // Создаем транзакции для multi-incoming
    let created = 0
    for (const pair of multiIncomingPairs) {
      const count = await this.createMultiIncomingTransaction(pair, tenantId, userId)
      created += count
    }
    
    return { created, pairs: multiIncomingPairs.length }
  }

  /**
   * Создать транзакции для multi-incoming перевода
   */
  private async createMultiIncomingTransaction(
    pair: { out: any, ins: any[] },
    tenantId: string,
    userId: string
  ) {
    const outRow = pair.out
    const transferAmount = Math.abs(outRow.amount)
    
    // Найти или создать счет-источник
    const fromAccount = await this.findOrCreateAccount(
      outRow.wallet,
      tenantId,
      userId
    )
    
    // Найти категорию для переводов (расход)
    const expenseTransferArticle = await this.findTransferCategory('expense', tenantId)
    
    // Создать расходную транзакцию
    await this.prisma.transaction.create({
      data: {
        tenantId,
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
    
    // Создать приходные транзакции для каждого поступления
    const incomeTransferArticle = await this.findTransferCategory('income', tenantId)
    
    for (const inRow of pair.ins) {
      const toAccount = await this.findOrCreateAccount(
        inRow.wallet,
        tenantId,
        userId
      )
      
      await this.prisma.transaction.create({
        data: {
          tenantId,
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
    
    return 1 + pair.ins.length
  }

  /**
   * Спарить обычные переводы 1:1
   */
  private pairRegularTransfers(
    outgoing: any[],
    incoming: any[],
    pairedOutgoing: any[],
    pairedIncoming: any[]
  ) {
    for (const outRow of outgoing) {
      // Пропускаем, если уже обработан в multi-incoming
      if (pairedOutgoing.includes(outRow)) continue
      
      for (const inRow of incoming) {
        if (pairedIncoming.includes(inRow)) continue
        
        // Пропускаем перевод на тот же счет
        if (outRow.wallet === inRow.wallet) continue
        
        const daysDiff = Math.abs(
          (outRow.date.getTime() - inRow.date.getTime()) / (1000 * 60 * 60 * 24)
        )
        
        // Разрешаем до 5 дней для комментария "на лс"
        const maxDays = outRow.comment?.includes('на лс') || inRow.comment?.includes('на лс') ? 5 : 2
        
        if (daysDiff <= maxDays) {
          pairedOutgoing.push(outRow)
          pairedIncoming.push(inRow)
          break
        }
      }
    }
  }

  /**
   * Создать транзакции для обычных 1:1 переводов
   */
  private async createRegularTransferTransactions(
    pairedOutgoing: any[],
    pairedIncoming: any[],
    tenantId: string,
    userId: string
  ) {
    let created = 0
    
    for (let i = 0; i < pairedOutgoing.length; i++) {
      const fromRow = pairedOutgoing[i]
      const toRow = pairedIncoming[i]
      
      // Найти или создать счета
      const fromAccount = await this.findOrCreateAccount(fromRow.wallet, tenantId, userId)
      const toAccount = await this.findOrCreateAccount(toRow.wallet, tenantId, userId)
      
      const transferAmount = Math.abs(fromRow.amount)
      const transferNote = `Перевод: ${fromRow.wallet} → ${toRow.wallet}`
      
      // Найти категории для переводов
      const expenseTransferArticle = await this.findTransferCategory('expense', tenantId)
      const incomeTransferArticle = await this.findTransferCategory('income', tenantId)
      
      // Расход
      await this.prisma.transaction.create({
        data: {
          tenantId,
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
      
      // Доход
      await this.prisma.transaction.create({
        data: {
          tenantId,
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
      
      created += 2
    }
    
    return { created, pairs: pairedOutgoing.length }
  }

  /**
   * Отметить неспаренные переводы
   */
  private async markIncompleteTransfers(unpaired: any[]) {
    for (const row of unpaired) {
      const originalData = JSON.parse(row.raw || '[]')
      const newRawData = {
        originalData,
        incompleteTransfer: true,
        transferType: row.amount < 0 ? 'outgoing_only' : 'incoming_only'
      }
      
      await this.prisma.gsCashflowRow.update({
        where: { id: row.id },
        data: { raw: JSON.stringify(newRawData) }
      })
    }
  }

  /**
   * Обработать обычные (не переводы) транзакции
   */
  private async processRegularTransactions(
    rows: any[],
    tenantId: string,
    userId: string
  ) {
    let created = 0
    let skipped = 0
    
    for (const row of rows) {
      try {
        await this.createRegularTransaction(row, tenantId, userId)
        created++
      } catch (e) {
        console.error('Failed to create transaction:', e)
        skipped++
      }
    }
    
    return { created, skipped }
  }

  /**
   * Создать обычную транзакцию
   */
  private async createRegularTransaction(row: any, tenantId: string, userId: string) {
    // Найти или создать счет
    const account = row.wallet 
      ? await this.findOrCreateAccount(row.wallet, tenantId, userId)
      : null
    
    // Найти категорию
    const category = row.fund
      ? await this.prisma.category.findFirst({
          where: { tenantId, fund: row.fund }
        })
      : null
    
    // Найти контрагента
    let counterparty = row.supplier
      ? await this.prisma.counterparty.findFirst({
          where: { tenantId, name: row.supplier }
        })
      : null
    
    // Специальная логика для эквайрингов
    if (row.fund?.includes('Эквайринг') || row.comment?.toLowerCase().includes('эквайринг')) {
      counterparty = await this.findOrCreateSberbank(tenantId, userId)
    }
    
    // Определить тип транзакции
    const kind = row.flowType === 'Поступление' ? 'income' : 'expense'
    
    // Создать транзакцию
    await this.prisma.transaction.create({
      data: {
        tenantId,
        kind,
        paymentDate: row.date,
        accrualYear: row.date.getFullYear(),
        accrualMonth: row.date.getMonth() + 1,
        accountId: account?.id,
        categoryId: category?.id,
        counterpartyId: counterparty?.id,
        amount: row.amount,
        note: row.comment || row.fund || null,
        source: 'gsheets',
        createdBy: userId
      }
    })
  }

  /**
   * Найти или создать счет
   */
  private async findOrCreateAccount(name: string, tenantId: string, userId: string) {
    if (!name) return null
    
    let account = await this.prisma.account.findFirst({
      where: { tenantId, name }
    })
    
    if (!account) {
      account = await this.prisma.account.create({
        data: {
          tenantId,
          name,
          kind: name.toLowerCase().includes('наличн') ? 'cash' : 'bank',
          createdBy: userId
        }
      })
    }
    
    return account
  }

  /**
   * Найти категорию для переводов
   */
  private async findTransferCategory(type: 'expense' | 'income', tenantId: string) {
    return await this.prisma.category.findFirst({
      where: { 
        tenantId, 
        name: 'Переводы между счетами', 
        type,
        parentId: { not: null }
      }
    })
  }

  /**
   * Найти или создать Сбербанк (для эквайрингов)
   */
  private async findOrCreateSberbank(tenantId: string, userId: string) {
    let sberbank = await this.prisma.counterparty.findFirst({
      where: { tenantId, name: 'Сбербанк' }
    })
    
    if (!sberbank) {
      sberbank = await this.prisma.counterparty.create({
        data: {
          tenantId,
          name: 'Сбербанк',
          kind: 'bank',
          createdBy: userId
        }
      })
    }
    
    return sberbank
  }
}

