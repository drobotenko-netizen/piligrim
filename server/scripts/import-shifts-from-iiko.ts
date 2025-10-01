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

async function importShiftsFromIiko(fromDate: string, toDate: string, mode: 'merge' | 'separate' = 'merge') {
  const modeText = mode === 'merge' ? 'объединение по дням' : 'раздельные смены'
  console.log(`🔄 Импорт смен из iiko API + чеков: ${fromDate} - ${toDate}`)
  console.log(`📋 Режим: ${modeText}`)

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
      status: 'ANY'
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

  // Сопоставляем UUID с именами - группируем по дням и берём самого частого waiter
  const uuidToNameMap = new Map<string, Map<string, number>>()
  
  // Группируем смены по дням для сопоставления
  const shiftsByDayTemp = new Map<string, any[]>()
  for (const iikoShift of iikoShifts) {
    if (!iikoShift.openDate) continue
    const dateKey = new Date(iikoShift.openDate).toISOString().slice(0, 10)
    if (!shiftsByDayTemp.has(dateKey)) {
      shiftsByDayTemp.set(dateKey, [])
    }
    shiftsByDayTemp.get(dateKey)!.push(iikoShift)
  }
  
  for (const [dateKey, dayShifts] of shiftsByDayTemp.entries()) {
    // Берём последнюю закрытую смену для UUID
    const lastShift = dayShifts.sort((a: any, b: any) => 
      (b.closeDate ? new Date(b.closeDate).getTime() : 0) - 
      (a.closeDate ? new Date(a.closeDate).getTime() : 0)
    )[0]
    
    if (!lastShift.responsibleUserId) continue
    
    // Чеки за день
    const dayReceipts = receipts.filter(r => {
      const rDate = r.date
      const dayStart = new Date(dateKey + 'T00:00:00.000Z')
      const dayEnd = new Date(dateKey + 'T23:59:59.999Z')
      return rDate >= dayStart && rDate <= dayEnd && r.waiter
    })
    
    const waiterCounts = new Map<string, number>()
    dayReceipts.forEach(r => {
      if (r.waiter) {
        waiterCounts.set(r.waiter, (waiterCounts.get(r.waiter) || 0) + 1)
      }
    })
    
    let maxName = ''
    let maxCount = 0
    for (const [name, count] of waiterCounts.entries()) {
      if (count > maxCount) {
        maxCount = count
        maxName = name
      }
    }
    
    if (maxName) {
      if (!uuidToNameMap.has(lastShift.responsibleUserId)) {
        uuidToNameMap.set(lastShift.responsibleUserId, new Map())
      }
      uuidToNameMap.get(lastShift.responsibleUserId)!.set(maxName, maxCount)
    }
  }
  
  const employeesMap = new Map<string, string>()
  for (const [uuid, names] of uuidToNameMap.entries()) {
    let bestName = ''
    let bestCount = 0
    for (const [name, count] of names.entries()) {
      if (count > bestCount) {
        bestCount = count
        bestName = name
      }
    }
    if (bestName) {
      employeesMap.set(uuid, bestName)
    }
  }
  
  console.log(`👥 Сопоставлено UUID → имена: ${employeesMap.size}`)
  for (const [uuid, name] of employeesMap.entries()) {
    console.log(`   ${uuid.slice(0, 8)}... → ${name}`)
  }

  // Группируем смены iiko по дням (может быть несколько смен в день)
  const shiftsByDay = new Map<string, any[]>()
  for (const iikoShift of iikoShifts) {
    if (!iikoShift.openDate) continue
    const dateKey = new Date(iikoShift.openDate).toISOString().slice(0, 10)
    if (!shiftsByDay.has(dateKey)) {
      shiftsByDay.set(dateKey, [])
    }
    shiftsByDay.get(dateKey)!.push(iikoShift)
  }

  let shiftsCreated = 0
  let salesCreated = 0

  if (mode === 'merge') {
    // РЕЖИМ 1: Объединяем смены по дням
    for (const [dateKey, dayShifts] of shiftsByDay.entries()) {
      console.log(`\n📅 Обработка ${dateKey}: ${dayShifts.length} смен(ы) iiko`)

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

      // Берём самую раннюю дату открытия и самую позднюю дату закрытия
      const openAt = new Date(Math.min(...dayShifts.map((s: any) => new Date(s.openDate).getTime())))
      const closeAt = new Date(Math.max(...dayShifts.map((s: any) => 
        s.closeDate ? new Date(s.closeDate).getTime() : new Date().getTime()
      )))
      
      // Берём ответственного из последней закрытой смены
      const lastShift = dayShifts.sort((a: any, b: any) => 
        (b.closeDate ? new Date(b.closeDate).getTime() : 0) - 
        (a.closeDate ? new Date(a.closeDate).getTime() : 0)
      )[0]
      
      const userId = lastShift.responsibleUserId || lastShift.managerId
      const closedBy = userId ? (employeesMap.get(userId) || userId) : 'unknown'
      
      const sessionNumbers = dayShifts.map((s: any) => s.sessionNumber).join(', ')
      console.log(`  📡 Из iiko API: смены #${sessionNumbers}`)
      console.log(`     Даты: ${openAt.toISOString()} - ${closeAt.toISOString()}`)
      console.log(`     Закрыл: ${closedBy}`)
      
      // Чеки за ДЕНЬ
      const dayStart = new Date(dateKey + 'T00:00:00.000Z')
      const dayEnd = new Date(dateKey + 'T23:59:59.999Z')
      
      const shiftReceipts = receipts.filter(r => {
        const rDate = r.date
        return rDate >= dayStart && rDate <= dayEnd
      })
      
      console.log(`  📄 Чеков за день: ${shiftReceipts.length}`)

    // Агрегируем продажи по channel × tenderType
    type SaleKey = string // `${channelName}__${tenderTypeName}`
    const salesAgg = new Map<SaleKey, { channel: string; tender: string; gross: number; discounts: number; refunds: number }>()

    for (const receipt of shiftReceipts) {
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
          note: `Смены iiko #${sessionNumbers}: ${shiftReceipts.length} чеков`,
          iikoSessionNum: dayShifts.length > 1 ? null : dayShifts[0].sessionNumber,
          iikoCashRegNum: dayShifts.length > 1 ? null : dayShifts[0].cashRegNumber
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
  } else {
    // РЕЖИМ 2: Создаём отдельную смену для каждой смены iiko
    for (const iikoShift of iikoShifts) {
      if (!iikoShift.openDate) continue
      
      const openAt = new Date(iikoShift.openDate)
      const closeAt = iikoShift.closeDate ? new Date(iikoShift.closeDate) : new Date()
      const dateKey = openAt.toISOString().slice(0, 10)
      
      console.log(`\n📅 Обработка смены #${iikoShift.sessionNumber} (${dateKey})`)

      // Проверяем, есть ли уже такая смена
      const existingShift = await prisma.shift.findFirst({
        where: {
          tenantId: tenant.id,
          openAt,
          closeAt
        }
      })

      if (existingShift) {
        console.log(`  ⏭️  Смена уже существует, пропускаем`)
        continue
      }

      const userId = iikoShift.responsibleUserId || iikoShift.managerId
      const closedBy = userId ? (employeesMap.get(userId) || userId) : 'unknown'
      
      console.log(`  📡 Из iiko API:`)
      console.log(`     Даты: ${openAt.toISOString()} - ${closeAt.toISOString()}`)
      console.log(`     Закрыл: ${closedBy}`)
      
      // Чеки КОНКРЕТНО ЭТОЙ СМЕНЫ по sessionNumber
      const shiftReceipts = receipts.filter(r => {
        return r.sessionNumber === iikoShift.sessionNumber
      })
      
      console.log(`  📄 Чеков в смене #${iikoShift.sessionNumber}: ${shiftReceipts.length}`)

      // Агрегируем продажи
      type SaleKey = string
      const salesAgg = new Map<SaleKey, { channel: string; tender: string; gross: number; discounts: number; refunds: number }>()

      for (const receipt of shiftReceipts) {
        const channelName = mapToChannel(receipt.orderType, receipt.deliveryServiceType)
        
        let payTypes: string[] = []
        try {
          if (receipt.payTypesJson) {
            const parsed = JSON.parse(receipt.payTypesJson)
            if (Array.isArray(parsed)) {
              payTypes = parsed
            }
          }
        } catch {}

        if (payTypes.length === 0) payTypes = ['Прочее']

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
          note: `Смена iiko #${iikoShift.sessionNumber}: ${shiftReceipts.length} чеков`,
          iikoSessionNum: iikoShift.sessionNumber,
          iikoCashRegNum: iikoShift.cashRegNumber
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
  }

  console.log(`\n✨ Импорт завершён:`)
  console.log(`  Смен создано: ${shiftsCreated}`)
  console.log(`  Продаж создано: ${salesCreated}`)
}

// Запуск из командной строки
const fromDate = process.argv[2] || '2025-01-01'
const toDate = process.argv[3] || new Date().toISOString().slice(0, 10)
const mode = (process.argv[4] === 'separate' ? 'separate' : 'merge') as 'merge' | 'separate'

importShiftsFromIiko(fromDate, toDate, mode)
  .then(() => {
    console.log('✅ Готово!')
    prisma.$disconnect()
  })
  .catch((e) => {
    console.error('❌ Ошибка:', e)
    prisma.$disconnect()
    process.exit(1)
  })

