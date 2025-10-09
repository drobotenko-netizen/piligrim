"use client"
import { useEffect, useState } from 'react'
import { getApiBase } from "@/lib/api"

function yearsAround(now = new Date(), before = 1, after = 0) {
  const y = now.getUTCFullYear()
  const arr: number[] = []
  for (let i = y - before; i <= y + after; i++) arr.push(i)
  return arr
}

export default function ImportClient() {
  const API_BASE = getApiBase()
  const [year, setYear] = useState(new Date().getUTCFullYear())
  const [status, setStatus] = useState<{ year: number; months: { month: number; loaded: boolean; receipts: number }[] } | null>(null)
  const [loading, setLoading] = useState(false)
  const [busyMonth, setBusyMonth] = useState<number | null>(null)
  const [progress, setProgress] = useState<Record<number, { done: number; total: number }>>({})
  const [rangeFrom, setRangeFrom] = useState('2024-08-01')
  const [rangeTo, setRangeTo] = useState('2025-10-01')
  const [busyRange, setBusyRange] = useState(false)
  const [rangeProgress, setRangeProgress] = useState<{ current: number; total: number; currentDate: string } | null>(null)

  async function loadStatus(y = year) {
    setLoading(true)
    try {
      const r = await fetch(`${API_BASE}/api/iiko/local/import/status?year=${y}`, { cache: 'no-store', credentials: 'include' })
      const j = await r.json()
      setStatus(j)
    } catch { setStatus(null) }
    setLoading(false)
  }

  useEffect(() => { loadStatus() }, [year])

  async function importMonth(m: number) {
    setBusyMonth(m)
    try {
      // Импортируем ПО ДНЯМ, чтобы был прогресс и не висел запрос
      const start = new Date(Date.UTC(year, m - 1, 1))
      const end = new Date(Date.UTC(year, m, 1))
      const total = Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000))
      setProgress(p => ({ ...p, [m]: { done: 0, total } }))
      for (let d = new Date(start); d < end; d.setUTCDate(d.getUTCDate() + 1)) {
        const y = d.getUTCFullYear()
        const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
        const dd = String(d.getUTCDate()).padStart(2, '0')
        const date = `${y}-${mm}-${dd}`
        try {
          const r = await fetch(`${API_BASE}/api/iiko/etl/receipts`, {
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ date })
          })
          if (!r.ok) {
            console.error('Import day failed', date, await r.text())
          }
        } catch (e) {
          console.error('Import day error', date, e)
        }
        setProgress(p => ({ ...p, [m]: { done: Math.min((p[m]?.done || 0) + 1, total), total } }))
      }
      await loadStatus()
    } finally {
      setBusyMonth(null)
    }
  }

  async function importRange() {
    setBusyRange(true)
    setRangeProgress(null)
    
    // Подсчитываем общее количество дней
    const fromDate = new Date(rangeFrom + 'T00:00:00.000Z')
    const toDate = new Date(rangeTo + 'T00:00:00.000Z')
    const totalDays = Math.ceil((toDate.getTime() - fromDate.getTime()) / (24 * 60 * 60 * 1000))
    
    try {
      // Импортируем по дням для отображения прогресса
      let processedDays = 0
      for (let d = new Date(fromDate); d < toDate; d.setUTCDate(d.getUTCDate() + 1)) {
        const y = d.getUTCFullYear()
        const m = String(d.getUTCMonth() + 1).padStart(2, '0')
        const day = String(d.getUTCDate()).padStart(2, '0')
        const date = `${y}-${m}-${day}`
        
        setRangeProgress({ current: processedDays + 1, total: totalDays, currentDate: date })
        
        try {
          const r = await fetch(`${API_BASE}/api/iiko/etl/receipts`, {
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ date })
          })
          if (!r.ok) {
            console.error('Import day failed', date, await r.text())
          }
        } catch (e) {
          console.error('Import day error', date, e)
        }
        
        processedDays++
      }
      
      alert('Импорт диапазона завершен')
      await loadStatus()
    } catch (e) {
      console.error('Import range error', e)
      alert('Ошибка импорта диапазона')
    } finally {
      setBusyRange(false)
      setRangeProgress(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-2">
        <div>
          <div className="text-xs text-muted-foreground">Год</div>
          <select value={year} onChange={e => setYear(Number(e.target.value))} className="border rounded px-2 py-1 text-sm">
            {yearsAround().map(y => (<option key={y} value={y}>{y}</option>))}
          </select>
        </div>
        <button onClick={() => loadStatus()} className="border rounded px-3 py-1 text-sm">Обновить</button>
      </div>

      <div className="rounded-lg border p-4">
        <h3 className="text-sm font-medium mb-3">Импорт диапазона дат</h3>
        <div className="flex items-end gap-2">
          <div>
            <div className="text-xs text-muted-foreground">От</div>
            <input 
              type="date" 
              value={rangeFrom} 
              onChange={e => setRangeFrom(e.target.value)} 
              className="border rounded px-2 py-1 text-sm" 
            />
          </div>
          <div>
            <div className="text-xs text-muted-foreground">До</div>
            <input 
              type="date" 
              value={rangeTo} 
              onChange={e => setRangeTo(e.target.value)} 
              className="border rounded px-2 py-1 text-sm" 
            />
          </div>
          <button 
            onClick={importRange} 
            disabled={busyRange}
            className="border rounded px-3 py-1 text-sm disabled:opacity-50"
          >
            {busyRange ? 'Импорт...' : 'Импортировать диапазон'}
          </button>
        </div>
        {rangeProgress && (
          <div className="mt-3 p-3 bg-blue-50 rounded border">
            <div className="text-sm font-medium mb-2">Прогресс импорта</div>
            <div className="text-xs text-muted-foreground mb-2">
              Обрабатывается: {rangeProgress.currentDate} ({rangeProgress.current}/{rangeProgress.total})
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                style={{ width: `${(rangeProgress.current / rangeProgress.total) * 100}%` }}
              ></div>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {Math.round((rangeProgress.current / rangeProgress.total) * 100)}% завершено
            </div>
          </div>
        )}
      </div>

      <div className="rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted-foreground">
              <th className="px-2 py-2">Месяц</th>
              <th className="px-2 py-2">Статус</th>
              <th className="px-2 py-2 w-[1%]"></th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 12 }).map((_, idx) => {
              const m = idx + 1
              const mo = status?.months?.find(x => x.month === m)
              const isLoaded = !!mo && mo.loaded
              const label = new Date(Date.UTC(2000, m - 1)).toLocaleDateString('ru-RU', { month: 'long' })
              return (
                <tr key={m} className="border-t">
                  <td className="px-2 py-2 capitalize">{label}</td>
                  <td className="px-2 py-2">{mo?.receipts ? `${mo.receipts} чеков` : '-'}</td>
                  <td className="px-2 py-2 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        className="border rounded px-2 py-1 text-sm disabled:opacity-50"
                        disabled={busyMonth === m}
                        onClick={() => {
                          if (isLoaded) {
                            if (!confirm('Месяц уже загружен полностью. Выполнить ПЕРЕИМПОРТ?')) return
                          }
                          importMonth(m)
                        }}
                      >{busyMonth === m ? 'Загрузка…' : (isLoaded ? 'Переимпорт' : 'Загрузить')}</button>
                      {busyMonth === m && (
                        <span className="text-xs text-muted-foreground whitespace-nowrap">{(progress[m]?.done || 0)}/{progress[m]?.total || 0}</span>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}


