"use client"
import { useEffect, useMemo, useState } from 'react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table'

function dtToYMD(d: Date) {
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

function SummaryCard({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="rounded-lg border p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-2xl font-semibold">{value ?? '-'}</div>
    </div>
  )
}

function formatNumber(value: number | null): string {
  if (value === null || value === undefined) return '-'
  return value.toLocaleString('ru-RU')
}

export default function SummaryClient() {
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000'
  const now = new Date()
  const [year, setYear] = useState(now.getUTCFullYear())
  const [month, setMonth] = useState(now.getUTCMonth() + 1)
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState<'amounts' | 'receipts'>('amounts')

  async function load() {
    setLoading(true)
    try {
      const r = await fetch(`${API_BASE}/api/iiko/local/sales/summary/month?year=${year}&month=${month}`, { cache: 'no-store', credentials: 'include' })
      const j = await r.json()
      setRows(Array.isArray(j?.rows) ? j.rows : [])
    } catch {
      setRows([])
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])
  const total = useMemo(() => {
    let net = 0, receipts = 0, returnsCount = 0, returnsSum = 0, deletedCount = 0, deletedSum = 0, deliveryNet = 0, deliveryCount = 0, deliveryCourierNet = 0, deliveryCourierCount = 0, deliveryPickupNet = 0, deliveryPickupCount = 0, hallNet = 0, hallCount = 0
    for (const r of rows) {
      net += r.net || 0
      receipts += r.receipts || 0
      returnsCount += r.returnsCount || 0
      returnsSum += r.returnsSum || 0
      deletedCount += r.deletedCount || 0
      deletedSum += r.deletedSum || 0
      deliveryNet += r.deliveryNet || 0
      deliveryCount += r.deliveryCount || 0
      deliveryCourierNet += r.deliveryCourierNet || 0
      deliveryCourierCount += r.deliveryCourierCount || 0
      deliveryPickupNet += r.deliveryPickupNet || 0
      deliveryPickupCount += r.deliveryPickupCount || 0
      hallNet += r.hallNet || 0
      hallCount += r.hallCount || 0
    }
    return { net, receipts, returnsCount, returnsSum, deletedCount, deletedSum, deliveryNet, deliveryCount, deliveryCourierNet, deliveryCourierCount, deliveryPickupNet, deliveryPickupCount, hallNet, hallCount }
  }, [rows])

  return (
    <Card>
      <CardContent className="p-4 space-y-3 flex flex-col h-[calc(100vh-4rem)] min-h-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <select value={year} onChange={e => setYear(Number(e.target.value))} className="border rounded px-2 py-1 text-sm">
              {Array.from({ length: 5 }).map((_,i) => now.getUTCFullYear()-2+i).map(y => (<option key={y} value={y}>{y}</option>))}
            </select>
            <select value={month} onChange={e => setMonth(Number(e.target.value))} className="border rounded px-2 py-1 text-sm capitalize">
              {Array.from({ length: 12 }).map((_,i) => i+1).map(m => (
                <option key={m} value={m}>{new Date(Date.UTC(2000, m-1)).toLocaleDateString('ru-RU', { month: 'long' })}</option>
              ))}
            </select>
            <button onClick={load} className="border rounded px-3 py-1 text-sm">Показать</button>
          </div>
          <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
            <TabsList>
              <TabsTrigger value="amounts">Суммы</TabsTrigger>
              <TabsTrigger value="receipts">Чеки</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        
        {loading ? (
          <div className="p-4 text-sm">Загрузка…</div>
        ) : (
          <div className="flex-1 overflow-auto">
            <Table className="w-full">
              <THead className="sticky top-0 bg-card z-10">
                <TR className="!border-0">
                  <TH className="w-[120px] !h-8 !px-2 !py-1">Дата</TH>
                  {tab === 'amounts' ? (
                    <>
                      <TH className="text-right w-[120px] !h-8 !px-2 !py-1">Выручка</TH>
                      <TH className="text-right w-[120px] !h-8 !px-2 !py-1">Зал, ₽</TH>
                      <TH className="text-right w-[120px] !h-8 !px-2 !py-1">Курьер, ₽</TH>
                      <TH className="text-right w-[120px] !h-8 !px-2 !py-1">Самовывоз, ₽</TH>
                      <TH className="text-right w-[120px] !h-8 !px-2 !py-1">Возвраты, ₽</TH>
                      <TH className="text-right w-[120px] !h-8 !px-2 !py-1">Удаленные, ₽</TH>
                    </>
                  ) : (
                    <>
                      <TH className="text-right w-[120px] !h-8 !px-2 !py-1">Чеки</TH>
                      <TH className="text-right w-[120px] !h-8 !px-2 !py-1">Зал, чеки</TH>
                      <TH className="text-right w-[120px] !h-8 !px-2 !py-1">Курьер, чеки</TH>
                      <TH className="text-right w-[120px] !h-8 !px-2 !py-1">Самовывоз, чеки</TH>
                      <TH className="text-right w-[120px] !h-8 !px-2 !py-1">Возвраты, шт</TH>
                      <TH className="text-right w-[120px] !h-8 !px-2 !py-1">Удаленные, шт</TH>
                    </>
                  )}
                </TR>
                {/* Итоговая строка закреплена в заголовке */}
                <TR className="bg-card font-medium !border-0">
                  <TH className="w-[120px] !h-8 !px-2 !py-1 border-t border-b bg-card">Итого</TH>
                  {tab === 'amounts' ? (
                    <>
                      <TH className="text-right w-[120px] !h-8 !px-2 !py-1 border-t border-b bg-card">{formatNumber(total.net)}</TH>
                      <TH className="text-right w-[120px] !h-8 !px-2 !py-1 border-t border-b bg-card">{formatNumber(total.hallNet)}</TH>
                      <TH className="text-right w-[120px] !h-8 !px-2 !py-1 border-t border-b bg-card">{formatNumber(total.deliveryCourierNet)}</TH>
                      <TH className="text-right w-[120px] !h-8 !px-2 !py-1 border-t border-b bg-card">{formatNumber(total.deliveryPickupNet)}</TH>
                      <TH className="text-right w-[120px] !h-8 !px-2 !py-1 border-t border-b bg-card">{formatNumber(total.returnsSum)}</TH>
                      <TH className="text-right w-[120px] !h-8 !px-2 !py-1 border-t border-b bg-card">{formatNumber(total.deletedSum)}</TH>
                    </>
                  ) : (
                    <>
                      <TH className="text-right w-[120px] !h-8 !px-2 !py-1 border-t border-b bg-card">{formatNumber(total.receipts)}</TH>
                      <TH className="text-right w-[120px] !h-8 !px-2 !py-1 border-t border-b bg-card">{formatNumber(total.hallCount)}</TH>
                      <TH className="text-right w-[120px] !h-8 !px-2 !py-1 border-t border-b bg-card">{formatNumber(total.deliveryCourierCount)}</TH>
                      <TH className="text-right w-[120px] !h-8 !px-2 !py-1 border-t border-b bg-card">{formatNumber(total.deliveryPickupCount)}</TH>
                      <TH className="text-right w-[120px] !h-8 !px-2 !py-1 border-t border-b bg-card">{formatNumber(total.returnsCount)}</TH>
                      <TH className="text-right w-[120px] !h-8 !px-2 !py-1 border-t border-b bg-card">{formatNumber(total.deletedCount)}</TH>
                    </>
                  )}
                </TR>
              </THead>
              <TBody>
                
                {/* Данные */}
                {rows.map((r: any, idx: number) => (
                  <TR key={idx} className="h-8">
                    <TD className="px-2 py-1">{r.date}</TD>
                    {tab === 'amounts' ? (
                      <>
                        <TD className="text-right px-2 py-1">{formatNumber(r.net)}</TD>
                        <TD className="text-right px-2 py-1">{formatNumber(r.hallNet)}</TD>
                        <TD className="text-right px-2 py-1">{formatNumber(r.deliveryCourierNet)}</TD>
                        <TD className="text-right px-2 py-1">{formatNumber(r.deliveryPickupNet)}</TD>
                        <TD className="text-right px-2 py-1">{formatNumber(r.returnsSum)}</TD>
                        <TD className="text-right px-2 py-1">{formatNumber(r.deletedSum)}</TD>
                      </>
                    ) : (
                      <>
                        <TD className="text-right px-2 py-1">{formatNumber(r.receipts)}</TD>
                        <TD className="text-right px-2 py-1">{formatNumber(r.hallCount)}</TD>
                        <TD className="text-right px-2 py-1">{formatNumber(r.deliveryCourierCount)}</TD>
                        <TD className="text-right px-2 py-1">{formatNumber(r.deliveryPickupCount)}</TD>
                        <TD className="text-right px-2 py-1">{formatNumber(r.returnsCount)}</TD>
                        <TD className="text-right px-2 py-1">{formatNumber(r.deletedCount)}</TD>
                      </>
                    )}
                  </TR>
                ))}
                {!rows.length && (
                  <TR>
                    <TD colSpan={7} className="text-center text-muted-foreground">Нет данных за месяц</TD>
                  </TR>
                )}
              </TBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}


