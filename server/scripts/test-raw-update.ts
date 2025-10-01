import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testRawUpdate() {
  try {
    console.log('🔍 Тестируем обновление поля raw...')

    // Найдем одну запись с переводом
    const gsRow = await prisma.gsCashflowRow.findFirst({
      where: {
        fund: {
          contains: 'Перевод'
        }
      }
    })

    if (!gsRow) {
      console.log('❌ Не найдено записей с переводами')
      return
    }

    console.log(`📊 Найдена запись: ${gsRow.id}`)
    console.log(`   Исходный raw: ${gsRow.raw}`)

    // Попробуем обновить raw с метаданными
    const originalRaw = gsRow.raw
    const newRaw = JSON.stringify({
      originalData: JSON.parse(originalRaw || '[]'),
      incompleteTransfer: true,
      transferType: 'test'
    })

    console.log(`   Новый raw: ${newRaw}`)

    await prisma.gsCashflowRow.update({
      where: { id: gsRow.id },
      data: { raw: newRaw }
    })

    console.log('✅ Запись обновлена')

    // Проверим, что записалось
    const updatedRow = await prisma.gsCashflowRow.findUnique({
      where: { id: gsRow.id },
      select: { raw: true }
    })

    console.log(`   Обновленный raw: ${updatedRow?.raw}`)

    // Восстановим исходное значение
    await prisma.gsCashflowRow.update({
      where: { id: gsRow.id },
      data: { raw: originalRaw }
    })

    console.log('✅ Исходное значение восстановлено')

  } catch (error) {
    console.error('❌ Ошибка:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

testRawUpdate()
  .then(() => process.exit(0))
  .catch(() => process.exit(1))
