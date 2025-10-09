"use client"
import { useEffect, useMemo, useState } from 'react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table'
import { useApi } from '@/hooks/use-api'

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
  const now = new Date()
  const [year, setYear] = useState(now.getUTCFullYear())
  const [month, setMonth] = useState(now.getUTCMonth() + 1)
  const [tab, setTab] = useState<'amounts' | 'receipts'>('amounts')

  const { data, loading, refetch } = useApi<{ rows?: any[] }>('/api/iiko/local/sales/summary/month', {
    skip: true,
    params: { year, month }
  })

  const rows = Array.isArray(data?.rows) ? data.rows : []

  useEffect(() => {
    refetch({ year, month })
  }, [year, month])

  const totals = useMemo(() => {
    if (!rows.length) return { gross: 0, net: 0, discount: 0, receipts: 0 }
    return rows.reduce((acc, r) => ({
      gross: acc.gross + (r.gross || 0),
      net: acc.net + (r.net || 0),
      discount: acc.discount + (r.discount || 0),
      receipts: acc.receipts + (r.receipts || 0)
    }), { gross: 0, net: 0, discount: 0, receipts: 0 })
  }, [rows])

  return (
    <div className="space-y-3">
      <div className="flex items-end gap-2">
        <div>
          <div className="text-xs text-muted-foreground">Год</div>
          <input 
            type="number" 
            value={year} 
            onChange={e => setYear(parseInt(e.target.value))} 
            className="border rounded px-2 py-1 text-sm w-24" 
          />
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Месяц</div>
          <input 
            type="number" 
            min="1" 
            max="12" 
            value={month} 
            onChange={e => setMonth(parseInt(e.target.value))} 
            className="border rounded px-2 py-1 text-sm w-20" 
          />
        </div>
        <button onClick={() => refetch({ year, month })} className="border rounded px-3 py-1 text-sm">Показать</button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard label="Валовая" value={totals.gross} />
        <SummaryCard label="Чистая" value={totals.net} />
        <SummaryCard label="Скидки" value={totals.discount} />
        <SummaryCard label="Чеков" value={totals.receipts} />
      </div>

      <Tabs value={tab} onValueChange={(v: any) => setTab(v)}>
        <TabsList>
          <TabsTrigger value="amounts">Суммы</TabsTrigger>
          <TabsTrigger value="receipts">Чеки</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card>
        <CardContent className="p-2">
          {loading ? <div className="p-4 text-sm">Загрузка…</div> : (
            <Table className="w-full">
              <THead>
                <TR className="text-left text-muted-foreground">
                  <TH className="px-2 py-1">Дата</TH>
                  {tab === 'amounts' ? (
                    <>
                      <TH className="px-2 py-1">Валовая</TH>
                      <TH className="px-2 py-1">Чистая</TH>
                      <TH className="px-2 py-1">Скидки</TH>
                    </>
                  ) : (
                    <TH className="px-2 py-1">Чеков</TH>
                  )}
                </TR>
              </THead>
              <TBody>
                {rows.map((r: any, i: number) => (
                  <TR key={i} className="border-t">
                    <TD className="px-2 py-1">{r.date}</TD>
                    {tab === 'amounts' ? (
                      <>
                        <TD className="px-2 py-1">{formatNumber(r.gross)}</TD>
                        <TD className="px-2 py-1">{formatNumber(r.net)}</TD>
                        <TD className="px-2 py-1">{formatNumber(r.discount)}</TD>
                      </>
                    ) : (
                      <TD className="px-2 py-1">{r.receipts}</TD>
                    )}
                  </TR>
                ))}
                {!rows.length && <TR><TD className="px-2 py-3 text-sm text-muted-foreground" colSpan={4}>Нет данных</TD></TR>}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

