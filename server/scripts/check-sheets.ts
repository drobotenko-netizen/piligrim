import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkSheets() {
  try {
    console.log('🔍 Проверяем листы в Google Sheets...')

    const spreadsheetId = '1vEuHUs31i9DVxLebJ9AxHiOYXCJxQR094NhY8u3IPi8'

    // Попробуем получить данные из разных листов
    const sheets = ['ДДС месяц', 'ДДС', 'Sheet1', 'Лист1']
    
    for (const sheet of sheets) {
      try {
        console.log(`\n📊 Проверяем лист: "${sheet}"`)
        const exportUrl = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(spreadsheetId)}/export?format=csv&sheet=${encodeURIComponent(sheet)}`
        const response = await fetch(exportUrl)
        
        if (response.ok) {
          const csv = await response.text()
          const lines = csv.split('\n').filter(line => line.trim())
          console.log(`✅ Лист "${sheet}": ${lines.length} строк`)
          
          // Показываем первые строки
          lines.slice(0, 3).forEach((line, i) => {
            console.log(`  ${i + 1}: ${line.substring(0, 80)}${line.length > 80 ? '...' : ''}`)
          })
        } else {
          console.log(`❌ Лист "${sheet}": ошибка ${response.status}`)
        }
      } catch (error) {
        console.log(`❌ Лист "${sheet}": ${error}`)
      }
    }

  } catch (error) {
    console.error('❌ Ошибка:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

checkSheets()
  .then(() => process.exit(0))
  .catch(() => process.exit(1))
