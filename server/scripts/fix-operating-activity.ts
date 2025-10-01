import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function fixOperatingActivity() {
  try {
    console.log('🔧 Исправляем активность "OPERATING" на "Операционная"...\n')
    
    // Получаем tenant
    const tenant = await prisma.tenant.findFirst()
    if (!tenant) {
      throw new Error('Tenant не найден')
    }
    
    console.log('📊 1. Находим записи с активностью "OPERATING":')
    
    const operatingTransactions = await prisma.transaction.findMany({
      where: { 
        tenantId: tenant.id,
        activity: 'OPERATING'
      },
      select: {
        id: true,
        kind: true,
        amount: true,
        activity: true,
        note: true,
        paymentDate: true
      }
    })
    
    console.log(`Найдено ${operatingTransactions.length} записей с активностью "OPERATING":`)
    
    for (const tx of operatingTransactions) {
      console.log(`  - ${tx.kind} ${(tx.amount/100).toFixed(2)}₽ (${tx.paymentDate.toISOString().slice(0,10)}) - ${tx.note || 'без комментария'}`)
    }
    
    if (operatingTransactions.length > 0) {
      console.log('\n📊 2. Обновляем на "Операционная":')
      
      const updateResult = await prisma.transaction.updateMany({
        where: { 
          tenantId: tenant.id,
          activity: 'OPERATING'
        },
        data: { activity: 'Операционная' }
      })
      
      console.log(`✅ Обновлено ${updateResult.count} записей`)
    }
    
    console.log('\n📊 3. Проверяем результат:')
    
    const remainingOperating = await prisma.transaction.count({
      where: { 
        tenantId: tenant.id,
        activity: 'OPERATING'
      }
    })
    
    console.log(`Осталось записей с активностью "OPERATING": ${remainingOperating}`)
    
    console.log('\n📊 4. Финальная статистика по активностям:')
    
    const finalStats = await prisma.transaction.groupBy({
      by: ['activity'],
      where: { tenantId: tenant.id },
      _count: { activity: true }
    })
    
    finalStats.forEach(stat => {
      const activity = stat.activity || 'NULL'
      console.log(`  "${activity}": ${stat._count.activity} транзакций`)
    })
    
    console.log('\n✅ Теперь все транзакции должны иметь активность "Операционная"!')
    
  } catch (error) {
    console.error('❌ Ошибка:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixOperatingActivity()
