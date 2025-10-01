import { PrismaClient } from '@prisma/client'
import { IikoClient } from '../src/modules/iiko/client'

const prisma = new PrismaClient()
const iikoClient = new IikoClient()

// Маппинг orderType + deliveryServiceType → Channel
function mapToChannel(orderType: string | null, deliveryServiceType: string | null): string {
  if (deliveryServiceType === 'COURIER') return 'Grab' // Курьерская доставка
  if (deliveryServiceType === 'PICKUP') return 'Pickup' // Самовывоз
  if (orderType === 'Доставка самовывоз') return 'Pickup'
  if (orderType === 'Доставка курьером') return 'Delivery'
  return 'Dine-in' // По умолчанию - в зале
}

// Маппинг payType из iiko → TenderType
function mapToTenderType(payType: string): string {
  const lower = payType.toLowerCase()
  if (lower.includes('наличн')) return 'Наличные'
  if (lower.includes('сбер') || lower.includes('card')) return 'Карта'
  if (lower.includes('qr') || lower.includes('кьюар')) return 'QR-код'
  if (lower.includes('бонус')) return 'Бонусы'
  return 'Прочее'
}

async function importShiftsFromIiko(fromDate: string, toDate: string) {
  console.log(`🔄 Импорт смен из iiko API + чеков: ${fromDate} - ${toDate}`)

  const tenant = await prisma.tenant.findFirst()
  if (!tenant) {
    throw new Error('Tenant not found')
  }

  // Получаем смены напрямую из iiko API
  let iikoShifts: any[] = []
  try {
    iikoShifts = await iikoClient.getCashShifts({
      openDateFrom: fromDate,
      openDateTo: toDate,
      status: 'CLOSED'
    })
    console.log(`📡 Получено смен из iiko API: ${iikoShifts.length}`)
  } catch (e) {
    console.warn(`⚠️  Не удалось получить смены из iiko API: ${e}`)
    console.log(`   Используем группировку по чекам`)
  }

  // Получаем или создаём каналы и способы оплаты
  const channelMap = new Map<string, string>()
  const tenderTypeMap = new Map<string, string>()

  const channelNames = ['Dine-in', 'Pickup', 'Delivery', 'Grab', 'Foodpanda']
  for (const name of channelNames) {
    let channel = await prisma.channel.findFirst({
      where: { tenantId: tenant.id, name }
    })
    if (!channel) {
      channel = await prisma.channel.create({
        data: { tenantId: tenant.id, name }
      })
      console.log(`✅ Создан канал: ${name}`)
    }
    channelMap.set(name, channel.id)
  }

  const tenderNames = ['Наличные', 'Карта', 'QR-код', 'Бонусы', 'Прочее']
  for (const name of tenderNames) {
    let tender = await prisma.tenderType.findFirst({
      where: { tenantId: tenant.id, name }
    })
    if (!tender) {
      tender = await prisma.tenderType.create({
        data: { tenantId: tenant.id, name }
      })
      console.log(`✅ Создан способ оплаты: ${name}`)
    }
    tenderTypeMap.set(name, tender.id)
  }

  // Получаем чеки за период
  const receipts = await prisma.iikoReceipt.findMany({
    where: {
      date: {
        gte: new Date(fromDate),
        lt: new Date(toDate)
      },
      OR: [
        { isDeleted: false },
        { isDeleted: null }
      ]
    },
    orderBy: { date: 'asc' }
  })

  console.log(`📄 Найдено чеков: ${receipts.length}`)

  // Создаём map смен iiko по датам для быстрого поиска
  const iikoShiftsMap = new Map<string, any>()
  for (const iikoShift of iikoShifts) {
    if (iikoShift.openDate) {
      const dateKey = new Date(iikoShift.openDate).toISOString().slice(0, 10)
      // Если в один день несколько смен - берём последнюю закрытую
      if (!iikoShiftsMap.has(dateKey) || iikoShift.closeDate) {
        iikoShiftsMap.set(dateKey, iikoShift)
      }
    }
  }

  // Группируем чеки по дням
  const dayMap = new Map<string, any[]>()
  
  for (const receipt of receipts) {
    const dateKey = receipt.date.toISOString().slice(0, 10)
    if (!dayMap.has(dateKey)) {
      dayMap.set(dateKey, [])
    }
    dayMap.get(dateKey)!.push(receipt)
  }

  let shiftsCreated = 0
  let salesCreated = 0

  // Создаём смены для каждого дня
  for (const [dateKey, dayReceipts] of dayMap.entries()) {
    console.log(`\n📅 Обработка ${dateKey}: ${dayReceipts.length} чеков`)

    // Проверяем, есть ли уже смена на этот день
    const existingShift = await prisma.shift.findFirst({
      where: {
        tenantId: tenant.id,
        openAt: {
          gte: new Date(dateKey + 'T00:00:00.000Z'),
          lt: new Date(dateKey + 'T23:59:59.999Z')
        }
      }
    })

    if (existingShift) {
      console.log(`  ⏭️  Смена уже существует, пропускаем`)
      continue
    }

    // Получаем данные о смене из iiko API (если есть)
    const iikoShift = iikoShiftsMap.get(dateKey)
    
    let openAt: Date
    let closeAt: Date
    let closedBy = 'unknown'
    
    if (iikoShift) {
      // Используем данные из iiko API смен
      openAt = iikoShift.openDate ? new Date(iikoShift.openDate) : new Date(dateKey + 'T09:00:00.000Z')
      closeAt = iikoShift.closeDate ? new Date(iikoShift.closeDate) : new Date(dateKey + 'T23:00:00.000Z')
      
      // responsibleUserId - UUID кассира из iiko
      closedBy = iikoShift.responsibleUserId || iikoShift.managerId || 'unknown'
      
      console.log(`  📡 Из iiko API: смена #${iikoShift.sessionNumber}`)
      console.log(`     Даты: ${openAt.toISOString()} - ${closeAt.toISOString()}`)
      console.log(`     Закрыл: ${closedBy}`)
    } else {
      // Fallback: определяем из чеков
      const times = dayReceipts
        .map(r => r.closeTime || r.openTime || r.date)
        .filter(t => t != null) as Date[]
      
      openAt = times.length > 0 ? new Date(Math.min(...times.map(t => t.getTime()))) : new Date(dateKey + 'T09:00:00.000Z')
      closeAt = times.length > 0 ? new Date(Math.max(...times.map(t => t.getTime()))) : new Date(dateKey + 'T23:00:00.000Z')
      
      console.log(`  ⚠️  Нет данных из iiko API, используем чеки`)
    }

    // Агрегируем продажи по channel × tenderType
    type SaleKey = string // `${channelName}__${tenderTypeName}`
    const salesAgg = new Map<SaleKey, { channel: string; tender: string; gross: number; discounts: number; refunds: number }>()

    for (const receipt of dayReceipts) {
      // Определяем канал
      const channelName = mapToChannel(receipt.orderType, receipt.deliveryServiceType)
      
      // Парсим способы оплаты
      let payTypes: string[] = []
      try {
        if (receipt.payTypesJson) {
          payTypes = JSON.parse(receipt.payTypesJson)
        }
      } catch {
        payTypes = ['Прочее']
      }

      if (payTypes.length === 0) payTypes = ['Прочее']

      // Распределяем сумму чека пропорционально между способами оплаты
      // ВАЖНО: receipt.net в целых рублях, нужно умножить на 100 для копеек!
      const netAmountCents = (receipt.net || 0) * 100
      const amountPerType = Math.floor(netAmountCents / payTypes.length)

      for (const payType of payTypes) {
        const tenderName = mapToTenderType(payType)
        const key: SaleKey = `${channelName}__${tenderName}`

        const sale = salesAgg.get(key) || { 
          channel: channelName, 
          tender: tenderName, 
          gross: 0, 
          discounts: 0, 
          refunds: 0 
        }

        sale.gross += amountPerType
        // discounts и refunds тоже в целых рублях
        if (receipt.isReturn) {
          sale.refunds += Math.abs(receipt.returnSum || 0) * 100
        }

        salesAgg.set(key, sale)
      }
    }

    // Создаём смену
    const shift = await prisma.shift.create({
      data: {
        tenantId: tenant.id,
        openAt,
        closeAt,
        openedBy: closedBy,
        closedBy: closedBy,
        note: `Импорт из iiko: ${dayReceipts.length} чеков`
      }
    })

    shiftsCreated++
    console.log(`  ✅ Смена создана: ${openAt.toISOString()} - ${closeAt.toISOString()}`)

    // Создаём продажи
    for (const [key, sale] of salesAgg.entries()) {
      const channelId = channelMap.get(sale.channel)
      const tenderTypeId = tenderTypeMap.get(sale.tender)

      if (!channelId || !tenderTypeId) {
        console.warn(`  ⚠️  Пропуск: канал=${sale.channel}, способ=${sale.tender}`)
        continue
      }

      await prisma.shiftSale.create({
        data: {
          shiftId: shift.id,
          channelId,
          tenderTypeId,
          grossAmount: sale.gross,
          discounts: sale.discounts,
          refunds: sale.refunds
        }
      })

      salesCreated++
      console.log(`    📊 ${sale.channel} × ${sale.tender}: ${sale.gross / 100} ₽`)
    }
  }

  console.log(`\n✨ Импорт завершён:`)
  console.log(`  Смен создано: ${shiftsCreated}`)
  console.log(`  Продаж создано: ${salesCreated}`)
}

// Запуск из командной строки
const fromDate = process.argv[2] || '2025-01-01'
const toDate = process.argv[3] || new Date().toISOString().slice(0, 10)

importShiftsFromIiko(fromDate, toDate)
  .then(() => {
    console.log('✅ Готово!')
    prisma.$disconnect()
  })
  .catch((e) => {
    console.error('❌ Ошибка:', e)
    prisma.$disconnect()
    process.exit(1)
  })

