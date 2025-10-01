import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkIncompleteTransfers() {
  try {
    console.log('🔍 Проверяем отметки неполных переводов...')

    // Проверяем GsCashflowRow с отметками incompleteTransfer
    const gsRowsWithIncomplete = await prisma.gsCashflowRow.findMany({
      where: {
        raw: {
          contains: '"incompleteTransfer":true'
        }
      },
      select: {
        id: true,
        date: true,
        amount: true,
        wallet: true,
        fund: true,
        raw: true
      }
    })

    console.log(`📊 GsCashflowRow с отметкой incompleteTransfer: ${gsRowsWithIncomplete.length}`)

    if (gsRowsWithIncomplete.length > 0) {
      console.log('\n🔍 Примеры отмеченных записей:')
      gsRowsWithIncomplete.slice(0, 10).forEach((row, i) => {
        const rawData = JSON.parse(row.raw || '{}')
        console.log(`  ${i + 1}. ${row.date?.toISOString().slice(0,10)} | ${row.amount} коп. | ${row.wallet} | ${row.fund}`)
        console.log(`     Raw: ${JSON.stringify(rawData)}`)
      })
    }

    // Проверяем все GsCashflowRow с переводами
    const allTransferRows = await prisma.gsCashflowRow.findMany({
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
      }
    })

    console.log(`\n📊 Всего GsCashflowRow с переводами: ${allTransferRows.length}`)

    let markedCount = 0
    let unmarkedCount = 0

    for (const row of allTransferRows) {
      const rawData = JSON.parse(row.raw || '{}')
      if (rawData.incompleteTransfer === true) {
        markedCount++
      } else {
        unmarkedCount++
      }
    }

    console.log(`✅ Отмеченных как неполные: ${markedCount}`)
    console.log(`❌ Не отмеченных: ${unmarkedCount}`)

    // Проверяем, есть ли записи с transferType
    const rowsWithTransferType = await prisma.gsCashflowRow.findMany({
      where: {
        raw: {
          contains: '"transferType"'
        }
      },
      select: {
        id: true,
        date: true,
        amount: true,
        wallet: true,
        fund: true,
        raw: true
      }
    })

    console.log(`\n📊 Записей с transferType: ${rowsWithTransferType.length}`)

    if (rowsWithTransferType.length > 0) {
      console.log('\n🔍 Примеры с transferType:')
      rowsWithTransferType.slice(0, 5).forEach((row, i) => {
        const rawData = JSON.parse(row.raw || '{}')
        console.log(`  ${i + 1}. ${row.date?.toISOString().slice(0,10)} | ${row.amount} коп. | ${row.wallet}`)
        console.log(`     TransferType: ${rawData.transferType}`)
      })
    }

  } catch (error) {
    console.error('❌ Ошибка:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

checkIncompleteTransfers()
  .then(() => process.exit(0))
  .catch(() => process.exit(1))
