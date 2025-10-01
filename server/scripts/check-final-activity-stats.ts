import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkFinalActivityStats() {
  try {
    console.log('📊 Финальная статистика по активностям...\n')
    
    // Получаем tenant
    const tenant = await prisma.tenant.findFirst()
    if (!tenant) {
      throw new Error('Tenant не найден')
    }
    
    console.log('📈 Статистика по активностям в транзакциях:')
    
    const stats = await prisma.transaction.groupBy({
      by: ['activity'],
      where: { tenantId: tenant.id },
      _count: { activity: true }
    })
    
    stats.forEach(stat => {
      const activity = stat.activity || 'NULL'
      console.log(`  "${activity}": ${stat._count.activity} транзакций`)
    })
    
    console.log('\n📈 Статистика по активностям в Google Sheets:')
    
    const gsStats = await prisma.gsCashflowRow.groupBy({
      by: ['activity'],
      _count: { activity: true }
    })
    
    gsStats.forEach(stat => {
      const activity = stat.activity || 'NULL'
      console.log(`  "${activity}": ${stat._count.activity} записей`)
    })
    
    console.log('\n✅ Теперь в ДДС должна отображаться только одна группа "Операционная"!')
    
  } catch (error) {
    console.error('❌ Ошибка:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkFinalActivityStats()
