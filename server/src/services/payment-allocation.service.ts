import { PrismaClient } from '@prisma/client'

/**
 * Данные для создания платежа с распределением
 */
export interface CreatePaymentData {
  expenseDocId?: string
  accountId: string
  date: string
  amount: number
  activity?: 'operating' | 'investing' | 'financing'
  memo?: string
  allocations?: Array<{
    expenseDocId: string
    amount: number
  }>
}

/**
 * Результат создания платежа
 */
export interface PaymentResult {
  payment: any
  allocations: any[]
}

/**
 * Сервис для управления платежами и их распределением (allocations)
 * 
 * Основная логика:
 * - Создание платежей с распределением по expense docs
 * - Валидация сумм распределений
 * - Обновление статусов документов (unpaid → partial → paid)
 * - Создание CashTx для движения денежных средств
 * - Откат платежей с обновлением документов
 */
export class PaymentAllocationService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Создать платёж с распределением по документам
   */
  async createPaymentWithAllocations(
    data: CreatePaymentData,
    tenantId: string,
    userId: string | null
  ): Promise<PaymentResult> {
    const paymentAmount = Math.round(data.amount * 100) // в копейки

    // Валидация: сумма allocations не должна превышать сумму платежа
    if (data.allocations) {
      this.validateAllocations(data.allocations, paymentAmount)
    }

    // Создаём платёж и распределения в транзакции
    return await this.prisma.$transaction(async (tx) => {
      // Создаем платёж
      const payment = await tx.payment.create({
        data: {
          tenantId,
          expenseDocId: data.expenseDocId || null,
          accountId: data.accountId,
          date: new Date(data.date),
          amount: paymentAmount,
          activity: data.activity || null,
          memo: data.memo,
          createdBy: userId
        }
      })

      // Создаём распределения и обновляем документы
      const allocations = []
      if (data.allocations) {
        for (const alloc of data.allocations) {
          const allocation = await this.createAllocation(
            tx,
            payment.id,
            alloc.expenseDocId,
            alloc.amount,
            userId
          )
          allocations.push(allocation)
        }
      }

      // Создаем CashTx для платежа
      await tx.cashTx.create({
        data: {
          tenantId,
          accountId: data.accountId,
          date: new Date(data.date),
          direction: 'out',
          amount: paymentAmount,
          sourceType: 'payment',
          sourceId: payment.id,
          activity: data.activity || 'operating',
          paymentId: payment.id,
          memo: data.memo
        }
      })

      return { payment, allocations }
    })
  }

  /**
   * Удалить платёж с откатом распределений
   */
  async deletePayment(paymentId: string, userId: string | null): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      // Получаем платёж с распределениями
      const payment = await tx.payment.findUnique({
        where: { id: paymentId },
        include: { allocations: true }
      })

      if (!payment) {
        throw new Error('Платёж не найден')
      }

      // Обновляем документы - вычитаем суммы распределений
      for (const alloc of payment.allocations) {
        await this.rollbackAllocation(tx, alloc.expenseDocId, alloc.amount, userId)
      }

      // Удаляем распределения
      await tx.paymentAllocation.deleteMany({
        where: { paymentId }
      })

      // Удаляем связанные CashTx
      await tx.cashTx.deleteMany({
        where: { paymentId }
      })

      // Удаляем платёж
      await tx.payment.delete({
        where: { id: paymentId }
      })
    })
  }

  /**
   * Валидация allocations
   */
  private validateAllocations(
    allocations: Array<{ expenseDocId: string; amount: number }>,
    paymentAmount: number
  ) {
    const totalAllocated = allocations.reduce(
      (sum, a) => sum + Math.round(a.amount * 100), 
      0
    )
    if (totalAllocated > paymentAmount) {
      throw new Error('Сумма распределения превышает сумму платежа')
    }
  }

  /**
   * Создать распределение и обновить документ
   */
  private async createAllocation(
    tx: any,
    paymentId: string,
    expenseDocId: string,
    amount: number,
    userId: string | null
  ) {
    const allocAmount = Math.round(amount * 100)
    
    // Проверяем, что сумма не превышает остаток документа
    const doc = await tx.expenseDoc.findUnique({
      where: { id: expenseDocId }
    })
    
    if (!doc) {
      throw new Error(`Документ ${expenseDocId} не найден`)
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
        paymentId,
        expenseDocId,
        amount: allocAmount
      }
    })

    // Обновляем paidAmount документа
    const newPaidAmount = doc.paidAmount + allocAmount
    let newStatus = doc.status
    if (newPaidAmount >= doc.amount) {
      newStatus = 'paid'
    } else if (newPaidAmount > 0) {
      newStatus = 'partial'
    }

    await tx.expenseDoc.update({
      where: { id: expenseDocId },
      data: { 
        paidAmount: newPaidAmount,
        status: newStatus,
        updatedBy: userId
      }
    })

    return allocation
  }

  /**
   * Откатить распределение (при удалении платежа)
   */
  private async rollbackAllocation(
    tx: any,
    expenseDocId: string,
    allocAmount: number,
    userId: string | null
  ) {
    const doc = await tx.expenseDoc.findUnique({
      where: { id: expenseDocId }
    })

    if (doc) {
      const newPaidAmount = doc.paidAmount - allocAmount
      let newStatus = doc.status
      if (newPaidAmount === 0) {
        newStatus = 'unpaid'
      } else if (newPaidAmount < doc.amount) {
        newStatus = 'partial'
      }

      await tx.expenseDoc.update({
        where: { id: expenseDocId },
        data: { 
          paidAmount: Math.max(0, newPaidAmount),
          status: newStatus,
          updatedBy: userId
        }
      })
    }
  }
}

