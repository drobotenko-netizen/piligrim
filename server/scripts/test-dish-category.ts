import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function test() {
  try {
    // Попробуем выбрать с dishCategory
    const item = await prisma.iikoReceiptItem.findFirst({
      select: {
        dishId: true,
        dishName: true,
        dishCategory: true
      }
    })
    
    console.log('✅ Поле dishCategory существует!')
    console.log('Пример:', item)
  } catch (error: any) {
    console.log('❌ Поле dishCategory не существует:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

test()



