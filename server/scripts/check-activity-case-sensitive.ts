import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkActivityCaseSensitive() {
  try {
    console.log('🔍 Проверка активности с учетом регистра и похожих символов...\n')
    
    // Получаем tenant
    const tenant = await prisma.tenant.findFirst()
    if (!tenant) {
      throw new Error('Tenant не найден')
    }
    
    console.log('📊 1. Поиск всех вариантов "операционн" (без учета регистра):')
    
    // Ищем все записи, которые содержат "операционн" в любом регистре
    const allTransactions = await prisma.transaction.findMany({
      where: { tenantId: tenant.id },
      select: { activity: true }
    })
    
    const operatingVariants = new Map<string, number>()
    
    for (const tx of allTransactions) {
      const activity = tx.activity || ''
      if (activity.toLowerCase().includes('операционн')) {
        operatingVariants.set(activity, (operatingVariants.get(activity) || 0) + 1)
      }
    }
    
    console.log('Найденные варианты:')
    for (const [variant, count] of operatingVariants.entries()) {
      console.log(`  "${variant}" - ${count} записей`)
    }
    
    console.log('\n📊 2. Проверка на латинские аналоги:')
    
    // Проверяем, есть ли записи с латинскими буквами, которые выглядят как кириллические
    const latinCyrillicMap = {
      'О': 'O', // Кириллическая О vs Латинская O
      'о': 'o', // Кириллическая о vs Латинская o
      'р': 'p', // Кириллическая р vs Латинская p
      'а': 'a', // Кириллическая а vs Латинская a
      'е': 'e', // Кириллическая е vs Латинская e
      'с': 'c', // Кириллическая с vs Латинская c
      'х': 'x', // Кириллическая х vs Латинская x
      'у': 'y', // Кириллическая у vs Латинская y
      'н': 'n', // Кириллическая н vs Латинская n
      'и': 'i', // Кириллическая и vs Латинская i
      'т': 't', // Кириллическая т vs Латинская t
      'я': 'ya', // Кириллическая я vs Латинская ya
    }
    
    const allActivities = await prisma.transaction.findMany({
      where: { tenantId: tenant.id },
      select: { activity: true },
      distinct: ['activity']
    })
    
    for (const tx of allActivities) {
      const activity = tx.activity || ''
      if (activity.toLowerCase().includes('операционн')) {
        console.log(`\nПроверяем: "${activity}"`)
        
        // Проверяем каждый символ
        for (let i = 0; i < activity.length; i++) {
          const char = activity[i]
          const code = char.charCodeAt(0)
          const isCyrillic = code >= 1040 && code <= 1103
          const isLatin = (code >= 65 && code <= 90) || (code >= 97 && code <= 122)
          
          if (isLatin) {
            console.log(`  Позиция ${i}: "${char}" (код: ${code}) - ЛАТИНСКАЯ БУКВА!`)
          } else if (isCyrillic) {
            console.log(`  Позиция ${i}: "${char}" (код: ${code}) - кириллическая`)
          } else {
            console.log(`  Позиция ${i}: "${char}" (код: ${code}) - другой символ`)
          }
        }
      }
    }
    
    console.log('\n📊 3. Проверка в Google Sheets:')
    
    const gsActivities = await prisma.gsCashflowRow.findMany({
      select: { activity: true },
      distinct: ['activity']
    })
    
    for (const gs of gsActivities) {
      const activity = gs.activity || ''
      if (activity.toLowerCase().includes('операционн')) {
        console.log(`\nGS: "${activity}"`)
        
        // Проверяем каждый символ
        for (let i = 0; i < activity.length; i++) {
          const char = activity[i]
          const code = char.charCodeAt(0)
          const isCyrillic = code >= 1040 && code <= 1103
          const isLatin = (code >= 65 && code <= 90) || (code >= 97 && code <= 122)
          
          if (isLatin) {
            console.log(`  Позиция ${i}: "${char}" (код: ${code}) - ЛАТИНСКАЯ БУКВА!`)
          } else if (isCyrillic) {
            console.log(`  Позиция ${i}: "${char}" (код: ${code}) - кириллическая`)
          } else {
            console.log(`  Позиция ${i}: "${char}" (код: ${code}) - другой символ`)
          }
        }
      }
    }
    
    console.log('\n📊 4. Проверка на смешанные кодировки:')
    
    // Ищем записи, которые могут содержать смесь кириллицы и латиницы
    const mixedEncoding = await prisma.transaction.findMany({
      where: { 
        tenantId: tenant.id,
        activity: { not: null }
      },
      select: { activity: true }
    })
    
    for (const tx of mixedEncoding) {
      const activity = tx.activity || ''
      if (activity.includes('Операционн') || activity.includes('операционн')) {
        const hasLatin = /[a-zA-Z]/.test(activity)
        const hasCyrillic = /[а-яА-Я]/.test(activity)
        
        if (hasLatin && hasCyrillic) {
          console.log(`Смешанная кодировка: "${activity}"`)
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Ошибка:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkActivityCaseSensitive()
