import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkSheetStructure() {
  try {
    console.log('🔍 Проверяем структуру листа "ДДС месяц"...')

    const spreadsheetId = '1vEuHUs31i9DVxLebJ9AxHiOYXCJxQR094NhY8u3IPi8'
    const sheet = 'ДДС месяц'

    // Получаем данные из Google Sheets
    const exportUrl = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(spreadsheetId)}/export?format=csv&sheet=${encodeURIComponent(sheet)}`
    const response = await fetch(exportUrl)
    
    if (response.ok) {
      const csv = await response.text()
      const lines = csv.split('\n').filter(line => line.trim())
      
      console.log(`📄 Всего строк в листе: ${lines.length}`)
      
      // Показываем первые 10 строк
      console.log('\n📋 Первые 10 строк:')
      lines.slice(0, 10).forEach((line, i) => {
        console.log(`  ${i + 1}: ${line}`)
      })
      
      // Показываем строки 4-8 (где должны быть данные)
      console.log('\n📋 Строки 4-8 (начало данных):')
      lines.slice(3, 8).forEach((line, i) => {
        console.log(`  ${i + 4}: ${line}`)
      })
      
      // Показываем последние 5 строк
      console.log('\n📋 Последние 5 строк:')
      lines.slice(-5).forEach((line, i) => {
        console.log(`  ${lines.length - 4 + i}: ${line}`)
      })
      
    } else {
      console.log(`❌ Ошибка получения данных: ${response.status}`)
    }

  } catch (error) {
    console.error('❌ Ошибка:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

checkSheetStructure()
  .then(() => process.exit(0))
  .catch(() => process.exit(1))
