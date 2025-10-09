"use client"
import { useEffect, useState } from 'react'
import { api } from '@/lib/api-client'

function dtToYMD(d: Date) {
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

export default function ConsumptionClient() {
  const [from, setFrom] = useState(dtToYMD(new Date()))
  const [to, setTo] = useState(dtToYMD(new Date()))
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const j: any = await api.post('/api/iiko/stores/consumption', { from, to })
      setRows(Array.isArray(j?.rows) ? j.rows : [])
    } catch { setRows([]) }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  return (
    <div className="space-y-3">
      <div className="flex items-end gap-2">
        <div>
          <div className="text-xs text-muted-foreground">С даты</div>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="border rounded px-2 py-1 text-sm" />
        </div>
        <div>
          <div className="text-xs text-muted-foreground">По дату</div>
          <input type="date" value={to} onChange={e => setTo(e.target.value)} className="border rounded px-2 py-1 text-sm" />
        </div>
        <button onClick={load} className="border rounded px-3 py-1 text-sm">Показать</button>
      </div>
      <div className="rounded-lg border p-2">
        {loading ? <div className="p-4 text-sm">Загрузка…</div> : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="px-2 py-1">Продукт</th>
                <th className="px-2 py-1">Кол-во</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 500).map((r: any, i: number) => (
                <tr key={i} className="border-t">
                  <td className="px-2 py-1">{r.productName || r.productId}</td>
                  <td className="px-2 py-1">{r.amount}</td>
                </tr>
              ))}
              {!rows.length && <tr><td className="px-2 py-3 text-sm text-muted-foreground" colSpan={2}>Нет данных за период</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

