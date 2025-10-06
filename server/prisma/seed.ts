import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Tenant
  const tenant = (await prisma.tenant.findFirst()) || (await prisma.tenant.create({ data: { name: 'Default' } }))

  // Helpers
  async function ensureAccount(name: string, kind: string) {
    const existing = await (prisma as any).account?.findFirst({ where: { tenantId: tenant.id, name } })
    if (existing) return existing
    return await (prisma as any).account?.create({ data: { tenantId: tenant.id, name, kind } })
  }
  async function ensureCategory(name: string, type: 'expense'|'income', activity: 'OPERATING'|'INVESTING'|'FINANCING', parentId?: string | null) {
    const where: any = { tenantId: tenant.id, name, type }
    if (parentId === undefined) where.parentId = null
    else where.parentId = parentId
    const existing = await (prisma as any).category?.findFirst({ where })
    if (existing) return existing
    return await (prisma as any).category?.create({ data: { tenantId: tenant.id, name, type, activity, parentId: parentId ?? null } })
  }
  async function ensureCounterparty(name: string, kind?: string | null) {
    const existing = await (prisma as any).counterparty?.findFirst({ where: { tenantId: tenant.id, name } })
    if (existing) return existing
    return await (prisma as any).counterparty?.create({ data: { tenantId: tenant.id, name, kind: kind || null } })
  }

  // Accounts (два типа: Наличные и Безналичные)
  const accCash = await ensureAccount('Касса ресторана', 'cash')
  const accSber = await ensureAccount('Эквайринг (Сбер)', 'noncash')
  const accRs = await ensureAccount('Р/счёт в Т-Банк', 'noncash')

  // Categories — иерархия: Категория -> Статья
  // Расходы: Персонал
  const catPers = await ensureCategory('Персонал', 'expense', 'OPERATING')
  const catSalary = await ensureCategory('Зарплата', 'expense', 'OPERATING', catPers?.id)
  const catTaxes = await ensureCategory('Налоги и взносы', 'expense', 'OPERATING', catPers?.id)
  const catUniform = await ensureCategory('Форма и СИЗ', 'expense', 'OPERATING', catPers?.id)

  // Расходы: Сырье и материалы
  const catRaw = await ensureCategory('Сырьё и материалы', 'expense', 'OPERATING')
  const catFood = await ensureCategory('Закупка продуктов', 'expense', 'OPERATING', catRaw?.id)
  const catVeg = await ensureCategory('Овощи и фрукты', 'expense', 'OPERATING', catRaw?.id)
  const catMeat = await ensureCategory('Мясо и птица', 'expense', 'OPERATING', catRaw?.id)
  const catDairy = await ensureCategory('Молочная продукция', 'expense', 'OPERATING', catRaw?.id)

  // Расходы: Помещения
  const catPrem = await ensureCategory('Помещения', 'expense', 'OPERATING')
  const catRent = await ensureCategory('Аренда', 'expense', 'OPERATING', catPrem?.id)
  const catUtilities = await ensureCategory('Коммунальные услуги', 'expense', 'OPERATING', catPrem?.id)
  const catCleaning = await ensureCategory('Уборка', 'expense', 'OPERATING', catPrem?.id)

  // Расходы: Маркетинг
  const catMkt = await ensureCategory('Маркетинг', 'expense', 'OPERATING')
  const catAds = await ensureCategory('Реклама', 'expense', 'OPERATING', catMkt?.id)
  const catAggregators = await ensureCategory('Комиссии агрегаторов', 'expense', 'OPERATING', catMkt?.id)

  // Расходы: Банковское обслуживание (FINANCING)
  const catBank = await ensureCategory('Банковское обслуживание', 'expense', 'FINANCING')
  const catAcq = await ensureCategory('Комиссия эквайринга', 'expense', 'FINANCING', catBank?.id)
  const catAccServ = await ensureCategory('Обслуживание счёта', 'expense', 'FINANCING', catBank?.id)

  // Расходы: Инвестиции
  const catInvest = await ensureCategory('Инвестиции', 'expense', 'INVESTING')
  const catEquip = await ensureCategory('Оборудование', 'expense', 'INVESTING', catInvest?.id)
  const catRepair = await ensureCategory('Ремонт', 'expense', 'INVESTING', catInvest?.id)

  // Доходы
  const catIncome = await ensureCategory('Выручка', 'income', 'OPERATING')
  const catSalesHall = await ensureCategory('Выручка зал', 'income', 'OPERATING', catIncome?.id)
  const catSalesDelivery = await ensureCategory('Выручка доставка', 'income', 'OPERATING', catIncome?.id)
  const catBarIncome = await ensureCategory('Бар', 'income', 'OPERATING', catIncome?.id)
  const catOtherInc = await ensureCategory('Прочие доходы', 'income', 'OPERATING')
  const catSupplierReturn = await ensureCategory('Возврат поставщика', 'income', 'OPERATING', catOtherInc?.id)

  // Counterparties
  const cpSupplier = await ensureCounterparty('Поставщик Продукты', 'company')
  const cpLandlord = await ensureCounterparty('Арендодатель', 'company')
  const cpSber = await ensureCounterparty('Сбербанк Эквайринг', 'bank')
  const cpEnergy = await ensureCounterparty('Энергосбыт', 'company')
  const cpAdsYandex = await ensureCounterparty('Яндекс Реклама', 'company')
  // RBAC seed
  const roles = ['ADMIN','ACCOUNTANT','MANAGER','CASHIER','EMPLOYEE']
  const perms = [
    'finance.read','finance.write',
    'transactions.read','transactions.write',
    'categories.read','categories.write',
    'accounts.read','accounts.write',
    'payouts.read','payouts.write',
    'payroll.read','payroll.write',
    'timesheets.read','timesheets.write',
    'users.manage'
  ]
  for (const name of roles) {
    await (prisma as any).role.upsert({ where: { name }, update: {}, create: { name } })
  }
  for (const name of perms) {
    await (prisma as any).permission.upsert({ where: { name }, update: {}, create: { name } })
  }
  // default role->permissions
  async function grant(roleName: string, permNames: string[]) {
    const role = await (prisma as any).role.findUnique({ where: { name: roleName } })
    for (const pn of permNames) {
      const p = await (prisma as any).permission.findUnique({ where: { name: pn } })
      if (p) {
        await (prisma as any).rolePermission.upsert({ where: { roleId_permissionId: { roleId: role.id, permissionId: p.id } }, update: {}, create: { roleId: role.id, permissionId: p.id } })
      }
    }
  }
  await grant('ADMIN', perms)
  await grant('ACCOUNTANT', ['finance.read','finance.write','transactions.read','transactions.write','categories.read','categories.write','accounts.read','accounts.write','payouts.read','payouts.write'])
  await grant('MANAGER', ['timesheets.read','timesheets.write','payroll.read','payroll.write'])
  await grant('CASHIER', ['payouts.read','payouts.write'])
  await grant('EMPLOYEE', [])

  // default admin user
  const adminPhone = '+79140775712'
  const adminName = 'Денис Дроботенко'
  const user = await (prisma as any).user.upsert({ where: { phone: adminPhone }, update: { fullName: adminName, active: true }, create: { tenantId: tenant.id, phone: adminPhone, fullName: adminName, active: true } })
  const adminRole = await (prisma as any).role.findUnique({ where: { name: 'ADMIN' } })
  await (prisma as any).userRole.upsert({ where: { tenantId_userId_roleId: { tenantId: tenant.id, userId: user.id, roleId: adminRole.id } }, update: {}, create: { tenantId: tenant.id, userId: user.id, roleId: adminRole.id } })

  // Telegram binding for admin user
  const telegramChatId = '379636473' // Chat ID Дениса Дроботенко
  await (prisma as any).telegramBinding.upsert({ 
    where: { tenantId_chatId: { tenantId: tenant.id, chatId: telegramChatId } }, 
    update: { userId: user.id }, 
    create: { tenantId: tenant.id, userId: user.id, chatId: telegramChatId } 
  })


  // Period
  const now = new Date()
  const y = now.getUTCFullYear()
  const m = now.getUTCMonth() + 1
  const payDate = new Date(Date.UTC(y, m - 1, Math.min(28, now.getUTCDate())))

  // Helper to create transaction if not exists (by unique fingerprint)
  async function createTxn(data: any) {
    const sameDayStart = new Date(Date.UTC(payDate.getUTCFullYear(), payDate.getUTCMonth(), payDate.getUTCDate()))
    const sameDayEnd = new Date(Date.UTC(payDate.getUTCFullYear(), payDate.getUTCMonth(), payDate.getUTCDate() + 1))
    const existing = await (prisma as any).transaction.findFirst({ where: { tenantId: tenant.id, paymentDate: { gte: sameDayStart, lt: sameDayEnd }, amount: data.amount, accountId: data.accountId ?? undefined, kind: data.kind } })
    if (existing) return existing
    return await (prisma as any).transaction.create({ data })
  }

  // Skip transactions for now - focus on user creation
  console.log('Skipping transactions - user creation only')

  console.log('Seed completed')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
}).finally(async () => {
  await prisma.$disconnect()
})
