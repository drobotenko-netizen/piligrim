import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { getTenant } from '../../utils/tenant'
import { requireRole } from '../../utils/auth'

const prisma = new PrismaClient()
const router = Router()

// GET /balances - получить остатки по счетам за период
router.get('/', async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query as { dateFrom?: string, dateTo?: string }
    
    if (!dateFrom || !dateTo) {
      return res.status(400).json({ error: 'dateFrom and dateTo parameters are required' })
    }
    
    const startDate = new Date(dateFrom)
    const endDate = new Date(dateTo)
    const tenant = await getTenant(prisma, req as any)
    
    // Получаем все активные счета
    const accounts = await prisma.account.findMany({
      where: { 
        tenantId: tenant.id,
        active: true 
      },
      orderBy: { name: 'asc' }
    })
    
    const balances = []
    
    for (const account of accounts) {
      // Получаем транзакции ДО начала периода (для начального остатка)
      const txBefore = await prisma.transaction.findMany({
        where: {
          tenantId: tenant.id,
          paymentDate: { lt: startDate },
          accountId: account.id
        },
        orderBy: { paymentDate: 'asc' }
      })
      
      // Получаем транзакции ЗА период
      const txPeriod = await prisma.transaction.findMany({
        where: {
          tenantId: tenant.id,
          paymentDate: { gte: startDate, lte: endDate },
          accountId: account.id
        },
        orderBy: { paymentDate: 'asc' }
      })
      
      // Функция подсчета баланса
      const calculateBalance = (transactions: any[]) => {
        let balance = 0
        for (const tx of transactions) {
          // Просто суммируем amount - он уже содержит правильный знак
          // (положительный для income, отрицательный для expense)
          if (tx.accountId === account.id) {
            balance += tx.amount
          }
        }
        return balance
      }
      
      const startBalance = calculateBalance(txBefore)
      const periodChange = calculateBalance(txPeriod)
      const endBalance = startBalance + periodChange
      
      balances.push({
        accountId: account.id,
        accountName: account.name,
        accountKind: account.kind,
        startBalance,
        periodChange,
        endBalance,
        lastTransactionDate: txPeriod.length > 0 ? txPeriod[txPeriod.length - 1].paymentDate : null
      })
    }
    
    // Сортируем по типу счета, затем по названию
    const kindOrder = { 'cash': 1, 'bank': 2, 'card': 3, 'safe': 4 }
    balances.sort((a, b) => {
      const aOrder = kindOrder[a.accountKind as keyof typeof kindOrder] || 999
      const bOrder = kindOrder[b.accountKind as keyof typeof kindOrder] || 999
      if (aOrder !== bOrder) return aOrder - bOrder
      return a.accountName.localeCompare(b.accountName)
    })
    
    res.json({ 
      balances,
      dateFrom: startDate.toISOString().split('T')[0],
      dateTo: endDate.toISOString().split('T')[0],
      totalStartBalance: balances.reduce((sum, b) => sum + b.startBalance, 0),
      totalPeriodChange: balances.reduce((sum, b) => sum + b.periodChange, 0),
      totalEndBalance: balances.reduce((sum, b) => sum + b.endBalance, 0)
    })
  } catch (e: any) {
    res.status(500).json({ error: String(e?.message || e) })
  }
})

export default router
