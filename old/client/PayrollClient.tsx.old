"use client"

import { useEffect, useMemo, useState } from 'react'
import { getApiBase } from "@/lib/api"
import { Card, CardContent } from '@/components/ui/card'
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function PayrollClient({ initialY, initialM, initialItems }: { initialY: number; initialM: number; initialItems?: any[] }) {
  const [y, setY] = useState(initialY)
  const [m, setM] = useState(initialM)
  const [items, setItems] = useState<any[]>(initialItems || [])
  const API_BASE = getApiBase()
  const [dept, setDept] = useState<'ALL'|'KITCHEN'|'HALL'|'BAR'|'OPERATORS'|'OFFICE'>('ALL')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const MONTHS = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь']

  async function reload() {
    try {
      const res = await fetch(`${API_BASE}/api/payroll?y=${y}&m=${m}`, { credentials: 'include' })
      const json = await res.json()
      setItems(json.items || [])
    } catch {
      setItems([])
    }
  }

  useEffect(() => { reload() }, [y, m])

  const filtered = useMemo(() => items.filter(i => dept === 'ALL' || (i.department || '').toUpperCase() === dept), [items, dept])

  // Выбор по умолчанию — первый с ненулевыми данными, иначе первый доступный
  useEffect(() => {
    if (filtered.length === 0) { setSelectedId(null); return }
    const exists = filtered.some(r => r.employeeId === selectedId)
    if (!exists) {
      const candidate = filtered.find(r => (r.hours || 0) > 0 || (r.totalAmount || 0) !== 0 || (r.adjustments || 0) !== 0) || filtered[0]
      setSelectedId(candidate?.employeeId || null)
    }
  }, [filtered, selectedId])

  const selected = useMemo(() => filtered.find(r => r.employeeId === selectedId) || null, [filtered, selectedId])

  const totals = useMemo(() => {
    return filtered.reduce((acc, i) => {
      acc.baseAmount += i.baseAmount || 0
      acc.adjustments += i.adjustments || 0
      acc.totalAmount += i.totalAmount || 0
      return acc
    }, { baseAmount: 0, adjustments: 0, totalAmount: 0 })
  }, [filtered])

  function rub(cents: number) { return new Intl.NumberFormat('ru-RU').format(Math.round(cents/100)) + ' ₽' }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-2">
        <CardContent className="p-4 space-y-3 flex flex-col h-[calc(100vh-4rem)] min-h-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Tabs value={dept} onValueChange={(v) => setDept(v as any)}>
                <TabsList>
                  <TabsTrigger value="ALL">Все</TabsTrigger>
                  <TabsTrigger value="KITCHEN">Кухня</TabsTrigger>
                  <TabsTrigger value="HALL">Зал</TabsTrigger>
                  <TabsTrigger value="BAR">Бар</TabsTrigger>
                  <TabsTrigger value="OPERATORS">Операторы</TabsTrigger>
                  <TabsTrigger value="OFFICE">Офис</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
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
                <TH className="h-8 px-2">ФИО</TH>
                <TH className="h-8 px-2">Должность</TH>
                <TH className="h-8 px-2 text-right">Часы</TH>
                <TH className="h-8 px-2 text-right">База</TH>
                <TH className="h-8 px-2 text-right">Операции</TH>
                <TH className="h-8 px-2 text-right">Итог</TH>
              </TR>
            </THead>
            <TBody>
              {filtered.map(row => (
                <TR key={row.employeeId} onClick={() => setSelectedId(row.employeeId)} className={`cursor-pointer ${selectedId === row.employeeId ? 'bg-accent/20' : ''}`}>
                  <TD className="py-1.5 px-2">{row.fullName}</TD>
                  <TD className="py-1.5 px-2">{row.position || ''}</TD>
                  <TD className="py-1.5 px-2 text-right">{(row.hours || 0).toFixed(1)}</TD>
                  <TD className="py-1.5 px-2 text-right">{rub(row.baseAmount)}</TD>
                  <TD className="py-1.5 px-2 text-right">{rub(row.adjustments)}</TD>
                  <TD className="py-1.5 px-2 text-right font-semibold">{rub(row.totalAmount)}</TD>
                </TR>
              ))}
              <TR>
                <TD className="py-1.5 px-2 font-semibold" colSpan={3}>Итого</TD>
                <TD className="py-1.5 px-2 text-right font-semibold">{rub(totals.baseAmount)}</TD>
                <TD className="py-1.5 px-2 text-right font-semibold">{rub(totals.adjustments)}</TD>
                <TD className="py-1.5 px-2 text-right font-bold">{rub(totals.totalAmount)}</TD>
              </TR>
            </TBody>
          </Table>
        </div>
      </CardContent>
    </Card>

      <Card className="self-start">
        <CardContent className="p-4 space-y-3">
          <div className="text-sm text-muted-foreground">Расчётный лист</div>
          {selected ? (
            <div className="space-y-2">
              <div className="text-base font-semibold">{selected.fullName}</div>
              <div className="text-sm text-muted-foreground">{selected.position || ''}{selected.department ? ` • ${selected.department}` : ''}</div>
              {(() => {
                const hoursAmountCents = (selected as any).hoursAmount ?? (selected as any).baseAmount ?? 0
                const salaryAmountCents = (selected as any).salaryAmount ?? 0
                const revenueAmountCents = (selected as any).revenueAmount ?? 0
                const bonusAmountCents = (selected as any).bonusAmount ?? 0
                const fineAmountCents = (selected as any).fineAmount ?? 0
                const deductionAmountCents = (selected as any).deductionAmount ?? 0
                const payoutsTotalCents = (selected as any).payoutsTotal ?? 0
                const accruedTotalCents = salaryAmountCents + hoursAmountCents + revenueAmountCents + (bonusAmountCents - fineAmountCents - deductionAmountCents)
                const hoursValue = (selected as any).hours || 0
                return (
                  <>
                    <div className="grid grid-cols-2 gap-2 pt-2">
                      <div className="text-sm">Оклад</div>
                      <div className="text-sm text-right">{rub(salaryAmountCents)}</div>
                      <div className="text-sm">По часам</div>
                      <div className="text-sm text-right">{Number(hoursValue).toFixed(1)} ч — {rub(hoursAmountCents)}</div>
                      <div className="text-sm">Процент от выручки</div>
                      <div className="text-sm text-right">{rub(revenueAmountCents)}</div>
                      <div className="col-span-2 h-px bg-border my-1" />
                      <div className="text-sm">Премии</div>
                      <div className="text-sm text-right">{rub(bonusAmountCents)}</div>
                      <div className="text-sm">Штрафы</div>
                      <div className="text-sm text-right">-{rub(fineAmountCents)}</div>
                      <div className="text-sm">Вычеты</div>
                      <div className="text-sm text-right">-{rub(deductionAmountCents)}</div>
                      <div className="col-span-2 h-px bg-border my-1" />
                      <div className="text-sm font-semibold">Начислено всего</div>
                      <div className="text-sm text-right font-semibold">{rub(accruedTotalCents)}</div>
                      <div className="text-sm">Выплаты</div>
                      <div className="text-sm text-right">-{rub(payoutsTotalCents)}</div>
                      <div className="text-sm font-semibold">Остаток</div>
                      <div className="text-sm text-right font-semibold">{rub(accruedTotalCents - payoutsTotalCents)}</div>
                    </div>
                    <div className="pt-2">
                      <div className="text-sm text-muted-foreground mb-1">Выплаты</div>
                      <div className="space-y-1">
                        {(selected as any).payouts?.length ? (selected as any).payouts.map((p: any) => (
                          <div key={p.id} className="flex items-center justify-between text-sm">
                            <div>{new Date(p.date).toISOString().slice(0,10)}</div>
                            <div>-{rub(p.amount || 0)}</div>
                          </div>
                        )) : (
                          <div className="text-sm text-muted-foreground">Нет выплат</div>
                        )}
                      </div>
                    </div>
                  </>
                )
              })()}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">Нет данных</div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
