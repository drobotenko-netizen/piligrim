"use client"
import Link from 'next/link'
import { getApiBase } from "@/lib/api"
import { usePathname } from 'next/navigation'
import { Users, CalendarCheck2, Banknote, FileSpreadsheet, Settings, ChevronDown, Wallet, ListTree, ArrowLeftRight, Contact, FileText, Shield, Tags, TrendingUp, UserCheck, Calculator, ChefHat, ShoppingCart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useEffect, useState, useCallback, useMemo } from 'react'
import { getMenuVisibility } from '@/lib/menu-utils'

const personnelItems = [
  { href: '/timesheets', label: 'Табели', icon: CalendarCheck2 },
  { href: '/adjustments', label: 'Операции', icon: Settings },
  { href: '/payouts', label: 'Выплаты', icon: Banknote },
  { href: '/payroll', label: 'Расчёт', icon: FileSpreadsheet },
  { href: '/employees', label: 'Сотрудники', icon: Users },
  { href: '/positions', label: 'Должности', icon: Settings },
]

const financeItems = [
  { href: '/shifts', label: 'Смены', icon: CalendarCheck2 },
  { href: '/finance/expense-docs', label: 'Документы расходов', icon: FileText },
  { href: '/finance/payments', label: 'Платежи', icon: Banknote },
  { href: '/finance/accounts', label: 'Счета', icon: Wallet },
  { href: '/finance/categories', label: 'Категории', icon: ListTree },
  { href: '/finance/transactions', label: 'Транзакции', icon: ArrowLeftRight },
  { href: '/finance/counterparties', label: 'Контрагенты', icon: Contact },
  { href: '/finance/counterparty-types', label: 'Типы контрагентов', icon: Tags },
  { href: '/finance/reports/cashflow', label: 'Движение денег', icon: FileSpreadsheet },
  { href: '/finance/reports/pnl', label: 'Прибыль', icon: FileSpreadsheet },
  { href: '/finance/reports/aging', label: 'Долги', icon: TrendingUp },
  { href: '/finance/balances', label: 'Остатки', icon: Calculator },
]

const settingsItems = [
  { href: '/admin/users', label: 'Пользователи', icon: Users },
  { href: '/admin/roles', label: 'Роли', icon: Shield },
  { href: '/admin/audit', label: 'Аудит', icon: FileText },
]

const salesItems = [
  { href: '/sales/revenue', label: 'Выручка', icon: TrendingUp },
  { href: '/sales/suppliers', label: 'Поставщики', icon: Contact },
  { href: '/sales/customers', label: 'Клиенты', icon: UserCheck },
  { href: '/analysis/checks-by-hour', label: 'Чеки по часам', icon: FileSpreadsheet },
]

const dishesItems = [
  { href: '/sales/dishes', label: 'Меню', icon: FileSpreadsheet },
  { href: '/sales/purchasing', label: 'Закупки', icon: ShoppingCart },
  { href: '/settings/purchasing', label: 'Настройки закупок', icon: Settings },
]

const iikoItems = [
  { href: '/iiko/sales/summary', label: 'Сводка продаж', icon: FileSpreadsheet },
  { href: '/iiko/sales/paytypes', label: 'Продажи по оплатам', icon: FileSpreadsheet },
  // { href: '/iiko/sales/hours', label: 'Продажи по часам', icon: FileSpreadsheet },
  { href: '/iiko/sales/receipts', label: 'Чеки (по блюдам)', icon: FileSpreadsheet },
  { href: '/iiko/stores/balances', label: 'Остатки на складах', icon: ListTree },
  { href: '/iiko/stores/consumption', label: 'Расход за период', icon: ListTree },
  { href: '/iiko/recipes', label: 'Рецепты', icon: ChefHat },
  { href: '/iiko/returns', label: 'Возвраты', icon: FileText },
]

export function Sidebar() {
  const pathname = usePathname()
  const [openPersonnel, setOpenPersonnel] = useState(true)
  const [openFinance, setOpenFinance] = useState(false)
  const [openSales, setOpenSales] = useState(false)
  const [openDishes, setOpenDishes] = useState(false)
  const [openSettings, setOpenSettings] = useState(false)
  const [me, setMe] = useState<any>(null)
  const [openIiko, setOpenIiko] = useState(false)
  const [openImport, setOpenImport] = useState(false)

  const toggleExclusive = useCallback((section: 'personnel'|'finance'|'sales'|'dishes'|'settings'|'iiko'|'import') => {
    setOpenPersonnel(section === 'personnel')
    setOpenFinance(section === 'finance')
    setOpenSales(section === 'sales')
    setOpenDishes(section === 'dishes')
    setOpenSettings(section === 'settings')
    setOpenIiko(section === 'iiko')
    setOpenImport(section === 'import')
  }, [])

  const fetchMe = useCallback(async () => {
    try {
      const API_BASE = getApiBase()
      const r = await fetch(`${API_BASE}/api/auth/me`, { credentials: 'include' })
      const j = await r.json()
      let user = j?.user || null
      if (!user) {
        try {
          const cached = localStorage.getItem('me')
          if (cached) user = JSON.parse(cached)
        } catch {}
      }
      // Роли приходят в корне ответа, а не в user объекте
      if (user && j?.roles) {
        user.roles = j.roles
        // Кэшируем данные пользователя
        try {
          localStorage.setItem('me', JSON.stringify(user))
        } catch {}
      }
      setMe(user)
    } catch (e) {
      console.log('[sidebar] /me error', e)
      // При ошибке пытаемся загрузить из кэша
      try {
        const cached = localStorage.getItem('me')
        if (cached) {
          const user = JSON.parse(cached)
          setMe(user)
        }
      } catch {}
    }
  }, [])

  useEffect(() => {
    // Сначала пытаемся загрузить из кэша для быстрого отображения
    try {
      const cached = localStorage.getItem('me')
      if (cached) {
        const user = JSON.parse(cached)
        setMe(user)
      }
    } catch {}
    
    // Затем загружаем актуальные данные
    fetchMe()
  }, [])

  // Авто-раскрытие нужной секции в зависимости от текущего пути
  useEffect(() => {
    if (!pathname) return
    if (pathname.startsWith('/sales/dishes') || pathname.startsWith('/sales/purchasing')) {
      toggleExclusive('dishes')
    } else if (pathname.startsWith('/sales/') || pathname.startsWith('/analysis/')) {
      toggleExclusive('sales')
    } else if (pathname.startsWith('/finance/')) {
      toggleExclusive('finance')
    } else if (
      pathname.startsWith('/timesheets') ||
      pathname.startsWith('/adjustments') ||
      pathname.startsWith('/payouts') ||
      pathname.startsWith('/payroll') ||
      pathname.startsWith('/employees') ||
      pathname.startsWith('/positions')
    ) {
      toggleExclusive('personnel')
    } else if (pathname.startsWith('/iiko/')) {
      toggleExclusive('iiko')
    } else if (pathname.startsWith('/gsheets/') || pathname.startsWith('/iiko/import')) {
      toggleExclusive('import')
    } else if (pathname.startsWith('/admin/')) {
      toggleExclusive('settings')
    }
  }, [pathname, toggleExclusive])

  useEffect(() => {
    // Проверяем авторизацию только при возвращении фокуса, но не чаще чем раз в 60 секунд
    let lastCheck = 0
    const onFocus = () => {
      const now = Date.now()
      if (now - lastCheck > 60000) { // 60 секунд
        fetchMe()
        lastCheck = now
      }
    }
    const onVisibility = () => { 
      if (!document.hidden) {
        const now = Date.now()
        if (now - lastCheck > 60000) { // 60 секунд
          fetchMe()
          lastCheck = now
        }
      }
    }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      const API_BASE = getApiBase()
      await fetch(`${API_BASE}/api/auth/logout`, { method: 'POST', credentials: 'include' })
      setMe(null)
      // Очищаем кэш при выходе
      try {
        localStorage.removeItem('me')
      } catch {}
      if (typeof window !== 'undefined') window.location.href = '/'
    } catch {}
  }, [])

  const roles = useMemo(() => Array.isArray(me?.roles) ? me.roles : [], [me?.roles])
  
  // Используем утилитарную функцию для определения видимости
  const visibility = useMemo(() => getMenuVisibility(roles), [roles])
  const { visibleSales, visiblePersonnel, visibleFinance, visibleSettings } = visibility

  return (
    <aside className="w-[15%] min-w-[220px] border-r bg-card flex flex-col">
      <div className="p-4 flex items-center justify-start">
        <img src="/logo.png" alt="logo" className="h-12 w-auto" />
      </div>
      <nav className="p-2 space-y-2 flex-1">
        {visibleSales && (
        <div>
          <button
            type="button"
            className="w-full px-2 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between hover:text-foreground"
            onClick={() => toggleExclusive('sales')}
            aria-expanded={openSales}
          >
            <span className="ml-[5px]">Анализ</span>
            <ChevronDown className={`h-4 w-4 transition-transform ${openSales ? 'rotate-0' : '-rotate-90'}`} />
          </button>
          <div className={`space-y-1 mt-1 ${openSales ? '' : 'hidden'}`}>
            {salesItems.map(({ href, label, icon: Icon }) => {
              const active = pathname?.startsWith(href)
              return (
                <Button key={href} asChild variant={active ? 'secondary' : 'ghost'} className="w-full justify-start gap-2">
                  <Link href={href}>
                    <Icon size={18} />
                    {label}
                  </Link>
                </Button>
              )
            })}
          </div>
        </div>
        )}

        {visiblePersonnel && (
        <div>
          <button
            type="button"
            className="w-full px-2 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between hover:text-foreground"
            onClick={() => toggleExclusive('personnel')}
            aria-expanded={openPersonnel}
          >
            <span className="ml-[5px]">Персонал</span>
            <ChevronDown className={`h-4 w-4 transition-transform ${openPersonnel ? 'rotate-0' : '-rotate-90'}`} />
          </button>
          <div className={`space-y-1 mt-1 ${openPersonnel ? '' : 'hidden'}`}>
            {personnelItems.map(({ href, label, icon: Icon }) => {
              const active = pathname?.startsWith(href)
              return (
                <Button key={href} asChild variant={active ? 'secondary' : 'ghost'} className="w-full justify-start gap-2">
                  <Link href={href}>
                    <Icon size={18} />
                    {label}
                  </Link>
                </Button>
              )
            })}
          </div>
        </div>
        )}

               {visibleFinance && (
               <div>
                 <button
                   type="button"
                   className="w-full px-2 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between hover:text-foreground"
                   onClick={() => toggleExclusive('finance')}
                   aria-expanded={openFinance}
                 >
                   <span className="ml-[5px]">Финансы</span>
                   <ChevronDown className={`h-4 w-4 transition-transform ${openFinance ? 'rotate-0' : '-rotate-90'}`} />
                 </button>
                 <div className={`space-y-1 mt-1 ${openFinance ? '' : 'hidden'}`}>
                   {financeItems.map(({ href, label, icon: Icon }) => {
                     const active = pathname?.startsWith(href)
                     return (
                       <Button key={href} asChild variant={active ? 'secondary' : 'ghost'} className="w-full justify-start gap-2">
                         <Link href={href}>
                           <Icon size={18} />
                           {label}
                         </Link>
                       </Button>
                     )
                   })}
                 </div>
               </div>
               )}

               <div>
                 <button
                   type="button"
                   className="w-full px-2 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between hover:text-foreground"
                   onClick={() => toggleExclusive('dishes')}
                   aria-expanded={openDishes}
                 >
                   <span className="ml-[5px]">Блюда</span>
                   <ChevronDown className={`h-4 w-4 transition-transform ${openDishes ? 'rotate-0' : '-rotate-90'}`} />
                 </button>
                 <div className={`space-y-1 mt-1 ${openDishes ? '' : 'hidden'}`}>
                   {dishesItems.map(({ href, label, icon: Icon }) => {
                     const active = pathname?.startsWith(href)
                     return (
                       <Button key={href} asChild variant={active ? 'secondary' : 'ghost'} className="w-full justify-start gap-2">
                         <Link href={href}>
                           <Icon size={18} />
                           {label}
                         </Link>
                       </Button>
                     )
                   })}
                 </div>
               </div>

        <div>
          <button
            type="button"
            className="w-full px-2 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between hover:text-foreground"
            onClick={() => toggleExclusive('iiko')}
            aria-expanded={openIiko}
          >
            <span className="ml-[5px]">iiko</span>
            <ChevronDown className={`h-4 w-4 transition-transform ${openIiko ? 'rotate-0' : '-rotate-90'}`} />
          </button>
          <div className={`space-y-1 mt-1 ${openIiko ? '' : 'hidden'}`}>
            {iikoItems.map(({ href, label, icon: Icon }) => {
              const active = pathname?.startsWith(href)
              return (
                <Button key={href} asChild variant={active ? 'secondary' : 'ghost'} className="w-full justify-start gap-2">
                  <Link href={href}>
                    <Icon size={18} />
                    {label}
                  </Link>
                </Button>
              )
            })}
          </div>
        </div>

        <div>
          <button
            type="button"
            className="w-full px-2 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between hover:text-foreground"
            onClick={() => toggleExclusive('import')}
            aria-expanded={openImport}
          >
            <span className="ml-[5px]">Импорт данных</span>
            <ChevronDown className={`h-4 w-4 transition-transform ${openImport ? 'rotate-0' : '-rotate-90'}`} />
          </button>
          <div className={`space-y-1 mt-1 ${openImport ? '' : 'hidden'}`}>
            {[{ href: '/iiko/import', label: 'Загрузка данных из iiko', icon: Settings }, { href: '/gsheets/cashflow', label: 'Движение денег (Google)', icon: FileSpreadsheet }].map(({ href, label, icon: Icon }) => {
              const active = pathname?.startsWith(href)
              return (
                <Button key={href} asChild variant={active ? 'secondary' : 'ghost'} className="w-full justify-start gap-2">
                  <Link href={href}>
                    <Icon size={18} />
                    {label}
                  </Link>
                </Button>
              )
            })}
          </div>
        </div>

        {visibleSettings && (
        <div>
          <button
            type="button"
            className="w-full px-2 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between hover:text-foreground"
            onClick={() => toggleExclusive('settings')}
            aria-expanded={openSettings}
          >
            <span className="ml-[5px]">Настройки</span>
            <ChevronDown className={`h-4 w-4 transition-transform ${openSettings ? 'rotate-0' : '-rotate-90'}`} />
          </button>
          <div className={`space-y-1 mt-1 ${openSettings ? '' : 'hidden'}`}>
            {settingsItems.map(({ href, label, icon: Icon }) => {
              const active = pathname?.startsWith(href)
              return (
                <Button key={href} asChild variant={active ? 'secondary' : 'ghost'} className="w-full justify-start gap-2">
                  <Link href={href}>
                    <Icon size={18} />
                    {label}
                  </Link>
                </Button>
              )
            })}
          </div>
        </div>
        )}
      </nav>
      <div className="px-3 py-3 flex items-center justify-between min-h-[56px]">
        <div className="truncate leading-tight ml-1" title={me?.fullName || ''}>
          <div className="text-sm whitespace-pre-line">{me?.fullName || ''}</div>
        </div>
        <Button size="icon" variant="ghost" onClick={logout} aria-label="Выйти">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
        </Button>
      </div>
    </aside>
  )
}


