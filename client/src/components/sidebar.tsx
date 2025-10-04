"use client"
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Users, CalendarCheck2, Banknote, FileSpreadsheet, Settings, ChevronDown, Wallet, ListTree, ArrowLeftRight, Contact, FileText, Shield, Tags, TrendingUp, UserCheck, Calculator, ChefHat } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useEffect, useState } from 'react'

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
  { href: '/sales/dishes', label: 'Блюда', icon: FileSpreadsheet },
  { href: '/sales/suppliers', label: 'Поставщики', icon: Contact },
  { href: '/sales/customers', label: 'Клиенты', icon: UserCheck },
  { href: '/analysis/checks-by-hour', label: 'Чеки по часам', icon: FileSpreadsheet },
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
  const [openSettings, setOpenSettings] = useState(false)
  const [me, setMe] = useState<any>(null)
  const [openIiko, setOpenIiko] = useState(false)
  const [openImport, setOpenImport] = useState(false)

  async function fetchMe() {
    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000'
      console.log('[sidebar] fetching /me …')
      const r = await fetch(`${API_BASE}/api/auth/otp/me`, { credentials: 'include' })
      const j = await r.json()
      console.log('[sidebar] /me response:', j)
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
      }
      console.log('[sidebar] final user object:', user)
      console.log('[sidebar] user roles:', user?.roles)
      setMe(user)
    } catch (e) {
      console.log('[sidebar] /me error', e)
    }
  }

  useEffect(() => {
    fetchMe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  // Авто-раскрытие нужной секции в зависимости от текущего пути
  useEffect(() => {
    if (!pathname) return
    if (pathname.startsWith('/sales/')) {
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
  }, [pathname])

  useEffect(() => {
    const onFocus = () => fetchMe()
    const onVisibility = () => { if (!document.hidden) fetchMe() }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  async function logout() {
    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000'
      await fetch(`${API_BASE}/api/auth/otp/logout`, { method: 'POST', credentials: 'include' })
      setMe(null)
      if (typeof window !== 'undefined') window.location.href = '/login'
    } catch {}
  }

  function toggleExclusive(section: 'personnel'|'finance'|'sales'|'settings'|'iiko'|'import') {
    setOpenPersonnel(section === 'personnel')
    setOpenFinance(section === 'finance')
    setOpenSales(section === 'sales')
    setOpenSettings(section === 'settings')
    setOpenIiko(section === 'iiko')
    setOpenImport(section === 'import')
  }
  const roles: string[] = Array.isArray(me?.roles) ? me.roles : []
  const has = (r: string) => roles.includes(r)
  const isAdmin = has('ADMIN')
  
  console.log('[sidebar] me object:', me)
  console.log('[sidebar] roles array:', roles)
  console.log('[sidebar] isAdmin:', isAdmin)
  
  // Для админа показываем всё, для остальных - по ролям
  const visibleSales = isAdmin || has('SALES') || has('OWNER')
  const visiblePersonnel = isAdmin || has('HR') || has('OWNER')
  const visibleFinance = isAdmin || has('FINANCE') || has('OWNER')
  const visibleSettings = isAdmin
  
  console.log('[sidebar] visibility:', { visibleSales, visiblePersonnel, visibleFinance, visibleSettings })

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


