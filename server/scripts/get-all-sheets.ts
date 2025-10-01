import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function getAllSheets() {
  try {
    console.log('🔍 Получаем все листы из Google Sheets...')

    const spreadsheetId = '1vEuHUs31i9DVxLebJ9AxHiOYXCJxQR094NhY8u3IPi8'

    // Попробуем получить информацию о листах через разные способы
    
    // Способ 1: Через gviz API
    console.log('\n📊 Способ 1: Через gviz API')
    try {
      const gvizUrl = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(spreadsheetId)}/gviz/tq?tqx=out:csv`
      const response = await fetch(gvizUrl)
      
      if (response.ok) {
        const csv = await response.text()
        const lines = csv.split('\n').filter(line => line.trim())
        console.log(`✅ Получено строк: ${lines.length}`)
        
        // Показываем первые строки
        lines.slice(0, 5).forEach((line, i) => {
          console.log(`  ${i + 1}: ${line.substring(0, 100)}${line.length > 100 ? '...' : ''}`)
        })
      } else {
        console.log(`❌ Ошибка: ${response.status}`)
      }
    } catch (error) {
      console.log(`❌ Ошибка: ${error}`)
    }

    // Способ 2: Попробуем разные gid
    console.log('\n📊 Способ 2: Проверяем разные gid')
    const gids = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10']
    
    for (const gid of gids) {
      try {
        const exportUrl = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(spreadsheetId)}/export?format=csv&gid=${gid}`
        const response = await fetch(exportUrl)
        
        if (response.ok) {
          const csv = await response.text()
          const lines = csv.split('\n').filter(line => line.trim())
          
          if (lines.length > 0) {
            console.log(`✅ GID ${gid}: ${lines.length} строк`)
            
            // Показываем первую строку (заголовок)
            if (lines[0]) {
              console.log(`  Заголовок: ${lines[0].substring(0, 80)}${lines[0].length > 80 ? '...' : ''}`)
            }
            
            // Если много строк, показываем это
            if (lines.length > 100) {
              console.log(`  ⚠️  Много строк! Возможно, это нужный лист`)
            }
          }
        } else {
          console.log(`❌ GID ${gid}: ошибка ${response.status}`)
        }
      } catch (error) {
        console.log(`❌ GID ${gid}: ${error}`)
      }
    }

    // Способ 3: Попробуем получить HTML страницу и найти gid
    console.log('\n📊 Способ 3: Анализируем HTML страницу')
    try {
      const htmlUrl = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(spreadsheetId)}/edit`
      const response = await fetch(htmlUrl)
      
      if (response.ok) {
        const html = await response.text()
        
        // Ищем gid в HTML
        const gidMatches = html.match(/gid=(\d+)/g)
        if (gidMatches) {
          console.log(`✅ Найдены gid в HTML: ${gidMatches.join(', ')}`)
        } else {
          console.log('❌ Gid не найдены в HTML')
        }
        
        // Ищем названия листов
        const sheetMatches = html.match(/"sheet_name":"([^"]+)"/g)
        if (sheetMatches) {
          console.log(`✅ Найдены листы: ${sheetMatches.join(', ')}`)
        } else {
          console.log('❌ Названия листов не найдены')
        }
      } else {
        console.log(`❌ Ошибка получения HTML: ${response.status}`)
      }
    } catch (error) {
      console.log(`❌ Ошибка HTML анализа: ${error}`)
    }

  } catch (error) {
    console.error('❌ Ошибка:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

getAllSheets()
  .then(() => process.exit(0))
  .catch(() => process.exit(1))
