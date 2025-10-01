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

  const { revenue, expenses, totals } = data

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
          <Table className="w-full">
            <TBody>
              {/* Выручка */}
              <TR className="hover:bg-muted/30 transition-colors">
                <TD className="font-bold py-1.5" colSpan={2}>ВЫРУЧКА (нетто)</TD>
                <TD className="text-right font-bold py-1.5">{rubFmt(totals.revenue)}</TD>
              </TR>
              {Object.entries(revenue.byChannel || {}).map(([channel, amount]: any) => (
                <TR key={channel} className="hover:bg-muted/20 transition-colors">
                  <TD className="pl-8 py-1.5"></TD>
                  <TD className="py-1.5">{channel}</TD>
                  <TD className="text-right py-1.5">{rubFmt(amount)}</TD>
                </TR>
              ))}

              {/* COGS */}
              <TR className="hover:bg-muted/30 transition-colors">
                <TD className="font-bold py-1.5" colSpan={2}>Себестоимость (COGS)</TD>
                <TD className="text-right font-bold py-1.5">−{rubFmt(totals.cogs)}</TD>
              </TR>
              {expenses.cogs?.items?.map((item: any, idx: number) => (
                <TR key={idx} className="hover:bg-muted/20 transition-colors">
                  <TD className="pl-8 py-1.5"></TD>
                  <TD className="py-1.5">{item.categoryName} {item.vendorName && `(${item.vendorName})`}</TD>
                  <TD className="text-right py-1.5">−{rubFmt(item.amount)}</TD>
                </TR>
              ))}

              {/* Валовая прибыль */}
              <TR className="bg-muted/50 hover:bg-muted/70 transition-colors border-t">
                <TD className="font-bold py-1.5" colSpan={2}>ВАЛОВАЯ ПРИБЫЛЬ</TD>
                <TD className="text-right font-bold py-1.5">{rubFmt(totals.grossProfit)}</TD>
              </TR>

              {/* OPEX */}
              <TR className="hover:bg-muted/30 transition-colors">
                <TD className="font-bold py-1.5" colSpan={2}>Операционные расходы (OPEX)</TD>
                <TD className="text-right font-bold py-1.5">−{rubFmt(totals.opex)}</TD>
              </TR>
              {expenses.opex?.items?.map((item: any, idx: number) => (
                <TR key={idx} className="hover:bg-muted/20 transition-colors">
                  <TD className="pl-8 py-1.5"></TD>
                  <TD className="py-1.5">{item.categoryName} {item.vendorName && `(${item.vendorName})`}</TD>
                  <TD className="text-right py-1.5">−{rubFmt(item.amount)}</TD>
                </TR>
              ))}

              {/* Операционная прибыль */}
              <TR className="bg-muted/50 hover:bg-muted/70 transition-colors border-t">
                <TD className="font-bold py-1.5" colSpan={2}>ОПЕРАЦИОННАЯ ПРИБЫЛЬ</TD>
                <TD className="text-right font-bold py-1.5">{rubFmt(totals.operatingProfit)}</TD>
              </TR>

              {/* Прочие расходы */}
              {(totals.fee > 0 || totals.tax > 0 || totals.other > 0) && (
                <>
                  {totals.fee > 0 && (
                    <>
                      <TR className="hover:bg-muted/30 transition-colors">
                        <TD className="font-semibold py-1.5" colSpan={2}>Комиссии и сборы</TD>
                        <TD className="text-right font-semibold py-1.5">−{rubFmt(totals.fee)}</TD>
                      </TR>
                      {expenses.fee?.items?.map((item: any, idx: number) => (
                        <TR key={idx} className="hover:bg-muted/20 transition-colors">
                          <TD className="pl-8 py-1.5"></TD>
                          <TD className="py-1.5">{item.categoryName}</TD>
                          <TD className="text-right py-1.5">−{rubFmt(item.amount)}</TD>
                        </TR>
                      ))}
                    </>
                  )}

                  {totals.tax > 0 && (
                    <>
                      <TR className="hover:bg-muted/30 transition-colors">
                        <TD className="font-semibold py-1.5" colSpan={2}>Налоги</TD>
                        <TD className="text-right font-semibold py-1.5">−{rubFmt(totals.tax)}</TD>
                      </TR>
                      {expenses.tax?.items?.map((item: any, idx: number) => (
                        <TR key={idx} className="hover:bg-muted/20 transition-colors">
                          <TD className="pl-8 py-1.5"></TD>
                          <TD className="py-1.5">{item.categoryName}</TD>
                          <TD className="text-right py-1.5">−{rubFmt(item.amount)}</TD>
                        </TR>
                      ))}
                    </>
                  )}

                  {totals.other > 0 && (
                    <>
                      <TR className="hover:bg-muted/30 transition-colors">
                        <TD className="font-semibold py-1.5" colSpan={2}>Прочие расходы</TD>
                        <TD className="text-right font-semibold py-1.5">−{rubFmt(totals.other)}</TD>
                      </TR>
                      {expenses.other?.items?.map((item: any, idx: number) => (
                        <TR key={idx} className="hover:bg-muted/20 transition-colors">
                          <TD className="pl-8 py-1.5"></TD>
                          <TD className="py-1.5">{item.categoryName}</TD>
                          <TD className="text-right py-1.5">−{rubFmt(item.amount)}</TD>
                        </TR>
                      ))}
                    </>
                  )}
                </>
              )}

              {/* Чистая прибыль */}
              <TR className="bg-muted/50 hover:bg-muted/70 transition-colors border-t-2">
                <TD className="font-bold py-2" colSpan={2}>ЧИСТАЯ ПРИБЫЛЬ</TD>
                <TD className="text-right font-bold py-2">{rubFmt(totals.netProfit)}</TD>
              </TR>
            </TBody>
          </Table>

          {/* CAPEX отдельно (не влияет на прибыль, но показываем для информации) */}
          {totals.capex > 0 && (
            <div className="mt-6 pt-6 border-t">
              <h3 className="font-bold mb-3 text-muted-foreground">Капитальные расходы (не влияют на P&L):</h3>
              <Table>
                <TBody>
                  {expenses.capex?.items?.map((item: any, idx: number) => (
                    <TR key={idx} className="hover:bg-muted/20 transition-colors">
                      <TD className="py-1.5">{item.categoryName} {item.vendorName && `(${item.vendorName})`}</TD>
                      <TD className="text-right py-1.5">{rubFmt(item.amount)}</TD>
                    </TR>
                  ))}
                  <TR className="border-t hover:bg-muted/30 transition-colors">
                    <TD className="font-bold py-1.5">Итого CAPEX</TD>
                    <TD className="text-right font-bold py-1.5">{rubFmt(totals.capex)}</TD>
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
