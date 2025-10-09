"use client"
import { useEffect, useMemo, useRef, useState } from 'react'
import { getApiBase } from "@/lib/api"
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts'

function dtToYMD(d: Date) {
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

type ViewMode = 'day' | 'week' | 'month'

export default function HoursClient() {
  const API_BASE = getApiBase()
  const [from, setFrom] = useState<string>('2025-09-01')
  const [to, setTo] = useState<string>('2025-09-30')
  const [view, setView] = useState<ViewMode>('day')
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [colKeys, setColKeys] = useState<string[]>([])
  const [colLabels, setColLabels] = useState<Record<string, string>>({})
  const HOURS = useMemo(() => Array.from({ length: 14 }, (_, i) => String(10 + i).padStart(2, '0')), [])
  const [version, setVersion] = useState(0)
  const WEEKDAY_KEYS = useMemo(() => ['1','2','3','4','5','6','7'], []) // Пн..Вс
  const WEEKDAY_LABELS: Record<string, string> = { '1': 'Пн', '2': 'Вт', '3': 'Ср', '4': 'Чт', '5': 'Пт', '6': 'Сб', '7': 'Вс' }
  const [chartTab, setChartTab] = useState<'all' | 'work' | 'weekend'>('all')
  const [chartMetric, setChartMetric] = useState<'count' | 'net'>('count')
  const [weeklyAvgTab, setWeeklyAvgTab] = useState<'count' | 'net'>('count')
  const [statsTab, setStatsTab] = useState<'count' | 'net'>('count')
  const countRef = useRef<Record<string, Record<string, number>>>({})
  const netRef = useRef<Record<string, Record<string, number>>>({})
  const countWRef = useRef<Record<string, Record<string, number>>>({})
  const netWRef = useRef<Record<string, Record<string, number>>>({})

  // Хелперы
  function listDatesInclusive(fromYmd: string, toYmd: string): string[] {
    const out: string[] = []
    try {
      let start = new Date(fromYmd + 'T00:00:00.000Z')
      let end = new Date(toYmd + 'T00:00:00.000Z')
      if (start.getTime() > end.getTime()) {
        const tmp = start; start = end; end = tmp
      }
      for (let d = new Date(start); d <= end; d = new Date(d.getTime() + 24 * 60 * 60 * 1000)) {
        out.push(dtToYMD(d))
      }
    } catch {}
    return out
  }

  function weekdayIndex(ymd: string): number { // 1..7 (Пн..Вс)
    const d = new Date(ymd + 'T00:00:00.000Z')
    const wd = d.getUTCDay() || 7 // 1..7, где 7=вс
    return wd
  }

  function formatDayLabel(ymd: string): string {
    try {
      const d = new Date(ymd + 'T00:00:00.000Z')
      return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })
    } catch { return ymd }
  }

  function startOfWeekMonday(ymd: string): string {
    const d = new Date(ymd + 'T00:00:00.000Z')
    const dow = d.getUTCDay() || 7
    const monday = new Date(d)
    monday.setUTCDate(d.getUTCDate() - (dow === 7 ? 6 : (dow - 1)))
    return dtToYMD(monday)
  }

  function monthKey(ymd: string): string { // YYYY-MM
    return String(ymd).slice(0, 7)
  }

  function monthLabelFromKey(yyyyMm: string): string {
    try {
      const [y, m] = yyyyMm.split('-').map(Number)
      const d = new Date(Date.UTC(y, (m || 1) - 1, 1))
      return d.toLocaleDateString('ru-RU', { month: 'short' })
    } catch { return yyyyMm }
  }

  function listMonthsInclusive(fromYmd: string, toYmd: string): Array<{ year: number; month: number }> {
    const result: Array<{ year: number; month: number }> = []
    try {
      let start = new Date(fromYmd + 'T00:00:00.000Z')
      let end = new Date(toYmd + 'T00:00:00.000Z')
      if (start.getTime() > end.getTime()) { const t = start; start = end; end = t }
      let y = start.getUTCFullYear()
      let m = start.getUTCMonth() + 1
      const endY = end.getUTCFullYear()
      const endM = end.getUTCMonth() + 1
      while (y < endY || (y === endY && m <= endM)) {
        result.push({ year: y, month: m })
        m += 1
        if (m > 12) { m = 1; y += 1 }
      }
    } catch {}
    return result
  }

  async function load() {
    setLoading(true)
    try {
      const days = listDatesInclusive(from, to)

      // Определяем колонки по гранулярности
      let cols: string[] = []
      let labels: Record<string, string> = {}
      if (view === 'day') {
        cols = days
        labels = Object.fromEntries(days.map(ymd => [ymd, formatDayLabel(ymd)]))
      } else if (view === 'week') {
        const uniq = new Map<string, string>()
        for (const d of days) {
          const wk = startOfWeekMonday(d)
          if (!uniq.has(wk)) uniq.set(wk, formatDayLabel(wk))
        }
        cols = Array.from(uniq.keys()).sort()
        labels = Object.fromEntries(cols.map(k => [k, uniq.get(k)!]))
      } else {
        const uniq = new Map<string, string>()
        for (const d of days) {
          const mk = monthKey(d)
          if (!uniq.has(mk)) uniq.set(mk, monthLabelFromKey(mk))
        }
        cols = Array.from(uniq.keys()).sort()
        labels = Object.fromEntries(cols.map(k => [k, uniq.get(k)!]))
      }

      // Новый быстрый эндпоинт матрицы
      const fast = await fetch(`${API_BASE}/api/iiko/local/sales/hours/matrix?from=${from}&to=${to}`, { cache: 'no-store', credentials: 'include' })
      const jm = await fast.json()
      const colsResp: string[] = Array.isArray(jm?.cols) ? jm.cols : cols

      // Base matrices from server (per-day columns)
      const srvCount: Record<string, Record<string, number>> = jm?.count || {}
      const srvNet: Record<string, Record<string, number>> = jm?.net || {}
      const srvCountW: Record<string, Record<string, number>> = jm?.countW || {}
      const srvNetW: Record<string, Record<string, number>> = jm?.netW || {}

      // Aggregate columns depending on view
      if (view === 'day') {
        countRef.current = srvCount
        netRef.current = srvNet
        setColKeys(colsResp)
        setColLabels(Object.fromEntries(colsResp.map(c => [c, formatDayLabel(c)])))
      } else if (view === 'week') {
        const weekKeys = Array.from(new Set(colsResp.map(d => startOfWeekMonday(d)))).sort()
        const aggCount: Record<string, Record<string, number>> = {}
        const aggNet: Record<string, Record<string, number>> = {}
        for (const h of Object.keys(srvCount)) {
          aggCount[h] = Object.fromEntries(weekKeys.map(w => [w, 0]))
          aggNet[h] = Object.fromEntries(weekKeys.map(w => [w, 0]))
          for (const d of colsResp) {
            const wk = startOfWeekMonday(d)
            aggCount[h][wk] += Number(srvCount[h]?.[d] || 0)
            aggNet[h][wk] += Number(srvNet[h]?.[d] || 0)
          }
        }
        countRef.current = aggCount
        netRef.current = aggNet
        setColKeys(weekKeys)
        setColLabels(Object.fromEntries(weekKeys.map(w => [w, formatDayLabel(w)])))
      } else {
        // month
        const monthKeys = Array.from(new Set(colsResp.map(d => monthKey(d)))).sort()
        const aggCount: Record<string, Record<string, number>> = {}
        const aggNet: Record<string, Record<string, number>> = {}
        for (const h of Object.keys(srvCount)) {
          aggCount[h] = Object.fromEntries(monthKeys.map(mk => [mk, 0]))
          aggNet[h] = Object.fromEntries(monthKeys.map(mk => [mk, 0]))
          for (const d of colsResp) {
            const mk = monthKey(d)
            aggCount[h][mk] += Number(srvCount[h]?.[d] || 0)
            aggNet[h][mk] += Number(srvNet[h]?.[d] || 0)
          }
        }
        countRef.current = aggCount
        netRef.current = aggNet
        setColKeys(monthKeys)
        setColLabels(Object.fromEntries(monthKeys.map(mk => [mk, monthLabelFromKey(mk)])))
      }

      // Weekday matrices as-is from server
      countWRef.current = srvCountW
      netWRef.current = srvNetW
      setRows([])
      setLoading(false)
      setVersion(v => v + 1)
    } catch {
      setRows([])
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [from, to, view])

  // Getters from refs
  const getCount = (h: string, c: string) => countRef.current?.[h]?.[c] ?? 0
  const getNet = (h: string, c: string) => netRef.current?.[h]?.[c] ?? 0
  const getCountW = (h: string, w: string) => countWRef.current?.[h]?.[w] ?? 0
  const getNetW = (h: string, w: string) => netWRef.current?.[h]?.[w] ?? 0

  // Количество вхождений каждого дня недели в диапазоне
  const weekdayOccurrences = useMemo(() => {
    const days = listDatesInclusive(from, to)
    const occ: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0, '6': 0, '7': 0 }
    for (const d of days) {
      const w = String(weekdayIndex(d))
      occ[w] = (occ[w] || 0) + 1
    }
    return occ
  }, [from, to])

  const chartData = useMemo(() => {
    const workDenom = (weekdayOccurrences['1']||0)+(weekdayOccurrences['2']||0)+(weekdayOccurrences['3']||0)+(weekdayOccurrences['4']||0)+(weekdayOccurrences['5']||0)
    const weekDenom = (weekdayOccurrences['6']||0)+(weekdayOccurrences['7']||0)
    const allDenom = workDenom + weekDenom
    return HOURS.map(h => {
      const workSum = chartMetric === 'net'
        ? (getNetW(h,'1')+getNetW(h,'2')+getNetW(h,'3')+getNetW(h,'4')+getNetW(h,'5'))
        : (getCountW(h,'1')+getCountW(h,'2')+getCountW(h,'3')+getCountW(h,'4')+getCountW(h,'5'))
      const weekSum = chartMetric === 'net'
        ? (getNetW(h,'6')+getNetW(h,'7'))
        : (getCountW(h,'6')+getCountW(h,'7'))
      const allSum = workSum + weekSum
      return {
        hour: h,
        all: allDenom > 0 ? allSum / allDenom : 0,
        work: workDenom > 0 ? workSum / workDenom : 0,
        weekend: weekDenom > 0 ? weekSum / weekDenom : 0
      }
    })
  }, [HOURS, weekdayOccurrences, version, chartMetric])
  const totalCountByCol = (ck: string) => {
    let sum = 0
    for (const h of HOURS) sum += getCount(h, ck)
    return sum
  }
  const totalNetByCol = (ck: string) => {
    let sum = 0
    for (const h of HOURS) sum += getNet(h, ck)
    return sum
  }

  return (
    <div className="space-y-3">
      <div className="flex items-end gap-2">
        <div>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="border rounded px-2 py-1 text-sm" />
        </div>
        <div>
          <input type="date" value={to} onChange={e => setTo(e.target.value)} className="border rounded px-2 py-1 text-sm" />
        </div>
        <button onClick={load} className="border rounded px-3 py-1 text-sm">Показать</button>
      </div>

      <div className="space-y-4">
        <div className="rounded-lg border p-2">
          <div className="px-2 pb-2 flex items-center justify-between">
            <div className="font-medium">Среднее по часам (столбиковый график)</div>
            <div className="flex items-center gap-2">
              <Tabs value={chartMetric} onValueChange={(v) => setChartMetric(v as any)}>
                <TabsList>
                  <TabsTrigger value="count">Чеки</TabsTrigger>
                  <TabsTrigger value="net">Выручка</TabsTrigger>
                </TabsList>
              </Tabs>
              <Tabs value={chartTab} onValueChange={(v) => setChartTab(v as any)}>
                <TabsList>
                  <TabsTrigger value="all">Все</TabsTrigger>
                  <TabsTrigger value="work">Будни</TabsTrigger>
                  <TabsTrigger value="weekend">Выходные</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ left: 8, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => (typeof v === 'number' ? (chartMetric === 'net' ? Math.round(v).toLocaleString('ru-RU') : v.toFixed(1)) : String(v))} />
                <Tooltip formatter={(value: any) => {
                  if (typeof value !== 'number') return [value, '']
                  return chartMetric === 'net'
                    ? [Math.round(value).toLocaleString('ru-RU'), 'ср. выручка']
                    : [value.toFixed(1), 'ср. чеки']
                }} labelFormatter={(label) => `${label}:00`} />
                <Bar dataKey={chartTab} fill="#f97316" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-lg border p-2">
          <div className="px-2 pb-2 flex items-center justify-between">
            <div className="font-medium">Среднее по дням недели</div>
            <Tabs value={weeklyAvgTab} onValueChange={(v) => setWeeklyAvgTab(v as any)}>
              <TabsList>
                <TabsTrigger value="count">Чеки</TabsTrigger>
                <TabsTrigger value="net">Выручка</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          {loading ? <div className="p-4 text-sm">Загрузка…</div> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground">
                    <th className="px-2 py-1 sticky left-0 z-10 bg-card">Час</th>
                    <th className="px-2 py-1 text-right">Будни</th>
                    <th className="px-2 py-1 text-right">Выходные</th>
                    {WEEKDAY_KEYS.map(wk => (
                      <th key={`avg-top-hdr-${wk}`} className="px-2 py-1 text-right">{WEEKDAY_LABELS[wk]}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {HOURS.map((h) => (
                    <tr key={`avg-top-row-${h}`} className="border-t">
                      <td className="px-2 py-1 sticky left-0 z-10 bg-card">{h}</td>
                      {(() => {
                        const isNet = weeklyAvgTab === 'net'
                        const workDenom = (weekdayOccurrences['1']||0)+(weekdayOccurrences['2']||0)+(weekdayOccurrences['3']||0)+(weekdayOccurrences['4']||0)+(weekdayOccurrences['5']||0)
                        const weekDenom = (weekdayOccurrences['6']||0)+(weekdayOccurrences['7']||0)
                        const workSum = isNet
                          ? (getNetW(h,'1')+getNetW(h,'2')+getNetW(h,'3')+getNetW(h,'4')+getNetW(h,'5'))
                          : (getCountW(h,'1')+getCountW(h,'2')+getCountW(h,'3')+getCountW(h,'4')+getCountW(h,'5'))
                        const weekSum = isNet
                          ? (getNetW(h,'6')+getNetW(h,'7'))
                          : (getCountW(h,'6')+getCountW(h,'7'))
                        const workAvg = workDenom > 0 ? workSum / workDenom : 0
                        const weekAvg = weekDenom > 0 ? weekSum / weekDenom : 0
                        const workFmt = isNet ? Math.round(workAvg).toLocaleString('ru-RU') : workAvg.toFixed(1)
                        const weekFmt = isNet ? Math.round(weekAvg).toLocaleString('ru-RU') : weekAvg.toFixed(1)
                        return (
                          <>
                            <td className="px-2 py-1 text-right">{workFmt}</td>
                            <td className="px-2 py-1 text-right">{weekFmt}</td>
                          </>
                        )
                      })()}
                      {WEEKDAY_KEYS.map(wk => {
                        const isNet = weeklyAvgTab === 'net'
                        const denom = weekdayOccurrences[wk] || 0
                        const val = isNet ? getNetW(h, wk) : getCountW(h, wk)
                        const avg = denom > 0 ? (val / denom) : 0
                        const fmt = isNet ? Math.round(avg).toLocaleString('ru-RU') : avg.toFixed(1)
                        return (
                          <td key={`avg-top-${h}-${wk}`} className="px-2 py-1 text-right">{fmt}</td>
                        )
                      })}
                    </tr>
                  ))}
                  <tr className="border-t font-medium">
                    <td className="px-2 py-1 sticky left-0 z-10 bg-card">Итого</td>
                    {(() => {
                      const isNet = weeklyAvgTab === 'net'
                      const workDenom = (weekdayOccurrences['1']||0)+(weekdayOccurrences['2']||0)+(weekdayOccurrences['3']||0)+(weekdayOccurrences['4']||0)+(weekdayOccurrences['5']||0)
                      const weekDenom = (weekdayOccurrences['6']||0)+(weekdayOccurrences['7']||0)
                      let workSum = 0; for (const h of HOURS) workSum += isNet ? (getNetW(h,'1')+getNetW(h,'2')+getNetW(h,'3')+getNetW(h,'4')+getNetW(h,'5')) : (getCountW(h,'1')+getCountW(h,'2')+getCountW(h,'3')+getCountW(h,'4')+getCountW(h,'5'))
                      let weekSum = 0; for (const h of HOURS) weekSum += isNet ? (getNetW(h,'6')+getNetW(h,'7')) : (getCountW(h,'6')+getCountW(h,'7'))
                      const workAvg = workDenom > 0 ? workSum / workDenom : 0
                      const weekAvg = weekDenom > 0 ? weekSum / weekDenom : 0
                      const workFmt = isNet ? Math.round(workAvg).toLocaleString('ru-RU') : workAvg.toFixed(1)
                      const weekFmt = isNet ? Math.round(weekAvg).toLocaleString('ru-RU') : weekAvg.toFixed(1)
                      return (
                        <>
                          <td className="px-2 py-1 text-right">{workFmt}</td>
                          <td className="px-2 py-1 text-right">{weekFmt}</td>
                        </>
                      )
                    })()}
                    {WEEKDAY_KEYS.map(wk => {
                      const isNet = weeklyAvgTab === 'net'
                      const denom = weekdayOccurrences[wk] || 0
                      let sum = 0; for (const h of HOURS) sum += isNet ? getNetW(h, wk) : getCountW(h, wk)
                      const avg = denom > 0 ? (sum / denom) : 0
                      const fmt = isNet ? Math.round(avg).toLocaleString('ru-RU') : avg.toFixed(1)
                      return (
                        <td key={`avg-top-total-${wk}`} className="px-2 py-1 text-right">{fmt}</td>
                      )
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className="rounded-lg border p-2">
          <div className="px-2 pb-2 flex items-center justify-between">
            <div className="font-medium">Статистика</div>
            <div className="flex items-center gap-2">
              <Tabs value={statsTab} onValueChange={(v) => setStatsTab(v as any)}>
                <TabsList>
                  <TabsTrigger value="count">Чеки</TabsTrigger>
                  <TabsTrigger value="net">Выручка</TabsTrigger>
                </TabsList>
              </Tabs>
              <Tabs value={view} onValueChange={v => setView(v as ViewMode)}>
                <TabsList>
                  <TabsTrigger value="day">День</TabsTrigger>
                  <TabsTrigger value="week">Неделя</TabsTrigger>
                  <TabsTrigger value="month">Месяц</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
          {loading ? <div className="p-4 text-sm">Загрузка…</div> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground">
                    <th className="px-2 py-1 sticky left-0 z-10 bg-card">Час</th>
                    {colKeys.map((ck) => (
                      <th key={ck} className="px-2 py-1 text-right">{colLabels[ck]}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {HOURS.map((h) => (
                    <tr key={`stat-row-${h}`} className="border-t">
                      <td className="px-2 py-1 sticky left-0 z-10 bg-card">{h}</td>
                      {colKeys.map(ck => {
                        const val = statsTab === 'net' ? getNet(h, ck) : getCount(h, ck)
                        return (
                          <td key={`stat-${h}-${ck}`} className="px-2 py-1 text-right">{statsTab === 'net' ? Number(val).toLocaleString('ru-RU') : val}</td>
                        )
                      })}
                    </tr>
                  ))}
                  {!colKeys.length && (
                    <tr><td className="px-2 py-3 text-sm text-muted-foreground" colSpan={1}>Нет данных</td></tr>
                  )}
                  {!!colKeys.length && (
                    <tr className="border-t font-medium">
                      <td className="px-2 py-1 sticky left-0 z-10 bg-card">Итого</td>
                      {colKeys.map(ck => {
                        const val = statsTab === 'net' ? totalNetByCol(ck) : totalCountByCol(ck)
                        return (
                          <td key={`stat-total-${ck}`} className="px-2 py-1 text-right">{statsTab === 'net' ? Number(val).toLocaleString('ru-RU') : val}</td>
                        )
                      })}
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


