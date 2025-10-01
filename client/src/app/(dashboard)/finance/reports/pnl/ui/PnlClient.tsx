"use client"

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'

const MONTHS = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь']

export default function PnlClient({ initialY, initialM }: { initialY: number; initialM: number }) {
  const [y, setY] = useState(initialY)
  const [m, setM] = useState(initialM)
  const [data, setData] = useState<any>(null)
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000'

  function rubFmt(cents: number) { return new Intl.NumberFormat('ru-RU').format(Math.round(cents/100)) + ' ₽' }

  async function reload() {
    const res = await fetch(`${API_BASE}/api/reports/pnl?y=${y}&m=${m}`, { credentials: 'include' })
    const json = await res.json()
    setData(json)
  }

  useEffect(() => { reload() }, [y, m])

  if (!data) return <div>Загрузка...</div>

  const { revenue, expenses, totals } = data

  return (
    <Card>
      <CardContent className="p-4 space-y-3 flex flex-col h-[calc(100vh-4rem)] min-h-0">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold">P&L - Отчёт о прибылях и убытках</h2>
          <div className="flex items-center gap-2">
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
            <TBody>
              {/* Выручка */}
              <TR className="bg-blue-50">
                <TD className="font-bold py-3" colSpan={2}>ВЫРУЧКА (нетто)</TD>
                <TD className="text-right font-bold py-3">{rubFmt(totals.revenue)}</TD>
              </TR>
              {Object.entries(revenue.byChannel || {}).map(([channel, amount]: any) => (
                <TR key={channel}>
                  <TD className="pl-8"></TD>
                  <TD>{channel}</TD>
                  <TD className="text-right">{rubFmt(amount)}</TD>
                </TR>
              ))}

              {/* COGS */}
              <TR className="bg-orange-50">
                <TD className="font-bold py-3" colSpan={2}>Себестоимость (COGS)</TD>
                <TD className="text-right font-bold py-3 text-red-600">−{rubFmt(totals.cogs)}</TD>
              </TR>
              {expenses.cogs?.items?.map((item: any, idx: number) => (
                <TR key={idx}>
                  <TD className="pl-8"></TD>
                  <TD>{item.categoryName} {item.vendorName && `(${item.vendorName})`}</TD>
                  <TD className="text-right text-red-600">−{rubFmt(item.amount)}</TD>
                </TR>
              ))}

              {/* Валовая прибыль */}
              <TR className="bg-green-100 border-t-2 border-gray-400">
                <TD className="font-bold py-3" colSpan={2}>ВАЛОВАЯ ПРИБЫЛЬ</TD>
                <TD className="text-right font-bold py-3 text-green-700">{rubFmt(totals.grossProfit)}</TD>
              </TR>

              {/* OPEX */}
              <TR className="bg-yellow-50">
                <TD className="font-bold py-3" colSpan={2}>Операционные расходы (OPEX)</TD>
                <TD className="text-right font-bold py-3 text-red-600">−{rubFmt(totals.opex)}</TD>
              </TR>
              {expenses.opex?.items?.map((item: any, idx: number) => (
                <TR key={idx}>
                  <TD className="pl-8"></TD>
                  <TD>{item.categoryName} {item.vendorName && `(${item.vendorName})`}</TD>
                  <TD className="text-right text-red-600">−{rubFmt(item.amount)}</TD>
                </TR>
              ))}

              {/* Операционная прибыль */}
              <TR className="bg-green-200 border-t-2 border-gray-400">
                <TD className="font-bold py-3" colSpan={2}>ОПЕРАЦИОННАЯ ПРИБЫЛЬ</TD>
                <TD className="text-right font-bold py-3 text-green-800">{rubFmt(totals.operatingProfit)}</TD>
              </TR>

              {/* Прочие расходы */}
              {(totals.fee > 0 || totals.tax > 0 || totals.other > 0) && (
                <>
                  {totals.fee > 0 && (
                    <>
                      <TR className="bg-gray-50">
                        <TD className="font-semibold py-2" colSpan={2}>Комиссии и сборы</TD>
                        <TD className="text-right font-semibold py-2 text-red-600">−{rubFmt(totals.fee)}</TD>
                      </TR>
                      {expenses.fee?.items?.map((item: any, idx: number) => (
                        <TR key={idx}>
                          <TD className="pl-8"></TD>
                          <TD>{item.categoryName}</TD>
                          <TD className="text-right text-red-600">−{rubFmt(item.amount)}</TD>
                        </TR>
                      ))}
                    </>
                  )}

                  {totals.tax > 0 && (
                    <>
                      <TR className="bg-gray-50">
                        <TD className="font-semibold py-2" colSpan={2}>Налоги</TD>
                        <TD className="text-right font-semibold py-2 text-red-600">−{rubFmt(totals.tax)}</TD>
                      </TR>
                      {expenses.tax?.items?.map((item: any, idx: number) => (
                        <TR key={idx}>
                          <TD className="pl-8"></TD>
                          <TD>{item.categoryName}</TD>
                          <TD className="text-right text-red-600">−{rubFmt(item.amount)}</TD>
                        </TR>
                      ))}
                    </>
                  )}

                  {totals.other > 0 && (
                    <>
                      <TR className="bg-gray-50">
                        <TD className="font-semibold py-2" colSpan={2}>Прочие расходы</TD>
                        <TD className="text-right font-semibold py-2 text-red-600">−{rubFmt(totals.other)}</TD>
                      </TR>
                      {expenses.other?.items?.map((item: any, idx: number) => (
                        <TR key={idx}>
                          <TD className="pl-8"></TD>
                          <TD>{item.categoryName}</TD>
                          <TD className="text-right text-red-600">−{rubFmt(item.amount)}</TD>
                        </TR>
                      ))}
                    </>
                  )}
                </>
              )}

              {/* Чистая прибыль */}
              <TR className="bg-blue-100 border-t-4 border-gray-600">
                <TD className="font-bold py-4 text-lg" colSpan={2}>ЧИСТАЯ ПРИБЫЛЬ</TD>
                <TD className={`text-right font-bold py-4 text-lg ${totals.netProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  {rubFmt(totals.netProfit)}
                </TD>
              </TR>
            </TBody>
          </Table>

          {/* CAPEX отдельно (не влияет на прибыль, но показываем для информации) */}
          {totals.capex > 0 && (
            <div className="mt-6 pt-6 border-t">
              <h3 className="font-bold mb-3 text-gray-600">Капитальные расходы (не влияют на P&L):</h3>
              <Table>
                <TBody>
                  {expenses.capex?.items?.map((item: any, idx: number) => (
                    <TR key={idx}>
                      <TD>{item.categoryName} {item.vendorName && `(${item.vendorName})`}</TD>
                      <TD className="text-right text-gray-600">{rubFmt(item.amount)}</TD>
                    </TR>
                  ))}
                  <TR className="border-t">
                    <TD className="font-bold">Итого CAPEX</TD>
                    <TD className="text-right font-bold text-gray-700">{rubFmt(totals.capex)}</TD>
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
