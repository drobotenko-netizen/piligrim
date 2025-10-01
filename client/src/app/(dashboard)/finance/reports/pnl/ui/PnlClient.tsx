"use client"

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'

const MONTHS = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь']

export default function PnlClient({ initialYFrom, initialMFrom, initialYTo, initialMTo }: { 
  initialYFrom: number
  initialMFrom: number
  initialYTo: number
  initialMTo: number
}) {
  const [yFrom, setYFrom] = useState(initialYFrom)
  const [mFrom, setMFrom] = useState(initialMFrom)
  const [yTo, setYTo] = useState(initialYTo)
  const [mTo, setMTo] = useState(initialMTo)
  const [data, setData] = useState<any>(null)
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000'

  function rubFmt(cents: number) { return new Intl.NumberFormat('ru-RU').format(Math.round(cents/100)) + ' ₽' }

  async function reload() {
    const res = await fetch(`${API_BASE}/api/reports/pnl?yFrom=${yFrom}&mFrom=${mFrom}&yTo=${yTo}&mTo=${mTo}`, { credentials: 'include' })
    const json = await res.json()
    setData(json)
  }

  useEffect(() => { reload() }, [yFrom, mFrom, yTo, mTo])

  if (!data) return <div>Загрузка...</div>

  const { months, revenue, expenses } = data

  // Подсчёт итогов
  const calcTotal = (byMonth: Record<string, number>) => {
    return months.reduce((sum: number, mo: any) => sum + (byMonth[mo.key] || 0), 0)
  }

  const revenueTotal = calcTotal(revenue.byMonth)
  const cogsTotal = calcTotal(expenses.cogs.byMonth)
  const grossProfitByMonth: Record<string, number> = {}
  months.forEach((mo: any) => {
    grossProfitByMonth[mo.key] = (revenue.byMonth[mo.key] || 0) - (expenses.cogs.byMonth[mo.key] || 0)
  })
  const grossProfitTotal = calcTotal(grossProfitByMonth)
  
  const opexTotal = calcTotal(expenses.opex.byMonth)
  const operatingProfitByMonth: Record<string, number> = {}
  months.forEach((mo: any) => {
    operatingProfitByMonth[mo.key] = grossProfitByMonth[mo.key] - (expenses.opex.byMonth[mo.key] || 0)
  })
  const operatingProfitTotal = calcTotal(operatingProfitByMonth)
  
  const taxTotal = calcTotal(expenses.tax.byMonth)
  const feeTotal = calcTotal(expenses.fee.byMonth)
  const otherTotal = calcTotal(expenses.other.byMonth)
  const capexTotal = calcTotal(expenses.capex.byMonth)
  const netProfitByMonth: Record<string, number> = {}
  months.forEach((mo: any) => {
    netProfitByMonth[mo.key] = operatingProfitByMonth[mo.key] - (expenses.tax.byMonth[mo.key] || 0) - (expenses.fee.byMonth[mo.key] || 0) - (expenses.other.byMonth[mo.key] || 0)
  })
  const netProfitTotal = calcTotal(netProfitByMonth)

  return (
    <Card>
      <CardContent className="p-4 space-y-3 flex flex-col h-[calc(100vh-4rem)] min-h-0">
        <div className="flex items-center justify-between gap-3">
          <div></div>
          <div className="flex items-center gap-2">
            <Select value={String(yFrom)} onValueChange={v => setYFrom(Number(v))}>
              <SelectTrigger className="w-28"><SelectValue placeholder="Год от" /></SelectTrigger>
              <SelectContent>
                {[yFrom-1, yFrom, yFrom+1].map(yy => (<SelectItem key={yy} value={String(yy)}>{yy}</SelectItem>))}
              </SelectContent>
            </Select>
            <Select value={String(mFrom)} onValueChange={v => setMFrom(Number(v))}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Месяц от" /></SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, i) => i + 1).map(mm => (
                  <SelectItem key={mm} value={String(mm)}>{MONTHS[mm-1]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Select value={String(yTo)} onValueChange={v => setYTo(Number(v))}>
              <SelectTrigger className="w-28"><SelectValue placeholder="Год до" /></SelectTrigger>
              <SelectContent>
                {[yTo-1, yTo, yTo+1].map(yy => (<SelectItem key={yy} value={String(yy)}>{yy}</SelectItem>))}
              </SelectContent>
            </Select>
            <Select value={String(mTo)} onValueChange={v => setMTo(Number(v))}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Месяц до" /></SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, i) => i + 1).map(mm => (
                  <SelectItem key={mm} value={String(mm)}>{MONTHS[mm-1]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <Table className="w-full table-fixed">
            <THead className="sticky top-0 bg-card z-10">
              <TR>
                <TH className="h-8 px-2 w-[300px] sticky left-0 bg-card z-20">Показатель</TH>
                {months.map((mo: any) => (
                  <TH key={mo.key} className="h-8 px-2 text-right w-[140px]">{mo.label}</TH>
                ))}
                <TH className="h-8 px-2 text-right w-[160px]">Итого</TH>
              </TR>
            </THead>
            <TBody>
              {/* Выручка */}
              <TR className="hover:bg-muted/30 transition-colors">
                <TD className="font-bold py-1.5 sticky left-0 bg-card">ВЫРУЧКА (нетто)</TD>
                {months.map((mo: any) => (
                  <TD key={mo.key} className="text-right py-1.5 font-bold">{rubFmt(revenue.byMonth[mo.key] || 0)}</TD>
                ))}
                <TD className="text-right py-1.5 font-bold">{rubFmt(revenueTotal)}</TD>
              </TR>
              {Object.entries(revenue.byChannelByMonth || {}).map(([channel, byMonth]: any) => (
                <TR key={channel} className="hover:bg-muted/20 transition-colors">
                  <TD className="pl-8 py-1.5 sticky left-0 bg-card">{channel}</TD>
                  {months.map((mo: any) => (
                    <TD key={mo.key} className="text-right py-1.5">{rubFmt(byMonth[mo.key] || 0)}</TD>
                  ))}
                  <TD className="text-right py-1.5">{rubFmt(calcTotal(byMonth))}</TD>
                </TR>
              ))}

              {/* COGS */}
              <TR className="hover:bg-muted/30 transition-colors">
                <TD className="font-bold py-1.5 sticky left-0 bg-card">Себестоимость (COGS)</TD>
                {months.map((mo: any) => (
                  <TD key={mo.key} className="text-right py-1.5 font-bold">−{rubFmt(expenses.cogs.byMonth[mo.key] || 0)}</TD>
                ))}
                <TD className="text-right py-1.5 font-bold">−{rubFmt(cogsTotal)}</TD>
              </TR>
              {expenses.cogs?.items?.map((item: any, idx: number) => (
                <TR key={idx} className="hover:bg-muted/20 transition-colors">
                  <TD className="pl-8 py-1.5 sticky left-0 bg-card">{item.name}</TD>
                  {months.map((mo: any) => (
                    <TD key={mo.key} className="text-right py-1.5">−{rubFmt(item.byMonth[mo.key] || 0)}</TD>
                  ))}
                  <TD className="text-right py-1.5">−{rubFmt(calcTotal(item.byMonth))}</TD>
                </TR>
              ))}

              {/* Валовая прибыль */}
              <TR className="bg-muted/50 hover:bg-muted/70 transition-colors border-t">
                <TD className="font-bold py-1.5 sticky left-0 bg-muted/50">ВАЛОВАЯ ПРИБЫЛЬ</TD>
                {months.map((mo: any) => (
                  <TD key={mo.key} className="text-right py-1.5 font-bold bg-muted/50">{rubFmt(grossProfitByMonth[mo.key] || 0)}</TD>
                ))}
                <TD className="text-right py-1.5 font-bold bg-muted/50">{rubFmt(grossProfitTotal)}</TD>
              </TR>

              {/* OPEX */}
              <TR className="hover:bg-muted/30 transition-colors">
                <TD className="font-bold py-1.5 sticky left-0 bg-card">Операционные расходы (OPEX)</TD>
                {months.map((mo: any) => (
                  <TD key={mo.key} className="text-right py-1.5 font-bold">−{rubFmt(expenses.opex.byMonth[mo.key] || 0)}</TD>
                ))}
                <TD className="text-right py-1.5 font-bold">−{rubFmt(opexTotal)}</TD>
              </TR>
              {expenses.opex?.items?.map((item: any, idx: number) => (
                <TR key={idx} className="hover:bg-muted/20 transition-colors">
                  <TD className="pl-8 py-1.5 sticky left-0 bg-card">{item.name}</TD>
                  {months.map((mo: any) => (
                    <TD key={mo.key} className="text-right py-1.5">−{rubFmt(item.byMonth[mo.key] || 0)}</TD>
                  ))}
                  <TD className="text-right py-1.5">−{rubFmt(calcTotal(item.byMonth))}</TD>
                </TR>
              ))}

              {/* Операционная прибыль */}
              <TR className="bg-muted/50 hover:bg-muted/70 transition-colors border-t">
                <TD className="font-bold py-1.5 sticky left-0 bg-muted/50">ОПЕРАЦИОННАЯ ПРИБЫЛЬ</TD>
                {months.map((mo: any) => (
                  <TD key={mo.key} className="text-right py-1.5 font-bold bg-muted/50">{rubFmt(operatingProfitByMonth[mo.key] || 0)}</TD>
                ))}
                <TD className="text-right py-1.5 font-bold bg-muted/50">{rubFmt(operatingProfitTotal)}</TD>
              </TR>

              {/* Прочие расходы */}
              {(feeTotal > 0 || taxTotal > 0 || otherTotal > 0) && (
                <>
                  {feeTotal > 0 && (
                    <>
                      <TR className="hover:bg-muted/30 transition-colors">
                        <TD className="font-semibold py-1.5 sticky left-0 bg-card">Комиссии и сборы</TD>
                        {months.map((mo: any) => (
                          <TD key={mo.key} className="text-right py-1.5 font-semibold">−{rubFmt(expenses.fee.byMonth[mo.key] || 0)}</TD>
                        ))}
                        <TD className="text-right py-1.5 font-semibold">−{rubFmt(feeTotal)}</TD>
                      </TR>
                      {expenses.fee?.items?.map((item: any, idx: number) => (
                        <TR key={idx} className="hover:bg-muted/20 transition-colors">
                          <TD className="pl-8 py-1.5 sticky left-0 bg-card">{item.name}</TD>
                          {months.map((mo: any) => (
                            <TD key={mo.key} className="text-right py-1.5">−{rubFmt(item.byMonth[mo.key] || 0)}</TD>
                          ))}
                          <TD className="text-right py-1.5">−{rubFmt(calcTotal(item.byMonth))}</TD>
                        </TR>
                      ))}
                    </>
                  )}

                  {taxTotal > 0 && (
                    <>
                      <TR className="hover:bg-muted/30 transition-colors">
                        <TD className="font-semibold py-1.5 sticky left-0 bg-card">Налоги</TD>
                        {months.map((mo: any) => (
                          <TD key={mo.key} className="text-right py-1.5 font-semibold">−{rubFmt(expenses.tax.byMonth[mo.key] || 0)}</TD>
                        ))}
                        <TD className="text-right py-1.5 font-semibold">−{rubFmt(taxTotal)}</TD>
                      </TR>
                      {expenses.tax?.items?.map((item: any, idx: number) => (
                        <TR key={idx} className="hover:bg-muted/20 transition-colors">
                          <TD className="pl-8 py-1.5 sticky left-0 bg-card">{item.name}</TD>
                          {months.map((mo: any) => (
                            <TD key={mo.key} className="text-right py-1.5">−{rubFmt(item.byMonth[mo.key] || 0)}</TD>
                          ))}
                          <TD className="text-right py-1.5">−{rubFmt(calcTotal(item.byMonth))}</TD>
                        </TR>
                      ))}
                    </>
                  )}

                  {otherTotal > 0 && (
                    <>
                      <TR className="hover:bg-muted/30 transition-colors">
                        <TD className="font-semibold py-1.5 sticky left-0 bg-card">Прочие расходы</TD>
                        {months.map((mo: any) => (
                          <TD key={mo.key} className="text-right py-1.5 font-semibold">−{rubFmt(expenses.other.byMonth[mo.key] || 0)}</TD>
                        ))}
                        <TD className="text-right py-1.5 font-semibold">−{rubFmt(otherTotal)}</TD>
                      </TR>
                      {expenses.other?.items?.map((item: any, idx: number) => (
                        <TR key={idx} className="hover:bg-muted/20 transition-colors">
                          <TD className="pl-8 py-1.5 sticky left-0 bg-card">{item.name}</TD>
                          {months.map((mo: any) => (
                            <TD key={mo.key} className="text-right py-1.5">−{rubFmt(item.byMonth[mo.key] || 0)}</TD>
                          ))}
                          <TD className="text-right py-1.5">−{rubFmt(calcTotal(item.byMonth))}</TD>
                        </TR>
                      ))}
                    </>
                  )}
                </>
              )}

              {/* Чистая прибыль */}
              <TR className="bg-muted/50 hover:bg-muted/70 transition-colors border-t-2">
                <TD className="font-bold py-2 sticky left-0 bg-muted/50">ЧИСТАЯ ПРИБЫЛЬ</TD>
                {months.map((mo: any) => (
                  <TD key={mo.key} className="text-right py-2 font-bold bg-muted/50">{rubFmt(netProfitByMonth[mo.key] || 0)}</TD>
                ))}
                <TD className="text-right py-2 font-bold bg-muted/50">{rubFmt(netProfitTotal)}</TD>
              </TR>
            </TBody>
          </Table>

          {/* CAPEX отдельно (не влияет на прибыль, но показываем для информации) */}
          {capexTotal > 0 && (
            <div className="mt-6 pt-6 border-t">
              <h3 className="font-bold mb-3 text-muted-foreground">Капитальные расходы (не влияют на P&L):</h3>
              <Table className="w-full table-fixed">
                <THead className="sticky top-0 bg-card z-10">
                  <TR>
                    <TH className="h-8 px-2 w-[300px] sticky left-0 bg-card z-20">Категория</TH>
                    {months.map((mo: any) => (
                      <TH key={mo.key} className="h-8 px-2 text-right w-[140px]">{mo.label}</TH>
                    ))}
                    <TH className="h-8 px-2 text-right w-[160px]">Итого</TH>
                  </TR>
                </THead>
                <TBody>
                  {expenses.capex?.items?.map((item: any, idx: number) => (
                    <TR key={idx} className="hover:bg-muted/20 transition-colors">
                      <TD className="py-1.5 sticky left-0 bg-card">{item.name}</TD>
                      {months.map((mo: any) => (
                        <TD key={mo.key} className="text-right py-1.5">{rubFmt(item.byMonth[mo.key] || 0)}</TD>
                      ))}
                      <TD className="text-right py-1.5">{rubFmt(calcTotal(item.byMonth))}</TD>
                    </TR>
                  ))}
                  <TR className="border-t hover:bg-muted/30 transition-colors">
                    <TD className="font-bold py-1.5 sticky left-0 bg-card">Итого CAPEX</TD>
                    {months.map((mo: any) => (
                      <TD key={mo.key} className="text-right py-1.5 font-bold">{rubFmt(expenses.capex.byMonth[mo.key] || 0)}</TD>
                    ))}
                    <TD className="text-right py-1.5 font-bold">{rubFmt(capexTotal)}</TD>
                  </TR>
                </TBody>
              </Table>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
