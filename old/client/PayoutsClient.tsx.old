"use client"

import { useEffect, useMemo, useState } from 'react'
import { getApiBase } from "@/lib/api"
import { Card, CardContent } from '@/components/ui/card'
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

const MONTHS = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь']

type Employee = { id: string; fullName: string; position?: { department?: string | null } | null }
type Account = { id: string; name: string; kind?: string }
type Item = { id: string; employeeId: string; date: string; year: number; month: number; method: string; accountId?: string | null; amount: number; note?: string }

export default function PayoutsClient({ initialY, initialM, initialEmployees, initialAccounts, initialItems }: { initialY: number; initialM: number; initialEmployees?: Employee[]; initialAccounts?: Account[]; initialItems?: Item[] }) {
  const [y, setY] = useState(initialY)
  const [m, setM] = useState(initialM)
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees || [])
  const [accounts, setAccounts] = useState<Account[]>(initialAccounts || [])
  const [items, setItems] = useState<Item[]>(initialItems || [])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [form, setForm] = useState<{ employeeId: string; dateIso: string; year: string; month: string; accountId?: string | null; amountRub: string; note?: string }>({ employeeId: '', dateIso: `${initialY}-${String(initialM).padStart(2,'0')}-01`, year: String(initialY), month: String(initialM), accountId: '', amountRub: '' })
  const [activeDept, setActiveDept] = useState<'ALL' | 'KITCHEN' | 'HALL' | 'BAR' | 'OPERATORS' | 'OFFICE'>('ALL')
  const API_BASE = getApiBase()

  async function reload() {
    try {
      const res = await fetch(`${API_BASE}/api/payouts?y=${y}&m=${m}`, { credentials: 'include' })
      const json = await res.json()
      setItems(Array.isArray(json.items) ? json.items : [])
    } catch { setItems([]) }
  }

  useEffect(() => { reload() }, [y, m])

  // Safety: refresh accounts if initial was empty
  useEffect(() => {
    (async () => {
      if (accounts.length === 0) {
        try {
          const r = await fetch(`${API_BASE}/api/accounts`, { credentials: 'include' })
          const j = await r.json()
          setAccounts(j.items || j.data || [])
        } catch {}
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function rubFmt(cents: number) { return new Intl.NumberFormat('ru-RU').format(Math.round(cents/100)) + ' ₽' }

  const filteredItems = useMemo(() => {
    return items.filter(it => {
      if (activeDept === 'ALL') return true
      const emp = employees.find(e => e.id === it.employeeId)
      return (emp?.position?.department || '').toUpperCase() === activeDept
    })
  }, [items, employees, activeDept])

  async function add() {
    if (!form.employeeId || !form.amountRub) return
    const amount = Math.round(parseFloat(form.amountRub.replace(',', '.')) * 100)
    const payload: any = { employeeId: form.employeeId, date: form.dateIso, year: Number(form.year), month: Number(form.month), amount, accountId: form.accountId || null, note: form.note }
    const res = await fetch(`${API_BASE}/api/payouts`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    if (!res.ok) return
    setForm(f => ({ ...f, employeeId: '', amountRub: '' }))
    await reload()
  }

  async function remove(id: string) {
    await fetch(`${API_BASE}/api/payouts/${id}`, { method: 'DELETE', credentials: 'include' })
    await reload()
  }

  function methodDisplay(it: Item): string {
    const acc = accounts.find(a => a.id === it.accountId)
    if ((acc?.kind || '').toLowerCase() === 'cash') return 'Наличные'
    if (!acc?.id) return '—'
    return 'Безнал'
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-2">
        <CardContent className="p-4 space-y-3 flex flex-col h-[calc(100vh-4rem)] min-h-0">
          <div className="flex items-center justify-between gap-3">
            <Tabs value={activeDept} onValueChange={(v) => setActiveDept(v as any)}>
              <TabsList>
                <TabsTrigger value="ALL">Все</TabsTrigger>
                <TabsTrigger value="KITCHEN">Кухня</TabsTrigger>
                <TabsTrigger value="HALL">Зал</TabsTrigger>
                <TabsTrigger value="BAR">Бар</TabsTrigger>
                <TabsTrigger value="OPERATORS">Операторы</TabsTrigger>
                <TabsTrigger value="OFFICE">Офис</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="flex items-center gap-3">
              <Select value={String(y)} onValueChange={v => setY(Number(v))}>
                <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[y-1, y, y+1].map(yy => (<SelectItem key={yy} value={String(yy)}>{yy}</SelectItem>))}
                </SelectContent>
              </Select>
              <Select value={String(m)} onValueChange={v => setM(Number(v))}>
                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(mm => (
                    <SelectItem key={mm} value={String(mm)}>{MONTHS[mm-1]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            <Table className="w-full">
              <THead className="sticky top-0 bg-card z-10">
                <TR>
                  <TH className="h-8 px-2">Дата</TH>
                  <TH className="h-8 px-2">Период</TH>
                  <TH className="h-8 px-2">Сотрудник</TH>
                  <TH className="h-8 px-2">Тип</TH>
                  <TH className="h-8 px-2">Счёт</TH>
                  <TH className="h-8 px-2 text-right">Сумма</TH>
                  <TH className="h-8 px-2">Комментарий</TH>
                  <TH className="h-8 px-2 w-10"></TH>
                </TR>
              </THead>
              <TBody>
                {filteredItems.map(it => (
                  <TR key={it.id}>
                    <TD className="py-1.5 px-2">{new Date(it.date).toISOString().slice(0,10)}</TD>
                    <TD className="py-1.5 px-2">{MONTHS[(it.month||1)-1]} {it.year}</TD>
                    <TD className="py-1.5 px-2">{employees.find(e => e.id === it.employeeId)?.fullName ?? it.employeeId}</TD>
                    <TD className="py-1.5 px-2">{methodDisplay(it)}</TD>
                    <TD className="py-1.5 px-2">{accounts.find(a => a.id === it.accountId)?.name ?? ''}</TD>
                    <TD className="py-1.5 px-2 text-right">{rubFmt(it.amount)}</TD>
                    <TD className="py-1.5 px-2">{it.note ?? ''}</TD>
                    <TD className="py-1.5 px-2 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost" aria-label="Операции">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => remove(it.id)}>Удалить</DropdownMenuItem>
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

      <Card className="self-start">
        <CardContent className="p-4 space-y-3">
          <Select value={form.employeeId} onValueChange={v => setForm(s => ({ ...s, employeeId: v }))}>
            <SelectTrigger><SelectValue placeholder="Сотрудник" /></SelectTrigger>
            <SelectContent className="max-h-60 overflow-auto">
              {employees.map(e => (<SelectItem key={e.id} value={e.id}>{e.fullName}</SelectItem>))}
            </SelectContent>
          </Select>
          <div className="grid grid-cols-3 gap-2">
            <Input placeholder="Дата" type="date" value={form.dateIso} onChange={e => setForm(s => ({ ...s, dateIso: e.target.value }))} />
            <Select value={String(form.month)} onValueChange={v => setForm(s => ({ ...s, month: v }))}>
              <SelectTrigger><SelectValue placeholder="Месяц" /></SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, i) => i + 1).map(mm => (
                  <SelectItem key={mm} value={String(mm)}>{MONTHS[mm-1]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={String(form.year)} onValueChange={v => setForm(s => ({ ...s, year: v }))}>
              <SelectTrigger><SelectValue placeholder="Год" /></SelectTrigger>
              <SelectContent>
                {[Number(form.year)-1, Number(form.year), Number(form.year)+1].map(yy => (
                  <SelectItem key={yy} value={String(yy)}>{yy}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Select value={form.accountId ?? 'none'} onValueChange={v => setForm(s => ({ ...s, accountId: v === 'none' ? '' : v }))}>
              <SelectTrigger><SelectValue placeholder="Счёт" /></SelectTrigger>
              <SelectContent className="max-h-60 overflow-auto">
                <SelectItem value="none">Без счёта</SelectItem>
                {accounts.map(a => (<SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>))}
              </SelectContent>
            </Select>
            <Input className="text-right" placeholder="Сумма (₽)" value={form.amountRub} onChange={e => setForm(s => ({ ...s, amountRub: e.target.value }))} />
          </div>
          <Input placeholder="Комментарий" value={form.note ?? ''} onChange={e => setForm(s => ({ ...s, note: e.target.value }))} />
          <div className="flex gap-2">
            <Button onClick={add}>Добавить</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
