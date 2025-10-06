import { getApiBase } from '../../lib/api'
"use client"

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu'
// import { fetchWithRole } from '@/lib/utils' // Устарело, используем credentials: 'include'

type TreeProps = {
  nodes: any[]
  onSelect: (n: any) => void
  selectedId?: string | null
  expanded: Set<string>
  onToggle: (id: string) => void
  activity: 'OPERATING'|'FINANCING'|'INVESTING'
  sectionRootIds: Set<string>
  payrollId?: string
  onDeleteNode: (n: any) => void
}

function Tree({ nodes, onSelect, selectedId, expanded, onToggle, activity, sectionRootIds, payrollId, onDeleteNode }: TreeProps) {
  return (
    <ul className="pl-2 space-y-1">
      {nodes.map((n) => {
        const hasChildren = Array.isArray(n.children) && n.children.length > 0
        const isOpen = expanded.has(n.id)
        const isCategory = n.parentId == null
        const isSystem = payrollId ? (n.id === payrollId || n.parentId === payrollId) : false
        return (
          <li key={n.id}>
            <div className="flex items-center gap-1 group hover:bg-accent/20 rounded px-1 py-0.5">
              {isCategory ? (
                <button
                  type="button"
                  className="w-5 h-5 inline-flex items-center justify-center rounded hover:bg-accent/40 text-sm"
                  aria-label={isOpen ? 'Свернуть' : 'Развернуть'}
                  onClick={() => onToggle(n.id)}
                >
                  {isOpen ? '−' : '+'}
                </button>
              ) : (
                <span className="w-5" />
              )}
              <button
                className={`text-left flex-1 px-2 py-1 rounded ${selectedId === n.id ? 'bg-accent' : ''} flex items-center gap-2`}
                onClick={() => onSelect(n)}
              >
                <span>{n.name}</span>
                {n.kind && (
                  <span className={`text-xs px-1.5 py-0.5 rounded font-mono ${
                    n.kind === 'COGS' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                    n.kind === 'OPEX' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                    n.kind === 'CAPEX' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
                    n.kind === 'TAX' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                    n.kind === 'FEE' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                    'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
                  }`}>
                    {n.kind}
                  </span>
                )}
              </button>
              {!isSystem && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity" aria-label="Операции">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onDeleteNode(n)}>Удалить</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
            {hasChildren && isOpen ? (
              <div className="pl-6">
                <Tree nodes={n.children} onSelect={onSelect} selectedId={selectedId} expanded={expanded} onToggle={onToggle} activity={activity} sectionRootIds={sectionRootIds} payrollId={payrollId} onDeleteNode={onDeleteNode} />
              </div>
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}

function filterTreeByActivity(nodes: any[], activity: 'OPERATING'|'FINANCING'|'INVESTING'): any[] {
  function dfs(list: any[]): any[] {
    const res: any[] = []
    for (const n of list || []) {
      const kids = dfs(n.children || [])
      if (n.activity === activity) {
        res.push({ ...n, children: kids })
      } else if (kids.length) {
        res.push(...kids)
      }
    }
    return res
  }
  return dfs(nodes)
}

function findSubtreeByName(nodes: any[], name: string): any | null {
  for (const n of nodes) {
    if (n.name === name) return n
    const child = findSubtreeByName(n.children || [], name)
    if (child) return child
  }
  return null
}
function findDirectChildByName(node: any | null, name: string): any | null {
  if (!node) return null
  for (const c of node.children || []) if (c.name === name) return c
  return null
}
function findAllByName(nodes: any[], name: string): any[] {
  const res: any[] = []
  function dfs(list: any[]) {
    for (const n of list || []) {
      if (n.name === name) res.push(n)
      if (n.children?.length) dfs(n.children)
    }
  }
  dfs(nodes)
  return res
}
function findNodeById(nodes: any[], id: string): any | null {
  for (const n of nodes) {
    if (n.id === id) return n
    const child = findNodeById(n.children || [], id)
    if (child) return child
  }
  return null
}
function isDescendant(nodes: any[], nodeId: string, ancestorId: string): boolean {
  let cur = findNodeById(nodes, nodeId)
  while (cur && cur.parentId) {
    if (cur.parentId === ancestorId) return true
    cur = findNodeById(nodes, cur.parentId)
  }
  return false
}

function collectIds(node: any, set: Set<string>) {
  if (!node) return
  set.add(node.id)
  for (const c of node.children || []) collectIds(c, set)
}
function collectIdsFromList(list: any[]): Set<string> {
  const s = new Set<string>()
  for (const n of list || []) collectIds(n, s)
  return s
}
function collectAllIds(list: any[]): Set<string> {
  // Собирает ID всех узлов во всём дереве/списке корней
  return collectIdsFromList(list)
}

export default function CategoriesClient({ initialCategories }: { initialCategories: any[] }) {
  const [categories, setCategories] = useState<any[]>(initialCategories)
  const [selected, setSelected] = useState<any | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [activeActivity, setActiveActivity] = useState<'OPERATING'|'FINANCING'|'INVESTING'>('OPERATING')
  const [nameInput, setNameInput] = useState('')
  const [operSection, setOperSection] = useState<'REVENUE'|'COGS'|'OPEX'>('REVENUE')
  const [catChoice, setCatChoice] = useState<'create'|string>('create')
  const [fundChoice, setFundChoice] = useState<string>('none')
  const [kindChoice, setKindChoice] = useState<string>('none')
  const [activityChoice, setActivityChoice] = useState<'OPERATING'|'FINANCING'|'INVESTING'>('OPERATING')
  const [availableFunds, setAvailableFunds] = useState<string[]>([])
  const [showChildWarn, setShowChildWarn] = useState(false)
  const [showTransfer, setShowTransfer] = useState<{ open: boolean; count: number }>({ open: false, count: 0 })
  const [transferTarget, setTransferTarget] = useState<string>('')
  const [expandMode, setExpandMode] = useState<'EXPANDED'|'COLLAPSED'>('EXPANDED')
  const [payrollEnsured, setPayrollEnsured] = useState(false)
  const [payrollEnsuring, setPayrollEnsuring] = useState(false)
  const API_BASE = getApiBase()
  const ENABLE_AUTO_PAYROLL_FIX = process.env.NEXT_PUBLIC_ENABLE_AUTO_PAYROLL_FIX === '1'

  // Набор раскрытых узлов
  const initialExpanded = useMemo(() => {
    const set = new Set<string>()
    function markParents(list: any[]) {
      for (const n of list) {
        if (n.children?.length) set.add(n.id)
        if (n.children?.length) markParents(n.children)
      }
    }
    markParents(categories)
    return set
  }, [categories])
  const [expanded, setExpanded] = useState<Set<string>>(initialExpanded)

  function toggleNode(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function applyExpandMode(mode: 'EXPANDED'|'COLLAPSED') {
    setExpandMode(mode)
    const tree = treeForTab
    if (mode === 'EXPANDED') setExpanded(collectAllIds(tree))
    else setExpanded(new Set())
  }

  async function refresh() {
    const res = await fetch(`${API_BASE}/api/categories`, { credentials: 'include' }, { credentials: 'include' })
    const json = await res.json()
    setCategories(json.items || [])
  }

  async function loadFunds() {
    try {
      const res = await fetch(`${API_BASE}/api/categories/funds`, { cache: 'no-store', credentials: 'include' })
      const json = await res.json()
      setAvailableFunds(json.funds || [])
    } catch (e) {
      console.error('Failed to load funds', e)
      setAvailableFunds([])
    }
  }

  function onSelectNode(n: any) {
    setSelected(n)
    setEditingId(n.id)
    setNameInput(n.name)
    // Фонд показывается только для статей (есть parentId)
    setFundChoice(n.parentId ? (n.fund || 'none') : 'none')
    // Kind показывается для категорий (есть kind)
    setKindChoice(n.kind || 'none')
    // Устанавливаем категорию для редактирования
    setCatChoice(n.parentId || 'create')
    // activity
    if (typeof n.activity === 'string') {
      setActiveActivity(n.activity)
      setActivityChoice(n.activity)
    }
    // section for OPERATING
    if (n.activity === 'OPERATING') {
      const revId = revenueRoot?.id
      const cogsId = cogsRoot?.id
      const opexId = opexRoot?.id
      if (revId && isDescendant(categories, n.id, revId)) setOperSection('REVENUE')
      else if (cogsId && isDescendant(categories, n.id, cogsId)) setOperSection('COGS')
      else setOperSection('OPEX')
      // catChoice: для статей — всегда родительская категория (включая корни-разделы), для категорий — create
      if (n.parentId) setCatChoice(n.parentId)
      else setCatChoice('create')
    } else {
      // FINANCING/INVESTING: catChoice — родитель (если есть), иначе create
      if (n.parentId) setCatChoice(n.parentId)
      else setCatChoice('create')
    }
  }

  function onDeleteNode(n: any) {
    setSelected(n)
    setEditingId(n.id)
    remove()
  }

  async function remove() {
    if (!selected) return
    const res = await fetch(`${API_BASE}/api/categories/${selected.id}`, { method: 'DELETE', credentials: 'include', credentials: 'include' })
    if (res.ok) {
      setSelected(null)
      setEditingId(null)
      await refresh()
      return
    }
    let payload: any = null
    try { payload = await res.json() } catch {}
    if (res.status === 400 && payload?.error === 'has_children') {
      setShowChildWarn(true)
      return
    }
    if (res.status === 409 && payload?.error === 'has_transactions') {
      setShowTransfer({ open: true, count: Number(payload?.count || 0) })
      setTransferTarget('')
      return
    }
  }

  async function confirmTransfer() {
    if (!selected || !transferTarget) return
    await fetch(`${API_BASE}/api/categories/${selected.id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ moveToCategoryId: transferTarget })
    })
    setShowTransfer({ open: false, count: 0 })
    setSelected(null)
    setTransferTarget('')
    await refresh()
  }

  const treeForTab = useMemo(() => filterTreeByActivity(categories, activeActivity), [categories, activeActivity])

  // Для OPERATING — определить корни разделов
  const revenueRoot = useMemo(() => findSubtreeByName(treeForTab, 'Выручка') || findSubtreeByName(treeForTab, 'Выручка зал'), [treeForTab])
  const cogsRoot = useMemo(() => findSubtreeByName(treeForTab, 'Себестоимость') || findSubtreeByName(treeForTab, 'Сырьё и материалы'), [treeForTab])
  const opexRoot = useMemo(() => findSubtreeByName(treeForTab, 'Операционные расходы'), [treeForTab])
  
  // Собираем все корневые категории по kind для показа под разделами
  const cogsCategoriesFromRoots = useMemo(() => {
    return treeForTab.filter((n: any) => n.kind === 'COGS' && !n.parentId)
  }, [treeForTab])
  
  const opexCategoriesFromRoots = useMemo(() => {
    return treeForTab.filter((n: any) => (n.kind === 'OPEX' || n.kind === 'TAX' || n.kind === 'FEE' || n.kind === 'OTHER') && !n.parentId)
  }, [treeForTab])

  const payrollCat = useMemo(() => findDirectChildByName(opexRoot || null, 'Заработная плата'), [opexRoot])
  const isSystemById = (id: string) => {
    const n = findNodeById(categories, id)
    if (!n || !payrollCat) return false
    return n.id === payrollCat.id || n.parentId === payrollCat.id
  }

  async function ensurePayrollSystemCategoryAndArticles() {
    if (activeActivity !== 'OPERATING') return
    if (payrollEnsuring) return
    setPayrollEnsuring(true)
    try {
    // Берём всегда свежие данные из API, не из локального state
    const fetchFresh = async () => {
      const r = await fetch(`${API_BASE}/api/categories`, { credentials: 'include' }, { credentials: 'include' })
      const j = await r.json()
      return (j.items || []) as any[]
    }
    let fresh = await fetchFresh()
    let operatingTree = filterTreeByActivity(fresh, 'OPERATING')

    // Убедимся, что есть «Операционные расходы»
    let freshOpex = findSubtreeByName(operatingTree, 'Операционные расходы')
    if (!freshOpex) {
      await fetch(`${API_BASE}/api/categories`, { credentials: 'include' }, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Операционные расходы', type: 'expense', activity: 'OPERATING', parentId: null })
      })
      fresh = await fetchFresh()
      operatingTree = filterTreeByActivity(fresh, 'OPERATING')
      freshOpex = findSubtreeByName(operatingTree, 'Операционные расходы')
    }
    if (!freshOpex) return

    // Найти/создать «Заработная плата» под Операционными расходами
    let payrollCat = findDirectChildByName(freshOpex, 'Заработная плата')
    if (!payrollCat) {
      await fetch(`${API_BASE}/api/categories`, { credentials: 'include' }, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Заработная плата', type: 'expense', activity: 'OPERATING', parentId: freshOpex.id })
      })
      fresh = await fetchFresh()
      operatingTree = filterTreeByActivity(fresh, 'OPERATING')
      freshOpex = findSubtreeByName(operatingTree, 'Операционные расходы')
      payrollCat = findDirectChildByName(freshOpex, 'Заработная плата')
    }
    if (!payrollCat) return

    // Дедупликация: если есть другие «Заработная плата» вне freshOpex — переносим всё в каноническую
    const allPayroll = findAllByName(operatingTree, 'Заработная плата')
    const canonicalId = payrollCat.id
    for (const node of allPayroll) {
      if (node.id === canonicalId) continue
      // Перенос дочерних статей в каноническую
      for (const ch of node.children || []) {
        await fetch(`${API_BASE}/api/categories/${ch.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ parentId: canonicalId })
        })
      }
      // Удаляем дубль с переносом транзакций
      await fetch(`${API_BASE}/api/categories/${node.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moveToCategoryId: canonicalId })
      })
    }

    // Перезагрузим, чтобы иметь актуальный список статей внутри канонической «Заработная плата»
    fresh = await fetchFresh()
    operatingTree = filterTreeByActivity(fresh, 'OPERATING')
    freshOpex = findSubtreeByName(operatingTree, 'Операционные расходы')
    payrollCat = findDirectChildByName(freshOpex, 'Заработная плата')
    if (!payrollCat) return

    // Дедупликация статей по имени внутри «Заработная плата»
    const groups: Record<string, any[]> = {}
    for (const ch of payrollCat.children || []) {
      groups[ch.name] = groups[ch.name] || []
      groups[ch.name].push(ch)
    }
    for (const name of Object.keys(groups)) {
      const arr = groups[name]
      if (arr.length <= 1) continue
      const keep = arr[0]
      for (const dup of arr.slice(1)) {
        // Перенос возможных детей дубликата (на всякий случай)
        for (const g of dup.children || []) {
          await fetch(`${API_BASE}/api/categories/${g.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ parentId: keep.id })
          })
        }
        // Удаление дубликата с переносом транзакций
        await fetch(`${API_BASE}/api/categories/${dup.id}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ moveToCategoryId: keep.id })
        })
      }
    }

    // Ещё раз получим актуальные статьи, чтобы не создать дубликаты
    fresh = await fetchFresh()
    operatingTree = filterTreeByActivity(fresh, 'OPERATING')
    freshOpex = findSubtreeByName(operatingTree, 'Операционные расходы')
    payrollCat = findDirectChildByName(freshOpex, 'Заработная плата')
    if (!payrollCat) return

    // Статьи-блоки внутри «Заработная плата» (без дублей)
    const blocks = ['Кухня', 'Зал', 'Офис', 'Бар', 'Операторы']
    const existingNames = new Set((payrollCat.children || []).map((c: any) => c.name))
    for (const name of blocks) {
      if (!existingNames.has(name)) {
        await fetch(`${API_BASE}/api/categories`, { credentials: 'include' }, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, type: 'expense', activity: 'OPERATING', parentId: payrollCat.id })
        })
      }
    }
    await refresh()
    } catch (e) {
      console.error('ensurePayrollSystemCategoryAndArticles failed', e)
    } finally {
      setPayrollEnsuring(false)
    }
  }

  useEffect(() => {
    if (!ENABLE_AUTO_PAYROLL_FIX) return
    if (!payrollEnsured && activeActivity === 'OPERATING') {
      ensurePayrollSystemCategoryAndArticles().finally(() => setPayrollEnsured(true))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payrollEnsured, activeActivity, ENABLE_AUTO_PAYROLL_FIX])

  useEffect(() => {
    loadFunds()
  }, [])

  async function createFundCategories() {
    if (!availableFunds.length) return
    
    // Определяем тип и активность для каждого фонда
    const fundMappings: Record<string, { type: 'expense' | 'income', activity: 'OPERATING' | 'INVESTING' | 'FINANCING' }> = {
      'ВЫРУЧКА': { type: 'income', activity: 'OPERATING' },
      'Эквайринг (процент)': { type: 'expense', activity: 'OPERATING' },
      'Комиссия банка': { type: 'expense', activity: 'OPERATING' },
      'ЗП курьеры': { type: 'expense', activity: 'OPERATING' },
      'ЗП кухня': { type: 'expense', activity: 'OPERATING' },
      'ЗП посуда': { type: 'expense', activity: 'OPERATING' },
      'ЗП гардеробщик': { type: 'expense', activity: 'OPERATING' },
      'ЗП офис': { type: 'expense', activity: 'OPERATING' },
      'Еда под ЗП': { type: 'expense', activity: 'OPERATING' },
      'Расходы на такси': { type: 'expense', activity: 'OPERATING' },
      'Вебсайт': { type: 'expense', activity: 'OPERATING' },
      'Консалтинг / обучение': { type: 'expense', activity: 'OPERATING' },
      'Подарки персоналу / дни рождения': { type: 'expense', activity: 'OPERATING' },
      'Выбытие - Перевод между счетами': { type: 'expense', activity: 'OPERATING' },
      'Поступление - Перевод между счетами': { type: 'income', activity: 'OPERATING' }
    }

    // Создаем категории для каждого фонда
    for (const fund of availableFunds) {
      const mapping = fundMappings[fund] || { type: 'expense', activity: 'OPERATING' }
      
      // Проверяем, существует ли уже категория с таким фондом
      const existing = categories.find(cat => cat.fund === fund)
      if (existing) continue

      try {
        await fetch(`${API_BASE}/api/categories`, { credentials: 'include' }, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: fund,
            type: mapping.type,
            activity: mapping.activity,
            parentId: null,
            fund: fund
          })
        })
      } catch (e) {
        console.error(`Failed to create category for fund ${fund}:`, e)
      }
    }
    
    await refresh()
  }

  // Для OPERATING — вычисления вспом. наборов
  const usedIdsSet = useMemo(() => { const s = new Set<string>(); if (revenueRoot) collectIds(revenueRoot, s); if (cogsRoot) collectIds(cogsRoot, s); return s }, [revenueRoot, cogsRoot])
  const opexRoots = useMemo(() => {
    if (activeActivity !== 'OPERATING') return []
    // верхнеуровневые корни, не входящие в revenue/cogs И не имеющие kind (те что с kind показываются через cogsCombinedList/opexCombinedList)
    return treeForTab.filter(n => !usedIdsSet.has(n.id) && !n.kind)
  }, [treeForTab, activeActivity, usedIdsSet])

  const cogsCombinedList = useMemo(() => {
    // дети корневого «Себестоимость» + корневые категории с kind=COGS
    const children = cogsRoot?.children || []
    const combined = [...children, ...cogsCategoriesFromRoots]
    // Убираем дубликаты по id
    const seen = new Set<string>()
    return combined.filter(n => {
      if (seen.has(n.id)) return false
      seen.add(n.id)
      return true
    })
  }, [cogsRoot, cogsCategoriesFromRoots])

  const opexCombinedList = useMemo(() => {
    // дети корневого «Операционные расходы» + корневые категории с kind=OPEX/TAX/FEE/OTHER
    const children = opexRoot?.children || []
    const others = opexRoots.filter(n => n.id !== opexRoot?.id)
    const combined = [...children, ...others, ...opexCategoriesFromRoots]
    // Если есть «Заработная плата» и под корнем, и как верхнеуровневая — показываем только под корнем
    const hasUnderRoot = combined.some(n => n.name === 'Заработная плата' && n.parentId === opexRoot?.id)
    if (!hasUnderRoot) return combined
    return combined.filter(n => n.name !== 'Заработная плата' || n.parentId === opexRoot?.id)
  }, [opexRoot, opexRoots, opexCategoriesFromRoots])

  // Допустимые цели переноса в пределах того же раздела/вида деятельности
  const allowedTransferIds = useMemo(() => {
    if (!selected) return new Set<string>()
    if (selected.activity === 'OPERATING') {
      const revId = revenueRoot?.id
      const cogsId = cogsRoot?.id
      const opxId = opexRoot?.id
      const set = new Set<string>()
      if (revId && isDescendant(categories, selected.id, revId)) {
        if (revenueRoot) collectIds(revenueRoot, set)
      } else if (cogsId && isDescendant(categories, selected.id, cogsId)) {
        if (cogsRoot) collectIds(cogsRoot, set)
      } else {
        if (opexRoot) collectIds(opexRoot, set)
        else {
          for (const r of opexRoots) collectIds(r, set)
        }
        // также включаем прежние верхнеуровневые «операционные», если есть
        for (const r of opexRoots) collectIds(r, set)
      }
      return set
    }
    // FINANCING / INVESTING — все в рамках того же activity
    return collectIdsFromList(filterTreeByActivity(categories, selected.activity))
  }, [selected, categories, revenueRoot, cogsRoot, opexRoot, opexRoots])

  const sectionRootIds = useMemo(() => new Set<string>([revenueRoot?.id, cogsRoot?.id, opexRoot?.id].filter(Boolean) as string[]), [revenueRoot, cogsRoot, opexRoot])

  // Список категорий для выбора родителя статьи: показываем ВСЕ корневые категории выбранного вида деятельности
  const categoryOptionsForSection = useMemo(() => {
    return (treeForTab || []).filter((n: any) => n.parentId == null)
  }, [treeForTab])

  // Для OPERATING/OPEX исключаем системные из списка выбора родителя
  const filteredCategoryOptionsForSection = useMemo(() => {
    if (activeActivity === 'OPERATING' && operSection === 'OPEX') {
      return categoryOptionsForSection.filter(n => !(payrollCat && (n.id === payrollCat.id || n.parentId === payrollCat.id)))
    }
    return categoryOptionsForSection
  }, [activeActivity, operSection, payrollCat, categoryOptionsForSection])

  async function ensureOperatingSectionRoot(section: 'REVENUE'|'COGS'|'OPEX'): Promise<string> {
    let existing: any | null = null
    let name = ''
    let type: 'expense'|'income' = 'expense'
    if (section === 'REVENUE') {
      existing = revenueRoot
      name = 'Выручка'
      type = 'income'
    } else if (section === 'COGS') {
      existing = cogsRoot
      name = 'Себестоимость'
      type = 'expense'
    } else {
      existing = opexRoot
      name = 'Операционные расходы'
      type = 'expense'
    }
    if (existing) return existing.id
    const res = await fetch(`${API_BASE}/api/categories`, { credentials: 'include' }, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, type, activity: 'OPERATING', parentId: null })
    })
    const json = await res.json()
    await refresh()
    return json?.data?.id
  }

  async function smartCreate() {
    // Категория создаётся под корневым узлом выбранного раздела.
    // Статья создаётся внутри выбранной категории, тип наследуется от родителя.
    const activity: 'OPERATING'|'FINANCING'|'INVESTING' = activeActivity
    let type: 'expense'|'income' = 'expense'
    let parentId: string | null = null

    if (activity === 'OPERATING') {
      if (catChoice === 'create') {
        // Определяем раздел на основе kind
        let section = operSection
        if (kindChoice === 'COGS') {
          section = 'COGS'
        } else if (kindChoice === 'OPEX' || kindChoice === 'TAX' || kindChoice === 'FEE' || kindChoice === 'OTHER') {
          section = 'OPEX'
        }
        
        const sectionRootId = await ensureOperatingSectionRoot(section)
        parentId = sectionRootId
        type = section === 'REVENUE' ? 'income' : 'expense'
      } else {
        parentId = String(catChoice)
        const parentNode = findNodeById(categories, parentId)
        type = parentNode?.type === 'income' ? 'income' : 'expense'
      }
    } else {
      if (catChoice === 'create') {
        parentId = null
        type = 'expense'
      } else {
        parentId = String(catChoice)
        const parentNode = findNodeById(categories, parentId)
        type = parentNode?.type === 'income' ? 'income' : 'expense'
      }
    }

    // Фонд можно привязать только к статьям (когда есть parentId)
    const fund = parentId ? (fundChoice === 'none' ? null : fundChoice) : null
    // Kind для категорий (когда нет fund)
    const kind = !fund && kindChoice !== 'none' ? kindChoice : null

        await fetch(`${API_BASE}/api/categories`, { credentials: 'include' }, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: nameInput.trim(), type, activity, parentId, fund, kind })
    })
    await refresh()
    setNameInput('')
  }

  async function smartSave() {
    if (editingId) {
      // Режим редактирования — обновляем имя, фонд, kind, activity и parentId
      const selectedNode = findNodeById(categories, editingId)
      const fund = selectedNode?.parentId ? (fundChoice === 'none' ? null : fundChoice) : null
      const kind = kindChoice === 'none' ? null : kindChoice
      const parentId = catChoice === 'create' ? null : catChoice
      
      await fetch(`${API_BASE}/api/categories/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: nameInput.trim(), fund, kind, activity: activityChoice, parentId })
      })
      await refresh()
    } else {
      await smartCreate()
    }
  }

  function resetToCreate() {
    setSelected(null)
    setEditingId(null)
    setNameInput('')
    setCatChoice('create')
    setFundChoice('none')
    setKindChoice('none')
    setActivityChoice('OPERATING')
  }

  // Select options helpers
  const sectionLabel = (s: 'REVENUE'|'COGS'|'OPEX') => s === 'REVENUE' ? 'Выручка' : s === 'COGS' ? 'Себестоимость' : 'Операционные расходы'

  const flatForParent = useMemo(() => {
    const acc: any[] = []
    function walk(list: any[], depth = 0) {
      list.forEach(n => { acc.push({ id: n.id, name: `${'— '.repeat(depth)}${n.name}` }); if (n.children?.length) walk(n.children, depth+1) })
    }
    walk(categories)
    return acc
  }, [categories])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-2">
        <CardContent className="p-4 flex flex-col h-[calc(100vh-4rem)] min-h-0">
          <div className="mb-2 flex items-center justify-between gap-3">
            <Tabs value={activeActivity} onValueChange={(v) => setActiveActivity(v as any)}>
              <TabsList>
                <TabsTrigger value="OPERATING">Операционная</TabsTrigger>
                <TabsTrigger value="FINANCING">Финансовая</TabsTrigger>
                <TabsTrigger value="INVESTING">Инвестиционная</TabsTrigger>
              </TabsList>
            </Tabs>
            <Tabs value={expandMode} onValueChange={(v) => applyExpandMode(v as any)}>
              <TabsList>
                <TabsTrigger value="COLLAPSED">Свернуть</TabsTrigger>
                <TabsTrigger value="EXPANDED">Развернуть</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <div className="flex-1 overflow-auto space-y-3">
            {activeActivity !== 'OPERATING' ? (
              <Tree
                nodes={treeForTab}
                onSelect={onSelectNode}
                selectedId={selected?.id}
                expanded={expanded}
                onToggle={toggleNode}
                activity={activeActivity}
                sectionRootIds={new Set()}
                payrollId={undefined}
                onDeleteNode={onDeleteNode}
              />
            ) : (
              <>
                <div>
                  <div className="px-2 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Выручка</div>
                  {revenueRoot ? (
                    <Tree
                      nodes={[revenueRoot]}
                      onSelect={onSelectNode}
                      selectedId={selected?.id}
                      expanded={expanded}
                      onToggle={toggleNode}
                      activity={activeActivity}
                      sectionRootIds={new Set([revenueRoot.id, cogsRoot?.id, opexRoot?.id].filter(Boolean) as string[])}
                      payrollId={payrollCat?.id}
                      onDeleteNode={onDeleteNode}
                    />
                  ) : (
                    <div className="px-2 text-sm text-muted-foreground">(пусто)</div>
                  )}
                </div>
                <div>
                  <div className="px-2 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Себестоимость</div>
                  {cogsRoot ? (
                    <Tree
                      nodes={[cogsRoot]}
                      onSelect={onSelectNode}
                      selectedId={selected?.id}
                      expanded={expanded}
                      onToggle={toggleNode}
                      activity={activeActivity}
                      sectionRootIds={new Set([revenueRoot?.id, cogsRoot?.id, opexRoot?.id].filter(Boolean) as string[])}
                      payrollId={payrollCat?.id}
                      onDeleteNode={onDeleteNode}
                    />
                  ) : (
                    <div className="px-2 text-sm text-muted-foreground">(пусто)</div>
                  )}
                </div>
                <div>
                  <div className="px-2 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Операционные расходы</div>
                  {opexCombinedList.length ? (
                    <Tree
                      nodes={opexCombinedList}
                      onSelect={onSelectNode}
                      selectedId={selected?.id}
                      expanded={expanded}
                      onToggle={toggleNode}
                      activity={activeActivity}
                      sectionRootIds={new Set([revenueRoot?.id, cogsRoot?.id, opexRoot?.id].filter(Boolean) as string[])}
                      payrollId={payrollCat?.id}
                      onDeleteNode={onDeleteNode}
                    />
                  ) : (
                    <div className="px-2 text-sm text-muted-foreground">(пусто)</div>
                  )}
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
      <Card className="self-start">
        <CardContent className="p-4 space-y-3">
          {/* 1. Вид деятельности - ПЕРВОЕ ПОЛЕ */}
          <Select 
            value={editingId ? activityChoice : activeActivity} 
            onValueChange={(v) => {
              const val = v as 'OPERATING'|'FINANCING'|'INVESTING'
              if (editingId) {
                setActivityChoice(val)
              } else {
                setActiveActivity(val)
              }
            }}
          >
            <SelectTrigger><SelectValue placeholder="Вид деятельности" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="OPERATING">Операционная</SelectItem>
              <SelectItem value="FINANCING">Финансовая</SelectItem>
              <SelectItem value="INVESTING">Инвестиционная</SelectItem>
            </SelectContent>
          </Select>

          {/* 2. Kind (COGS/OPEX/etc) — только для категорий (root) или при создании категории */}
          {((!editingId && catChoice === 'create') || (editingId && selected?.parentId == null)) && (
            <Select value={kindChoice} onValueChange={(v) => {
              setKindChoice(v)
              if (!editingId && activeActivity === 'OPERATING') {
                if (v === 'COGS') setOperSection('COGS')
                else if (v === 'OPEX' || v === 'TAX' || v === 'FEE' || v === 'OTHER') setOperSection('OPEX')
              }
            }}>
              <SelectTrigger><SelectValue placeholder="Тип (kind)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Без типа</SelectItem>
                <SelectItem value="COGS">COGS (Себестоимость)</SelectItem>
                <SelectItem value="OPEX">OPEX (Операционные расходы)</SelectItem>
                <SelectItem value="CAPEX">CAPEX (Капитальные расходы)</SelectItem>
                <SelectItem value="TAX">TAX (Налоги)</SelectItem>
                <SelectItem value="FEE">FEE (Комиссии)</SelectItem>
                <SelectItem value="OTHER">OTHER (Прочее)</SelectItem>
              </SelectContent>
            </Select>
          )}

          {/* 3. Раздел (REVENUE/COGS/OPEX) - только для операционной деятельности при создании */}
          {!editingId && activeActivity === 'OPERATING' && (
            <Select value={operSection} onValueChange={(v) => { setOperSection(v as any); setCatChoice('create') }}>
              <SelectTrigger><SelectValue placeholder="Раздел" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="REVENUE">Выручка</SelectItem>
                <SelectItem value="COGS">Себестоимость</SelectItem>
                <SelectItem value="OPEX">Операционные расходы</SelectItem>
              </SelectContent>
            </Select>
          )}

          {/* 4. Категория (родитель) */}
          <Select value={catChoice} onValueChange={(v) => setCatChoice(v as any)}>
            <SelectTrigger><SelectValue placeholder="Категория" /></SelectTrigger>
            <SelectContent className="max-h-60 overflow-auto">
              <SelectItem value="create">Создать категорию</SelectItem>
              {filteredCategoryOptionsForSection.map((c: any) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* 5. Название */}
          <Input placeholder="Название" value={nameInput} onChange={e => setNameInput(e.target.value)} />

          {/* 6. Фонд - показывается только для статей (когда выбрана конкретная категория) */}
          {catChoice !== 'create' && (
            <Select value={fundChoice} onValueChange={(v) => setFundChoice(v)}>
              <SelectTrigger><SelectValue placeholder="Фонд (опционально)" /></SelectTrigger>
              <SelectContent className="max-h-60 overflow-auto">
                <SelectItem value="none">Без фонда</SelectItem>
                {availableFunds.map((fund) => (
                  <SelectItem key={fund} value={fund}>{fund}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <div className="flex gap-2">
            <Button onClick={smartSave} disabled={!nameInput.trim()}>{editingId ? 'Сохранить' : 'Сохранить'}</Button>
            <Button variant="secondary" onClick={resetToCreate}>Новая</Button>
          </div>
        </CardContent>
      </Card>

      {/* Модал: нельзя удалить — есть дочерние */}
      {showChildWarn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowChildWarn(false)} />
          <div className="relative bg-card border rounded-md p-4 w-[420px] shadow-lg">
            <div className="text-base font-semibold mb-2">Удаление невозможно</div>
            <div className="text-sm text-muted-foreground mb-4">Нельзя удалить категорию: есть вложенные статьи. Сначала удалите или перенесите дочерние статьи.</div>
            <div className="flex justify-end gap-2">
              <Button onClick={() => setShowChildWarn(false)}>Понятно</Button>
            </div>
          </div>
        </div>
      )}

      {/* Модал: есть транзакции — перенос */}
      {showTransfer.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowTransfer({ open: false, count: 0 })} />
          <div className="relative bg-card border rounded-md p-4 w-[520px] shadow-lg space-y-3">
            <div className="text-base font-semibold">Перенос операций</div>
            <div className="text-sm text-muted-foreground">По этой статье найдено операций: {showTransfer.count}. Выберите статью, на которую их перенести:</div>
            <Select value={transferTarget || 'none'} onValueChange={(v) => setTransferTarget(v === 'none' ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="Статья назначения" /></SelectTrigger>
              <SelectContent className="max-h-60 overflow-auto">
                <SelectItem value="none">Выберите статью</SelectItem>
                {flatForParent
                  .filter((c) => c.id !== selected?.id)
                  .filter((c) => allowedTransferIds.has(c.id))
                  .filter((c) => !sectionRootIds.has(c.id))
                  .filter((c) => !isSystemById(c.id))
                  .map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
              </SelectContent>
            </Select>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setShowTransfer({ open: false, count: 0 })}>Отмена</Button>
              <Button disabled={!transferTarget} onClick={confirmTransfer}>Перенести и удалить</Button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
