import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkNullCount() {
  try {
    console.log('🔍 Подсчет записей с NULL активностью...\n')
    
    // Получаем tenant
    const tenant = await prisma.tenant.findFirst()
    if (!tenant) {
      throw new Error('Tenant не найден')
    }
    
    console.log('📊 1. Точный подсчет записей с NULL активностью:')
    
    const nullCount = await prisma.transaction.count({
      where: { 
        tenantId: tenant.id,
        activity: null
      }
    })
    
    console.log(`Записей с activity = NULL: ${nullCount}`)
    
    const emptyStringCount = await prisma.transaction.count({
      where: { 
        tenantId: tenant.id,
        activity: ''
      }
    })
    
    console.log(`Записей с activity = "": ${emptyStringCount}`)
    
    const nullStringCount = await prisma.transaction.count({
      where: { 
        tenantId: tenant.id,
        activity: 'NULL'
      }
    })
    
    console.log(`Записей с activity = "NULL": ${nullStringCount}`)
    
    console.log('\n📊 2. Примеры записей с NULL активностью:')
    
    const nullExamples = await prisma.transaction.findMany({
      where: { 
        tenantId: tenant.id,
        activity: null
      },
      select: {
        id: true,
        kind: true,
        amount: true,
        activity: true,
        note: true,
        paymentDate: true,
        category: {
          select: { name: true, activity: true }
        }
      },
      take: 10,
      orderBy: { paymentDate: 'desc' }
    })
    
    console.log(`Найдено ${nullExamples.length} примеров:`)
    nullExamples.forEach((tx, index) => {
      console.log(`  ${index + 1}. ${tx.kind} ${(tx.amount/100).toFixed(2)}₽ (${tx.paymentDate.toISOString().slice(0,10)})`)
      console.log(`     Активность: ${tx.activity}`)
      console.log(`     Категория: ${tx.category?.name || 'нет'} (активность категории: ${tx.category?.activity || 'нет'})`)
      console.log(`     Комментарий: ${tx.note || 'нет'}`)
      console.log('')
    })
    
    console.log('\n📊 3. Проверка в Google Sheets:')
    
    const gsNullCount = await prisma.gsCashflowRow.count({
      where: { activity: null }
    })
    
    console.log(`Записей в Google Sheets с activity = NULL: ${gsNullCount}`)
    
    const gsEmptyStringCount = await prisma.gsCashflowRow.count({
      where: { activity: '' }
    })
    
    console.log(`Записей в Google Sheets с activity = "": ${gsEmptyStringCount}`)
    
    console.log('\n📊 4. Примеры из Google Sheets с NULL активностью:')
    
    const gsNullExamples = await prisma.gsCashflowRow.findMany({
      where: { activity: null },
      select: {
        id: true,
        amount: true,
        activity: true,
        comment: true,
        date: true,
        fund: true,
        supplier: true
      },
      take: 10,
      orderBy: { date: 'desc' }
    })
    
    console.log(`Найдено ${gsNullExamples.length} примеров из Google Sheets:`)
    gsNullExamples.forEach((gs, index) => {
      console.log(`  ${index + 1}. ${(gs.amount/100).toFixed(2)}₽ (${gs.date?.toISOString().slice(0,10) || 'нет даты'})`)
      console.log(`     Активность: ${gs.activity}`)
      console.log(`     Фонд: ${gs.fund || 'нет'}`)
      console.log(`     Поставщик: ${gs.supplier || 'нет'}`)
      console.log(`     Комментарий: ${gs.comment || 'нет'}`)
      console.log('')
    })
    
    console.log('\n📊 5. Общая статистика по активностям:')
    
    const allStats = await prisma.transaction.groupBy({
      by: ['activity'],
      where: { tenantId: tenant.id },
      _count: { activity: true }
    })
    
    allStats.forEach(stat => {
      const activity = stat.activity || 'NULL'
      console.log(`  "${activity}": ${stat._count.activity} транзакций`)
    })
    
  } catch (error) {
    console.error('❌ Ошибка:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkNullCount()
