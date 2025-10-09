import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { getTenant } from '../../utils/tenant'
import { getUserId } from '../../utils/auth'
import { IikoClient } from '../iiko/client'

// Функция для конвертации даты в формат iiko
function toIikoDateTime(date: Date): string {
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  const hh = String(date.getUTCHours()).padStart(2, '0')
  const mm = String(date.getUTCMinutes()).padStart(2, '0')
  const ss = String(date.getUTCSeconds()).padStart(2, '0')
  const ms = String(date.getUTCMilliseconds()).padStart(3, '0')
  return `${y}-${m}-${d}T${hh}:${mm}:${ss}.${ms}`
}

export function createBufferRouter(prisma: PrismaClient) {
  const router = Router()
  const client = new IikoClient()

  // GET расчет скользящих сумм для конкретного ингредиента
  router.get('/calculate/:productId', async (req, res) => {
    try {
      const tenant = await getTenant(prisma, req as any)
      const { productId } = req.params

      // Получаем настройки
      let settings = await (prisma as any).purchasingSettings?.findUnique({
        where: { tenantId: tenant.id }
      })

      if (!settings) {
        settings = {
          purchaseWindowDays: 3,
          analysisWindowDays: 30
        }
      }

      const { purchaseWindowDays, analysisWindowDays } = settings

      // Получаем данные расхода из iiko за analysisWindowDays через OLAP
      const now = new Date()
      const startDate = new Date(now)
      startDate.setDate(startDate.getDate() - analysisWindowDays)

      const body = {
        reportType: 'TRANSACTIONS',
        buildSummary: false,
        groupByRowFields: ['Product.Id', 'DateTime.Typed'],
        groupByColFields: [],
        aggregateFields: ['Amount'],
        filters: {
          'DateTime.Typed': {
            filterType: 'DateRange',
            periodType: 'CUSTOM',
            from: toIikoDateTime(startDate),
            to: toIikoDateTime(now)
          },
          'Product.Id': {
            filterType: 'IncludeValues',
            values: [productId]
          }
        }
      }

      const consumption = await client.postOlap(body)

      // Группируем по дням
      const dailyConsumption: { [date: string]: number } = {}
      
      for (const row of consumption.data || []) {
        const dateKey = row['DateTime.Typed']?.split('T')[0] || ''
        const amount = Number(row.Amount) || 0
        
        // Пропускаем положительные значения (приход на склад)
        // Нас интересует только расход (отрицательные значения)
        if (amount >= 0) continue
        
        if (!dailyConsumption[dateKey]) {
          dailyConsumption[dateKey] = 0
        }
        // Сохраняем абсолютное значение расхода
        dailyConsumption[dateKey] += Math.abs(amount)
      }

      // Создаем массив дней с расходом (включая дни с нулевым расходом)
      const days: { date: string; consumption: number }[] = []
      for (let i = 0; i < analysisWindowDays; i++) {
        const date = new Date(startDate)
        date.setDate(date.getDate() + i)
        const dateKey = date.toISOString().split('T')[0]
        days.push({
          date: dateKey,
          consumption: dailyConsumption[dateKey] || 0
        })
      }

      // Расчет скользящих сумм
      const windowSums: { date: string; windowSum: number }[] = []
      
      for (let i = 0; i <= days.length - purchaseWindowDays; i++) {
        let sum = 0
        for (let j = 0; j < purchaseWindowDays; j++) {
          sum += days[i + j].consumption
        }
        windowSums.push({
          date: days[i].date,
          windowSum: sum
        })
      }

      // Находим максимальную скользящую сумму
      const maxWindowSum = Math.max(...windowSums.map(w => w.windowSum), 0)

      res.json({
        productId,
        purchaseWindowDays,
        analysisWindowDays,
        autoBuffer: maxWindowSum,
        dailyConsumption: days,
        windowSums,
        maxWindowSum
      })
    } catch (error: any) {
      console.error('Error calculating buffer:', error)
      res.status(500).json({ error: error?.message || 'Failed to calculate buffer' })
    }
  })

  // POST массовый пересчет буферов для всех ингредиентов
  router.post('/recalculate-all', async (req, res) => {
    try {
      const tenant = await getTenant(prisma, req as any)
      const userId = getUserId(req as any)

      // Получаем настройки
      let settings = await (prisma as any).purchasingSettings?.findUnique({
        where: { tenantId: tenant.id }
      })

      if (!settings) {
        return res.status(400).json({ error: 'Settings not found. Please configure purchasing settings first.' })
      }

      const { purchaseWindowDays, analysisWindowDays } = settings

      // Получаем список всех ингредиентов (GOODS)
      const products = await client.listProducts({ includeDeleted: false })
      const items = Array.isArray(products) ? products : (products?.items || products?.data || [])
      const ingredients = items.filter((item: any) => 
        item.type === 'GOODS'
      ) || []

      console.log(`[buffer-recalculate] Processing ${ingredients.length} ingredients`)

      // Получаем данные расхода из iiko через OLAP
      const now = new Date()
      const startDate = new Date(now)
      startDate.setDate(startDate.getDate() - analysisWindowDays)

      // Без группировки по типу документа (поле не найдено)
      // Будем фильтровать только по знаку Amount
      const body = {
        reportType: 'TRANSACTIONS',
        buildSummary: false,
        groupByRowFields: ['Product.Id', 'DateTime.Typed'],
        groupByColFields: [],
        aggregateFields: ['Amount'],
        filters: {
          'DateTime.Typed': {
            filterType: 'DateRange',
            periodType: 'CUSTOM',
            from: toIikoDateTime(startDate),
            to: toIikoDateTime(now)
          }
        }
      }

      const consumption = await client.postOlap(body)

      // Группируем расход по продуктам и дням
      const consumptionByProduct: { [productId: string]: { [date: string]: number } } = {}

      for (const row of consumption.data || []) {
        const productId = row['Product.Id']
        const dateKey = row['DateTime.Typed']?.split('T')[0] || ''
        const amount = Number(row.Amount) || 0
        
        // Пропускаем положительные значения (приход на склад)
        // Нас интересует только расход (отрицательные значения)
        if (amount >= 0) continue
        
        if (!consumptionByProduct[productId]) {
          consumptionByProduct[productId] = {}
        }
        if (!consumptionByProduct[productId][dateKey]) {
          consumptionByProduct[productId][dateKey] = 0
        }
        // Сохраняем абсолютное значение расхода
        consumptionByProduct[productId][dateKey] += Math.abs(amount)
      }

      let updated = 0
      let created = 0

      // Обрабатываем каждый ингредиент
      for (const ingredient of ingredients) {
        const productId = ingredient.id
        const dailyConsumption = consumptionByProduct[productId] || {}

        // Создаем массив дней
        const days: number[] = []
        for (let i = 0; i < analysisWindowDays; i++) {
          const date = new Date(startDate)
          date.setDate(date.getDate() + i)
          const dateKey = date.toISOString().split('T')[0]
          days.push(dailyConsumption[dateKey] || 0)
        }

        // Расчет максимальной скользящей суммы
        let maxWindowSum = 0
        for (let i = 0; i <= days.length - purchaseWindowDays; i++) {
          let sum = 0
          for (let j = 0; j < purchaseWindowDays; j++) {
            sum += days[i + j]
          }
          if (sum > maxWindowSum) {
            maxWindowSum = sum
          }
        }

        // Сохраняем/обновляем буфер
        const existing = await (prisma as any).productBuffer?.findUnique({
          where: { productId }
        })

        if (existing) {
          await (prisma as any).productBuffer?.update({
            where: { productId },
            data: {
              autoBuffer: maxWindowSum,
              updatedBy: userId
            }
          })
          updated++
        } else {
          await (prisma as any).productBuffer?.create({
            data: {
              tenantId: tenant.id,
              productId,
              productName: ingredient.name,
              autoBuffer: maxWindowSum,
              unit: 'кг',
              createdBy: userId
            }
          })
          created++
        }
      }

      res.json({
        success: true,
        message: `Buffers recalculated. Created: ${created}, Updated: ${updated}`,
        created,
        updated
      })
    } catch (error: any) {
      console.error('Error recalculating buffers:', error)
      res.status(500).json({ error: error?.message || 'Failed to recalculate buffers' })
    }
  })

  // GET список буферов
  router.get('/', async (req, res) => {
    try {
      const tenant = await getTenant(prisma, req as any)
      
      const buffers = await (prisma as any).productBuffer?.findMany({
        where: { tenantId: tenant.id, isActive: true },
        orderBy: { productName: 'asc' }
      }) || []

      res.json({ buffers })
    } catch (error: any) {
      console.error('Error loading buffers:', error)
      res.status(500).json({ error: error?.message || 'Failed to load buffers' })
    }
  })

  // PATCH обновление буфера (ручная корректировка)
  router.patch('/:id', async (req, res) => {
    try {
      const { id } = req.params
      const { manualBuffer, notes } = req.body
      const userId = getUserId(req as any)

      const data: any = {
        updatedBy: userId
      }

      if (typeof manualBuffer === 'number') {
        data.manualBuffer = manualBuffer
      }

      if (typeof notes === 'string') {
        data.notes = notes
      }

      const buffer = await (prisma as any).productBuffer?.update({
        where: { id },
        data
      })

      res.json({ buffer })
    } catch (error: any) {
      console.error('Error updating buffer:', error)
      res.status(500).json({ error: error?.message || 'Failed to update buffer' })
    }
  })

  return router
}

