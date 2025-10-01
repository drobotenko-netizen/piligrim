import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function analyzeGSheetsData() {
  try {
    console.log('🔍 Анализируем данные из Google Sheets...')

    const spreadsheetId = '1vEuHUs31i9DVxLebJ9AxHiOYXCJxQR094NhY8u3IPi8'
    const sheet = 'ДДС месяц'

    // Проверяем, сколько строк у нас в базе
    const dbRows = await prisma.gsCashflowRow.findMany({
      where: { spreadsheet: spreadsheetId, sheet },
      select: { rowNum: true, dateText: true, amount: true, fund: true }
    })

    console.log(`📊 В базе данных: ${dbRows.length} записей`)
    
    if (dbRows.length > 0) {
      const minRow = Math.min(...dbRows.map(r => r.rowNum))
      const maxRow = Math.max(...dbRows.map(r => r.rowNum))
      console.log(`📈 Диапазон строк в базе: ${minRow} - ${maxRow}`)
      
      // Показываем несколько примеров
      console.log('\n📋 Примеры записей:')
      dbRows.slice(0, 5).forEach(row => {
        console.log(`  Строка ${row.rowNum}: ${row.dateText} | ${row.amount} коп. | ${row.fund}`)
      })
    }

    // Попробуем получить данные напрямую из Google Sheets
    console.log('\n🌐 Проверяем Google Sheets напрямую...')
    
    try {
      // Сначала проверим основной лист
      const exportUrl = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(spreadsheetId)}/export?format=csv&sheet=${encodeURIComponent(sheet)}`
      const response = await fetch(exportUrl)
      
      if (response.ok) {
        const csv = await response.text()
        const lines = csv.split('\n').filter(line => line.trim())
        console.log(`📄 В листе "${sheet}" найдено строк: ${lines.length}`)
        
        // Показываем первые несколько строк
        console.log('\n📋 Первые строки из Google Sheets:')
        lines.slice(0, 5).forEach((line, i) => {
          console.log(`  ${i + 1}: ${line.substring(0, 100)}${line.length > 100 ? '...' : ''}`)
        })
        
        // Проверяем, есть ли данные после строки 91
        if (lines.length > 91) {
          console.log('\n⚠️  Есть данные после строки 91!')
          lines.slice(90, 95).forEach((line, i) => {
            console.log(`  ${91 + i}: ${line.substring(0, 100)}${line.length > 100 ? '...' : ''}`)
          })
        }
      } else {
        console.log(`❌ Ошибка получения данных: ${response.status}`)
      }
      
      // Теперь проверим, есть ли другие листы с данными
      console.log('\n🔍 Проверяем другие листы...')
      
      // Попробуем получить данные без указания листа (первый лист)
      const exportUrlDefault = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(spreadsheetId)}/export?format=csv`
      const responseDefault = await fetch(exportUrlDefault)
      
      if (responseDefault.ok) {
        const csvDefault = await responseDefault.text()
        const linesDefault = csvDefault.split('\n').filter(line => line.trim())
        console.log(`📄 В первом листе найдено строк: ${linesDefault.length}`)
        
        if (linesDefault.length > lines.length) {
          console.log('⚠️  В первом листе больше данных!')
        }
      }
      
    } catch (error) {
      console.log(`❌ Ошибка при обращении к Google Sheets: ${error}`)
    }

  } catch (error) {
    console.error('❌ Ошибка анализа:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

analyzeGSheetsData()
  .then(() => process.exit(0))
  .catch(() => process.exit(1))
