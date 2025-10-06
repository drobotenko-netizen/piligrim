"use client"
import { useEffect, useState } from 'react'

function startOfMonth(d = new Date()) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1))
}
function endOfMonth(d = new Date()) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1))
}
function dtToYMD(d: Date) {
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

export default function ReturnsClient() {
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000'
  const [from, setFrom] = useState(dtToYMD(startOfMonth()))
  const [to, setTo] = useState(dtToYMD(endOfMonth()))
  const [group, setGroup] = useState<'waiter' | 'register'>('waiter')
  const [summary, setSummary] = useState<any[]>([])
  const [details, setDetails] = useState<any[]>([])
  const [dishes, setDishes] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const r = await fetch(`${API_BASE}/api/iiko/local/returns?from=${from}&to=${to}&group=${group}`, { cache: 'no-store', credentials: 'include' })
      const j = await r.json()
      setSummary(Array.isArray(j?.rows) ? j.rows : [])
      setDetails(Array.isArray(j?.details) ? j.details : [])
      setDishes(Array.isArray(j?.dishes) ? j.dishes : [])
    } catch {
      setSummary([]); setDetails([]); setDishes([])
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-2">
        <div>
          <div className="text-xs text-muted-foreground">От</div>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="border rounded px-2 py-1 text-sm" />
        </div>
        <div>
          <div className="text-xs text-muted-foreground">До</div>
          <input type="date" value={to} onChange={e => setTo(e.target.value)} className="border rounded px-2 py-1 text-sm" />
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Группировка</div>
          <select value={group} onChange={e => setGroup(e.target.value as any)} className="border rounded px-2 py-1 text-sm">
            <option value="waiter">По официантам</option>
            <option value="register">По кассам</option>
          </select>
        </div>
        <button onClick={load} className="border rounded px-3 py-1 text-sm">Показать</button>
      </div>

      <div className="rounded-lg border">
        <div className="px-2 py-2 font-medium">Сводка ({group === 'waiter' ? 'по официантам' : 'по кассам'})</div>
        {loading ? <div className="p-3 text-sm">Загрузка…</div> : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="px-2 py-2">{group === 'waiter' ? 'Официант' : 'Касса'}</th>
                <th className="px-2 py-2">Возвраты, шт</th>
                <th className="px-2 py-2">Возвраты, ₽</th>
              </tr>
            </thead>
            <tbody>
              {summary.map((r: any, idx: number) => (
                <tr key={idx} className="border-t">
                  <td className="px-2 py-2">{r.key}</td>
                  <td className="px-2 py-2">{r.count}</td>
                  <td className="px-2 py-2">{r.sum}</td>
                </tr>
              ))}
              {!summary.length && <tr><td className="px-2 py-3 text-sm text-muted-foreground" colSpan={3}>Нет данных</td></tr>}
            </tbody>
          </table>
        )}
      </div>

      <div className="rounded-lg border">
        <div className="px-2 py-2 font-medium">Детализация чеков</div>
        {loading ? <div className="p-3 text-sm">Загрузка…</div> : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="px-2 py-2">Дата</th>
                <th className="px-2 py-2">Чек</th>
                <th className="px-2 py-2">Касса</th>
                <th className="px-2 py-2">Возврат, ₽</th>
              </tr>
            </thead>
            <tbody>
              {details.map((r: any, idx: number) => (
                <tr key={idx} className="border-t">
                  <td className="px-2 py-2">{new Date(r.date).toISOString().slice(0,10)}</td>
                  <td className="px-2 py-2">{r.orderNum}</td>
                  <td className="px-2 py-2">{r.register}</td>
                  <td className="px-2 py-2">{r.returnSum || 0}</td>
                </tr>
              ))}
              {!details.length && <tr><td className="px-2 py-3 text-sm text-muted-foreground" colSpan={4}>Нет данных</td></tr>}
            </tbody>
          </table>
        )}
      </div>

      <div className="rounded-lg border">
        <div className="px-2 py-2 font-medium">Позиции в возвратах (ТОП)</div>
        {loading ? <div className="p-3 text-sm">Загрузка…</div> : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="px-2 py-2">Блюдо</th>
                <th className="px-2 py-2">Возвраты, шт (чеков)</th>
                <th className="px-2 py-2">Возвраты, ₽</th>
              </tr>
            </thead>
            <tbody>
              {dishes.map((r: any, idx: number) => (
                <tr key={idx} className="border-t">
                  <td className="px-2 py-2">{r.dishName}</td>
                  <td className="px-2 py-2">{r.count}</td>
                  <td className="px-2 py-2">{r.sum}</td>
                </tr>
              ))}
              {!dishes.length && <tr><td className="px-2 py-3 text-sm text-muted-foreground" colSpan={3}>Нет данных</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}


