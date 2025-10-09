#!/usr/bin/env npx tsx

/**
 * Скрипт для переимпорта последних дней для заполнения категорий блюд
 * Использование: npx tsx scripts/reimport-recent-days.ts [days]
 * Пример: npx tsx scripts/reimport-recent-days.ts 7
 */

import { PrismaClient } from '@prisma/client'
import { IikoClient } from '../src/modules/iiko/client'
import { importReceiptsForDate } from '../src/modules/iiko/etl/receipts'

const prisma = new PrismaClient()
const client = new IikoClient()

async function main() {
  const daysToImport = Number(process.argv[2]) || 7
  
  console.log(`📥 Начинаем переимпорт последних ${daysToImport} дней для заполнения категорий блюд...`)
  
  const results = []
  
  for (let i = 0; i < daysToImport; i++) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    const ymd = date.toISOString().slice(0, 10)
    
    console.log(`\n📅 Импортируем ${ymd} (день ${i + 1}/${daysToImport})...`)
    
    try {
      const result = await importReceiptsForDate(prisma, client, ymd)
      results.push(result)
      console.log(`✅ ${ymd}: создано ${result.created}, обновлено ${result.updated}`)
    } catch (e: any) {
      console.error(`❌ Ошибка импорта ${ymd}:`, e.message)
    }
  }
  
  console.log('\n✅ Импорт завершён!')
  console.log('Статистика:')
  console.log(`- Всего дней: ${results.length}`)
  console.log(`- Создано чеков: ${results.reduce((sum, r) => sum + r.created, 0)}`)
  console.log(`- Обновлено чеков: ${results.reduce((sum, r) => sum + r.updated, 0)}`)
}

main()
  .catch(e => {
    console.error('Ошибка:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())







