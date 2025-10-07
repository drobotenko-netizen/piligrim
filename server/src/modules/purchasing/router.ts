import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { getTenant } from '../../utils/tenant'
import { requirePermission } from '../../utils/auth'

export function createPurchasingRouter(prisma: PrismaClient) {
  const router = Router()

  // ===== Расчет заказов =====

  // GET /api/purchasing/calculate-orders - Основной расчет заказов
  router.get('/calculate-orders', requirePermission(prisma, 'iiko.read'), async (req: any, res) => {
    try {
      const tenantId = await getTenant(prisma, req)
      const { storeId, supplierId, productId, date } = req.query

      // Получаем все продукты с буферами
      const productsWithBuffers = await prisma.productBuffer.findMany({
        where: {
          tenantId,
          isActive: true,
          ...(productId && { productId })
        },
        include: {
          productSuppliers: {
            where: { isActive: true },
            include: { supplier: true },
            orderBy: [
              { isPrimary: 'desc' },
              { priority: 'asc' }
            ]
          }
        }
      })

      const calculations = []

      for (const buffer of productsWithBuffers) {
        // Получаем поставщика (основной или запасной)
        const supplier = buffer.productSuppliers.find(ps => ps.isPrimary) || 
                        buffer.productSuppliers[0]

        if (!supplier) continue

        // Фильтруем по поставщику если указан
        if (supplierId && supplier.supplierId !== supplierId) continue

        // Рассчитываем расход за неделю (заглушка - будет интегрировано с iiko)
        const weeklyConsumption = await calculateWeeklyConsumption(prisma, buffer.productId, storeId)

        // Рассчитываем буферный запас
        const bufferStock = calculateBufferStock(buffer, weeklyConsumption)

        // Получаем текущий остаток
        const currentStock = await getCurrentStock(prisma, buffer.productId, storeId || 'default')

        // Рассчитываем количество к заказу
        const orderQuantity = bufferStock - Math.max(currentStock, 0)

        if (orderQuantity > 0) {
          calculations.push({
            productId: buffer.productId,
            productName: buffer.productName,
            supplierId: supplier.supplierId,
            supplierName: supplier.supplier.name,
            isPrimarySupplier: supplier.isPrimary,
            weeklyConsumption,
            bufferStock,
            currentStock,
            orderQuantity,
            price: supplier.price,
            totalAmount: orderQuantity * (supplier.price || 0),
            deliveryDays: supplier.deliveryDays,
            unit: supplier.unit
          })
        }
      }

      res.json({ calculations, date: date || new Date().toISOString().split('T')[0] })
    } catch (e: any) {
      console.error('Error calculating orders:', e)
      res.status(500).json({ error: String(e?.message || e) })
    }
  })

  // ===== Управление буферами =====

  // GET /api/purchasing/buffers - Список буферов
  router.get('/buffers', requirePermission(prisma, 'iiko.read'), async (req: any, res) => {
    try {
      const tenantId = await getTenant(prisma, req)
      const { productId } = req.query

      const buffers = await prisma.productBuffer.findMany({
        where: {
          tenantId,
          ...(productId && { productId })
        },
        orderBy: { productName: 'asc' }
      })

      res.json({ buffers })
    } catch (e: any) {
      res.status(500).json({ error: String(e?.message || e) })
    }
  })

  // POST /api/purchasing/buffers - Создать буфер
  router.post('/buffers', requirePermission(prisma, 'iiko.manage'), async (req: any, res) => {
    try {
      const tenantId = await getTenant(prisma, req)
      const { productId, productName, bufferDays, minBuffer, maxBuffer, notes } = req.body

      if (!productId || !productName) {
        return res.status(400).json({ error: 'productId and productName are required' })
      }

      const buffer = await prisma.productBuffer.create({
        data: {
          tenantId,
          productId,
          productName,
          bufferDays: bufferDays || 7,
          minBuffer: minBuffer || 0,
          maxBuffer,
          notes,
          createdBy: req.auth?.userId
        }
      })

      res.json({ buffer })
    } catch (e: any) {
      res.status(500).json({ error: String(e?.message || e) })
    }
  })

  // PUT /api/purchasing/buffers/:id - Обновить буфер
  router.put('/buffers/:id', requirePermission(prisma, 'iiko.manage'), async (req: any, res) => {
    try {
      const tenantId = await getTenant(prisma, req)
      const { id } = req.params
      const { bufferDays, minBuffer, maxBuffer, isActive, notes } = req.body

      const buffer = await prisma.productBuffer.update({
        where: { id, tenantId },
        data: {
          bufferDays,
          minBuffer,
          maxBuffer,
          isActive,
          notes,
          updatedBy: req.auth?.userId
        }
      })

      res.json({ buffer })
    } catch (e: any) {
      res.status(500).json({ error: String(e?.message || e) })
    }
  })

  // DELETE /api/purchasing/buffers/:id - Удалить буфер
  router.delete('/buffers/:id', requirePermission(prisma, 'iiko.manage'), async (req: any, res) => {
    try {
      const tenantId = await getTenant(prisma, req)
      const { id } = req.params

      await prisma.productBuffer.delete({
        where: { id, tenantId }
      })

      res.json({ success: true })
    } catch (e: any) {
      res.status(500).json({ error: String(e?.message || e) })
    }
  })

  // ===== Управление поставщиками продуктов =====

  // GET /api/purchasing/product-suppliers - Список поставщиков продуктов
  router.get('/product-suppliers', requirePermission(prisma, 'iiko.read'), async (req: any, res) => {
    try {
      const tenantId = await getTenant(prisma, req)
      const { productId, supplierId } = req.query

      const productSuppliers = await prisma.productSupplier.findMany({
        where: {
          tenantId,
          ...(productId && { productId }),
          ...(supplierId && { supplierId })
        },
        include: { supplier: true },
        orderBy: [
          { productName: 'asc' },
          { isPrimary: 'desc' },
          { priority: 'asc' }
        ]
      })

      res.json({ productSuppliers })
    } catch (e: any) {
      res.status(500).json({ error: String(e?.message || e) })
    }
  })

  // POST /api/purchasing/product-suppliers - Создать связь продукт-поставщик
  router.post('/product-suppliers', requirePermission(prisma, 'iiko.manage'), async (req: any, res) => {
    try {
      const tenantId = await getTenant(prisma, req)
      const { 
        productId, 
        productName, 
        supplierId, 
        isPrimary, 
        priority, 
        minOrderAmount, 
        deliveryDays, 
        price, 
        unit, 
        notes 
      } = req.body

      if (!productId || !productName || !supplierId) {
        return res.status(400).json({ error: 'productId, productName and supplierId are required' })
      }

      const productSupplier = await prisma.productSupplier.create({
        data: {
          tenantId,
          productId,
          productName,
          supplierId,
          isPrimary: isPrimary || false,
          priority: priority || 1,
          minOrderAmount,
          deliveryDays: deliveryDays || 1,
          price,
          unit: unit || 'кг',
          notes,
          createdBy: req.auth?.userId
        },
        include: { supplier: true }
      })

      res.json({ productSupplier })
    } catch (e: any) {
      res.status(500).json({ error: String(e?.message || e) })
    }
  })

  // PUT /api/purchasing/product-suppliers/:id - Обновить связь продукт-поставщик
  router.put('/product-suppliers/:id', requirePermission(prisma, 'iiko.manage'), async (req: any, res) => {
    try {
      const tenantId = await getTenant(prisma, req)
      const { id } = req.params
      const { 
        isPrimary, 
        priority, 
        isActive, 
        minOrderAmount, 
        deliveryDays, 
        price, 
        unit, 
        notes 
      } = req.body

      const productSupplier = await prisma.productSupplier.update({
        where: { id, tenantId },
        data: {
          isPrimary,
          priority,
          isActive,
          minOrderAmount,
          deliveryDays,
          price,
          unit,
          notes,
          updatedBy: req.auth?.userId
        },
        include: { supplier: true }
      })

      res.json({ productSupplier })
    } catch (e: any) {
      res.status(500).json({ error: String(e?.message || e) })
    }
  })

  // DELETE /api/purchasing/product-suppliers/:id - Удалить связь продукт-поставщик
  router.delete('/product-suppliers/:id', requirePermission(prisma, 'iiko.manage'), async (req: any, res) => {
    try {
      const tenantId = await getTenant(prisma, req)
      const { id } = req.params

      await prisma.productSupplier.delete({
        where: { id, tenantId }
      })

      res.json({ success: true })
    } catch (e: any) {
      res.status(500).json({ error: String(e?.message || e) })
    }
  })

  // ===== Заказы поставщикам =====

  // GET /api/purchasing/orders - Список заказов
  router.get('/orders', requirePermission(prisma, 'iiko.read'), async (req: any, res) => {
    try {
      const tenantId = await getTenant(prisma, req)
      const { supplierId, status, from, to } = req.query

      const where: any = { tenantId }
      if (supplierId) where.supplierId = supplierId
      if (status) where.status = status
      if (from || to) {
        where.orderDate = {}
        if (from) where.orderDate.gte = new Date(from)
        if (to) where.orderDate.lte = new Date(to)
      }

      const orders = await prisma.supplierOrder.findMany({
        where,
        include: {
          supplier: true,
          items: true
        },
        orderBy: { orderDate: 'desc' }
      })

      res.json({ orders })
    } catch (e: any) {
      res.status(500).json({ error: String(e?.message || e) })
    }
  })

  // POST /api/purchasing/orders - Создать заказ
  router.post('/orders', requirePermission(prisma, 'iiko.manage'), async (req: any, res) => {
    try {
      const tenantId = await getTenant(prisma, req)
      const { supplierId, scheduledDate, items, notes } = req.body

      if (!supplierId || !scheduledDate || !items || !Array.isArray(items)) {
        return res.status(400).json({ error: 'supplierId, scheduledDate and items are required' })
      }

      // Рассчитываем общую сумму
      const totalAmount = items.reduce((sum: number, item: any) => {
        return sum + (item.quantity * (item.price || 0))
      }, 0)

      const order = await prisma.supplierOrder.create({
        data: {
          tenantId,
          supplierId,
          scheduledDate: new Date(scheduledDate),
          totalAmount,
          notes,
          createdBy: req.auth?.userId,
          items: {
            create: items.map((item: any) => ({
              productId: item.productId,
              productName: item.productName,
              quantity: item.quantity,
              unit: item.unit,
              price: item.price,
              totalAmount: item.quantity * (item.price || 0),
              notes: item.notes
            }))
          }
        },
        include: {
          supplier: true,
          items: true
        }
      })

      res.json({ order })
    } catch (e: any) {
      res.status(500).json({ error: String(e?.message || e) })
    }
  })

  // PUT /api/purchasing/orders/:id/status - Изменить статус заказа
  router.put('/orders/:id/status', requirePermission(prisma, 'iiko.manage'), async (req: any, res) => {
    try {
      const tenantId = await getTenant(prisma, req)
      const { id } = req.params
      const { status, deliveryDate } = req.body

      if (!status) {
        return res.status(400).json({ error: 'status is required' })
      }

      const updateData: any = { status, updatedBy: req.auth?.userId }
      if (deliveryDate) updateData.deliveryDate = new Date(deliveryDate)

      const order = await prisma.supplierOrder.update({
        where: { id, tenantId },
        data: updateData,
        include: {
          supplier: true,
          items: true
        }
      })

      res.json({ order })
    } catch (e: any) {
      res.status(500).json({ error: String(e?.message || e) })
    }
  })

  // ===== Синхронизация с iiko =====

  // POST /api/purchasing/sync-stocks - Синхронизация остатков с iiko
  router.post('/sync-stocks', requirePermission(prisma, 'iiko.manage'), async (req: any, res) => {
    try {
      const tenantId = await getTenant(prisma, req)
      const { storeIds, productIds } = req.body

      const { createIikoClient } = await import('../iiko/client')
      const client = createIikoClient()
      
      // Получаем остатки из iiko
      const response = await client.getStoresBalances()
      const balances = Array.isArray(response?.data) ? response.data : []
      
      let syncedCount = 0
      const errors: string[] = []

      for (const balance of balances) {
        try {
          // Фильтруем по storeIds если указаны
          if (storeIds && Array.isArray(storeIds) && !storeIds.includes(balance.storeId)) {
            continue
          }

          // Фильтруем по productIds если указаны
          if (productIds && Array.isArray(productIds) && !productIds.includes(balance.productId)) {
            continue
          }

          await prisma.productStock.upsert({
            where: {
              productId_storeId: {
                productId: balance.productId,
                storeId: balance.storeId
              }
            },
            update: {
              currentStock: Number(balance.balance) || 0,
              lastSyncWithIiko: new Date()
            },
            create: {
              tenantId,
              productId: balance.productId,
              productName: balance.productName || 'Unknown',
              storeId: balance.storeId,
              storeName: balance.storeName || 'Unknown',
              currentStock: Number(balance.balance) || 0,
              lastSyncWithIiko: new Date()
            }
          })

          syncedCount++
        } catch (error) {
          errors.push(`Error syncing ${balance.productId}: ${error}`)
        }
      }

      res.json({ 
        success: true, 
        syncedCount, 
        totalBalances: balances.length,
        errors: errors.slice(0, 10) // Показываем только первые 10 ошибок
      })
    } catch (e: any) {
      res.status(500).json({ error: String(e?.message || e) })
    }
  })

  // GET /api/purchasing/stocks - Получить остатки продуктов
  router.get('/stocks', requirePermission(prisma, 'iiko.read'), async (req: any, res) => {
    try {
      const tenantId = await getTenant(prisma, req)
      const { storeId, productId, lowStock } = req.query

      const where: any = { tenantId }
      if (storeId) where.storeId = storeId
      if (productId) where.productId = productId
      if (lowStock === 'true') where.currentStock = { lte: 10 } // Малые остатки

      const stocks = await prisma.productStock.findMany({
        where,
        orderBy: [
          { productName: 'asc' },
          { storeName: 'asc' }
        ]
      })

      res.json({ stocks })
    } catch (e: any) {
      res.status(500).json({ error: String(e?.message || e) })
    }
  })

  return router
}

// ===== Вспомогательные функции =====

// Расчет расхода за неделю на основе данных iiko
async function calculateWeeklyConsumption(prisma: PrismaClient, productId: string, storeId?: string): Promise<number> {
  try {
    // Получаем данные о расходе за последние 4 недели
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - 28) // 4 недели назад

    // Запрос к iiko OLAP для получения расхода
    const filters: any = {
      'DateTime.Typed': { 
        filterType: 'DateRange', 
        periodType: 'CUSTOM', 
        from: startDate.toISOString().split('T')[0] + 'T00:00:00.000',
        to: endDate.toISOString().split('T')[0] + 'T00:00:00.000'
      },
      'Product.Id': { filterType: 'IncludeValues', values: [productId] }
    }

    if (storeId) {
      filters['Store'] = { filterType: 'IncludeValues', values: [storeId] }
    }

    const body = {
      reportType: 'TRANSACTIONS',
      buildSummary: false,
      groupByRowFields: ['Product.Id', 'Product.Name'],
      groupByColFields: [],
      aggregateFields: ['Amount'],
      filters
    }

    // Используем существующий iiko клиент
    const { createIikoClient } = await import('../iiko/client')
    const client = createIikoClient()
    const response = await client.postOlap(body)
    
    const rows = Array.isArray(response?.data) ? response.data : []
    const totalConsumption = rows.reduce((sum: number, row: any) => {
      return sum + (Number(row?.Amount) || 0)
    }, 0)

    // Возвращаем средний недельный расход
    return totalConsumption / 4
  } catch (error) {
    console.error('Error calculating weekly consumption:', error)
    // Возвращаем значение по умолчанию при ошибке
    return 10 // 10 единиц в неделю по умолчанию
  }
}

// Расчет буферного запаса
function calculateBufferStock(buffer: any, weeklyConsumption: number): number {
  if (!buffer.isActive) return 0

  // Базовый буфер на основе расхода
  const baseBuffer = Math.ceil(weeklyConsumption * (buffer.bufferDays / 7))

  // Применяем ограничения
  return Math.max(
    buffer.minBuffer,
    buffer.maxBuffer ? Math.min(buffer.maxBuffer, baseBuffer) : baseBuffer
  )
}

// Получение текущего остатка из iiko
async function getCurrentStock(prisma: PrismaClient, productId: string, storeId: string): Promise<number> {
  try {
    // Сначала проверяем локальную базу данных
    const localStock = await prisma.productStock.findFirst({
      where: {
        productId,
        storeId
      }
    })

    if (localStock) {
      // Если данные не старше 1 часа, используем их
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
      if (localStock.lastSyncWithIiko > oneHourAgo) {
        return localStock.currentStock
      }
    }

    // Получаем актуальные данные из iiko
    const { createIikoClient } = await import('../iiko/client')
    const client = createIikoClient()
    
    // Запрос остатков из iiko
    const response = await client.getStoresBalances()
    const balances = Array.isArray(response?.data) ? response.data : []
    
    const productBalance = balances.find((balance: any) => 
      balance.productId === productId && balance.storeId === storeId
    )

    const currentStock = productBalance ? Number(productBalance.balance) || 0 : 0

    // Обновляем локальную базу данных
    await prisma.productStock.upsert({
      where: {
        productId_storeId: {
          productId,
          storeId
        }
      },
      update: {
        currentStock,
        lastSyncWithIiko: new Date()
      },
      create: {
        productId,
        productName: productBalance?.productName || 'Unknown',
        storeId,
        storeName: productBalance?.storeName || 'Unknown',
        currentStock,
        lastSyncWithIiko: new Date()
      }
    })

    return currentStock
  } catch (error) {
    console.error('Error getting current stock:', error)
    // Возвращаем значение из локальной базы или 0
    const localStock = await prisma.productStock.findFirst({
      where: { productId, storeId }
    })
    return localStock?.currentStock || 0
  }
}
