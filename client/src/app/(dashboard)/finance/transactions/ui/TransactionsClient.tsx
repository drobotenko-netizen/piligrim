"use client"

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { MoreHorizontal } from 'lucide-react'
import { api } from '@/lib/api-client'

const MONTHS = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь']

export default function TransactionsClient({ initialY, initialM, initialAccounts, initialCategories, initialItems }: { initialY: number; initialM: number; initialAccounts: any[]; initialCategories: any[]; initialItems: any[] }) {
  const [y, setY] = useState(initialY)
  const [m, setM] = useState(initialM)
  const [kind, setKind] = useState<'expense'|'income'|'transfer'|'all'>('all')
  const [accounts, setAccounts] = useState<any[]>(initialAccounts)
  const [categories, setCategories] = useState<any[]>(initialCategories)
  const [items, setItems] = useState<any[]>(initialItems)
  const [counterparties, setCounterparties] = useState<any[]>([])
  const [filters, setFilters] = useState<{ accountId?: string; categoryId?: string; activity?: string; counterpartyId?: string }>({})
  const [form, setForm] = useState<any>({ paymentDate: new Date().toISOString().slice(0,10), accrualYear: String(initialY), accrualMonth: String(initialM), accountId: '', categoryId: '', counterpartyId: '', amountRub: '', note: '' })
  const [editingId, setEditingId] = useState<string | null>(null)

  const flatCategories = useMemo(() => {
    const acc: any[] = []
    function walk(list: any[], depth = 0) {
      list.forEach(n => {
        const isLeaf = !(Array.isArray(n.children) && n.children.length > 0)
        acc.push({ id: n.id, name: `${'— '.repeat(depth)}${n.name}`, type: n.type, activity: n.activity, isLeaf })
        if (!isLeaf) walk(n.children, depth + 1)
      })
    }
    walk(categories)
    return acc
  }, [categories])

  function rubFmt(cents: number) { return new Intl.NumberFormat('ru-RU').format(Math.round(cents/100)) + ' ₽' }

  const totalAmount = useMemo(() => {
    // Переводы теперь хранятся как пары income/expense, поэтому просто суммируем все
    return items.reduce((sum, item) => sum + (item.amount || 0), 0)
  }, [items])

  async function reload() {
    const params = new URLSearchParams()
    if (y != null && m != null) {
      const from = new Date(Date.UTC(y as any, (m as any) - 1, 1)).toISOString()
      const to = new Date(Date.UTC(y as any, m as any, 1)).toISOString()
      params.set('from', from)
      params.set('to', to)
    }
    if (filters.accountId) params.set('accountId', filters.accountId)
    if (filters.categoryId) params.set('categoryId', filters.categoryId)
    if (filters.activity) params.set('activity', filters.activity)
    if (kind && kind !== 'all') params.set('kind', kind)
    if (filters.counterpartyId) params.set('counterpartyId', filters.counterpartyId)
    // Убираем view=transfer-aggregated, так как теперь переводы создаются как одна транзакция
    params.set('pageSize', '5000') // Увеличиваем лимит для показа всех транзакций месяца
    const json: any = await api.get('/api/transactions', { params: Object.fromEntries(params) })
    setItems(json.items || [])
  }

  useEffect(() => { reload() }, [y, m, kind, filters])

  useEffect(() => {
    async function loadCp() {
      try { const r: any = await api.get('/api/counterparties'); setCounterparties(r.items || []) } catch {}
    }
    loadCp()
  }, [])

  async function addExpenseIncome(k: 'expense'|'income') {
    if (!form.accountId || !form.amountRub || !form.paymentDate) return
    const amount = Math.round(parseFloat(String(form.amountRub).replace(',', '.')) * 100)
    const payload = {
      kind: k,
      paymentDate: form.paymentDate,
      accrualYear: Number(form.accrualYear) || null,
      accrualMonth: Number(form.accrualMonth) || null,
      accountId: form.accountId,
      categoryId: form.categoryId || null,
      counterpartyId: form.counterpartyId || null,
      amount,
      note: form.note || null,
    }
    if (editingId) {
      await api.patch(`/api/transactions/${editingId}`, payload)
    } else {
      await api.post('/api/transactions', payload)
    }
    setForm((f: any) => ({ ...f, amountRub: '' }))
    setEditingId(null)
    await reload()
  }

  async function addTransfer() {
    if (!form.fromAccountId || !form.toAccountId || !form.amountRub || !form.paymentDate) return
    const amount = Math.round(parseFloat(String(form.amountRub).replace(',', '.')) * 100)
    const payload = { paymentDate: form.paymentDate, fromAccountId: form.fromAccountId, toAccountId: form.toAccountId, amount, note: form.note || null }
    if (editingId) {
      await api.patch(`/api/transactions/${editingId}`, payload)
    } else {
      await api.post('/api/transactions/transfer', payload)
    }
    setForm((f: any) => ({ ...f, amountRub: '' }))
    setEditingId(null)
    await reload()
  }

  function startEdit(row: any) {
    setEditingId(row.id)
    if (row.kind === 'transfer') {
      setKind('transfer')
      setForm((s: any) => ({
        ...s,
        paymentDate: new Date(row.paymentDate).toISOString().slice(0,10),
        fromAccountId: row.fromAccountId || '',
        toAccountId: row.toAccountId || '',
        amountRub: String((row.amount || 0) / 100).replace('.', ','),
        note: row.note || ''
      }))
      // sync period filters to paymentDate
      try {
        const d = new Date(row.paymentDate)
        if (!Number.isNaN(d.getTime())) { setY(d.getUTCFullYear() as any); setM((d.getUTCMonth() + 1) as any) }
      } catch {}
    } else {
      setKind(row.kind)
      setForm((s: any) => ({
        ...s,
        paymentDate: new Date(row.paymentDate).toISOString().slice(0,10),
        accrualYear: String(row.accrualYear || ''),
        accrualMonth: String(row.accrualMonth || ''),
        accountId: row.accountId || '',
        categoryId: row.categoryId || '',
        counterpartyId: row.counterpartyId || '',
        amountRub: String((row.amount || 0) / 100).replace('.', ','),
        note: row.note || ''
      }))
      // reflect selection into top filters & period
      setFilters((s) => ({
        ...s,
        accountId: row.accountId || undefined,
        categoryId: row.categoryId || undefined,
        counterpartyId: row.counterpartyId || undefined,
      }))
      try {
        const d = new Date(row.paymentDate)
        if (!Number.isNaN(d.getTime())) { setY(d.getUTCFullYear() as any); setM((d.getUTCMonth() + 1) as any) }
      } catch {}
    }
  }

  function resetForm() {
    setEditingId(null)
    // сброс «Все» для фильтров и полей
    setY(null as any)
    setM(null as any)
    setFilters({ accountId: undefined, categoryId: undefined, activity: undefined, counterpartyId: undefined })
    setForm({
      paymentDate: new Date().toISOString().slice(0,10),
      accrualYear: '',
      accrualMonth: '',
      accountId: '',
      categoryId: '',
      counterpartyId: '',
      amountRub: '',
      note: ''
    })
  }

  async function remove(id: string) {
    await api.delete(`/api/transactions/${id}`)
    if (editingId === id) setEditingId(null)
    await reload()
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-3 space-y-6">
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Input className="w-36" placeholder="Дата операции" type="date" value={form.paymentDate} onChange={e => setForm((s: any) => ({ ...s, paymentDate: e.target.value }))} />
              <Select value={y == null ? 'all' : String(y)} onValueChange={v => { if (v === 'all') setY(null as any); else setY(Number(v)); setForm((s: any) => ({ ...s, accrualYear: v === 'all' ? s.accrualYear : v })) }}>
                <SelectTrigger className="w-28"><SelectValue placeholder="Год" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все</SelectItem>
                  {[y ? y - 1 : new Date().getFullYear() - 1, y ?? new Date().getFullYear(), (y ? y + 1 : new Date().getFullYear() + 1)].map(yy => (<SelectItem key={yy} value={String(yy)}>{yy}</SelectItem>))}
                </SelectContent>
              </Select>
              <Select value={m == null ? 'all' : String(m)} onValueChange={v => { if (v === 'all') setM(null as any); else setM(Number(v)); setForm((s: any) => ({ ...s, accrualMonth: v === 'all' ? s.accrualMonth : v })) }}>
                <SelectTrigger className="w-36"><SelectValue placeholder="Месяц" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все</SelectItem>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(mm => (
                    <SelectItem key={mm} value={String(mm)}>{MONTHS[mm-1]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filters.activity ?? 'all'} onValueChange={v => { setFilters(s => ({ ...s, activity: v === 'all' ? undefined : v })) }}>
                <SelectTrigger className="w-44"><SelectValue placeholder="Деятельность" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все</SelectItem>
                  <SelectItem value="OPERATING">Операции</SelectItem>
                  <SelectItem value="FINANCING">Финансы</SelectItem>
                  <SelectItem value="INVESTING">Инвестиции</SelectItem>
                </SelectContent>
              </Select>
              <Select value={kind} onValueChange={(v) => setKind(v as any)}>
                <SelectTrigger className="w-40"><SelectValue placeholder="Тип операции" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все</SelectItem>
                  <SelectItem value="income">Доходы</SelectItem>
                  <SelectItem value="expense">Расходы</SelectItem>
                  <SelectItem value="transfer">Перевод</SelectItem>
                </SelectContent>
              </Select>
              {kind !== 'transfer' ? (
                <div className="ml-auto flex items-center gap-2">
                  <Button onClick={() => addExpenseIncome(kind as 'expense'|'income')} disabled={!form.accountId || !form.amountRub}>{editingId ? 'Сохранить' : 'Добавить'}</Button>
                  {editingId && <Button variant="outline" onClick={resetForm}>Новый</Button>}
                </div>
              ) : (
                <div className="ml-auto flex items-center gap-2">
                  <Button onClick={addTransfer} disabled={!form.fromAccountId || !form.toAccountId || !form.amountRub}>{editingId ? 'Сохранить' : 'Перевести'}</Button>
                  {editingId && <Button variant="outline" onClick={resetForm}>Новый</Button>}
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full">
              {kind !== 'transfer' ? (
                <>
                  <Select value={filters.accountId ?? 'all'} onValueChange={v => { const val = v === 'all' ? '' : v; setForm((s: any) => ({ ...s, accountId: val })); setFilters(s => ({ ...s, accountId: v === 'all' ? undefined : v })) }}>
                    <SelectTrigger className="w-48 shrink-0"><SelectValue placeholder="Счет" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Все</SelectItem>
                      {accounts.map(a => (<SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                  <Select value={filters.categoryId ?? 'all'} onValueChange={v => { const val = v === 'all' ? '' : v; setForm((s: any) => ({ ...s, categoryId: val })); setFilters(s => ({ ...s, categoryId: v === 'all' ? undefined : v })) }}>
                    <SelectTrigger className="w-50 shrink-0"><SelectValue placeholder="Статья" /></SelectTrigger>
                    <SelectContent className="max-h-60 overflow-auto">
                      <SelectItem value="all">Все</SelectItem>
                      {flatCategories.filter(c => c.isLeaf && c.type === (kind === 'expense' ? 'expense' : 'income')).map(c => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                  <Select value={filters.counterpartyId ?? 'all'} onValueChange={v => { if (v === 'all') { setFilters(s => ({ ...s, counterpartyId: undefined })); setForm((s: any) => ({ ...s, counterpartyId: '' })) } else if (v === 'none') { setForm((s: any) => ({ ...s, counterpartyId: '' })) } else { setForm((s: any) => ({ ...s, counterpartyId: v })); setFilters(s => ({ ...s, counterpartyId: v })) } }}>
                    <SelectTrigger className="w-50 shrink-0"><SelectValue placeholder="Контрагент (опц.)" /></SelectTrigger>
                    <SelectContent className="max-h-60 overflow-auto">
                      <SelectItem value="all">Все</SelectItem>
                      <SelectItem value="none">(Без контрагента)</SelectItem>
                      {counterparties.map(cp => (<SelectItem key={cp.id} value={cp.id}>{cp.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                  <Input className="w-40 shrink-0 text-right" placeholder="Сумма (₽)" value={form.amountRub} onChange={e => setForm((s: any) => ({ ...s, amountRub: e.target.value }))} />
                  <Input className="flex-1 min-w-[200px]" placeholder="Комментарий" value={form.note} onChange={e => setForm((s: any) => ({ ...s, note: e.target.value }))} />
                </>
              ) : (
                <>
                  <Select value={form.fromAccountId} onValueChange={v => setForm((s: any) => ({ ...s, fromAccountId: v }))}>
                    <SelectTrigger className="w-56 shrink-0"><SelectValue placeholder="Из счета" /></SelectTrigger>
                    <SelectContent>
                      {accounts.map(a => (<SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                  <Select value={form.toAccountId} onValueChange={v => setForm((s: any) => ({ ...s, toAccountId: v }))}>
                    <SelectTrigger className="w-56 shrink-0"><SelectValue placeholder="В счет" /></SelectTrigger>
                    <SelectContent>
                      {accounts.map(a => (<SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                  <Input className="w-40 shrink-0 text-right" placeholder="Сумма (₽)" value={form.amountRub} onChange={e => setForm((s: any) => ({ ...s, amountRub: e.target.value }))} />
                  <Input className="flex-1 min-w-[200px]" placeholder="Комментарий" value={form.note} onChange={e => setForm((s: any) => ({ ...s, note: e.target.value }))} />
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-3 flex flex-col h-[calc(100vh-14rem)] min-h-0">

            <div className="flex-1 overflow-auto">
              <Table className="w-full text-xs">
                <THead className="sticky top-0 bg-card z-10">
                  <TR className="!border-0">
                    <TH className="h-6 px-1">Дата</TH>
                    {kind === 'transfer' ? (
                      <>
                        <TH className="h-6 px-1">Из</TH>
                        <TH className="h-6 px-1">В</TH>
                      </>
                    ) : (
                      <>
                        <TH className="h-6 px-1">Счет</TH>
                        <TH className="h-6 px-1">Статья</TH>
                        <TH className="h-6 px-1">Контрагент</TH>
                      </>
                    )}
                    <TH className="h-6 px-1 text-right">Сумма</TH>
                    <TH className="h-6 px-1">Комментарий</TH>
                    <TH className="h-6 px-1 w-8"></TH>
                  </TR>
                  <TR className="bg-card font-medium !border-0">
                    <TH className="h-6 px-1 border-t border-b bg-card" colSpan={4}>Итого</TH>
                    <TH className="h-6 px-1 text-right border-t border-b bg-card">{rubFmt(totalAmount)}</TH>
                    <TH className="h-6 px-1 border-t border-b bg-card" colSpan={2}></TH>
                  </TR>
                </THead>
                <TBody>
                  {items.map(row => (
                    <TR key={row.id} onClick={() => startEdit(row)} className={editingId === row.id ? 'bg-accent' : 'cursor-pointer'}>
                      <TD className="py-1 px-1">{new Date(row.paymentDate).toISOString().slice(0,10)}</TD>
                      <TD className="py-1 px-1">{row.account?.name || ''}</TD>
                      <TD className="py-1 px-1">{row.category?.name || ''}</TD>
                      <TD className="py-1 px-1">{row.counterparty?.name || ''}</TD>
                      <TD className="py-1 px-1 text-right">{rubFmt(row.amount)}</TD>
                      <TD className="py-1 px-1">{row.note || ''}</TD>
                      <TD className="py-1 px-1 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={(e) => e.stopPropagation()}><MoreHorizontal className="h-3 w-3" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => startEdit(row)}>Редактировать</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => remove(row.id)}>Удалить</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
