import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function fixNullActivities() {
  try {
    console.log('🔧 Исправляем записи с NULL активностью...\n')
    
    // Получаем tenant
    const tenant = await prisma.tenant.findFirst()
    if (!tenant) {
      throw new Error('Tenant не найден')
    }
    
    console.log('📊 1. Находим записи с NULL активностью:')
    
    const nullTransactions = await prisma.transaction.findMany({
      where: { 
        tenantId: tenant.id,
        activity: null
      },
      include: {
        category: {
          select: { name: true, activity: true }
        }
      }
    })
    
    console.log(`Найдено ${nullTransactions.length} записей с NULL активностью:`)
    
    for (const tx of nullTransactions) {
      console.log(`\nТранзакция: ${tx.kind} ${(tx.amount/100).toFixed(2)}₽ (${tx.paymentDate.toISOString().slice(0,10)})`)
      console.log(`  Категория: ${tx.category?.name || 'нет'}`)
      console.log(`  Активность категории: ${tx.category?.activity || 'нет'}`)
      console.log(`  Комментарий: ${tx.note || 'нет'}`)
      
      // Определяем правильную активность
      let correctActivity = null
      
      if (tx.category?.activity) {
        // Берем активность из категории
        correctActivity = tx.category.activity
      } else if (tx.note?.toLowerCase().includes('перевод') || tx.kind === 'transfer') {
        // Для переводов используем "Техническая операция"
        correctActivity = 'Техническая операция'
      } else {
        // По умолчанию "Операционная"
        correctActivity = 'Операционная'
      }
      
      console.log(`  → Устанавливаем активность: "${correctActivity}"`)
      
      // Обновляем запись
      await prisma.transaction.update({
        where: { id: tx.id },
        data: { activity: correctActivity }
      })
      
      console.log(`  ✅ Обновлено`)
    }
    
    console.log('\n📊 2. Проверяем результат:')
    
    const remainingNulls = await prisma.transaction.count({
      where: { 
        tenantId: tenant.id,
        activity: null
      }
    })
    
    console.log(`Осталось записей с NULL активностью: ${remainingNulls}`)
    
    if (remainingNulls === 0) {
      console.log('✅ Все записи с NULL активностью исправлены!')
    } else {
      console.log('⚠️ Остались записи с NULL активностью')
    }
    
    console.log('\n📊 3. Новая статистика по активностям:')
    
    const newStats = await prisma.transaction.groupBy({
      by: ['activity'],
      where: { tenantId: tenant.id },
      _count: { activity: true }
    })
    
    newStats.forEach(stat => {
      const activity = stat.activity || 'NULL'
      console.log(`  "${activity}": ${stat._count.activity} транзакций`)
    })
    
  } catch (error) {
    console.error('❌ Ошибка:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixNullActivities()
