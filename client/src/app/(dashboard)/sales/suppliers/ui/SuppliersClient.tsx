"use client"
import { useEffect, useState, useMemo } from 'react'
import { getApiBase } from "@/lib/api"
import { Card, CardContent } from '@/components/ui/card'
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:4000')

function formatNumber(value: number | null): string {
  if (value === null || value === undefined) return '-'
  return value.toLocaleString('ru-RU')
}

function formatCurrency(value: number | null): string {
  if (value === null || value === undefined) return '-'
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function formatCurrencyThousands(value: number | null): string {
  if (value === null || value === undefined) return '-'
  const thousands = value / 1000
  return new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(thousands)
}

// Получить номер недели в году (ISO 8601)
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

// Группировка по неделям (по номеру недели в году)
function groupByWeek(data: any[]): any[] {
  if (data.length === 0) return []
  
  const weeks = new Map<number, { week: number; amount: number; count: number }>()
  
  data.forEach(item => {
    const date = new Date(item.date)
    const weekNum = getWeekNumber(date)
    
    const existing = weeks.get(weekNum) || { 
      week: weekNum,
      amount: 0, 
      count: 0 
    }
    existing.amount += item.amount || 0
    existing.count += 1
    
    weeks.set(weekNum, existing)
  })
  
  return Array.from(weeks.values()).sort((a, b) => a.week - b.week)
}

// Группировка по месяцам (календарным)
function groupByMonth(data: any[]): any[] {
  const months = new Map<string, { month: string; monthLabel: string; amount: number; count: number }>()
  
  data.forEach(item => {
    const monthKey = item.date.slice(0, 7) // YYYY-MM
    // Формат: MM.YY (например 09.24)
    const monthLabel = `${monthKey.slice(5, 7)}.${monthKey.slice(2, 4)}`
    
    const existing = months.get(monthKey) || { 
      month: monthKey, 
      monthLabel,
      amount: 0, 
      count: 0 
    }
    existing.amount += item.amount || 0
    existing.count += 1
    
    months.set(monthKey, existing)
  })
  
  return Array.from(months.values()).sort((a, b) => a.month.localeCompare(b.month))
}

export function SuppliersClient() {
  const now = new Date()
  const [dateFrom, setDateFrom] = useState('2025-01-01')
  const [dateTo, setDateTo] = useState(now.toISOString().slice(0, 10))
  
  const [selectedCounterparty, setSelectedCounterparty] = useState<string>('all')
  const [counterpartyType, setCounterpartyType] = useState<string>('supplier')
  const [groupBy, setGroupBy] = useState<'days' | 'weeks' | 'months'>('months')
  const [counterparties, setCounterparties] = useState<any[]>([])
  const [dataCurrent, setDataCurrent] = useState<any[]>([])
  const [dataLastYear, setDataLastYear] = useState<any[]>([])
  const [totalRevenue, setTotalRevenue] = useState<number>(0)
  const [totalRevenueByPeriod, setTotalRevenueByPeriod] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [chartTab, setChartTab] = useState<'revenue' | 'share'>('revenue')
  const [availableTypes, setAvailableTypes] = useState<Array<{ kind: string; count: number }>>([])
  const [payments, setPayments] = useState<Array<{ id: string; date: string; amount: number; vendor: string; description?: string | null }>>([])
  const KIND_LABELS: Record<string, string> = {
    supplier: 'Поставщик',
    service: 'Услуги',
    personnel: 'Персонал',
    bank: 'Банк',
    tax: 'Налоги',
    transfer: 'Переводы',
    other: 'Прочее'
  }

  // Загрузка списка контрагентов
  const loadCounterparties = async () => {
    try {
      const u = new URL(`${API_BASE}/api/counterparties`)
      if (counterpartyType && counterpartyType !== 'all') u.searchParams.set('type', counterpartyType)
      const res = await fetch(u.toString(), { credentials: 'include' })
      const json = await res.json()
      const list = (json.counterparties || json.items || [])
      console.log('Loaded counterparties:', { type: counterpartyType, count: list.length })
      setCounterparties(list)
      // Автоматически выбираем первого
      if (list.length > 0 && selectedCounterparty !== 'all') {
        setSelectedCounterparty(list[0].id)
      }
    } catch (e) {
      console.error('Error loading counterparties:', e)
    }
  }

  // Загрузка доступных типов с ненулевым количеством
  const loadCounterpartyTypes = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/counterparties/types`, { credentials: 'include' })
      const json = await res.json()
      let items = (json.items || []) as Array<{ kind: string; count: number }>
      // Fallback: если бэкенд вернул пусто (все kind = null), посчитаем из списка контрагентов
      if (!items.length) {
        try {
          const resAll = await fetch(`${API_BASE}/api/counterparties?type=all`, { credentials: 'include' })
          const jAll = await resAll.json()
          const list = (jAll.counterparties || jAll.items || []) as Array<{ kind?: string | null }>
          const map = new Map<string, number>()
          for (const cp of list) {
            const k = (cp.kind || '').trim()
            if (!k) continue
            map.set(k, (map.get(k) || 0) + 1)
          }
          items = Array.from(map.entries()).map(([kind, count]) => ({ kind, count }))
        } catch {}
      }
      setAvailableTypes(items)
      // Если текущий тип отсутствует, переключим на первый доступный
      if (counterpartyType !== 'all' && !items.find(x => x.kind === counterpartyType)) {
        if (items.length > 0) setCounterpartyType(items[0].kind)
      }
    } catch (e) {
      console.error('Error loading counterparty types:', e)
    }
  }

  // Загрузка данных по поставщику или по всем
  const loadData = async () => {
    console.log('Loading data for counterparty:', selectedCounterparty)
    setLoading(true)
    try {
      // Вычисляем период год назад
      const fromDate = new Date(dateFrom)
      const toDate = new Date(dateTo)
      
      const lastYearFrom = new Date(fromDate)
      lastYearFrom.setFullYear(lastYearFrom.getFullYear() - 1)
      
      const lastYearTo = new Date(toDate)
      lastYearTo.setFullYear(lastYearTo.getFullYear() - 1)
      
      const curUrl = selectedCounterparty === 'all'
        ? `${API_BASE}/api/payments?from=${dateFrom}&to=${dateTo}${counterpartyType && counterpartyType !== 'all' ? `&type=${encodeURIComponent(counterpartyType)}` : ''}`
        : `${API_BASE}/api/payments?counterpartyId=${selectedCounterparty}&from=${dateFrom}&to=${dateTo}`
      const prevUrl = selectedCounterparty === 'all'
        ? `${API_BASE}/api/payments?from=${lastYearFrom.toISOString().slice(0, 10)}&to=${lastYearTo.toISOString().slice(0, 10)}${counterpartyType && counterpartyType !== 'all' ? `&type=${encodeURIComponent(counterpartyType)}` : ''}`
        : `${API_BASE}/api/payments?counterpartyId=${selectedCounterparty}&from=${lastYearFrom.toISOString().slice(0, 10)}&to=${lastYearTo.toISOString().slice(0, 10)}`
      const [resCurrent, resLastYear] = await Promise.all([
        fetch(curUrl, { credentials: 'include' }),
        fetch(prevUrl, { credentials: 'include' })
      ])
      
      const jsonCurrent = await resCurrent.json()
      const jsonLastYear = await resLastYear.json()
      // Все платежи текущего периода (для таблицы)
      const paymentsList = (selectedCounterparty === 'all'
        ? (jsonCurrent.items || [])
        : (jsonCurrent.payments || [])
      ).map((p: any) => ({
        id: p.id,
        date: typeof p.date === 'string' ? p.date.slice(0, 10) : new Date(p.date).toISOString().slice(0, 10),
        amount: (p.amount || 0) / 100,
        vendor: p.vendor?.name || p.vendor || p.expenseDoc?.vendor?.name || '',
        description: p.description || p.memo || null
      }))
      setPayments(paymentsList)

      
      console.log('Current data:', jsonCurrent)
      console.log('Last year data:', jsonLastYear)
      console.log('Counterparty type:', counterpartyType)
      console.log('Last year period:', lastYearFrom.toISOString().slice(0, 10), 'to', lastYearTo.toISOString().slice(0, 10))
      
      // Загружаем выручку кафе по iiko и формируем суммы по периодам
      const revenueMap: Record<string, number> = {}
      const fromY = parseInt(dateFrom.slice(0, 4))
      const fromM = parseInt(dateFrom.slice(5, 7))
      const toY = parseInt(dateTo.slice(0, 4))
      const toM = parseInt(dateTo.slice(5, 7))
      const months: Array<{ y: number; m: number }> = []
      for (let y = fromY; y <= toY; y++) {
        const startM = y === fromY ? fromM : 1
        const endM = y === toY ? toM : 12
        for (let m = startM; m <= endM; m++) months.push({ y, m })
      }
      // Последовательно (не так много месяцев)
      for (const { y, m } of months) {
        try {
          const r = await fetch(`${API_BASE}/api/iiko/local/sales/revenue/month?year=${y}&month=${m}`, { credentials: 'include' })
          const jr = await r.json()
          const rows = jr.revenue || []
          rows.forEach((row: any) => {
            const d = row.date || row.day || row.ymd || row.Date || ''
            const ymd = typeof d === 'string' ? d.slice(0, 10) : new Date(d).toISOString().slice(0, 10)
            revenueMap[ymd] = (revenueMap[ymd] || 0) + (Number(row.net || 0))
          })
        } catch {}
      }
      // Заполняем totalRevenue и totalRevenueByPeriod согласно groupBy
      const totalRevenueRub = Object.values(revenueMap).reduce((a, b) => a + b, 0)
      setTotalRevenue(Math.round(totalRevenueRub))
      if (groupBy === 'days') {
        const byDay = Object.entries(revenueMap).reduce((acc: any, [ymd, net]) => {
          const key = ymd
          acc[key] = (acc[key] || 0) + (Number(net) || 0)
          return acc
        }, {})
        setTotalRevenueByPeriod(Object.entries(byDay).map(([period, amount]) => ({ period, amount })) )
      } else if (groupBy === 'weeks') {
        const agg = new Map<string, number>()
        Object.keys(revenueMap).forEach((ymd) => {
          const d = new Date(ymd)
          const week = getWeekNumber(d)
          const key = `Неделя ${week}`
          agg.set(key, (agg.get(key) || 0) + (revenueMap[ymd] || 0))
        })
        setTotalRevenueByPeriod(Array.from(agg.entries()).map(([period, amount]) => ({ period, amount })))
      } else {
        const agg = new Map<string, number>()
        Object.keys(revenueMap).forEach((ymd) => {
          const d = new Date(ymd)
          const key = `${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getFullYear()).slice(-2)}`
          agg.set(key, (agg.get(key) || 0) + (revenueMap[ymd] || 0))
        })
        setTotalRevenueByPeriod(Array.from(agg.entries()).map(([period, amount]) => ({ period, amount })))
      }
      
      // Группируем данные по дням
      const currentByDate = new Map<string, { date: string; amount: number; count: number }>()
      const lastYearByDate = new Map<string, { date: string; amount: number; count: number }>()
      
      // Обрабатываем текущие данные
      const curArray = selectedCounterparty === 'all' ? (jsonCurrent.items || []) : (jsonCurrent.payments || [])
      curArray.forEach((payment: any) => {
        const date = (typeof payment.date === 'string' ? payment.date : new Date(payment.date).toISOString()).slice(0, 10)
        const existing = currentByDate.get(date) || { date, amount: 0, count: 0 }
        existing.amount += (payment.amount || 0) / 100
        existing.count += 1
        currentByDate.set(date, existing)
      })
      
      // Обрабатываем данные прошлого года
      const prevArray = selectedCounterparty === 'all' ? (jsonLastYear.items || []) : (jsonLastYear.payments || [])
      prevArray.forEach((payment: any) => {
        const date = (typeof payment.date === 'string' ? payment.date : new Date(payment.date).toISOString()).slice(0, 10)
        const existing = lastYearByDate.get(date) || { date, amount: 0, count: 0 }
        existing.amount += (payment.amount || 0) / 100
        existing.count += 1
        lastYearByDate.set(date, existing)
      })
      
      setDataCurrent(Array.from(currentByDate.values()).sort((a, b) => a.date.localeCompare(b.date)))
      setDataLastYear(Array.from(lastYearByDate.values()).sort((a, b) => a.date.localeCompare(b.date)))
      
    } catch (e) {
      console.error('Error loading data:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCounterpartyTypes()
    loadCounterparties()
  }, [counterpartyType])

  useEffect(() => {
    loadData()
  }, [dateFrom, dateTo, selectedCounterparty, groupBy, counterpartyType])

  // Объединяем данные для графика с учетом группировки
  const chartData = useMemo(() => {
    if (groupBy === 'days') {
      // По дням - создаем полный календарный период
      const startDate = new Date(dateFrom)
      const endDate = new Date(dateTo)
      const result = []
      
      // Создаем мапу для быстрого поиска данных
      const currentMap = new Map(dataCurrent.map(d => [d.date, d]))
      const lastYearMap = new Map(dataLastYear.map(d => [d.date, d]))
      
      // Проходим по каждому дню в выбранном периоде
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().slice(0, 10)
        const lastYearDate = new Date(d)
        lastYearDate.setFullYear(lastYearDate.getFullYear() - 1)
        const lastYearDateStr = lastYearDate.toISOString().slice(0, 10)
        
        const currentData = currentMap.get(dateStr)
        const lastYearData = lastYearMap.get(lastYearDateStr)
        
        result.push({
          x: dateStr.slice(5, 10), // MM-DD формат
          amountCurrent: currentData?.amount || null,
          amountLastYear: lastYearData?.amount || null,
        })
      }
      
      return result
    }
    
    // Для недель - группируем по номеру недели в году
    if (groupBy === 'weeks') {
      const weeksCurrent = groupByWeek(dataCurrent)
      const weeksLastYear = groupByWeek(dataLastYear)
      
      // Создаем мапу для быстрого поиска
      const currentWeekMap = new Map(weeksCurrent.map(w => [w.week, w]))
      const lastYearWeekMap = new Map(weeksLastYear.map(w => [w.week, w]))
      
      // Получаем все недели из текущего периода
      const startDate = new Date(dateFrom)
      const endDate = new Date(dateTo)
      const weeksInPeriod = new Set<number>()
      
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 7)) {
        weeksInPeriod.add(getWeekNumber(d))
      }
      
      const result = []
      for (const weekNum of Array.from(weeksInPeriod).sort((a, b) => a - b)) {
        const wCurrent = currentWeekMap.get(weekNum)
        const wLastYear = lastYearWeekMap.get(weekNum)
        
        result.push({
          x: `Неделя ${weekNum}`,
          amountCurrent: wCurrent?.amount || null,
          amountLastYear: wLastYear?.amount || null,
        })
      }
      
      return result
    }
    
    // По месяцам - показываем только месяцы с данными
    const monthsCurrent = groupByMonth(dataCurrent)
    const monthsLastYear = groupByMonth(dataLastYear)
    
    // Создаем мапу для быстрого поиска
    const currentMonthMap = new Map(monthsCurrent.map(m => [m.month, m]))
    const lastYearMonthMap = new Map(monthsLastYear.map(m => [m.month, m]))
    
    // Собираем все уникальные месяцы из данных
    const allMonthKeys = new Set<string>()
    monthsCurrent.forEach(m => allMonthKeys.add(m.month))
    monthsLastYear.forEach(m => allMonthKeys.add(m.month))
    
    const result = []
    for (const monthKey of Array.from(allMonthKeys).sort()) {
      const mCurrent = currentMonthMap.get(monthKey)
      
      // Для прошлого года ищем данные в том же месяце прошлого года
      const lastYearMonthKey = monthKey.replace(/^\d{4}/, String(parseInt(monthKey.slice(0, 4)) - 1))
      const mLastYear = lastYearMonthMap.get(lastYearMonthKey)
      
      // Используем monthLabel из данных (формат MM.YY)
      const monthLabel = mCurrent?.monthLabel || mLastYear?.monthLabel || monthKey.slice(5, 7) + '.' + monthKey.slice(2, 4)
      
      result.push({
        x: monthLabel,
        amountCurrent: mCurrent?.amount || null,
        amountLastYear: mLastYear?.amount || null,
      })
    }
    
    return result
  }, [dataCurrent, dataLastYear, groupBy, dateFrom, dateTo])

  // Данные для графика процентов
  const percentageChartData = useMemo(() => {
    console.log('Calculating percentage data:', { 
      totalRevenueByPeriod, 
      chartDataLength: chartData.length,
      chartDataKeys: chartData.map(item => item.x),
      revenueKeys: totalRevenueByPeriod.map((item: any) => item.period),
      revenueData: totalRevenueByPeriod
    })
    if (totalRevenueByPeriod.length === 0) return []
    
    // Создаем мапу выручки по периодам для быстрого поиска
    const revenueMap = new Map<string, number>()
    totalRevenueByPeriod.forEach((item: any) => {
      revenueMap.set(item.period, item.amount)
    })
    
    const result = chartData.map(item => {
      const periodRevenue = revenueMap.get(item.x) || 0
      const percentage = item.amountCurrent && periodRevenue > 0 ? (item.amountCurrent / periodRevenue * 100) : 0
      console.log(`Period ${item.x}: supplier=${item.amountCurrent}, revenue=${periodRevenue}, percentage=${percentage}`)
      return {
        x: item.x,
        percentage
      }
    })
    console.log('Percentage chart data:', result)
    return result
  }, [chartData, totalRevenueByPeriod])

  const totalAmountCurrent = dataCurrent.reduce((sum, d) => sum + (d?.amount || 0), 0)
  const totalAmountLastYear = dataLastYear.reduce((sum, d) => sum + (d?.amount || 0), 0)
  const totalCountCurrent = dataCurrent.reduce((sum, d) => sum + (d?.count || 0), 0)
  const totalCountLastYear = dataLastYear.reduce((sum, d) => sum + (d?.count || 0), 0)

  const selectedCounterpartyData = counterparties.find(s => s.id === selectedCounterparty)

  return (
    <div className="space-y-6 px-6 py-6">

      <div className="grid gap-6">
        {/* Фильтры */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-4">
              {/* Период */}
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="px-3 py-1 border rounded text-sm"
                />
                <span className="text-sm text-muted-foreground">—</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="px-3 py-1 border rounded text-sm"
                />
              </div>

              {/* Тип контрагента */}
              <div className="flex items-center gap-2">
                 <Select value={counterpartyType} onValueChange={(v) => { setCounterpartyType(v); setSelectedCounterparty('all') }}>
                   <SelectTrigger className="w-[220px]">
                     <SelectValue placeholder="Тип контрагента" />
                   </SelectTrigger>
                  <SelectContent>
                   <SelectItem value="all">Все</SelectItem>
                   {availableTypes.map(t => {
                      const key = (t.kind || '').trim()
                      const label = KIND_LABELS[key] || key || '(без типа)'
                      return (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      )
                    })}
                   </SelectContent>
                 </Select>
               </div>

              {/* Выбор контрагента */}
              <div className="flex items-center gap-2">
                 <Select value={selectedCounterparty} onValueChange={setSelectedCounterparty}>
                   <SelectTrigger className="w-[300px]">
                     <SelectValue placeholder="Выберите контрагента" />
                   </SelectTrigger>
                   <SelectContent className="max-h-[400px]">
                     <SelectItem value="all">Все</SelectItem>
                     {counterparties.map(cp => (
                       <SelectItem key={cp.id} value={cp.id}>
                         {cp.name}
                       </SelectItem>
                     ))}
                   </SelectContent>
                 </Select>
               </div>

              {/* Группировка */}
              <div className="flex items-center gap-2 ml-auto">
                <Tabs value={groupBy} onValueChange={(value: any) => setGroupBy(value)}>
                  <TabsList>
                    <TabsTrigger value="days">Дни</TabsTrigger>
                    <TabsTrigger value="weeks">Недели</TabsTrigger>
                    <TabsTrigger value="months">Месяцы</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Статистика */}
        {selectedCounterpartyData && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground">Контрагент</div>
                <div className="text-lg font-semibold">{selectedCounterpartyData.name}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground">Сумма (текущий период)</div>
                <div className="text-lg font-semibold" style={{ color: '#f97316' }}>{formatCurrency(totalAmountCurrent)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground">Сумма (прошлый год)</div>
                <div className="text-lg font-semibold" style={{ color: '#6b7280' }}>
                  {dataLastYear.length > 0 ? formatCurrency(totalAmountLastYear) : 'Нет данных'}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground">Изменение</div>
                <div className={`text-lg font-semibold ${dataLastYear.length > 0 ? (totalAmountCurrent > totalAmountLastYear ? 'text-green-600' : 'text-red-600') : 'text-muted-foreground'}`}>
                  {dataLastYear.length > 0 
                    ? (totalAmountLastYear > 0 
                        ? `${((totalAmountCurrent - totalAmountLastYear) / totalAmountLastYear * 100).toFixed(1)}%`
                        : totalAmountCurrent > 0 ? '+100%' : '0%'
                      )
                    : 'Нет данных'
                  }
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Графики: один Card с табами */}
        <Card>
          <CardContent className="p-4">
            <div className="mb-4">
              <Tabs value={chartTab} onValueChange={(v: any) => setChartTab(v)}>
                <TabsList>
                  <TabsTrigger value="revenue">Выручка</TabsTrigger>
                  <TabsTrigger value="share">Доля %</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            <div className="relative">
              {loading && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/50 dark:bg-black/30 backdrop-blur-[1px]">
                  <div className="w-8 h-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
                </div>
              )}
              <div className={`transition-opacity duration-300 ${loading ? 'opacity-50' : 'opacity-100'}`}>
                {chartTab === 'revenue' ? (
                  dataCurrent.length === 0 ? (
                    <div className="h-64 flex flex-col items-center justify-center text-muted-foreground">
                      <div className="text-lg mb-2">Нет данных за выбранный период</div>
                      <div className="text-sm">Попробуйте изменить период или контрагента</div>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="x" tick={{ fontSize: 12 }} />
                        <YAxis tickFormatter={(value) => formatNumber(value)} tick={{ fontSize: 12 }} />
                      <Tooltip
                        formatter={(value: any, _name: string, props: any) => {
                          const key = props?.dataKey || props?.name
                          return [formatCurrency(value), key === 'amountCurrent' ? 'Текущий период' : 'Год назад']
                        }}
                      />
                        <Line type="monotone" dataKey="amountCurrent" stroke="#f97316" strokeWidth={2} name="Текущий период" dot={{ fill: '#f97316', strokeWidth: 2, r: 4 }} />
                        <Line type="monotone" dataKey="amountLastYear" stroke="#6b7280" strokeWidth={2} name="Прошлый год" dot={{ fill: '#6b7280', strokeWidth: 2, r: 4 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  )
                ) : (
                  totalRevenue === 0 || dataCurrent.length === 0 ? (
                    <div className="h-64 flex flex-col items-center justify-center text-muted-foreground">
                      <div className="text-lg mb-2">Нет данных</div>
                      <div className="text-sm">Не удалось загрузить общую выручку или нет данных периода</div>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={percentageChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="x" tick={{ fontSize: 12 }} />
                        <YAxis tickFormatter={(value) => `${value.toFixed(1)}%`} tick={{ fontSize: 12 }} />
                        <Tooltip formatter={(value: any) => [`${Number(value).toFixed(2)}%`, 'Доля в выручке']} />
                        <Line type="monotone" dataKey="percentage" stroke="#f97316" strokeWidth={2} name="Доля в выручке" dot={{ fill: '#f97316', strokeWidth: 2, r: 4 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  )
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Таблица всех платежей текущего периода */}
        <Card>
          <CardContent className="p-4">
            <div className="overflow-x-auto">
              <Table>
                <THead>
                  <TR>
                    <TH className="w-48">Дата</TH>
                    <TH>Контрагент</TH>
                    <TH>Описание</TH>
                    <TH className="text-right w-32">Сумма</TH>
                  </TR>
                </THead>
                <TBody>
                  {payments.map((p) => (
                    <TR key={p.id}>
                      <TD className="whitespace-nowrap">{p.date}</TD>
                      <TD>{p.vendor}</TD>
                      <TD>{p.description || ''}</TD>
                      <TD className="text-right">{formatCurrency(p.amount)}</TD>
                    </TR>
                  ))}
                  {!payments.length && (
                    <TR>
                      <TD colSpan={4} className="text-center text-muted-foreground py-6">Нет платежей за период</TD>
                    </TR>
                  )}
                </TBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
