import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function debugImportLimit() {
  try {
    console.log('🔍 Отладка лимита импорта...')

    const spreadsheetId = '1vEuHUs31i9DVxLebJ9AxHiOYXCJxQR094NhY8u3IPi8'
    const sheet = 'ДДС месяц'

    // Получаем данные напрямую из Google Sheets
    const exportUrl = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(spreadsheetId)}/export?format=csv&sheet=${encodeURIComponent(sheet)}`
    const response = await fetch(exportUrl)
    
    if (!response.ok) {
      console.log(`❌ Ошибка получения данных: ${response.status}`)
      return
    }
    
    const csv = await response.text()
    const lines = csv.split('\n').filter(line => line.trim())
    console.log(`📄 Всего строк в Google Sheets: ${lines.length}`)
    
    // Проверяем каждую строку начиная с 90
    console.log('\n🔍 Проверяем строки 90-98:')
    for (let i = 89; i < Math.min(lines.length, 98); i++) {
      const line = lines[i]
      const cells = line.split(',')
      console.log(`  Строка ${i + 1}: ${cells.length} колонок`)
      console.log(`    Содержимое: ${line.substring(0, 150)}${line.length > 150 ? '...' : ''}`)
      
      // Проверяем, считается ли строка пустой по логике импортера
      const monthName = cells[0] ? cells[0].trim() : null
      const monthNum = cells[1] ? Number(cells[1].replace(/[^0-9-]/g, '')) : null
      const dateText = cells[2] ? cells[2].trim() : null
      const amount = cells[3] ? cells[3].trim() : null
      const wallet = cells[4] ? cells[4].trim() : null
      const supplier = cells[6] ? cells[6].trim() : null
      const comment = cells[7] ? cells[7].trim() : null
      const fund = cells[8] ? cells[8].trim() : null
      const flowType = cells[10] ? cells[10].trim() : null
      const activity = cells[11] ? cells[11].trim() : null
      
      const isEmpty = !monthName && !monthNum && !dateText && !amount && !wallet && !supplier && !comment && !fund && !flowType && !activity
      
      console.log(`    Пустая по логике импортера: ${isEmpty}`)
      console.log(`    Данные: monthName="${monthName}", amount="${amount}", fund="${fund}"`)
      console.log('')
    }

  } catch (error) {
    console.error('❌ Ошибка:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

debugImportLimit()
  .then(() => process.exit(0))
  .catch(() => process.exit(1))
