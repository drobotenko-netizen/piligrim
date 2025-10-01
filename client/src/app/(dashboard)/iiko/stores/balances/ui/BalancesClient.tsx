"use client"
import { useEffect, useState } from 'react'

function dtToIso(d: Date) {
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${dd}T12:00:00.000`
}

export default function BalancesClient() {
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000'
  const [timestamp, setTimestamp] = useState(dtToIso(new Date()))
  const [rows, setRows] = useState<any[]>([])
  const [prodMap, setProdMap] = useState<Record<string, string>>({})
  const [storeMap, setStoreMap] = useState<Record<string, string>>({})
  const [storeAlias, setStoreAlias] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const [bRes, pRes, sRes] = await Promise.all([
        fetch(`${API_BASE}/api/iiko/stores/balances?timestamp=${encodeURIComponent(timestamp)}`, { cache: 'no-store', headers: { 'x-role': 'ADMIN' } }),
        fetch(`${API_BASE}/api/iiko/entities/products`, { cache: 'no-store', headers: { 'x-role': 'ADMIN' } }),
        fetch(`${API_BASE}/api/iiko/entities/stores`, { cache: 'no-store', headers: { 'x-role': 'ADMIN' } }),
      ])
      const [b, p, s] = await Promise.all([bRes.json(), pRes.json(), sRes.json()])
      setRows(Array.isArray(b?.rows) ? b.rows : [])
      const map: Record<string, string> = {}
      for (const it of (p?.items || [])) map[it.id] = it.name
      setProdMap(map)
      const smap: Record<string, string> = {}
      for (const it of (s?.items || [])) smap[it.id] = it.name
      setStoreMap(smap)
      // Build aliases for stores without names: "Склад 1", "Склад 2", ...
      const alias: Record<string, string> = {}
      let counter = 0
      for (const r of (Array.isArray(b?.rows) ? b.rows : [])) {
        const id = String(r?.store || '')
        if (!id || alias[id]) continue
        const name = smap[id]
        if (name && name !== id) alias[id] = name
        else alias[id] = `Склад ${++counter}`
      }
      setStoreAlias(alias)
    } catch { setRows([]) }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  return (
    <div className="space-y-3">
      <div className="flex items-end gap-2">
        <div>
          <div className="text-xs text-muted-foreground">Учетная дата-время</div>
          <input type="datetime-local" value={timestamp.slice(0, 16)} onChange={e => setTimestamp(e.target.value + ":00.000")} className="border rounded px-2 py-1 text-sm" />
        </div>
        <button onClick={load} className="border rounded px-3 py-1 text-sm">Показать</button>
      </div>
      <div className="rounded-lg border p-2">
        {loading ? <div className="p-4 text-sm">Загрузка…</div> : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="px-2 py-1">Склад</th>
                <th className="px-2 py-1">Продукт</th>
                <th className="px-2 py-1">Кол-во</th>
                <th className="px-2 py-1">Сумма</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 1000).map((r: any, i: number) => (
                <tr key={i} className="border-t">
                  <td className="px-2 py-1">{storeAlias[r.store] || storeMap[r.store] || r.store}</td>
                  <td className="px-2 py-1">{prodMap[r.product] || r.product}</td>
                  <td className="px-2 py-1">{r.amount}</td>
                  <td className="px-2 py-1">{r.sum}</td>
                </tr>
              ))}
              {!rows.length && <tr><td className="px-2 py-3 text-sm text-muted-foreground" colSpan={4}>Нет данных на дату</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}


