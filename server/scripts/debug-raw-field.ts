import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function debugRawField() {
  try {
    console.log('🔍 Проверяем поле raw в GsCashflowRow...')

    // Проверяем несколько записей с переводами
    const transferRows = await prisma.gsCashflowRow.findMany({
      where: {
        fund: {
          contains: 'Перевод'
        }
      },
      select: {
        id: true,
        date: true,
        amount: true,
        wallet: true,
        fund: true,
        raw: true
      },
      take: 5
    })

    console.log(`📊 Найдено записей с переводами: ${transferRows.length}`)

    transferRows.forEach((row, i) => {
      console.log(`\n${i + 1}. Запись ${row.id}:`)
      console.log(`   Дата: ${row.date?.toISOString().slice(0,10)}`)
      console.log(`   Сумма: ${row.amount} коп.`)
      console.log(`   Кошелек: ${row.wallet}`)
      console.log(`   Фонд: ${row.fund}`)
      console.log(`   Raw: ${row.raw}`)
      
      if (row.raw) {
        try {
          const parsed = JSON.parse(row.raw)
          console.log(`   Parsed: ${JSON.stringify(parsed, null, 2)}`)
        } catch (e) {
          console.log(`   Ошибка парсинга JSON: ${e}`)
        }
      }
    })

    // Проверяем записи с incompleteTransfer
    const incompleteRows = await prisma.gsCashflowRow.findMany({
      where: {
        raw: {
          contains: 'incompleteTransfer'
        }
      },
      select: {
        id: true,
        date: true,
        amount: true,
        wallet: true,
        fund: true,
        raw: true
      },
      take: 3
    })

    console.log(`\n📊 Записей с incompleteTransfer: ${incompleteRows.length}`)

    incompleteRows.forEach((row, i) => {
      console.log(`\n${i + 1}. Incomplete запись ${row.id}:`)
      console.log(`   Дата: ${row.date?.toISOString().slice(0,10)}`)
      console.log(`   Сумма: ${row.amount} коп.`)
      console.log(`   Кошелек: ${row.wallet}`)
      console.log(`   Фонд: ${row.fund}`)
      console.log(`   Raw: ${row.raw}`)
    })

  } catch (error) {
    console.error('❌ Ошибка:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

debugRawField()
  .then(() => process.exit(0))
  .catch(() => process.exit(1))
