// Утилиты для работы с меню и ролями пользователей

export interface MenuItem {
  href: string
  label: string
  section: string
}

export interface MenuSection {
  name: string
  items: MenuItem[]
  visible: boolean
}

// Функция для проверки ролей пользователя
export function hasRole(roles: string[], role: string): boolean {
  return roles.includes(role)
}

// Функция для проверки, является ли пользователь админом
export function isAdmin(roles: string[]): boolean {
  return hasRole(roles, 'ADMIN')
}

// Функция для определения видимости секций меню
export function getMenuVisibility(roles: string[]) {
  const admin = isAdmin(roles)
  const has = (r: string) => hasRole(roles, r)
  
  return {
    visibleSales: admin || has('SALES') || has('OWNER'),
    visiblePersonnel: admin || has('HR') || has('OWNER') || has('CASHIER'),
    visibleFinance: admin || has('FINANCE') || has('OWNER'),
    visibleSettings: admin,
    visibleIiko: true, // iiko всегда доступен
    visibleImport: true, // импорт всегда доступен
  }
}

// Функция для определения первого доступного пункта меню
export function getFirstAvailableMenuItem(roles: string[] = []): string {
  const visibility = getMenuVisibility(roles)
  
  // Порядок приоритета секций (сверху вниз в sidebar)
  if (visibility.visibleSales) return '/sales/revenue'
  if (visibility.visiblePersonnel) return '/timesheets'
  if (visibility.visibleFinance) return '/shifts'
  if (visibility.visibleSettings) return '/admin/users'
  
  // Если ничего не доступно, показываем iiko (всегда доступен)
  return '/iiko/sales/summary'
}

// Функция для получения всех доступных пунктов меню
export function getAvailableMenuItems(roles: string[] = []): MenuItem[] {
  const visibility = getMenuVisibility(roles)
  const items: MenuItem[] = []
  
  if (visibility.visibleSales) {
    items.push(
      { href: '/sales/revenue', label: 'Выручка', section: 'sales' },
      { href: '/sales/dishes', label: 'Блюда', section: 'sales' },
      { href: '/sales/suppliers', label: 'Поставщики', section: 'sales' },
      { href: '/sales/customers', label: 'Клиенты', section: 'sales' },
      { href: '/analysis/checks-by-hour', label: 'Чеки по часам', section: 'sales' }
    )
  }
  
  if (visibility.visiblePersonnel) {
    items.push(
      { href: '/timesheets', label: 'Табели', section: 'personnel' },
      { href: '/adjustments', label: 'Операции', section: 'personnel' },
      { href: '/payouts', label: 'Выплаты', section: 'personnel' },
      { href: '/payroll', label: 'Расчёт', section: 'personnel' },
      { href: '/employees', label: 'Сотрудники', section: 'personnel' },
      { href: '/positions', label: 'Должности', section: 'personnel' }
    )
  }
  
  if (visibility.visibleFinance) {
    items.push(
      { href: '/shifts', label: 'Смены', section: 'finance' },
      { href: '/finance/expense-docs', label: 'Документы расходов', section: 'finance' },
      { href: '/finance/payments', label: 'Платежи', section: 'finance' },
      { href: '/finance/accounts', label: 'Счета', section: 'finance' },
      { href: '/finance/categories', label: 'Категории', section: 'finance' },
      { href: '/finance/transactions', label: 'Транзакции', section: 'finance' },
      { href: '/finance/counterparties', label: 'Контрагенты', section: 'finance' },
      { href: '/finance/counterparty-types', label: 'Типы контрагентов', section: 'finance' },
      { href: '/finance/reports/cashflow', label: 'Движение денег', section: 'finance' },
      { href: '/finance/reports/pnl', label: 'Прибыль', section: 'finance' },
      { href: '/finance/reports/aging', label: 'Долги', section: 'finance' },
      { href: '/finance/balances', label: 'Остатки', section: 'finance' }
    )
  }
  
  // iiko всегда доступен
  items.push(
    { href: '/iiko/sales/summary', label: 'Сводка продаж', section: 'iiko' },
    { href: '/iiko/sales/paytypes', label: 'Продажи по оплатам', section: 'iiko' },
    { href: '/iiko/sales/receipts', label: 'Чеки (по блюдам)', section: 'iiko' },
    { href: '/iiko/stores/balances', label: 'Остатки на складах', section: 'iiko' },
    { href: '/iiko/stores/consumption', label: 'Расход за период', section: 'iiko' },
    { href: '/iiko/recipes', label: 'Рецепты', section: 'iiko' },
    { href: '/iiko/returns', label: 'Возвраты', section: 'iiko' }
  )
  
  // импорт всегда доступен
  items.push(
    { href: '/iiko/import', label: 'Загрузка данных из iiko', section: 'import' },
    { href: '/gsheets/cashflow', label: 'Движение денег (Google)', section: 'import' }
  )
  
  if (visibility.visibleSettings) {
    items.push(
      { href: '/admin/users', label: 'Пользователи', section: 'settings' },
      { href: '/admin/roles', label: 'Роли', section: 'settings' },
      { href: '/admin/audit', label: 'Аудит', section: 'settings' }
    )
  }
  
  return items
}
