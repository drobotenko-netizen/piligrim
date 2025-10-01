import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function seedFinanceV3() {
  console.log('🌱 Seeding Finance v3 data...')

  // Получаем первого tenant или создаём
  let tenant = await prisma.tenant.findFirst()
  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: { name: 'Demo Cafe' }
    })
    console.log('✅ Created tenant:', tenant.name)
  }

  // 1. Создаём каналы продаж
  const channels = await Promise.all([
    prisma.channel.upsert({
      where: { id: 'ch-dinein' },
      create: { id: 'ch-dinein', tenantId: tenant.id, name: 'Dine-in' },
      update: {}
    }),
    prisma.channel.upsert({
      where: { id: 'ch-pickup' },
      create: { id: 'ch-pickup', tenantId: tenant.id, name: 'Pickup' },
      update: {}
    }),
    prisma.channel.upsert({
      where: { id: 'ch-grab' },
      create: { id: 'ch-grab', tenantId: tenant.id, name: 'Grab' },
      update: {}
    }),
    prisma.channel.upsert({
      where: { id: 'ch-foodpanda' },
      create: { id: 'ch-foodpanda', tenantId: tenant.id, name: 'Foodpanda' },
      update: {}
    })
  ])
  console.log('✅ Created channels:', channels.length)

  // 2. Создаём способы оплаты
  const tenderTypes = await Promise.all([
    prisma.tenderType.upsert({
      where: { id: 'tt-cash' },
      create: { id: 'tt-cash', tenantId: tenant.id, name: 'Наличные' },
      update: {}
    }),
    prisma.tenderType.upsert({
      where: { id: 'tt-card' },
      create: { id: 'tt-card', tenantId: tenant.id, name: 'Карта' },
      update: {}
    }),
    prisma.tenderType.upsert({
      where: { id: 'tt-qr' },
      create: { id: 'tt-qr', tenantId: tenant.id, name: 'QR-код' },
      update: {}
    }),
    prisma.tenderType.upsert({
      where: { id: 'tt-aggregator' },
      create: { id: 'tt-aggregator', tenantId: tenant.id, name: 'Агрегатор' },
      update: {}
    })
  ])
  console.log('✅ Created tender types:', tenderTypes.length)

  // 3. Обновляем категории с kind
  const categories = await prisma.category.findMany({
    where: { tenantId: tenant.id }
  })

  for (const cat of categories) {
    let kind = null
    const name = cat.name.toLowerCase()
    
    // Определяем kind по имени
    if (name.includes('мясо') || name.includes('рыба') || name.includes('овощ') || 
        name.includes('молоч') || name.includes('напит') || name.includes('упаков')) {
      kind = 'COGS'
    } else if (name.includes('аренд') || name.includes('зарплат') || name.includes('коммунал') || 
               name.includes('связь') || name.includes('маркетинг') || name.includes('хоз')) {
      kind = 'OPEX'
    } else if (name.includes('оборудован') || name.includes('ремонт')) {
      kind = 'CAPEX'
    } else if (name.includes('комисс') || name.includes('банк')) {
      kind = 'FEE'
    } else if (name.includes('налог')) {
      kind = 'TAX'
    }

    if (kind && !cat.kind) {
      await prisma.category.update({
        where: { id: cat.id },
        data: { kind }
      })
    }
  }
  console.log('✅ Updated categories with kind')

  // 4. Создаём примеры категорий, если их нет
  const existingCategories = await prisma.category.findMany({
    where: { tenantId: tenant.id, parentId: null }
  })

  if (existingCategories.length === 0) {
    // Создаём корневые категории
    const cogsRoot = await prisma.category.create({
      data: {
        tenantId: tenant.id,
        name: 'Себестоимость',
        type: 'expense',
        kind: 'COGS',
        activity: 'OPERATING'
      }
    })

    const opexRoot = await prisma.category.create({
      data: {
        tenantId: tenant.id,
        name: 'Операционные расходы',
        type: 'expense',
        kind: 'OPEX',
        activity: 'OPERATING'
      }
    })

    const capexRoot = await prisma.category.create({
      data: {
        tenantId: tenant.id,
        name: 'Капитальные расходы',
        type: 'expense',
        kind: 'CAPEX',
        activity: 'INVESTING'
      }
    })

    const revenueRoot = await prisma.category.create({
      data: {
        tenantId: tenant.id,
        name: 'Выручка',
        type: 'income',
        activity: 'OPERATING'
      }
    })

    // Создаём подкатегории COGS
    await Promise.all([
      prisma.category.create({
        data: {
          tenantId: tenant.id,
          name: 'Мясо и рыба',
          type: 'expense',
          kind: 'COGS',
          activity: 'OPERATING',
          parentId: cogsRoot.id
        }
      }),
      prisma.category.create({
        data: {
          tenantId: tenant.id,
          name: 'Овощи и фрукты',
          type: 'expense',
          kind: 'COGS',
          activity: 'OPERATING',
          parentId: cogsRoot.id
        }
      }),
      prisma.category.create({
        data: {
          tenantId: tenant.id,
          name: 'Молочные продукты',
          type: 'expense',
          kind: 'COGS',
          activity: 'OPERATING',
          parentId: cogsRoot.id
        }
      })
    ])

    // Создаём подкатегории OPEX
    await Promise.all([
      prisma.category.create({
        data: {
          tenantId: tenant.id,
          name: 'Аренда',
          type: 'expense',
          kind: 'OPEX',
          activity: 'OPERATING',
          parentId: opexRoot.id
        }
      }),
      prisma.category.create({
        data: {
          tenantId: tenant.id,
          name: 'Коммунальные платежи',
          type: 'expense',
          kind: 'OPEX',
          activity: 'OPERATING',
          parentId: opexRoot.id
        }
      }),
      prisma.category.create({
        data: {
          tenantId: tenant.id,
          name: 'Зарплата',
          type: 'expense',
          kind: 'OPEX',
          activity: 'OPERATING',
          parentId: opexRoot.id
        }
      }),
      prisma.category.create({
        data: {
          tenantId: tenant.id,
          name: 'Комиссия банка',
          type: 'expense',
          kind: 'FEE',
          activity: 'OPERATING',
          parentId: opexRoot.id
        }
      })
    ])

    console.log('✅ Created sample categories')
  }

  // 5. Создаём счета, если их нет
  const existingAccounts = await prisma.account.findMany({
    where: { tenantId: tenant.id }
  })

  if (existingAccounts.length === 0) {
    await Promise.all([
      prisma.account.create({
        data: {
          tenantId: tenant.id,
          name: 'Касса',
          kind: 'cash'
        }
      }),
      prisma.account.create({
        data: {
          tenantId: tenant.id,
          name: 'Расчётный счёт',
          kind: 'bank'
        }
      }),
      prisma.account.create({
        data: {
          tenantId: tenant.id,
          name: 'Эквайринг',
          kind: 'card'
        }
      })
    ])
    console.log('✅ Created sample accounts')
  }

  // 6. Создаём поставщиков, если их нет
  const existingVendors = await prisma.counterparty.findMany({
    where: { tenantId: tenant.id }
  })

  if (existingVendors.length === 0) {
    await Promise.all([
      prisma.counterparty.create({
        data: {
          tenantId: tenant.id,
          name: 'ООО "Мясная лавка"',
          kind: 'supplier'
        }
      }),
      prisma.counterparty.create({
        data: {
          tenantId: tenant.id,
          name: 'ИП Петров (овощи)',
          kind: 'supplier'
        }
      }),
      prisma.counterparty.create({
        data: {
          tenantId: tenant.id,
          name: 'Арендодатель - ООО "Недвижимость"',
          kind: 'landlord'
        }
      })
    ])
    console.log('✅ Created sample vendors')
  }

  console.log('✨ Finance v3 seed completed!')
}

seedFinanceV3()
  .then(() => {
    console.log('Done!')
    prisma.$disconnect()
  })
  .catch((e) => {
    console.error('Error:', e)
    prisma.$disconnect()
    process.exit(1)
  })

