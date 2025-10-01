import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function markExistingIncompleteTransfers() {
  try {
    console.log('🔍 Отмечаем существующие неполные переводы...')

    // Получаем все переводы без fromAccountId/toAccountId
    const unpairedTransfers = await prisma.transaction.findMany({
      where: {
        kind: 'transfer',
        OR: [
          { fromAccountId: null },
          { toAccountId: null }
        ]
      },
      orderBy: [{ paymentDate: 'asc' }, { amount: 'asc' }],
      select: {
        id: true,
        paymentDate: true,
        amount: true,
        accountId: true
      }
    })

    console.log(`📊 Найдено неполных переводов: ${unpairedTransfers.length}`)

    let markedCount = 0

    for (const tx of unpairedTransfers) {
      // Находим соответствующий GsCashflowRow
      const account = await prisma.account.findUnique({ 
        where: { id: tx.accountId || '' },
        select: { name: true }
      })

      if (!account) continue

      // Ищем запись с переводом - может быть несколько вариантов
      const gsRow = await prisma.gsCashflowRow.findFirst({
        where: {
          date: tx.paymentDate,
          amount: tx.amount,
          wallet: account.name,
          fund: {
            contains: 'Перевод'
          }
        }
      })

      if (gsRow) {
        // Парсим исходные данные
        const originalData = JSON.parse(gsRow.raw || '[]')
        
        // Создаем новый объект с метаданными
        const newRawData = {
          originalData: originalData,
          incompleteTransfer: true,
          transferType: tx.amount < 0 ? 'outgoing_only' : 'incoming_only'
        }
        
        await prisma.gsCashflowRow.update({
          where: { id: gsRow.id },
          data: { raw: JSON.stringify(newRawData) }
        })
        
        markedCount++
        console.log(`✅ Отмечена запись: ${tx.paymentDate.toISOString().slice(0,10)} - ${account.name} - ${tx.amount} коп.`)
      }
    }

    console.log(`\n📈 Результат: отмечено ${markedCount} записей в GsCashflowRow`)

  } catch (error) {
    console.error('❌ Ошибка:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

markExistingIncompleteTransfers()
  .then(() => process.exit(0))
  .catch(() => process.exit(1))
