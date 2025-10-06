'use client'

import { useEffect, useMemo, useState } from 'react'
import { getApiBase } from "@/lib/api"
import { Card, CardContent } from '@/components/ui/card'
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { MoreHorizontal } from 'lucide-react'

type Employee = { id: string; fullName: string; position?: { department?: string | null } | null }
type Item = { id: string; employeeId: string; date: string; kind: 'bonus' | 'fine' | 'deduction'; amount: number; reason?: string }

export default function AdjustmentsClient({ initialY, initialM, initialEmployees, initialItems }: { initialY: number; initialM: number; initialEmployees?: Employee[]; initialItems?: Item[] }) {
  const [y, setY] = useState(initialY)
  const [m, setM] = useState(initialM)
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees || [])
  const [items, setItems] = useState<Item[]>(initialItems || [])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [form, setForm] = useState<{ employeeId: string; kind: 'bonus'|'fine'|'deduction'; amountRub: string; dateIso: string; reason?: string }>({ employeeId: '', kind: 'bonus', amountRub: '', dateIso: `${initialY}-${String(initialM).padStart(2,'0')}-01` })
  const API_BASE = getApiBase()
  const [activeDept, setActiveDept] = useState<'ALL' | 'KITCHEN' | 'HALL' | 'BAR' | 'OPERATORS' | 'OFFICE'>('ALL')
  const [formDept, setFormDept] = useState<'KITCHEN' | 'HALL' | 'BAR' | 'OPERATORS' | 'OFFICE'>('HALL')
  const [employeeQuery, setEmployeeQuery] = useState('')

  function formatDate(iso: string) {
    const d = new Date(iso)
    const dd = String(d.getUTCDate()).padStart(2, '0')
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
    const yyyy = d.getUTCFullYear()
    return `${dd}.${mm}.${yyyy}`
  }

  async function reload() {
    try {
      const res = await fetch(`${API_BASE}/api/adjustments?y=${y}&m=${m}`, { credentials: 'include' })
      const json = await res.json()
      setItems(Array.isArray(json.items) ? json.items : [])
    } catch (e) {
      // сервер недоступен — просто показываем пустой список, без ошибок в консоли
      setItems([])
    }
  }

  useEffect(() => { reload() }, [y, m])

  // Если SSR-данные пустые (API было недоступно), пробуем подтянуть сотрудников на клиенте
  useEffect(() => {
    async function reloadEmployees() {
      try {
        const res = await fetch(`${API_BASE}/api/employees`, { credentials: 'include' })
        const json = await res.json()
        if (Array.isArray(json.data) && json.data.length) setEmployees(json.data)
      } catch {}
    }
    if (!employees?.length) reloadEmployees()
  }, [])

  // Синхронизируем правый селект блока с активной вкладкой слева (кроме "Все")
  useEffect(() => {
    if (activeDept !== 'ALL') setFormDept(activeDept as any)
  }, [activeDept])

  // Дата в форме всегда в выбранном году/месяце (первое число)
  useEffect(() => {
    setForm(s => ({ ...s, dateIso: `${y}-${String(m).padStart(2,'0')}-01` }))
  }, [y, m])

  const filteredEmployees = employees
    .filter(e => (e.position?.department || '').toUpperCase() === formDept)
    .filter(e => e.fullName.toLowerCase().includes(employeeQuery.toLowerCase().trim()))

  async function addItem() {
    if (!form.employeeId || !form.amountRub) return
    const parsed = parseFloat(form.amountRub.replace(',', '.'))
    if (!Number.isFinite(parsed)) return
    const amount = Math.round(parsed * 100)
    const res = await fetch(`${API_BASE}/api/adjustments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ employeeId: form.employeeId, date: form.dateIso, kind: form.kind, amount, reason: form.reason }), credentials: 'include' })
    if (!res.ok) {
      try { console.error('Failed to create adjustment', await res.text()) } catch {}
      return
    }
    setForm({ employeeId: '', kind: 'bonus', amountRub: '', dateIso: `${y}-${String(m).padStart(2,'0')}-01` })
    setSelectedId(null)
    await reload()
  }

  async function saveItem() {
    if (!selectedId) return addItem()
    const parsed = parseFloat(form.amountRub.replace(',', '.'))
    if (!Number.isFinite(parsed)) return
    const amount = Math.round(parsed * 100)
    const res = await fetch(`${API_BASE}/api/adjustments/${selectedId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ employeeId: form.employeeId, date: form.dateIso, kind: form.kind, amount, reason: form.reason }), credentials: 'include' })
    if (!res.ok) {
      try { console.error('Failed to update adjustment', await res.text()) } catch {}
      return
    }
    await reload()
  }

  async function remove(id: string) {
    await fetch(`${API_BASE}/api/adjustments/${id}`, { method: 'DELETE', credentials: 'include' })
    await reload()
  }

  const MONTHS = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь']

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
                  <TH className="h-8 px-2 w-24">Дата</TH>
                  <TH className="h-8 px-2">Сотрудник</TH>
                  <TH className="h-8 px-2">Тип</TH>
                  <TH className="h-8 px-2 text-right">Сумма</TH>
                  <TH className="h-8 px-2">Комментарий</TH>
                  <TH className="h-8 px-2 w-10"></TH>
                </TR>
              </THead>
              <TBody>
                {items
                  .filter(it => {
                    if (activeDept === 'ALL') return true
                    const emp = employees.find(e => e.id === it.employeeId)
                    return (emp?.position?.department || '').toUpperCase() === activeDept
                  })
                  .map(it => (
                  <TR key={it.id} onClick={() => { 
                    setSelectedId(it.id); 
                    setForm({ employeeId: it.employeeId, kind: it.kind, amountRub: (it.amount/100).toFixed(2), dateIso: new Date(it.date).toISOString().slice(0,10), reason: it.reason });
                    const emp = employees.find(e => e.id === it.employeeId)
                    const dep = (emp?.position?.department || '').toUpperCase()
                    if (['KITCHEN','HALL','BAR','OPERATORS','OFFICE'].includes(dep)) setFormDept(dep as any)
                  }} className={`cursor-pointer ${selectedId === it.id ? 'bg-accent/20' : ''}`}>
                    <TD className="py-1.5 px-2 w-24 whitespace-nowrap">{formatDate(it.date)}</TD>
                    <TD className="py-1.5 px-2">{employees.find(e => e.id === it.employeeId)?.fullName ?? it.employeeId}</TD>
                    <TD className="py-1.5 px-2">{it.kind === 'bonus' ? 'Премия' : it.kind === 'fine' ? 'Штраф' : 'Вычет'}</TD>
                    <TD className="py-1.5 px-2 text-right">{new Intl.NumberFormat('ru-RU').format(Math.round(it.amount/100))} ₽</TD>
                    <TD className="py-1.5 px-2">{it.reason ?? ''}</TD>
                    <TD className="py-1.5 px-2 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0" aria-label="Действия">
                            <MoreHorizontal className="h-4 w-4" />
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
          <Select value={formDept} onValueChange={(v) => setFormDept(v as any)}>
            <SelectTrigger><SelectValue placeholder="Блок" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="KITCHEN">Кухня</SelectItem>
              <SelectItem value="HALL">Зал</SelectItem>
              <SelectItem value="BAR">Бар</SelectItem>
              <SelectItem value="OPERATORS">Операторы</SelectItem>
              <SelectItem value="OFFICE">Офис</SelectItem>
            </SelectContent>
          </Select>
          <Select value={form.employeeId} onValueChange={v => setForm(s => ({ ...s, employeeId: v }))}>
            <SelectTrigger><SelectValue placeholder="Сотрудник" /></SelectTrigger>
            <SelectContent className="max-h-60 overflow-auto">
              {filteredEmployees.map(e => (
                <SelectItem key={e.id} value={e.id}>{e.fullName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={form.kind} onValueChange={v => setForm(s => ({ ...s, kind: v as any }))}>
            <SelectTrigger><SelectValue placeholder="Тип" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="bonus">Премия</SelectItem>
              <SelectItem value="fine">Штраф</SelectItem>
              <SelectItem value="deduction">Вычет</SelectItem>
            </SelectContent>
          </Select>
          <div className="grid grid-cols-[8.5rem_1fr] gap-2 items-center">
            <Input placeholder="Дата" type="date" value={form.dateIso} onChange={e => setForm(s => ({ ...s, dateIso: e.target.value }))} />
            <Input className="text-right" placeholder="Сумма ₽" value={form.amountRub} onChange={e => setForm(s => ({ ...s, amountRub: e.target.value }))} />
          </div>
          <Input placeholder="Комментарий" value={form.reason ?? ''} onChange={e => setForm(s => ({ ...s, reason: e.target.value }))} />
          <div className="flex gap-2">
            <Button onClick={selectedId ? saveItem : addItem}>{selectedId ? 'Сохранить' : 'Добавить'}</Button>
            {selectedId ? <Button variant="outline" onClick={() => { setSelectedId(null); setForm({ employeeId: '', kind: 'bonus', amountRub: '', dateIso: `${y}-${String(m).padStart(2,'0')}-01` }) }}>Очистить</Button> : null}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


