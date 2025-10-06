import { getApiBase } from '../../lib/api'
'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useEffect } from 'react'

const MONTHS = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь']

type Position = { id: string; name: string; kind: string; department?: string | null; revenuePercentBps?: number | null; salaryAmount?: number | null; baseHourRate?: number | null }

const KIND_LABEL: Record<string, string> = {
  SHIFTS_PLUS_REVENUE: 'Смены + % выручки',
  SALARY: 'Оклад',
  SALARY_PLUS_TASKS: 'Оклад + задачи'
}

export default function PositionsClient({ initialPositions }: { initialPositions?: Position[] }) {
  const [positions, setPositions] = useState<Position[]>(initialPositions || [])
  const [form, setForm] = useState<{ name: string; kind: string; department?: string; revenuePercentBps?: string; salaryAmount?: string; baseHourRate?: string }>({ name: '', kind: 'SHIFTS_PLUS_REVENUE', department: 'HALL' })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [activeDept, setActiveDept] = useState<'ALL' | 'KITCHEN' | 'HALL' | 'BAR' | 'OPERATORS' | 'OFFICE'>('ALL')
  const API_BASE = getApiBase()
  const [rates, setRates] = useState<any[]>([])
  const [rateForm, setRateForm] = useState<{ year: string; month: string; baseHourRate?: string; revenuePercentBps?: string; salaryAmount?: string }>({ year: String(new Date().getUTCFullYear()), month: String(new Date().getUTCMonth()+1) })
  const [viewY, setViewY] = useState(new Date().getUTCFullYear())
  const [viewM, setViewM] = useState(new Date().getUTCMonth() + 1)
  const [monthRates, setMonthRates] = useState<Record<string, any>>({})

  function parseRubToCents(input?: string): number | null {
    if (!input) return null
    const num = parseFloat(String(input).replace(',', '.'))
    if (Number.isNaN(num)) return null
    return Math.round(num * 100)
  }

  function parsePercentToBps(input?: string): number | null {
    if (!input) return null
    const num = parseFloat(String(input).replace(',', '.'))
    if (Number.isNaN(num)) return null
    return Math.round(num * 100)
  }

  async function refresh() {
    const res = await fetch(`${API_BASE}/api/positions`, { credentials: 'include' })
    const json = await res.json()
    setPositions(json.data || [])
  }

  useEffect(() => {
    async function loadMonthRates() {
      try {
        const r = await fetch(`${API_BASE}/api/positions/rates?y=${viewY}&m=${viewM}`, { credentials: 'include' }).then(x => x.json())
        const map: Record<string, any> = {}
        ;(r.data || []).forEach((it: any) => { map[it.positionId] = it })
        setMonthRates(map)
      } catch { setMonthRates({}) }
    }
    loadMonthRates()
  }, [viewY, viewM])

  async function createPosition() {
    if (!form.name.trim()) return
    const payload: any = { name: form.name, kind: form.kind, department: form.department }
    if (form.kind === 'SHIFTS_PLUS_REVENUE') {
      payload.baseHourRate = parseRubToCents(form.baseHourRate)
      payload.revenuePercentBps = parsePercentToBps(form.revenuePercentBps)
    }
    if (form.kind === 'SALARY' || form.kind === 'SALARY_PLUS_TASKS') {
      payload.salaryAmount = parseRubToCents(form.salaryAmount)
    }
    await fetch(`${API_BASE}/api/positions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), credentials: 'include' })
    setForm({ name: '', kind: 'SHIFTS_PLUS_REVENUE', department: 'HALL' })
    await refresh()
  }

  async function updatePosition(id: string, patch: any) {
    await fetch(`${API_BASE}/api/positions/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch), credentials: 'include' })
    await refresh()
  }

  function startEdit(p: Position) {
    setEditingId(p.id)
    setForm({
      name: p.name,
      kind: p.kind,
      department: p.department ?? 'HALL',
      baseHourRate: p.baseHourRate != null ? String((p.baseHourRate / 100).toFixed(2)) : '',
      revenuePercentBps: p.revenuePercentBps != null ? String((p.revenuePercentBps / 100).toFixed(2)) : '',
      salaryAmount: p.salaryAmount != null ? String((p.salaryAmount / 100).toFixed(2)) : ''
    })
    // загрузить периоды ставок
    fetch(`${API_BASE}/api/positions/${p.id}/rates`, { credentials: 'include' }).then(r => r.json()).then(json => setRates(json.data || [])).catch(() => setRates([]))
  }

  async function save() {
    if (!form.name.trim()) return
    if (!editingId) {
      await createPosition()
      return
    }
    const patch: any = { name: form.name, kind: form.kind, department: form.department }
    if (form.kind === 'SHIFTS_PLUS_REVENUE') {
      patch.baseHourRate = parseRubToCents(form.baseHourRate)
      patch.revenuePercentBps = parsePercentToBps(form.revenuePercentBps)
      patch.salaryAmount = null
    } else {
      patch.salaryAmount = parseRubToCents(form.salaryAmount)
      patch.baseHourRate = null
      patch.revenuePercentBps = null
    }
    await updatePosition(editingId, patch)
    // Дополнительно сохраняем период, если выбран год/месяц
    const y = Number(rateForm.year)
    const mo = Number(rateForm.month)
    if (y && mo) {
      await saveRate()
    }
  }

  async function saveRate() {
    if (!editingId) return
    const y = Number(rateForm.year)
    const mo = Number(rateForm.month)
    if (!y || !mo) return
    // использовать значения из основной формы должности
    const payload: any = { year: y, month: mo }
    if (form.kind === 'SHIFTS_PLUS_REVENUE') {
      payload.baseHourRate = parseRubToCents(form.baseHourRate)
      payload.revenuePercentBps = parsePercentToBps(form.revenuePercentBps)
      payload.salaryAmount = null
    } else {
      payload.salaryAmount = parseRubToCents(form.salaryAmount)
      payload.baseHourRate = null
      payload.revenuePercentBps = null
    }
    await fetch(`${API_BASE}/api/positions/${editingId}/rates`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), credentials: 'include' })
    const json = await fetch(`${API_BASE}/api/positions/${editingId}/rates`, { credentials: 'include' }).then(r => r.json())
    setRates(json.data || [])
  }

  function resetToCreate() {
    setEditingId(null)
    setForm({ name: '', kind: 'SHIFTS_PLUS_REVENUE' })
    setRates([])
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-2">
        <CardContent className="p-4 flex flex-col h-[calc(100vh-4rem)] min-h-0">
          <div className="mb-2 flex items-center justify-between gap-3">
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
            <div className="flex items-center gap-2">
              <Select value={String(viewY)} onValueChange={v => setViewY(Number(v))}>
                <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[viewY-1, viewY, viewY+1].map(yy => (<SelectItem key={yy} value={String(yy)}>{yy}</SelectItem>))}
                </SelectContent>
              </Select>
              <Select value={String(viewM)} onValueChange={v => setViewM(Number(v))}>
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
                  <TH>Название</TH>
                  <TH>Тип</TH>
                  <TH className="text-right">Ставка/оклад</TH>
                  <TH className="text-right">% выручки</TH>
                </TR>
              </THead>
              <TBody>
                {positions
                  .filter(p => activeDept === 'ALL' || ((p.department || '').toUpperCase() === activeDept))
                  .map(p => {
                    const mr = monthRates[p.id]
                    const displaySalary = mr?.salaryAmount ?? p.salaryAmount
                    const displayHour = mr?.baseHourRate ?? p.baseHourRate
                    const displayPct = mr?.revenuePercentBps ?? p.revenuePercentBps
                    return (
                      <TR key={p.id} onClick={() => startEdit(p)} className={p.id === editingId ? 'bg-accent' : 'cursor-pointer'}>
                        <TD>{p.name}</TD>
                        <TD>{KIND_LABEL[p.kind] || p.kind}</TD>
                        <TD className="text-right">{displaySalary ? `${new Intl.NumberFormat('ru-RU').format(Math.round(displaySalary/100))} ₽` : (displayHour ? `${new Intl.NumberFormat('ru-RU').format(Math.round(displayHour/100))} ₽/ч` : '—')}</TD>
                        <TD className="text-right">{displayPct ? `${(displayPct/100).toFixed(2)}%` : '—'}</TD>
                      </TR>
                    )
                })}
              </TBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      <Card className="self-start">
        <CardContent className="p-4 space-y-3">
        <Select value={form.department} onValueChange={v => setForm(s => ({ ...s, department: v }))}>
          <SelectTrigger><SelectValue placeholder="Блок" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="KITCHEN">Кухня</SelectItem>
            <SelectItem value="HALL">Зал</SelectItem>
            <SelectItem value="BAR">Бар</SelectItem>
            <SelectItem value="OPERATORS">Операторы</SelectItem>
            <SelectItem value="OFFICE">Офис</SelectItem>
          </SelectContent>
        </Select>
        <Input placeholder="Название" value={form.name} onChange={e => setForm(v => ({ ...v, name: e.target.value }))} />
        <Select value={form.kind} onValueChange={v => setForm(s => ({ ...s, kind: v }))}>
          <SelectTrigger><SelectValue placeholder="Тип должности" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="SHIFTS_PLUS_REVENUE">Смены + % выручки</SelectItem>
            <SelectItem value="SALARY">Оклад</SelectItem>
            <SelectItem value="SALARY_PLUS_TASKS">Оклад + задачи</SelectItem>
          </SelectContent>
        </Select>
        {editingId && (
          <div className="grid grid-cols-2 gap-2">
            <Select value={String(rateForm.year)} onValueChange={(v) => setRateForm(s => ({ ...s, year: v }))}>
              <SelectTrigger><SelectValue placeholder="Год" /></SelectTrigger>
              <SelectContent>
                {[Number(rateForm.year)-1, Number(rateForm.year), Number(rateForm.year)+1].map(yy => (
                  <SelectItem key={yy} value={String(yy)}>{yy}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={String(rateForm.month ?? '')} onValueChange={(v) => setRateForm(s => ({ ...s, month: v }))}>
              <SelectTrigger><SelectValue placeholder="Месяц" /></SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, i) => i + 1).map(mm => (
                  <SelectItem key={mm} value={String(mm)}>{MONTHS[mm-1]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {form.kind === 'SHIFTS_PLUS_REVENUE' && (
          <>
            <Input placeholder="Ставка за час (₽)" value={form.baseHourRate ?? ''} onChange={e => setForm(v => ({ ...v, baseHourRate: e.target.value }))} />
            <Input placeholder="% от выручки" value={form.revenuePercentBps ?? ''} onChange={e => setForm(v => ({ ...v, revenuePercentBps: e.target.value }))} />
          </>
        )}
        {(form.kind === 'SALARY' || form.kind === 'SALARY_PLUS_TASKS') && (
          <Input placeholder="Оклад (₽)" value={form.salaryAmount ?? ''} onChange={e => setForm(v => ({ ...v, salaryAmount: e.target.value }))} />
        )}
        <div className="flex gap-2">
          <Button onClick={save}>{editingId ? 'Сохранить' : 'Создать'}</Button>
          {editingId && <Button variant="outline" onClick={resetToCreate}>Новая</Button>}
        </div>

        {editingId && (
          <div className="pt-2 space-y-2">
            <div className="text-sm text-muted-foreground">Периоды ставок</div>
            <div className="space-y-1 max-h-48 overflow-auto">
              {rates.length ? rates.map(r => (
                <div key={`${r.year}-${r.month}`} className="flex items-center justify-between text-sm">
                  <div>{MONTHS[(r.month||1)-1]} {r.year}</div>
                  <div className="text-right">
                    {(r.salaryAmount ? `${new Intl.NumberFormat('ru-RU').format(Math.round(r.salaryAmount/100))} ₽` : (r.baseHourRate ? `${new Intl.NumberFormat('ru-RU').format(Math.round(r.baseHourRate/100))} ₽/ч` : '—'))}
                    {r.revenuePercentBps ? ` • ${(r.revenuePercentBps/100).toFixed(2)}%` : ''}
                  </div>
                </div>
              )) : <div className="text-sm text-muted-foreground">Нет периодов</div>}
            </div>
          </div>
        )}
        </CardContent>
      </Card>
    </div>
  )
}


