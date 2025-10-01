import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkNullActivities() {
  try {
    console.log('🔍 Проверка записей с NULL активностью...\n')
    
    // Получаем tenant
    const tenant = await prisma.tenant.findFirst()
    if (!tenant) {
      throw new Error('Tenant не найден')
    }
    
    console.log('📊 1. Статистика по NULL активностям в транзакциях:')
    
    const nullActivityStats = await prisma.transaction.groupBy({
      by: ['activity'],
      where: { 
        tenantId: tenant.id,
        OR: [
          { activity: null },
          { activity: '' },
          { activity: 'NULL' }
        ]
      },
      _count: { activity: true }
    })
    
    console.log('Записи с пустой активностью:')
    nullActivityStats.forEach(stat => {
      const activity = stat.activity || 'NULL'
      console.log(`  - "${activity}": ${stat._count.activity} транзакций`)
    })
    
    console.log('\n📊 2. Проверка всех возможных "пустых" значений:')
    
    const allActivities = await prisma.transaction.findMany({
      where: { tenantId: tenant.id },
      select: { activity: true },
      distinct: ['activity']
    })
    
    console.log('Все уникальные значения активности:')
    allActivities.forEach((tx, index) => {
      const activity = tx.activity
      const isNull = activity === null
      const isEmpty = activity === ''
      const isNullString = activity === 'NULL'
      const length = activity ? activity.length : 0
      
      console.log(`  ${index + 1}. ${isNull ? 'NULL' : `"${activity}"`} (длина: ${length})`)
      console.log(`     isNull: ${isNull}, isEmpty: ${isEmpty}, isNullString: ${isNullString}`)
    })
    
    console.log('\n📊 3. Примеры транзакций с разными активностями:')
    
    const examples = await prisma.transaction.findMany({
      where: { tenantId: tenant.id },
      select: {
        id: true,
        kind: true,
        amount: true,
        activity: true,
        note: true,
        paymentDate: true
      },
      take: 20,
      orderBy: { paymentDate: 'desc' }
    })
    
    // Группируем по активности
    const grouped = new Map<string, any[]>()
    for (const tx of examples) {
      const activity = tx.activity || 'NULL'
      if (!grouped.has(activity)) grouped.set(activity, [])
      grouped.get(activity)!.push(tx)
    }
    
    for (const [activity, txs] of grouped.entries()) {
      console.log(`\nАктивность: ${activity === 'NULL' ? 'NULL' : `"${activity}"`} (${txs.length} примеров)`)
      txs.slice(0, 3).forEach(tx => {
        console.log(`  - ${tx.kind} ${(tx.amount/100).toFixed(2)}₽ (${tx.paymentDate.toISOString().slice(0,10)}) - ${tx.note || 'без комментария'}`)
      })
      if (txs.length > 3) {
        console.log(`  ... и еще ${txs.length - 3} записей`)
      }
    }
    
    console.log('\n📊 4. Проверка в Google Sheets:')
    
    const gsNullStats = await prisma.gsCashflowRow.groupBy({
      by: ['activity'],
      where: {
        OR: [
          { activity: null },
          { activity: '' },
          { activity: 'NULL' }
        ]
      },
      _count: { activity: true }
    })
    
    console.log('Записи с пустой активностью в Google Sheets:')
    gsNullStats.forEach(stat => {
      const activity = stat.activity || 'NULL'
      console.log(`  - "${activity}": ${stat._count.activity} записей`)
    })
    
    console.log('\n📊 5. Все уникальные значения в Google Sheets:')
    
    const gsActivities = await prisma.gsCashflowRow.findMany({
      select: { activity: true },
      distinct: ['activity']
    })
    
    gsActivities.forEach((gs, index) => {
      const activity = gs.activity
      const isNull = activity === null
      const isEmpty = activity === ''
      const isNullString = activity === 'NULL'
      const length = activity ? activity.length : 0
      
      console.log(`  ${index + 1}. ${isNull ? 'NULL' : `"${activity}"`} (длина: ${length})`)
      console.log(`     isNull: ${isNull}, isEmpty: ${isEmpty}, isNullString: ${isNullString}`)
    })
    
  } catch (error) {
    console.error('❌ Ошибка:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkNullActivities()
