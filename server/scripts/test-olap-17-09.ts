import { IikoClient } from '../src/modules/iiko/client'

const client = new IikoClient()

async function testOlap() {
  try {
    console.log('🔍 Запрос OLAP данных за 17.09.2025\n')
    
    const body = {
      reportType: 'SALES',
      buildSummary: true,
      groupByRowFields: ['SessionNum', 'OrderNum', 'PayTypes', 'WaiterName', 'CashRegisterName'],
      groupByColFields: [],
      aggregateFields: ['DishSumInt', 'DishDiscountSumInt'],
      filters: {
        'OpenDate.Typed': { 
          filterType: 'DateRange', 
          periodType: 'CUSTOM', 
          from: '2025-09-17T00:00:00',
          to: '2025-09-18T00:00:00'
        }
      }
    }
    
    const result: any = await client.postOlap(body)
    
    console.log(`✅ Получено строк: ${result.data?.length || 0}\n`)
    
    // Группируем по сменам
    const bySession = new Map<number, any[]>()
    
    for (const row of result.data || []) {
      const sessionNum = row.SessionNum
      if (!bySession.has(sessionNum)) {
        bySession.set(sessionNum, [])
      }
      bySession.get(sessionNum)!.push(row)
    }
    
    console.log('📊 Статистика по сменам:\n')
    
    for (const [sessionNum, rows] of Array.from(bySession.entries()).sort((a, b) => a[0] - b[0])) {
      const totalSum = rows.reduce((sum, r) => sum + (r.DishDiscountSumInt || 0), 0)
      const orderNums = new Set(rows.map(r => r.OrderNum))
      
      console.log(`Смена #${sessionNum}:`)
      console.log(`  Чеков: ${orderNums.size}`)
      console.log(`  Сумма: ${totalSum} ₽`)
      console.log(`  Строк OLAP: ${rows.length}`)
      
      // Группируем по официантам
      const byWaiter = new Map<string, number>()
      rows.forEach(r => {
        const waiter = r.WaiterName || 'unknown'
        byWaiter.set(waiter, (byWaiter.get(waiter) || 0) + 1)
      })
      
      console.log(`  Официанты:`)
      for (const [waiter, count] of byWaiter.entries()) {
        console.log(`    - ${waiter}: ${count} строк`)
      }
      console.log('')
    }
    
    console.log('📋 Первые 5 строк OLAP:')
    result.data?.slice(0, 5).forEach((r: any, i: number) => {
      console.log(`\n${i + 1}. Смена #${r.SessionNum}, чек ${r.OrderNum}`)
      console.log(`   Официант: ${r.WaiterName}`)
      console.log(`   Касса: ${r.CashRegisterName}`)
      console.log(`   Оплаты: ${r.PayTypes}`)
      console.log(`   Сумма: ${r.DishDiscountSumInt} ₽`)
    })
    
  } catch (e: any) {
    console.error('❌ Ошибка:', e.message)
  }
}

testOlap()

