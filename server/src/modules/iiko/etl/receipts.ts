import { PrismaClient } from '@prisma/client'
import { IikoClient, buildDayRangeIso } from '../client'
import fs from 'fs'
import path from 'path'

// Функция для логирования в файл
function logToFile(message: string) {
  const logFile = path.join(process.cwd(), 'etl.log')
  const timestamp = new Date().toISOString()
  fs.appendFileSync(logFile, `[${timestamp}] ${message}\n`)
  console.log(message) // Также выводим в консоль
}

export type ImportResult = { date: string; created: number; updated: number }

export async function importReceiptsForDate(prisma: PrismaClient, client: IikoClient, ymd: string): Promise<ImportResult> {
  const tag = `[iiko][etl] ${ymd}`
  logToFile(`${tag} start`)
  console.time(tag)
  const { from, to } = buildDayRangeIso(ymd)
  const dayStart = new Date(ymd + 'T00:00:00.000Z')

  // 1) Заголовки чеков (включая удаленные)
  const bodyHeader = {
    reportType: 'SALES',
    buildSummary: true,
    groupByRowFields: ['OrderNum','PayTypes','WaiterName','CashRegisterName','Delivery.CustomerName','Delivery.CustomerPhone','OrderType','Storned','Delivery.ServiceType','OrderDeleted','DeletedWithWriteoff','OpenTime','CloseTime'],
    groupByColFields: [],
    aggregateFields: ['DishSumInt','DishDiscountSumInt','ProductCostBase.ProductCost','GuestNum','DishAmountInt','DishReturnSum'],
    filters: {
      'OpenDate.Typed': { filterType: 'DateRange', periodType: 'CUSTOM', from, to }
      // Убираем фильтры по удаленным чекам - импортируем все
    }
  }
  
  // 1.1) Отдельно получаем удаленные чеки с временем
  const bodyDeleted = {
    reportType: 'SALES',
    buildSummary: true,
    groupByRowFields: ['OrderNum','OpenTime','CloseTime','OrderDeleted','DeletedWithWriteoff','PayTypes','WaiterName','CashRegisterName','Delivery.CustomerName','Delivery.CustomerPhone','OrderType','Storned','Delivery.ServiceType'],
    groupByColFields: [],
    aggregateFields: ['DishSumInt','DishDiscountSumInt','ProductCostBase.ProductCost','GuestNum','DishAmountInt','DishReturnSum'],
    filters: {
      'OpenDate.Typed': { filterType: 'DateRange', periodType: 'CUSTOM', from, to },
      'OrderDeleted': { filterType: 'IncludeValues', values: ['DELETED'] }
    }
  }
  const j: any = await client.postOlap(bodyHeader)
  logToFile(`${tag} headers rows=${Array.isArray(j?.data) ? j.data.length : 0}`)
  
  // Инициализируем map
  const map = new Map<string, any>()
  
  // Получаем удаленные чеки с временем
  const jDeleted: any = await client.postOlap(bodyDeleted)
  logToFile(`${tag} deleted rows=${Array.isArray(jDeleted?.data) ? jDeleted.data.length : 0}`)
  logToFile(`${tag} deleted data sample: ${JSON.stringify(jDeleted?.data?.slice(0, 2) || [])}`)
  const deletedMap = new Map<string, any>()
  for (const r of (Array.isArray(jDeleted?.data) ? jDeleted.data : [])) {
    const num = String(r?.OrderNum || '')
    if (!num) continue
    logToFile(`${tag} deleted order ${num}: openTime=${r?.OpenTime}, closeTime=${r?.CloseTime}`)
    deletedMap.set(num, {
      openTime: r?.OpenTime,
      closeTime: r?.CloseTime,
      isDeleted: String(r?.OrderDeleted || '').toUpperCase() === 'DELETED',
      deletedWithWriteoff: String(r?.DeletedWithWriteoff || '').toUpperCase() === 'DELETED_WITH_WRITEOFF'
    })
  }
  
  // Добавляем удаленные чеки в основной map, если их там нет
  for (const [num, deletedData] of deletedMap.entries()) {
    if (!map.has(num)) {
      logToFile(`${tag} adding deleted order ${num} to main map`)
      const e = {
        orderNum: num,
        net: 0,
        cost: 0,
        guests: 0,
        guestsMax: 0,
        dishes: 0,
        payTypes: new Set<string>(),
        waiter: null,
        register: null,
        customerName: null,
        customerPhone: null,
        orderType: null,
        deliveryServiceType: null,
        isReturn: false,
        returnSum: 0,
        isDeleted: deletedData.isDeleted,
        deletedWithWriteoff: deletedData.deletedWithWriteoff,
        openTime: deletedData.openTime,
        closeTime: deletedData.closeTime
      }
      map.set(num, e)
    }
  }
  
  // Обрабатываем основные чеки
  for (const r of (Array.isArray(j?.data) ? j.data : [])) {
    const num = String(r?.OrderNum || '')
    if (!num) continue
    const existingInMap = map.get(num)
    if (existingInMap && num === '23') {
      logToFile(`${tag} processing order ${num}: existing openTime=${existingInMap.openTime}, r.OpenTime=${r?.OpenTime}`)
    }
    const e = map.get(num) || {
      orderNum: num,
      net: 0,
      cost: 0,
      guests: 0,
      guestsMax: 0,
      dishes: 0,
      payTypes: new Set<string>(),
      waiter: r?.WaiterName || null,
      register: r?.CashRegisterName || null,
      customerName: r?.['Delivery.CustomerName'] || null,
      customerPhone: r?.['Delivery.CustomerPhone'] || null,
      orderType: r?.OrderType || null,
      deliveryServiceType: r?.['Delivery.ServiceType'] || null,
      isReturn: false,
      returnSum: 0,
      isDeleted: false,
      deletedWithWriteoff: false,
      openTime: null,
      closeTime: null
    }
    // Для удаленных чеков используем оригинальную сумму (DishSumInt), а не сумму после скидок
    const originalSum = Number(r?.DishSumInt) || 0
    const discountSum = Number(r?.DishDiscountSumInt) || 0
    const orderDeleted = String(r?.OrderDeleted || '').toUpperCase()
    const isReturn = String(r?.Storned || '').toUpperCase() === 'TRUE'
    
    // Для возвратов используем только положительные DishReturnSum
    if (isReturn) {
      const returnSum = Number(r?.DishReturnSum) || 0
      if (returnSum > 0) {
        e.net += returnSum
      }
    } else {
      e.net += (orderDeleted === 'DELETED' && originalSum > 0) ? originalSum : discountSum
    }
    e.cost += Number(r?.['ProductCostBase.ProductCost']) || 0
    e.guests += Number(r?.GuestNum) || 0
    e.guestsMax = Math.max(e.guestsMax, Number(r?.GuestNum) || 0)
    e.dishes += Number(r?.DishAmountInt) || 0
    if (r?.PayTypes) e.payTypes.add(r.PayTypes)
    if (r?.WaiterName && !e.waiter) e.waiter = r.WaiterName
    if (r?.CashRegisterName && !e.register) e.register = r.CashRegisterName
    if (r?.['Delivery.CustomerName'] && !e.customerName) e.customerName = r['Delivery.CustomerName']
    if (r?.['Delivery.CustomerPhone'] && !e.customerPhone) e.customerPhone = r['Delivery.CustomerPhone']
    if (r?.OrderType && !e.orderType) e.orderType = r.OrderType
    if (r?.['Delivery.ServiceType'] && !e.deliveryServiceType) e.deliveryServiceType = r['Delivery.ServiceType']
    // Время обновляем если оно есть в ответе
    if (r?.OpenTime) e.openTime = r.OpenTime
    if (r?.CloseTime) e.closeTime = r.CloseTime
    const ret = (String(r?.Storned || '').toUpperCase() === 'TRUE') || ((Number(r?.DishReturnSum) || 0) > 0)
    if (ret) e.isReturn = true
    e.returnSum += (Number(r?.DishReturnSum) || 0)
    
    // Обработка флагов удаления
    const orderDeletedFlag = String(r?.OrderDeleted || '').toUpperCase()
    const deletedWithWriteoffFlag = String(r?.DeletedWithWriteoff || '').toUpperCase()
    if (orderDeletedFlag === 'DELETED') e.isDeleted = true
    if (deletedWithWriteoffFlag === 'DELETED_WITH_WRITEOFF') e.deletedWithWriteoff = true
    e.orderDeleted = orderDeletedFlag || 'NOT_DELETED'
    
    // Если это удаленный чек, используем данные из deletedMap
    const deletedData = deletedMap.get(num)
    if (deletedData) {
      logToFile(`${tag} updating deleted order ${num}: openTime=${deletedData.openTime}, closeTime=${deletedData.closeTime}, e.openTime=${e.openTime}, isDeleted=${deletedData.isDeleted}`)
      if (deletedData.openTime) e.openTime = deletedData.openTime
      if (deletedData.closeTime) e.closeTime = deletedData.closeTime
      if (deletedData.isDeleted) e.isDeleted = true
      if (deletedData.deletedWithWriteoff) e.deletedWithWriteoff = true
    }
    
    map.set(num, e)
  }

  // 1.1) Точное наполнение сумм возврата по чекам (как в iiko): отдельный запрос
  const bodyReturns = {
    reportType: 'SALES',
    buildSummary: true,
    groupByRowFields: ['OrderNum','Storned'],
    groupByColFields: [],
    aggregateFields: ['DishReturnSum'],
    filters: {
      'OpenDate.Typed': { filterType: 'DateRange', periodType: 'CUSTOM', from, to },
      DeletedWithWriteoff: { filterType: 'IncludeValues', values: ['NOT_DELETED'] },
      OrderDeleted: { filterType: 'IncludeValues', values: ['NOT_DELETED'] }
    }
  }
  try {
    const jr: any = await client.postOlap(bodyReturns)
    console.log(`${tag} returns rows=${Array.isArray(jr?.data) ? jr.data.length : 0}`)
    for (const r of (Array.isArray(jr?.data) ? jr.data : [])) {
      const num = String(r?.OrderNum || '')
      if (!num) continue
      const e = map.get(num) || { orderNum: num, returnSum: 0, isReturn: false }
      const retSum = Number(r?.DishReturnSum) || 0
      e.returnSum = (e.returnSum || 0) + retSum
      const st = String(r?.Storned || '').toUpperCase() === 'TRUE'
      if (st || retSum > 0) e.isReturn = true
      map.set(num, e)
    }
    // 1.2) Для всех сторно — подтянем исходные чеки (включая удалённые) и сохраним локально
    try {
      const sources = new Set<string>()
      for (const r of (Array.isArray(jr?.data) ? jr.data : [])) {
        const src = String(r?.SourceOrderNum || '')
        if (src) sources.add(src)
      }
      for (const src of sources) {
        // Заголовок исходного чека без фильтра OrderDeleted
        const filtersHead: any = {
          'OpenDate.Typed': { filterType: 'DateRange', periodType: 'CUSTOM', from, to },
          DeletedWithWriteoff: { filterType: 'IncludeValues', values: ['NOT_DELETED'] },
          OrderNum: { filterType: 'IncludeValues', values: [src] }
        }
        const bodyHead = {
          reportType: 'SALES',
          buildSummary: true,
          groupByRowFields: ['OrderNum','PayTypes','WaiterName','CashRegisterName','Delivery.CustomerName','Delivery.CustomerPhone','OrderType'],
          groupByColFields: [],
          aggregateFields: ['DishSumInt','DishDiscountSumInt','ProductCostBase.ProductCost','GuestNum','DishAmountInt'],
          filters: filtersHead
        }
        const jhs: any = await client.postOlap(bodyHead)
        const srcEntry = {
          orderNum: src,
          net: 0,
          cost: 0,
          guests: 0,
          guestsMax: 0,
          dishes: 0,
          payTypes: new Set<string>(),
          waiter: null as any,
          register: null as any,
          customerName: null as any,
          customerPhone: null as any,
          orderType: null as any,
          items: [] as any[]
        }
        for (const r of (Array.isArray(jhs?.data) ? jhs.data : [])) {
          // Для исходных чеков используем оригинальную сумму, если есть
          const originalSum = Number(r?.DishSumInt) || 0
          const discountSum = Number(r?.DishDiscountSumInt) || 0
          srcEntry.net += originalSum > 0 ? originalSum : discountSum
          srcEntry.cost += Number(r?.['ProductCostBase.ProductCost']) || 0
          srcEntry.guests += Number(r?.GuestNum) || 0
          srcEntry.guestsMax = Math.max(srcEntry.guestsMax, Number(r?.GuestNum) || 0)
          srcEntry.dishes += Number(r?.DishAmountInt) || 0
          if (r?.PayTypes) srcEntry.payTypes.add(r.PayTypes)
          if (r?.WaiterName && !srcEntry.waiter) srcEntry.waiter = r.WaiterName
          if (r?.CashRegisterName && !srcEntry.register) srcEntry.register = r.CashRegisterName
          if (r?.['Delivery.CustomerName'] && !srcEntry.customerName) srcEntry.customerName = r['Delivery.CustomerName']
          if (r?.['Delivery.CustomerPhone'] && !srcEntry.customerPhone) srcEntry.customerPhone = r['Delivery.CustomerPhone']
          if (r?.OrderType && !srcEntry.orderType) srcEntry.orderType = r.OrderType
        }
        // Позиции исходного чека
        const bodyItemsSrc = {
          reportType: 'SALES',
          buildSummary: true,
          groupByRowFields: ['OrderNum','DishId','DishName','DishSize.ShortName','DishMeasureUnit'],
          groupByColFields: [],
          aggregateFields: ['DishSumInt','DishDiscountSumInt','ProductCostBase.ProductCost','DishAmountInt'],
          filters: filtersHead
        }
        const jis: any = await client.postOlap(bodyItemsSrc)
        for (const r of (Array.isArray(jis?.data) ? jis.data : [])) {
          // Для исходных чеков используем оригинальную сумму, если есть
          const originalSum = Number(r?.DishSumInt) || 0
          const discountSum = Number(r?.DishDiscountSumInt) || 0
          const netAmount = originalSum > 0 ? originalSum : discountSum
          
          srcEntry.items.push({
            dishId: r?.DishId || null,
            dishName: r?.DishName || '',
            size: r?.['DishSize.ShortName'] || null,
            measureUnit: r?.DishMeasureUnit || null,
            qty: Number(r?.DishAmountInt) || 0,
            net: netAmount,
            cost: Math.round(((Number(r?.['ProductCostBase.ProductCost']) || 0)) * 100) / 100
          })
        }
        // Сохраняем исходный чек локально (идемпотентно)
        const payTypesSrc = Array.from(srcEntry.payTypes)
        const existingSrc = await prisma.iikoReceipt.findFirst({ where: { orderNum: srcEntry.orderNum, date: dayStart } })
        if (!existingSrc) {
          const receiptSrc = await prisma.iikoReceipt.upsert({
            where: { orderNum_date: { orderNum: srcEntry.orderNum, date: dayStart } },
            create: {
              orderNum: srcEntry.orderNum,
              date: dayStart,
              waiter: srcEntry.waiter as any,
              register: srcEntry.register as any,
              customerName: srcEntry.customerName as any,
              customerPhone: srcEntry.customerPhone as any,
              orderType: srcEntry.orderType as any,
              isReturn: false,
              returnSum: 0,
              payTypesJson: JSON.stringify(payTypesSrc),
              guests: Number.isFinite(srcEntry.guestsMax) ? Math.trunc(srcEntry.guestsMax) : null,
              net: Number.isFinite(srcEntry.net) ? Math.trunc(srcEntry.net) : null,
              cost: Number.isFinite(srcEntry.cost) ? Math.trunc(srcEntry.cost) : null,
            },
            update: {}
          })
          await prisma.iikoReceiptItem.deleteMany({ where: { receiptId: receiptSrc.id } })
          await prisma.iikoReceiptItem.createMany({ data: (srcEntry.items || []).map((it: any, idx: number) => ({
            receiptId: receiptSrc.id,
            lineNo: idx + 1,
            dishId: it.dishId,
            dishName: it.dishName,
            size: it.size,
            measureUnit: it.measureUnit || null,
            qty: Number.isFinite(it.qty) ? Math.trunc(it.qty) : null,
            net: Number.isFinite(it.net) ? Math.trunc(it.net) : null,
            cost: Number.isFinite(it.cost) ? Math.trunc(it.cost) : null,
          })) })
        }
      }
    } catch {}
  } catch {}

  // 2.2) Дополнительно: собрать как можно больше колонок OLAP и сохранить в K/V (уровень чеков и позиций)
  if (process.env.IIKO_SAVE_KV_FULL === '1') try {
    const cols: any = await client.getOlapColumns('SALES' as any)
    const names = Object.keys(cols || {})
    const aggCols = names.filter(n => cols[n]?.aggregationAllowed === true)
    const grpCols = names.filter(n => cols[n]?.groupingAllowed === true)
    console.log(`${tag} columns meta: total=${names.length} agg=${aggCols.length} grp=${grpCols.length}`)

    // Helper to batch arrays
    const batchify = (arr: string[], size = 20) => {
      const out: string[][] = []
      for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
      return out
    }

    // 2.2.1) Агрегаты по чекам: группируем только по OrderNum, тянем пачками агрегаты
    for (const pack of batchify(aggCols, 15)) {
      const bodyAgg = {
        reportType: 'SALES',
        buildSummary: true,
        groupByRowFields: ['OrderNum'],
        groupByColFields: [],
        aggregateFields: pack,
        filters: {
          'OpenDate.Typed': { filterType: 'DateRange', periodType: 'CUSTOM', from, to },
          DeletedWithWriteoff: { filterType: 'IncludeValues', values: ['NOT_DELETED'] },
          OrderDeleted: { filterType: 'IncludeValues', values: ['NOT_DELETED'] }
        }
      }
      try {
        const ja: any = await client.postOlap(bodyAgg)
        console.log(`${tag} kv receipt agg pack=${pack.length} rows=${Array.isArray(ja?.data) ? ja.data.length : 0}`)
        const kvRows: any[] = []
        for (const r of (Array.isArray(ja?.data) ? ja.data : [])) {
          const num = String(r?.OrderNum || '')
          if (!num) continue
          for (const col of pack) {
            const v: any = (r as any)[col]
            const asNum = typeof v === 'number' ? v : Number(v)
            kvRows.push({
              date: dayStart,
              orderNum: num,
              level: 'RECEIPT',
              itemKey: null,
              col,
              valNum: Number.isFinite(asNum) ? asNum : null,
              valStr: Number.isFinite(asNum) ? null : (v == null ? null : String(v))
            })
          }
        }
        if (kvRows.length) {
          const batch = 500
          for (let i = 0; i < kvRows.length; i += batch) {
            const slice = kvRows.slice(i, i + batch)
            await (prisma as any).iikoOlapRowKV.createMany({ data: slice, skipDuplicates: true })
          }
        }
      } catch {}
    }

    // 2.2.2) Групповые строки по чекам: тянем по одному столбцу вместе с OrderNum (минимальный агрегат для валидности)
    const grpColsFiltered = grpCols.filter(c => c !== 'OrderNum')
    for (const col of grpColsFiltered) {
      const bodyGrp = {
        reportType: 'SALES',
        buildSummary: true,
        groupByRowFields: ['OrderNum', col],
        groupByColFields: [],
        aggregateFields: ['DishDiscountSumInt'],
        filters: {
          'OpenDate.Typed': { filterType: 'DateRange', periodType: 'CUSTOM', from, to },
          DeletedWithWriteoff: { filterType: 'IncludeValues', values: ['NOT_DELETED'] },
          OrderDeleted: { filterType: 'IncludeValues', values: ['NOT_DELETED'] }
        }
      }
      try {
        const jg: any = await client.postOlap(bodyGrp)
        console.log(`${tag} kv receipt grp col=${col} rows=${Array.isArray(jg?.data) ? jg.data.length : 0}`)
        const kvRows: any[] = []
        for (const r of (Array.isArray(jg?.data) ? jg.data : [])) {
          const num = String(r?.OrderNum || '')
          if (!num) continue
          const v: any = (r as any)[col]
          const asNum = typeof v === 'number' ? v : Number(v)
          kvRows.push({
            date: dayStart,
            orderNum: num,
            level: 'RECEIPT',
            itemKey: null,
            col,
            valNum: Number.isFinite(asNum) ? asNum : null,
            valStr: Number.isFinite(asNum) ? null : (v == null ? null : String(v))
          })
        }
        if (kvRows.length) {
          const batch = 500
          for (let i = 0; i < kvRows.length; i += batch) {
            const slice = kvRows.slice(i, i + batch)
            await (prisma as any).iikoOlapRowKV.createMany({ data: slice, skipDuplicates: true })
          }
        }
      } catch {}
    }

    // 2.2.3) Агрегаты по позициям: группируем по OrderNum+DishId
    for (const pack of batchify(aggCols, 10)) {
      const bodyAggItems = {
        reportType: 'SALES',
        buildSummary: true,
        groupByRowFields: ['OrderNum','DishId'],
        groupByColFields: [],
        aggregateFields: pack,
        filters: {
          'OpenDate.Typed': { filterType: 'DateRange', periodType: 'CUSTOM', from, to },
          DeletedWithWriteoff: { filterType: 'IncludeValues', values: ['NOT_DELETED'] },
          OrderDeleted: { filterType: 'IncludeValues', values: ['NOT_DELETED'] }
        }
      }
      try {
        const jai: any = await client.postOlap(bodyAggItems)
        console.log(`${tag} kv item agg pack=${pack.length} rows=${Array.isArray(jai?.data) ? jai.data.length : 0}`)
        const kvRows: any[] = []
        for (const r of (Array.isArray(jai?.data) ? jai.data : [])) {
          const num = String(r?.OrderNum || '')
          if (!num) continue
          const itemKey = String(r?.DishId || '') || null
          for (const col of pack) {
            const v: any = (r as any)[col]
            const asNum = typeof v === 'number' ? v : Number(v)
            kvRows.push({
              date: dayStart,
              orderNum: num,
              level: 'ITEM',
              itemKey,
              col,
              valNum: Number.isFinite(asNum) ? asNum : null,
              valStr: Number.isFinite(asNum) ? null : (v == null ? null : String(v))
            })
          }
        }
        if (kvRows.length) {
          const batch = 500
          for (let i = 0; i < kvRows.length; i += batch) {
            const slice = kvRows.slice(i, i + batch)
            await (prisma as any).iikoOlapRowKV.createMany({ data: slice, skipDuplicates: true })
          }
        }
      } catch {}
    }
  } catch {}

  // 2) Позиции чеков (включая удаленные)
  const bodyItems = {
    reportType: 'SALES',
    buildSummary: true,
    groupByRowFields: ['OrderNum','DishId','DishName','DishSize.ShortName','DishMeasureUnit','OrderDeleted'],
    groupByColFields: [],
    aggregateFields: ['DishSumInt','DishDiscountSumInt','ProductCostBase.ProductCost','DishAmountInt','DishReturnSum'],
    filters: {
      'OpenDate.Typed': { filterType: 'DateRange', periodType: 'CUSTOM', from, to }
      // Убираем фильтры по удаленным чекам - импортируем все позиции
    }
  }
  const ji: any = await client.postOlap(bodyItems)
  for (const r of (Array.isArray(ji?.data) ? ji.data : [])) {
    const num = String(r?.OrderNum || '')
    if (!num) continue
    const e = map.get(num)
    if (!e) continue
    if (!e.items) e.items = []
    // Для возвратов используем только положительные DishReturnSum
    const originalSum = Number(r?.DishSumInt) || 0
    const discountSum = Number(r?.DishDiscountSumInt) || 0
    const orderDeletedFlag = String(r?.OrderDeleted || '').toUpperCase()
    const isReturn = String(r?.Storned || '').toUpperCase() === 'TRUE'
    
    let netAmount = 0
    if (isReturn) {
      const returnSum = Number(r?.DishReturnSum) || 0
      if (returnSum > 0) {
        netAmount = returnSum
      }
    } else {
      netAmount = (orderDeletedFlag === 'DELETED' && originalSum > 0) ? originalSum : discountSum
    }
    
    e.items.push({
      dishId: r?.DishId || null,
      dishName: r?.DishName || '',
      size: r?.['DishSize.ShortName'] || null,
      measureUnit: r?.DishMeasureUnit || null,
      qty: Number(r?.DishAmountInt) || 0,
      net: netAmount,
      cost: Math.round(((Number(r?.['ProductCostBase.ProductCost']) || 0)) * 100) / 100,
      returnSum: Number(r?.DishReturnSum) || 0
    })
  }

  // 2.1) Полное сохранение OLAP колонок (уровень чеков и позиций) в IikoOlapRowKV
  try {
    // Очистим ранее сохранённые K/V для этого дня
    if ((prisma as any).iikoOlapRowKV) {
      await (prisma as any).iikoOlapRowKV.deleteMany({ where: { date: dayStart } })
      const kvRows: any[] = []
      const pushRow = (level: 'RECEIPT' | 'ITEM', orderNum: string, obj: any, itemKey?: string | null) => {
        if (!orderNum) return
        const entries = Object.entries(obj || {}) as Array<[string, any]>
        for (const [col, val] of entries) {
          // Пропустим технические поля без смысла
          if (!col || col === '0') continue
          const asNum = typeof val === 'number' ? val : Number(val)
          const row: any = {
            date: dayStart,
            orderNum: String(orderNum),
            level,
            itemKey: itemKey || null,
            col: String(col),
            valNum: Number.isFinite(asNum) ? asNum : null,
            valStr: Number.isFinite(asNum) ? null : (val == null ? null : String(val))
          }
          kvRows.push(row)
        }
      }
      for (const r of (Array.isArray(j?.data) ? j.data : [])) {
        const num = String(r?.OrderNum || '')
        if (!num) continue
        pushRow('RECEIPT', num, r, null)
      }
      for (const r of (Array.isArray(ji?.data) ? ji.data : [])) {
        const num = String(r?.OrderNum || '')
        if (!num) continue
        const itemKey = String(r?.DishId || r?.DishName || '') || null
        pushRow('ITEM', num, r, itemKey)
      }
      if (kvRows.length) {
        // Разобьём на батчи, чтобы избежать ограничений SQLite
        const batch = 500
        for (let i = 0; i < kvRows.length; i += batch) {
          const slice = kvRows.slice(i, i + batch)
          await (prisma as any).iikoOlapRowKV.createMany({ data: slice, skipDuplicates: true })
        }
      }
    }
  } catch {}

  // 3) Сохранение в БД
  let created = 0, updated = 0
  for (const e of map.values()) {
    const payTypes = Array.from(e.payTypes)
    // попробуем найти по уникальной паре (orderNum,date)
    const existing = await prisma.iikoReceipt.findFirst({ where: { orderNum: e.orderNum, date: dayStart } })
    if (existing) updated++; else created++
    
    // Логируем сохранение удаленных чеков
    if (e.orderNum === '23') {
      logToFile(`${tag} saving order ${e.orderNum}: openTime=${e.openTime}, closeTime=${e.closeTime}, isDeleted=${e.isDeleted}`)
      logToFile(`${tag} openTime type: ${typeof e.openTime}, value: ${e.openTime}`)
      logToFile(`${tag} new Date(e.openTime): ${e.openTime ? new Date(e.openTime) : 'null'}`)
    }
    if (e.orderNum === '23') {
      logToFile(`${tag} upserting order ${e.orderNum}: existing=${!!existing}`)
    }
    const receipt = await prisma.iikoReceipt.upsert({
      where: { orderNum_date: { orderNum: e.orderNum, date: dayStart } },
      create: {
        orderNum: e.orderNum,
        date: dayStart,
        waiter: e.waiter,
        register: e.register,
        customerName: e.customerName,
        customerPhone: e.customerPhone,
        orderType: e.orderType,
        deliveryServiceType: e.deliveryServiceType,
        isReturn: !!e.isReturn || null,
        returnSum: Number.isFinite(e.returnSum) ? Math.trunc(e.returnSum) : null,
        isDeleted: !!e.isDeleted || null,
        deletedWithWriteoff: !!e.deletedWithWriteoff || null,
        openTime: e.openTime ? new Date(e.openTime) : null,
        closeTime: e.closeTime ? new Date(e.closeTime) : null,
        payTypesJson: JSON.stringify(payTypes),
        guests: Number.isFinite(e.guestsMax) ? Math.trunc(e.guestsMax) : null,
        net: Number.isFinite(e.net) ? Math.trunc(e.net) : null,
        cost: Number.isFinite(e.cost) ? Math.trunc(e.cost) : null,
      },
      update: {
        date: dayStart,
        waiter: e.waiter,
        register: e.register,
        customerName: e.customerName,
        customerPhone: e.customerPhone,
        orderType: e.orderType,
        deliveryServiceType: e.deliveryServiceType,
        isReturn: !!e.isReturn || null,
        returnSum: Number.isFinite(e.returnSum) ? Math.trunc(e.returnSum) : null,
        isDeleted: !!e.isDeleted || null,
        deletedWithWriteoff: !!e.deletedWithWriteoff || null,
        openTime: e.openTime ? new Date(e.openTime) : null,
        closeTime: e.closeTime ? new Date(e.closeTime) : null,
        payTypesJson: JSON.stringify(payTypes),
        guests: Number.isFinite(e.guestsMax) ? Math.trunc(e.guestsMax) : null,
        net: Number.isFinite(e.net) ? Math.trunc(e.net) : null,
        cost: Number.isFinite(e.cost) ? Math.trunc(e.cost) : null,
      }
    })
    
    // Логируем результат upsert для отладки
    if (e.orderNum === '23') {
      logToFile(`${tag} upsert result for order ${e.orderNum}: openTime=${receipt.openTime}, closeTime=${receipt.closeTime}, isDeleted=${receipt.isDeleted}`)
    }
    // Перезапишем позиции отдельно, чтобы опираться на surrogate key receiptId
    await prisma.iikoReceiptItem.deleteMany({ where: { receiptId: receipt.id } })
    await prisma.iikoReceiptItem.createMany({ data: (e.items || []).map((it: any, idx: number) => ({
      receiptId: receipt.id,
      lineNo: idx + 1,
      dishId: it.dishId,
      dishName: it.dishName,
      size: it.size,
      measureUnit: it.measureUnit || null,
      qty: Number.isFinite(it.qty) ? Math.trunc(it.qty) : null,
      net: Number.isFinite(it.net) ? Math.trunc(it.net) : null,
      cost: Number.isFinite(it.cost) ? Math.trunc(it.cost) : null,
      returnSum: Number.isFinite(it.returnSum) ? Math.trunc(it.returnSum) : null,
    })) })
  }

  const result = { date: ymd, created, updated }
  logToFile(`${tag} done created=${created} updated=${updated}`)
  console.timeEnd(tag)
  return result
}

export async function importReceiptsRange(prisma: PrismaClient, client: IikoClient, fromYmd: string, toYmd: string): Promise<ImportResult[]> {
  const results: ImportResult[] = []
  const from = new Date(fromYmd + 'T00:00:00.000Z')
  const to = new Date(toYmd + 'T00:00:00.000Z')
  
  // Подсчитываем общее количество дней
  const totalDays = Math.ceil((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000))
  let processedDays = 0
  
  logToFile(`[RANGE] Начинаем импорт диапазона ${fromYmd} - ${toYmd} (${totalDays} дней)`)
  
  for (let d = new Date(from); d < to; d.setUTCDate(d.getUTCDate() + 1)) {
    const y = d.getUTCFullYear(), m = String(d.getUTCMonth() + 1).padStart(2, '0'), day = String(d.getUTCDate()).padStart(2, '0')
    const ymd = `${y}-${m}-${day}`
    
    logToFile(`[RANGE] Импортируем день ${ymd} (${processedDays + 1}/${totalDays})`)
    
    const r = await importReceiptsForDate(prisma, client, ymd)
    results.push(r)
    processedDays++
    
    logToFile(`[RANGE] День ${ymd} завершен. Импортировано: ${r.receipts} чеков, ${r.items} позиций`)
  }
  
  logToFile(`[RANGE] Импорт диапазона завершен. Всего дней: ${processedDays}, чеков: ${results.reduce((sum, r) => sum + r.receipts, 0)}, позиций: ${results.reduce((sum, r) => sum + r.items, 0)}`)
  
  return results
}


