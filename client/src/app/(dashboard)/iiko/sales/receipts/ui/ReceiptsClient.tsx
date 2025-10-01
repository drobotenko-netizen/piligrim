"use client"
import { useEffect, useMemo, useState } from 'react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ChevronDown, ChevronRight } from 'lucide-react'

function dtToYMD(d: Date) {
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

export default function ReceiptsClient() {
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000'
  const [date, setDate] = useState(dtToYMD(new Date()))
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState<'all' | 'actual' | 'returns' | 'deleted'>('all')
  const [expandedReceipts, setExpandedReceipts] = useState<Set<string>>(new Set())
  const returnsCount = useMemo(() => rows.filter((r: any) => (!!r.isReturn) || ((Number(r.returnSum) || 0) > 0)).length, [rows])
  const deletedCount = useMemo(() => rows.filter((r: any) => r.isDeleted === true).length, [rows])
  const actualCount = useMemo(
    () => rows.filter((r: any) => (r.isDeleted !== true) && !((!!r.isReturn) || ((Number(r.returnSum) || 0) > 0))).length,
    [rows]
  )

  const toggleReceipt = (orderNum: string) => {
    const newExpanded = new Set(expandedReceipts)
    if (newExpanded.has(orderNum)) {
      newExpanded.delete(orderNum)
    } else {
      newExpanded.add(orderNum)
    }
    setExpandedReceipts(newExpanded)
  }

  async function load() {
    setLoading(true)
    try {
      const r = await fetch(`${API_BASE}/api/iiko/local/sales/receipts?date=${date}&includeItems=1`, { cache: 'no-store', headers: { 'x-role': 'ADMIN' } })
      const j = await r.json()
      setRows(Array.isArray(j?.rows) ? j.rows : [])
    } catch { setRows([]) }
    setLoading(false)
  }

  useEffect(() => { 
    load()
  }, [date])

  return (
    <div className="space-y-3">
      <div className="flex items-end gap-2">
        <div>
          <div className="text-xs text-muted-foreground">Дата</div>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="border rounded px-2 py-1 text-sm" />
        </div>
        <button onClick={() => { load(); }} className="border rounded px-3 py-1 text-sm">Показать</button>
        <div className="ml-auto flex items-center gap-3">
          <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
            <TabsList>
              <TabsTrigger value="all">Все: {rows.length}</TabsTrigger>
              <TabsTrigger value="actual">Актуальные: {actualCount}</TabsTrigger>
              <TabsTrigger value="returns">Возвраты: {returnsCount}</TabsTrigger>
              <TabsTrigger value="deleted">Удалённые: {deletedCount}</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>
      <div className="rounded-lg border">
        {loading ? <div className="p-4 text-sm">Загрузка…</div> : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="px-2 py-1 w-8"></th>
                <th className="px-2 py-1">Время</th>
                <th className="px-2 py-1 w-[20%]">Чек</th>
                <th className="px-2 py-1">Клиент</th>
                <th className="px-2 py-1">Телефон</th>
                <th className="px-2 py-1">Тип</th>
                <th className="px-2 py-1">Чистая</th>
                <th className="px-2 py-1">FC, %</th>
                <th className="px-2 py-1">Оплаты</th>
                <th className="px-2 py-1">Официант</th>
                <th className="px-2 py-1">Касса</th>
              </tr>
            </thead>
            <tbody>
              {rows
                .filter((r: any) => {
                  const isReturn = (!!r.isReturn) || ((Number(r.returnSum) || 0) > 0)
                  const isDeleted = r.isDeleted === true
                  if (tab === 'actual') return !isReturn && !isDeleted
                  if (tab === 'returns') return isReturn
                  if (tab === 'deleted') return isDeleted
                  return true
                })
                .map((r: any, i: number) => {
                const orderNum = r.orderNum
                const isExpanded = expandedReceipts.has(orderNum)
                const hasItems = r.items && r.items.length > 0
                const isReturn = (!!r.isReturn) || ((Number(r.returnSum) || 0) > 0)
                const isDeleted = r.isDeleted === true
                const rowClass = `border-t align-top ${isReturn || isDeleted ? 'text-red-600' : ''}`
                return (
                  <>
                    <tr key={`row-${i}`} className={rowClass}>
                      <td className="px-2 py-1">
                        {hasItems && (
                          <button
                            onClick={() => toggleReceipt(orderNum)}
                            className="p-1 hover:bg-muted rounded"
                          >
                            {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                          </button>
                        )}
                      </td>
                      <td className="px-2 py-1">
                        {(r.openTime || r.closeTime || '').toString().slice(11,16)}
                      </td>
                      <td className="px-2 py-1 w-[20%]">
                        <div className="font-medium">
                          {orderNum}
                          {isReturn ? <span className="ml-2 inline-block rounded bg-red-100 text-red-700 px-1 py-0.5 text-[10px] align-middle">Возврат</span> : null}
                          {isDeleted ? <span className="ml-2 inline-block rounded bg-gray-100 text-gray-700 px-1 py-0.5 text-[10px] align-middle">Удален</span> : null}
                        </div>
                      </td>
                      <td className="px-2 py-1">{r.customerName || ''}</td>
                      <td className="px-2 py-1">{r.customerPhone || ''}</td>
                      <td className="px-2 py-1">{r.orderType || ''}</td>
                      <td className="px-2 py-1">{r.net}</td>
                      <td className="px-2 py-1">{r.foodCostPct}</td>
                      <td className="px-2 py-1">{(r.payTypes || []).join(', ')}</td>
                      <td className="px-2 py-1">{r.waiter}</td>
                      <td className="px-2 py-1">{r.register}</td>
                    </tr>
                    
                    {/* Развернутые позиции чека */}
                    {isExpanded && hasItems && (
                      <>
                        {r.items.map((item: any, itemIndex: number) => (
                          <tr key={`item-${i}-${itemIndex}`} className="bg-muted/20">
                            <td className="px-2 py-1"></td>
                            <td className="px-2 py-1"></td>
                            <td className="px-2 py-1 pl-6">
                              <div className="text-sm">
                                <span className="text-muted-foreground">×{item.qty}</span> {item.dishName}
                                {item.size && <span className="text-muted-foreground"> ({item.size})</span>}
                              </div>
                            </td>
                            <td className="px-2 py-1"></td>
                            <td className="px-2 py-1"></td>
                            <td className="px-2 py-1"></td>
                            <td className="px-2 py-1 text-sm">{item.net}₽</td>
                            <td className="px-2 py-1 text-sm">{item.cost}₽</td>
                            <td className="px-2 py-1"></td>
                            <td className="px-2 py-1"></td>
                            <td className="px-2 py-1"></td>
                          </tr>
                        ))}
                      </>
                    )}
                    
                  </>
                )
              })}
              {!rows.length && <tr><td className="px-2 py-3 text-sm text-muted-foreground" colSpan={11}>Нет чеков на дату</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}


