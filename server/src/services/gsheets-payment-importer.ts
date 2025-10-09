import { PrismaClient } from '@prisma/client'

/**
 * Результат импорта платежей из GSheets
 */
export interface PaymentImportResult {
  createdDocs: number
  createdPayments: number
  createdTransfers: number
  skipped: number
}

/**
 * Сервис для импорта платежей и expense docs из Google Sheets
 * 
 * Содержит логику:
 * - Удаление старых данных
 * - Нормализация типов контрагентов
 * - Группировка переводов
 * - Создание ExpenseDoc и Payment записей
 * - Обработка неполных данных
 */
export class GsheetsPaymentImporter {
  constructor(private prisma: PrismaClient) {}

  /**
   * Импортировать платежи из GSheets
   */
  async importPayments(
    spreadsheetId: string,
    tenantId: string,
    userId: string,
    gid?: string | null
  ): Promise<PaymentImportResult> {
    // Подготовка: создание справочников и нормализация
    await this.ensureCounterpartyTypes(tenantId)
    await this.normalizeCounterpartyKinds(tenantId)
    
    // Удаляем старые данные
    await this.clearOldData(tenantId)
    
    // Очищаем отметки в GSheets
    await this.clearGSheetsMarks(spreadsheetId)
    
    // Получаем данные из GSheets
    const gsRows = await this.fetchGSheetsRows(spreadsheetId, gid)
    
    // Группируем и обрабатываем
    return await this.processRows(gsRows, tenantId, userId)
  }

  /**
   * Обеспечить наличие справочника типов контрагентов
   */
  private async ensureCounterpartyTypes(tenantId: string) {
    // Создание таблицы CounterpartyType если не существует
    const ensureTypesTableSQL = `CREATE TABLE IF NOT EXISTS CounterpartyType (
      id TEXT PRIMARY KEY,
      tenantId TEXT NOT NULL,
      name TEXT NOT NULL,
      label TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(tenantId, name)
    );`
    await (this.prisma as any).$executeRawUnsafe(ensureTypesTableSQL)
    
    // Базовые типы
    const baseTypes: Array<{ name: string; label: string }> = [
      { name: 'supplier', label: 'Поставщик' },
      { name: 'service', label: 'Услуги' },
      { name: 'personnel', label: 'Персонал' },
      { name: 'bank', label: 'Банк' },
      { name: 'tax', label: 'Налоги' },
      { name: 'transfer', label: 'Перевод' },
      { name: 'other', label: 'Прочее' },
    ]
    
    const existingTypes: any[] = await (this.prisma as any).$queryRawUnsafe(
      `SELECT name FROM CounterpartyType WHERE tenantId = ?`, tenantId
    )
    const existingSet = new Set((existingTypes || []).map((r: any) => String(r.name)))
    
    for (const t of baseTypes) {
      if (!existingSet.has(t.name)) {
        const id = (global as any).crypto?.randomUUID?.() || Math.random().toString(36).slice(2)
        await (this.prisma as any).$executeRawUnsafe(
          `INSERT INTO CounterpartyType (id, tenantId, name, label, active) VALUES (?, ?, ?, ?, 1)`,
          id, tenantId, t.name, t.label
        )
      }
    }
  }

  /**
   * Нормализовать виды контрагентов к каноническим ключам
   */
  private async normalizeCounterpartyKinds(tenantId: string) {
    const kindsMap: Array<{ from: string, to: string }> = [
      { from: 'банк', to: 'bank' },
      { from: 'персонал', to: 'personnel' },
      { from: 'услуги', to: 'service' },
      { from: 'поставщик', to: 'supplier' },
      { from: 'налоги', to: 'tax' },
      { from: 'перевод', to: 'transfer' },
      { from: 'vendor', to: 'supplier' },
      { from: 'company', to: 'service' },
      { from: 'person', to: 'service' }
    ]
    
    for (const m of kindsMap) {
      await this.prisma.counterparty.updateMany({ 
        where: { tenantId, kind: m.from }, 
        data: { kind: m.to } 
      })
    }
  }

  /**
   * Удалить старые payments и expense docs
   */
  private async clearOldData(tenantId: string) {
    await this.prisma.payment.deleteMany({
      where: { tenantId }
    })
    await this.prisma.expenseDoc.deleteMany({
      where: { tenantId }
    })
  }

  /**
   * Очистить отметки в GSheets
   */
  private async clearGSheetsMarks(spreadsheetId: string) {
    await this.prisma.gsCashflowRow.updateMany({
      where: { 
        spreadsheet: spreadsheetId,
        OR: [
          { raw: { contains: '"notImported":true' } },
          { raw: { contains: '"incompleteTransfer":true' } }
        ]
      },
      data: { raw: null }
    })
  }

  /**
   * Получить записи из GSheets
   */
  private async fetchGSheetsRows(spreadsheetId: string, gid?: string | null) {
    return await this.prisma.gsCashflowRow.findMany({
      where: { 
        spreadsheet: spreadsheetId,
        ...(gid ? { sheet: 'ДДС месяц' } : {})
      },
      orderBy: { date: 'asc' }
    })
  }

  /**
   * Обработать строки из GSheets
   */
  private async processRows(
    gsRows: any[],
    tenantId: string,
    userId: string
  ): Promise<PaymentImportResult> {
    let createdDocs = 0
    let createdPayments = 0
    let createdTransfers = 0
    let skipped = 0
    
    // Группируем переводы и расходы
    const transferGroups = new Map<string, any[]>()
    const expenseRows: any[] = []
    
    for (const row of gsRows) {
      if (!row.amount || !row.date) {
        skipped++
        continue
      }
      
      // Пропускаем строки без контрагента
      if (!row.supplier) {
        skipped++
        continue
      }
      
      // Переводы обрабатываем отдельно
      if (row.fund?.includes('Перевод')) {
        const amountKey = Math.abs(row.amount)
        const groupKey = `${amountKey}`
        
        if (!transferGroups.has(groupKey)) {
          transferGroups.set(groupKey, [])
        }
        transferGroups.get(groupKey)?.push(row)
      } else {
        expenseRows.push(row)
      }
    }
    
    // Обрабатываем переводы
    const transfersResult = await this.processTransfers(transferGroups, tenantId, userId)
    createdTransfers = transfersResult.created
    
    // Обрабатываем расходы
    const expensesResult = await this.processExpenses(expenseRows, tenantId, userId)
    createdDocs = expensesResult.docs
    createdPayments = expensesResult.payments
    skipped += expensesResult.skipped
    
    return { createdDocs, createdPayments, createdTransfers, skipped }
  }

  /**
   * Обработать переводы (stub - можно расширить при необходимости)
   */
  private async processTransfers(
    transferGroups: Map<string, any[]>,
    tenantId: string,
    userId: string
  ) {
    // TODO: реализовать логику обработки переводов если нужно
    return { created: 0 }
  }

  /**
   * Обработать расходы
   */
  private async processExpenses(
    rows: any[],
    tenantId: string,
    userId: string
  ) {
    let docs = 0
    let payments = 0
    let skipped = 0
    
    for (const row of rows) {
      try {
        await this.createExpenseWithPayment(row, tenantId, userId)
        docs++
        payments++
      } catch (e) {
        console.error('Failed to create expense:', e)
        skipped++
      }
    }
    
    return { docs, payments, skipped }
  }

  /**
   * Создать expense doc и payment из строки GSheets
   */
  private async createExpenseWithPayment(
    row: any,
    tenantId: string,
    userId: string
  ) {
    // Найти или создать контрагента
    let vendor = await this.prisma.counterparty.findFirst({
      where: { tenantId, name: row.supplier }
    })
    
    if (!vendor) {
      vendor = await this.prisma.counterparty.create({
        data: {
          tenantId,
          name: row.supplier,
          kind: 'supplier',
          createdBy: userId
        }
      })
    }
    
    // Найти категорию
    const category = row.fund
      ? await this.prisma.category.findFirst({
          where: { tenantId, fund: row.fund }
        })
      : null
    
    // Найти счёт
    let account = row.wallet
      ? await this.prisma.account.findFirst({
          where: { tenantId, name: row.wallet }
        })
      : null
    
    if (!account && row.wallet) {
      account = await this.prisma.account.create({
        data: {
          tenantId,
          name: row.wallet,
          kind: row.wallet.toLowerCase().includes('наличн') ? 'cash' : 'bank',
          createdBy: userId
        }
      })
    }
    
    // Создать ExpenseDoc
    const amount = Math.abs(Math.round(row.amount * 100))
    
    const docData: any = {
      tenantId,
      vendorId: vendor.id,
      date: row.date,
      amount,
      paidAmount: amount,
      status: 'paid',
      createdBy: userId
    }
    if (category?.id) docData.categoryId = category.id
    if (row.comment) docData.description = row.comment
    
    const expenseDoc = await this.prisma.expenseDoc.create({
      data: docData
    })
    
    // Создать Payment только если есть счет
    if (!account) {
      throw new Error(`Счет "${row.wallet}" не найден`)
    }

    const payment = await this.prisma.payment.create({
      data: {
        tenantId,
        expenseDocId: expenseDoc.id,
        accountId: account.id,
        date: row.date,
        amount,
        activity: 'operating',
        memo: row.comment,
        createdBy: userId
      }
    })
    
    // Создать CashTx
    await this.prisma.cashTx.create({
      data: {
        tenantId,
        accountId: account.id,
        date: row.date,
        direction: 'out',
        amount,
        sourceType: 'payment',
        sourceId: payment.id,
        activity: 'operating',
        paymentId: payment.id,
        memo: row.comment
      }
    })
  }
}

