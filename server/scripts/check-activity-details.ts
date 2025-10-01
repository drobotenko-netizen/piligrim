import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkActivityDetails() {
  try {
    console.log('🔍 Детальный анализ значений активности...\n')
    
    // Получаем tenant
    const tenant = await prisma.tenant.findFirst()
    if (!tenant) {
      throw new Error('Tenant не найден')
    }
    
    console.log('📊 1. Все уникальные значения активности в транзакциях:')
    const transactionActivities = await prisma.transaction.findMany({
      where: { tenantId: tenant.id },
      select: { activity: true },
      distinct: ['activity']
    })
    
    transactionActivities.forEach((tx, index) => {
      const activity = tx.activity || 'NULL'
      const length = activity.length
      const chars = activity.split('').map(c => `${c}(${c.charCodeAt(0)})`).join(' ')
      console.log(`  ${index + 1}. "${activity}" (длина: ${length})`)
      console.log(`     Символы: ${chars}`)
    })
    
    console.log('\n📊 2. Все уникальные значения активности в Google Sheets:')
    const gsActivities = await prisma.gsCashflowRow.findMany({
      select: { activity: true },
      distinct: ['activity']
    })
    
    gsActivities.forEach((gs, index) => {
      const activity = gs.activity || 'NULL'
      const length = activity.length
      const chars = activity.split('').map(c => `${c}(${c.charCodeAt(0)})`).join(' ')
      console.log(`  ${index + 1}. "${activity}" (длина: ${length})`)
      console.log(`     Символы: ${chars}`)
    })
    
    console.log('\n📊 3. Статистика по символам в "Операционная":')
    
    // Ищем все записи, которые содержат "Операционн" (с разными окончаниями)
    const operatingLike = await prisma.transaction.findMany({
      where: { 
        tenantId: tenant.id,
        activity: { contains: 'Операционн' }
      },
      select: { activity: true },
      distinct: ['activity']
    })
    
    console.log('Найдено записей, содержащих "Операционн":')
    operatingLike.forEach((tx, index) => {
      const activity = tx.activity || 'NULL'
      const length = activity.length
      const chars = activity.split('').map(c => `${c}(${c.charCodeAt(0)})`).join(' ')
      console.log(`  ${index + 1}. "${activity}" (длина: ${length})`)
      console.log(`     Символы: ${chars}`)
    })
    
    console.log('\n📊 4. Проверка на скрытые символы:')
    
    // Проверяем каждое значение активности на наличие невидимых символов
    const allActivities = await prisma.transaction.findMany({
      where: { tenantId: tenant.id },
      select: { activity: true },
      distinct: ['activity']
    })
    
    allActivities.forEach((tx, index) => {
      const activity = tx.activity || 'NULL'
      if (activity !== 'NULL') {
        const hasInvisibleChars = /[\u200B-\u200D\uFEFF\u00A0\u2000-\u200F\u2028-\u202F\u205F-\u206F]/.test(activity)
        const trimmed = activity.trim()
        const isDifferent = activity !== trimmed
        
        console.log(`  ${index + 1}. "${activity}"`)
        console.log(`     Есть невидимые символы: ${hasInvisibleChars}`)
        console.log(`     Отличается от trim(): ${isDifferent}`)
        console.log(`     После trim(): "${trimmed}"`)
        
        if (hasInvisibleChars || isDifferent) {
          const chars = activity.split('').map((c, i) => {
            const code = c.charCodeAt(0)
            const isInvisible = code < 32 || (code >= 127 && code <= 159)
            return `${c}(${code})${isInvisible ? '⚠️' : ''}`
          }).join(' ')
          console.log(`     Детальные символы: ${chars}`)
        }
      }
    })
    
    console.log('\n📊 5. Группировка по длине и содержимому:')
    
    const grouped = new Map<string, number>()
    for (const tx of allActivities) {
      const activity = tx.activity || 'NULL'
      const key = `${activity.length}:${activity}`
      grouped.set(key, (grouped.get(key) || 0) + 1)
    }
    
    for (const [key, count] of grouped.entries()) {
      console.log(`  "${key}" - ${count} записей`)
    }
    
  } catch (error) {
    console.error('❌ Ошибка:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkActivityDetails()
