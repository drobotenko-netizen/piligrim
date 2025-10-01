"use client"

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'

const MONTHS = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь']

export default function PnlClient({ initialY, initialM, initialItems, initialTotals }: { initialY: number; initialM: number; initialItems: any[]; initialTotals: { income: number; expense: number; net: number } }) {
  const [y, setY] = useState(initialY)
  const [m, setM] = useState(initialM)
  const [items, setItems] = useState<any[]>(initialItems)
  const [totals, setTotals] = useState(initialTotals)
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000'

  function rubFmt(cents: number) { return new Intl.NumberFormat('ru-RU').format(Math.round(cents/100)) + ' ₽' }

  async function reload() {
    const res = await fetch(`${API_BASE}/api/reports/pnl?y=${y}&m=${m}`)
    const json = await res.json()
    setItems(json.items || [])
    setTotals(json.totals || { income: 0, expense: 0, net: 0 })
  }

  useEffect(() => { reload() }, [y, m])

  return (
    <Card>
      <CardContent className="p-4 space-y-3 flex flex-col h-[calc(100vh-4rem)] min-h-0">
        <div className="flex items-center justify-end gap-3">
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
        <div className="flex-1 overflow-auto">
          <Table className="w-full">
            <THead className="sticky top-0 bg-card z-10">
              <TR>
                <TH className="h-8 px-2">Вид деятельности</TH>
                <TH className="h-8 px-2">Статья</TH>
                <TH className="h-8 px-2 text-right">Сумма</TH>
              </TR>
            </THead>
            <TBody>
              {items.map((r: any, idx: number) => (
                <TR key={idx}>
                  <TD className="py-1.5 px-2">{r.activity}</TD>
                  <TD className="py-1.5 px-2">{r.categoryName || (r.type === 'income' ? 'Доходы' : 'Расходы')}</TD>
                  <TD className="py-1.5 px-2 text-right">{rubFmt(r.sum)}</TD>
                </TR>
              ))}
              <TR>
                <TD className="py-1.5 px-2 font-semibold">Итого доходы</TD>
                <TD className="py-1.5 px-2"></TD>
                <TD className="py-1.5 px-2 text-right font-semibold">{rubFmt(totals.income)}</TD>
              </TR>
              <TR>
                <TD className="py-1.5 px-2 font-semibold">Итого расходы</TD>
                <TD className="py-1.5 px-2"></TD>
                <TD className="py-1.5 px-2 text-right font-semibold">{rubFmt(totals.expense)}</TD>
              </TR>
              <TR>
                <TD className="py-1.5 px-2 font-bold">Итог (прибыль)</TD>
                <TD className="py-1.5 px-2"></TD>
                <TD className="py-1.5 px-2 text-right font-bold">{rubFmt(totals.net)}</TD>
              </TR>
            </TBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
