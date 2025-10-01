import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkUnpairedTransfers() {
  try {
    console.log('🔍 Проверяем переводы без пар...')

    // Получаем все переводы
    const transferTransactions = await prisma.transaction.findMany({
      where: {
        kind: 'transfer'
      },
      orderBy: [{ paymentDate: 'asc' }, { amount: 'asc' }],
      select: {
        id: true,
        paymentDate: true,
        amount: true,
        accountId: true,
        fromAccountId: true,
        toAccountId: true,
        note: true
      }
    })

    console.log(`📊 Всего переводов: ${transferTransactions.length}`)

    // Группируем по дате и сумме
    const groupedByDateAndAmount = new Map<string, any[]>()
    
    for (const tx of transferTransactions) {
      const dateKey = tx.paymentDate.toISOString().split('T')[0]
      const amountKey = Math.abs(tx.amount)
      const groupKey = `${dateKey}_${amountKey}`
      if (!groupedByDateAndAmount.has(groupKey)) {
        groupedByDateAndAmount.set(groupKey, [])
      }
      groupedByDateAndAmount.get(groupKey)?.push(tx)
    }

    console.log(`📈 Групп по дате/сумме: ${groupedByDateAndAmount.size}`)

    let pairedCount = 0
    let unpairedCount = 0
    const unpairedGroups: any[] = []

    for (const [groupKey, group] of groupedByDateAndAmount.entries()) {
      const outgoing = group.filter(tx => tx.amount < 0)
      const incoming = group.filter(tx => tx.amount > 0)

      if (outgoing.length === 1 && incoming.length === 1) {
        pairedCount += group.length
      } else {
        unpairedCount += group.length
        unpairedGroups.push({
          groupKey,
          outgoing: outgoing.length,
          incoming: incoming.length,
          total: group.length,
          transactions: group
        })
      }
    }

    console.log(`✅ Спаренных переводов: ${pairedCount}`)
    console.log(`❌ Неспаренных переводов: ${unpairedCount}`)
    console.log(`📊 Групп без пар: ${unpairedGroups.length}`)

    if (unpairedGroups.length > 0) {
      console.log('\n🔍 Примеры неспаренных групп:')
      unpairedGroups.slice(0, 10).forEach((group, i) => {
        console.log(`\n${i + 1}. Группа ${group.groupKey}:`)
        console.log(`   Исходящих: ${group.outgoing}, Входящих: ${group.incoming}, Всего: ${group.total}`)
        group.transactions.forEach((tx: any) => {
          const accountInfo = tx.accountId ? `Счет: ${tx.accountId}` : 'Без счета'
          const fromToInfo = tx.fromAccountId && tx.toAccountId ? 
            `От: ${tx.fromAccountId} → К: ${tx.toAccountId}` : 
            'Без from/to'
          console.log(`   ${tx.paymentDate.toISOString().slice(0,10)} | ${tx.amount} коп. | ${accountInfo} | ${fromToInfo}`)
        })
      })
    }

    // Проверяем переводы с fromAccountId/toAccountId
    const transfersWithAccounts = await prisma.transaction.findMany({
      where: {
        kind: 'transfer',
        AND: [
          { fromAccountId: { not: null } },
          { toAccountId: { not: null } }
        ]
      },
      select: {
        id: true,
        paymentDate: true,
        amount: true,
        fromAccountId: true,
        toAccountId: true
      }
    })

    console.log(`\n🔗 Переводов с fromAccountId/toAccountId: ${transfersWithAccounts.length}`)

    // Проверяем переводы без fromAccountId/toAccountId
    const transfersWithoutAccounts = await prisma.transaction.findMany({
      where: {
        kind: 'transfer',
        OR: [
          { fromAccountId: null },
          { toAccountId: null }
        ]
      },
      select: {
        id: true,
        paymentDate: true,
        amount: true,
        accountId: true,
        fromAccountId: true,
        toAccountId: true,
        note: true
      }
    })

    console.log(`❌ Переводов без fromAccountId/toAccountId: ${transfersWithoutAccounts.length}`)

    if (transfersWithoutAccounts.length > 0) {
      console.log('\n🔍 Примеры переводов без from/to:')
      transfersWithoutAccounts.slice(0, 5).forEach((tx, i) => {
        console.log(`   ${i + 1}. ${tx.paymentDate.toISOString().slice(0,10)} | ${tx.amount} коп. | Счет: ${tx.accountId} | Примечание: ${tx.note || 'нет'}`)
      })
    }

  } catch (error) {
    console.error('❌ Ошибка:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

checkUnpairedTransfers()
  .then(() => process.exit(0))
  .catch(() => process.exit(1))
