"use client"
import { useState } from 'react'
import { useApi } from '@/hooks/use-api'

function dtToYMD(d: Date) {
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

export default function PaytypesClient() {
  const [date, setDate] = useState(dtToYMD(new Date()))
  const { data, loading, refetch } = useApi<{ rows?: any[] }>(`/api/iiko/local/sales/paytypes`, { 
    skip: true,
    params: { date }
  })

  const rows = Array.isArray(data?.rows) ? data.rows : (Array.isArray(data) ? data : [])

  return (
    <div className="space-y-3">
      <div className="flex items-end gap-2">
        <div>
          <div className="text-xs text-muted-foreground">Дата</div>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="border rounded px-2 py-1 text-sm" />
        </div>
        <button onClick={() => refetch({ date })} className="border rounded px-3 py-1 text-sm">Показать</button>
      </div>
      <div className="rounded-lg border p-2">
        {loading ? <div className="p-4 text-sm">Загрузка…</div> : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="px-2 py-1">Тип оплаты</th>
                <th className="px-2 py-1">Валовая</th>
                <th className="px-2 py-1">Чистая</th>
                <th className="px-2 py-1">Скидки</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r: any, i: number) => (
                <tr key={i} className="border-t">
                  <td className="px-2 py-1">{r.payType}</td>
                  <td className="px-2 py-1">{r.gross}</td>
                  <td className="px-2 py-1">{r.net}</td>
                  <td className="px-2 py-1">{r.discount}</td>
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

