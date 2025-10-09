"use client"
import { useEffect, useState, useMemo } from 'react'
import { getApiBase } from "@/lib/api"
import { Card, CardContent } from '@/components/ui/card'
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const API_BASE = getApiBase()

function formatNumber(value: number | null): string {
  if (value === null || value === undefined) return '-'
  return value.toLocaleString('ru-RU')
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
  
  const weeks = new Map<number, { week: number; qty: number; revenue: number; count: number }>()
  
  data.forEach(item => {
    const date = new Date(item.date)
    const weekNum = getWeekNumber(date)
    
    const existing = weeks.get(weekNum) || { 
      week: weekNum,
      qty: 0, 
      revenue: 0, 
      count: 0 
    }
    existing.qty += item.qty || 0
    existing.revenue += item.revenue || 0
    existing.count += 1
    
    weeks.set(weekNum, existing)
  })
  
  return Array.from(weeks.values()).sort((a, b) => a.week - b.week)
}

// Группировка по месяцам (календарным)
function groupByMonth(data: any[]): any[] {
  const months = new Map<string, { month: string; monthLabel: string; qty: number; revenue: number; count: number }>()
  
  data.forEach(item => {
    const monthKey = item.date.slice(0, 7) // YYYY-MM
    // Формат: MM.YY (например 09.24)
    const monthLabel = `${monthKey.slice(5, 7)}.${monthKey.slice(2, 4)}`
    
    const existing = months.get(monthKey) || { 
      month: monthKey, 
      monthLabel,
      qty: 0, 
      revenue: 0, 
      count: 0 
    }
    existing.qty += item.qty || 0
    existing.revenue += item.revenue || 0
    existing.count += 1
    
    months.set(monthKey, existing)
  })
  
  return Array.from(months.values()).sort((a, b) => a.month.localeCompare(b.month))
}

export function DishesClient() {
  const now = new Date()
  const threeMonthsAgo = new Date(now)
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
  const [dateFrom, setDateFrom] = useState(threeMonthsAgo.toISOString().slice(0, 10))
  const [dateTo, setDateTo] = useState(now.toISOString().slice(0, 10))
  
  const [selectedDish, setSelectedDish] = useState<string>('all')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [groupBy, setGroupBy] = useState<'days' | 'weeks' | 'months'>('months')
  const [displayMode, setDisplayMode] = useState<'sales' | 'receipts'>('sales')
  const [dishes, setDishes] = useState<any[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [dataCurrent, setDataCurrent] = useState<any[]>([])
  const [dataLastYear, setDataLastYear] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  // Загрузка категорий блюд
  const loadCategories = async () => {
    try {
      const params = new URLSearchParams({ from: dateFrom, to: dateTo })
      const res = await fetch(`${API_BASE}/api/iiko/local/sales/dish-categories?${params.toString()}`, { credentials: 'include' })
      const json = await res.json()
      setCategories(json.categories || [])
    } catch (e) {
      console.error('Error loading categories:', e)
    }
  }

  // Загрузка списка блюд
  const loadDishes = async () => {
    try {
      const params = new URLSearchParams({ from: dateFrom, to: dateTo, limit: String(300) })
      if (selectedCategory !== 'all') params.set('category', selectedCategory)
      const url = `${API_BASE}/api/iiko/local/sales/dishes?${params.toString()}`
      
      const res = await fetch(url, { credentials: 'include' })
      const json = await res.json()
      console.log('Loaded dishes:', json)
      setDishes(json.dishes || [])
      // При смене категории автоматически выбираем соответствующий режим
      if (selectedCategory === 'all') {
        console.log('Setting selectedDish to all for all categories')
        setSelectedDish('all')
      } else if (json.dishes?.length > 0) {
        console.log('Setting selectedDish to category for category:', selectedCategory)
        setSelectedDish('category')
      }
    } catch (e) {
      console.error('Error loading dishes:', e)
    }
  }

  // Загрузка данных по блюду или категории
  const loadData = async () => {
    console.log('Loading data for:', selectedDish, 'category:', selectedCategory)
    setLoading(true)
    try {
      // Вычисляем период год назад
      const fromDate = new Date(dateFrom)
      const toDate = new Date(dateTo)
      
      const lastYearFrom = new Date(fromDate)
      lastYearFrom.setFullYear(lastYearFrom.getFullYear() - 1)
      
      const lastYearTo = new Date(toDate)
      lastYearTo.setFullYear(lastYearTo.getFullYear() - 1)
      
      // Определяем endpoint в зависимости от выбора
      let endpoint: string
      if (selectedDish === 'all') {
        endpoint = `${API_BASE}/api/iiko/local/sales/all`
      } else if (selectedDish === 'category') {
        endpoint = `${API_BASE}/api/iiko/local/sales/category/${encodeURIComponent(selectedCategory)}`
      } else {
        endpoint = `${API_BASE}/api/iiko/local/sales/dish/${selectedDish}`
      }
      
      const [resCurrent, resLastYear] = await Promise.all([
        fetch(`${endpoint}?from=${dateFrom}&to=${dateTo}`, { credentials: 'include' }),
        fetch(`${endpoint}?from=${lastYearFrom.toISOString().slice(0, 10)}&to=${lastYearTo.toISOString().slice(0, 10)}`, { credentials: 'include' })
      ])
      
      const jsonCurrent = await resCurrent.json()
      const jsonLastYear = await resLastYear.json()
      
      console.log('Loaded data:', { jsonCurrent, jsonLastYear })
      
      setDataCurrent(jsonCurrent.daily || [])
      setDataLastYear(jsonLastYear.daily || [])
    } catch (e) {
      console.error('Error loading dish data:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCategories()
  }, [])

  useEffect(() => {
    loadDishes()
  }, [selectedCategory, dateFrom, dateTo])

  useEffect(() => {
    console.log('useEffect triggered for loadData:', { dateFrom, dateTo, selectedDish, selectedCategory })
    loadData()
  }, [dateFrom, dateTo, selectedDish, selectedCategory])

  // Объединяем данные для графика с учетом группировки
  const chartData = useMemo(() => {
    const startDate = new Date(dateFrom + 'T00:00:00.000Z')
    const endDate = new Date(dateTo + 'T23:59:59.999Z')
    
    console.log('Chart data period:', { dateFrom, dateTo, startDate: startDate.toISOString(), endDate: endDate.toISOString() })
    
    if (groupBy === 'days') {
      // По дням - создаем полный календарный период
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
          qtyCurrent: currentData?.qty || null,
          qtyLastYear: lastYearData?.qty || null,
          revenueCurrent: currentData?.revenue || null,
          revenueLastYear: lastYearData?.revenue || null,
          current: displayMode === 'sales' ? (currentData?.revenue || null) : (currentData?.qty || null),
          lastYear: displayMode === 'sales' ? (lastYearData?.revenue || null) : (lastYearData?.qty || null)
        })
      }
      
      return result
    }
    
    // Для недель - группируем по номеру недели в году
    if (groupBy === 'weeks') {
      
      // Фильтруем данные по выбранному периоду
      const filteredCurrent = dataCurrent.filter(item => {
        const itemDate = new Date(item.date)
        return itemDate >= startDate && itemDate <= endDate
      })
      const filteredLastYear = dataLastYear.filter(item => {
        const itemDate = new Date(item.date)
        const lastYearStart = new Date(dateFrom + 'T00:00:00.000Z')
        lastYearStart.setFullYear(lastYearStart.getFullYear() - 1)
        const lastYearEnd = new Date(dateTo + 'T23:59:59.999Z')
        lastYearEnd.setFullYear(lastYearEnd.getFullYear() - 1)
        return itemDate >= lastYearStart && itemDate <= lastYearEnd
      })
      
      const weeksCurrent = groupByWeek(filteredCurrent)
      const weeksLastYear = groupByWeek(filteredLastYear)
      
      // Создаем мапу для быстрого поиска
      const currentWeekMap = new Map(weeksCurrent.map(w => [w.week, w]))
      const lastYearWeekMap = new Map(weeksLastYear.map(w => [w.week, w]))
      
      // Получаем все недели из текущего периода
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
          qtyCurrent: wCurrent?.qty || null,
          qtyLastYear: wLastYear?.qty || null,
          revenueCurrent: wCurrent?.revenue || null,
          revenueLastYear: wLastYear?.revenue || null,
          current: displayMode === 'sales' ? (wCurrent?.revenue || null) : (wCurrent?.qty || null),
          lastYear: displayMode === 'sales' ? (wLastYear?.revenue || null) : (wLastYear?.qty || null)
        })
      }
      
      return result
    }
    
    // По месяцам - группируем по календарным месяцам (с годом)
    // Фильтруем данные по выбранному периоду
    console.log('Filtering data:', { 
      dataCurrentLength: dataCurrent.length, 
      sampleDates: dataCurrent.slice(0, 3).map(d => d.date) 
    })
    
    const filteredCurrent = dataCurrent.filter(item => {
      const itemDate = new Date(item.date)
      const inRange = itemDate >= startDate && itemDate <= endDate
      if (!inRange) {
        console.log('Filtered out date:', item.date, 'not in range', startDate.toISOString(), 'to', endDate.toISOString())
      }
      return inRange
    })
    const filteredLastYear = dataLastYear.filter(item => {
      const itemDate = new Date(item.date)
      const lastYearStart = new Date(dateFrom + 'T00:00:00.000Z')
      lastYearStart.setFullYear(lastYearStart.getFullYear() - 1)
      const lastYearEnd = new Date(dateTo + 'T23:59:59.999Z')
      lastYearEnd.setFullYear(lastYearEnd.getFullYear() - 1)
      return itemDate >= lastYearStart && itemDate <= lastYearEnd
    })
    
    const monthsCurrent = groupByMonth(filteredCurrent)
    const monthsLastYear = groupByMonth(filteredLastYear)
    
    console.log('Monthly grouping:', {
      filteredCurrentLength: filteredCurrent.length,
      monthsCurrent: monthsCurrent.map(m => ({ month: m.month, monthLabel: m.monthLabel })),
      sampleFilteredDates: filteredCurrent.slice(0, 5).map(d => d.date)
    })
    
    // Создаем мапу для быстрого поиска
    const currentMonthMap = new Map(monthsCurrent.map(m => [m.month, m]))
    const lastYearMonthMap = new Map(monthsLastYear.map(m => [m.month, m]))
    
    // Получаем все месяцы из текущего периода
    const monthsInPeriod = new Set<string>()
    
    // Используем исходные строки дат для создания календарного периода
    const startYear = parseInt(dateFrom.slice(0, 4))
    const startMonth = parseInt(dateFrom.slice(5, 7))
    const endYear = parseInt(dateTo.slice(0, 4))
    const endMonth = parseInt(dateTo.slice(5, 7))
    
    for (let year = startYear; year <= endYear; year++) {
      const startM = (year === startYear) ? startMonth : 1
      const endM = (year === endYear) ? endMonth : 12
      
      for (let month = startM; month <= endM; month++) {
        const monthKey = `${year}-${String(month).padStart(2, '0')}`
        monthsInPeriod.add(monthKey)
      }
    }
    
    console.log('Calendar period months:', Array.from(monthsInPeriod).sort())
    
    const result = []
    for (const monthKey of Array.from(monthsInPeriod).sort()) {
      const mCurrent = currentMonthMap.get(monthKey)
      
      // Для прошлого года ищем данные в том же месяце прошлого года
      const lastYearMonthKey = monthKey.replace(/^\d{4}/, String(parseInt(monthKey.slice(0, 4)) - 1))
      const mLastYear = lastYearMonthMap.get(lastYearMonthKey)
      
      // Используем monthLabel из данных (формат MM.YY)
      const monthLabel = mCurrent?.monthLabel || mLastYear?.monthLabel || monthKey.slice(5, 7) + '.' + monthKey.slice(2, 4)
      
      result.push({
        x: monthLabel,
        qtyCurrent: mCurrent?.qty || null,
        qtyLastYear: mLastYear?.qty || null,
        revenueCurrent: mCurrent?.revenue || null,
        revenueLastYear: mLastYear?.revenue || null,
        current: displayMode === 'sales' ? (mCurrent?.revenue || null) : (mCurrent?.qty || null),
        lastYear: displayMode === 'sales' ? (mLastYear?.revenue || null) : (mLastYear?.qty || null)
      })
    }
    
    console.log('Final chart data:', result.map(r => ({ x: r.x, qtyCurrent: r.qtyCurrent, qtyLastYear: r.qtyLastYear })))
    
    return result
  }, [dataCurrent, dataLastYear, groupBy, dateFrom, dateTo, displayMode])

  const totalQtyCurrent = dataCurrent.reduce((sum, d) => sum + (d?.qty || 0), 0)
  const totalQtyLastYear = dataLastYear.reduce((sum, d) => sum + (d?.qty || 0), 0)
  const totalRevenueCurrent = dataCurrent.reduce((sum, d) => sum + (d?.revenue || 0), 0)
  const totalRevenueLastYear = dataLastYear.reduce((sum, d) => sum + (d?.revenue || 0), 0)

  // Определяем заголовок в зависимости от выбора
  const getPageTitle = () => {
    if (selectedCategory === 'all' && selectedDish === 'all') {
      return 'Анализ всех блюд'
    } else if (selectedCategory === 'all') {
      return 'Анализ блюд'
    } else if (selectedDish === 'category') {
      return `Анализ категории "${selectedCategory}"`
    } else if (selectedDish === 'all') {
      return 'Анализ всех блюд'
    } else {
      const selectedDishData = dishes.find(d => d.dishId === selectedDish)
      return selectedDishData ? `Анализ блюда "${selectedDishData.dishName}"` : 'Анализ блюд'
    }
  }

  return (
    <div className="p-6 space-y-6">
      {(() => {
        const title = getPageTitle()
        if (title === 'Анализ всех блюд' || title.startsWith('Анализ категории') || title.startsWith('Анализ блюда')) return null
        return (
          <div className="mb-6">
            <h1 className="text-3xl font-bold">{title}</h1>
          </div>
        )
      })()}
      
      {/* Фильтры и табы */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4 flex-wrap">
              {/* Выбор категории */}
              <div className="flex items-center gap-2">
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Все категории" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[400px]">
                    <SelectItem value="all">Все категории</SelectItem>
                    {categories.map(cat => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            
              {/* Выбор блюда */}
              <div className="flex items-center gap-2">
                <Select value={selectedDish} onValueChange={setSelectedDish}>
                  <SelectTrigger className="w-[300px]">
                    <SelectValue placeholder="Выберите блюдо" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[400px]">
                    {selectedCategory === 'all' && (
                      <SelectItem value="all">
                        Все блюда
                      </SelectItem>
                    )}
                    {selectedCategory !== 'all' && (
                      <SelectItem value="category">
                        <strong>Все блюда категории &quot;{selectedCategory}&quot;</strong>
                      </SelectItem>
                    )}
                    {dishes.map(dish => (
                      <SelectItem key={dish.dishId} value={dish.dishId}>
                        {dish.dishName} ({formatNumber(dish.totalQty)} шт)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={e => setDateFrom(e.target.value)}
                  className="border rounded px-2 py-1 text-sm"
                />
                <span className="text-sm text-muted-foreground">—</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={e => setDateTo(e.target.value)}
                  className="border rounded px-2 py-1 text-sm"
                />
              </div>
            </div>
            
            {/* Табы группировки */}
            <Tabs value={groupBy} onValueChange={(v) => setGroupBy(v as any)}>
              <TabsList>
                <TabsTrigger value="days">Дни</TabsTrigger>
                <TabsTrigger value="weeks">Недели</TabsTrigger>
                <TabsTrigger value="months">Месяцы</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

      <div className="relative">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/50 dark:bg-black/30 backdrop-blur-[1px]">
            <div className="w-8 h-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
          </div>
        )}
        <div className={`space-y-6 transition-opacity duration-300 ${loading ? 'opacity-50' : 'opacity-100'}`}>
          {/* Карточки с итогами */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                <div className="rounded-lg border p-4">
                  <div className="text-sm text-muted-foreground">Продано (текущий период)</div>
                  <div className="text-2xl font-bold" style={{ color: '#f97316' }}>{formatNumber(totalQtyCurrent)} шт</div>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="text-sm text-muted-foreground">Продано (прошлый год)</div>
                  <div className="text-2xl font-bold" style={{ color: '#6b7280' }}>{formatNumber(totalQtyLastYear)} шт</div>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="text-sm text-muted-foreground">Изменение количества</div>
                  <div className={`text-2xl font-bold ${totalQtyLastYear > 0 ? (totalQtyCurrent > totalQtyLastYear ? 'text-green-600' : 'text-red-600') : 'text-muted-foreground'}`}>
                    {totalQtyLastYear > 0 ? 
                      `${totalQtyCurrent > totalQtyLastYear ? '+' : ''}${Math.round((totalQtyCurrent - totalQtyLastYear) / totalQtyLastYear * 100)}%` : 
                      'Нет данных'
                    }
                  </div>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="text-sm text-muted-foreground">Выручка (текущий период)</div>
                  <div className="text-2xl font-bold" style={{ color: '#f97316' }}>{formatNumber(totalRevenueCurrent)} ₽</div>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="text-sm text-muted-foreground">Выручка (прошлый год)</div>
                  <div className="text-2xl font-bold" style={{ color: '#6b7280' }}>{formatNumber(totalRevenueLastYear)} ₽</div>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="text-sm text-muted-foreground">Изменение выручки</div>
                  <div className={`text-2xl font-bold ${totalRevenueLastYear > 0 ? (totalRevenueCurrent > totalRevenueLastYear ? 'text-green-600' : 'text-red-600') : 'text-muted-foreground'}`}>
                    {totalRevenueLastYear > 0 ? 
                      `${totalRevenueCurrent > totalRevenueLastYear ? '+' : ''}${Math.round((totalRevenueCurrent - totalRevenueLastYear) / totalRevenueLastYear * 100)}%` : 
                      'Нет данных'
                    }
                  </div>
                </div>
              </div>

          {/* График с табами */}
          <Card>
            <CardContent className="p-4">
                <Tabs value={displayMode} onValueChange={(value) => setDisplayMode(value as 'sales' | 'receipts')}>
                  <div className="flex justify-between items-center mb-4">
                    <TabsList className="grid w-full max-w-xs grid-cols-2">
                      <TabsTrigger value="sales">Продажи</TabsTrigger>
                      <TabsTrigger value="receipts">Чеки</TabsTrigger>
                    </TabsList>
                  </div>
                  
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="x"
                          tick={{ fontSize: 12 }}
                          angle={groupBy === 'months' ? -45 : 0}
                          textAnchor={groupBy === 'months' ? 'end' : 'middle'}
                        />
                        <YAxis 
                          tickFormatter={displayMode === 'sales' ? (value) => formatNumber(value) : undefined}
                          tick={{ fontSize: 10 }} 
                        />
                        <Tooltip 
                          formatter={(value: any) => {
                            if (value === null) return null
                            const unit = displayMode === 'sales' ? '₽' : 'шт'
                            return `${formatNumber(value)} ${unit}`
                          }}
                          labelFormatter={(label) => label}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="current" 
                          stroke="#374151" 
                          strokeWidth={2}
                          name="Текущий период"
                          connectNulls={false}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="lastYear" 
                          stroke="#f97316" 
                          strokeWidth={2}
                          name="Год назад"
                          connectNulls={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </Tabs>
            </CardContent>
          </Card>

          {/* Таблица */}
          <Card>
            <CardContent className="p-4">
                <div className="overflow-auto">
                  <Table className="w-full">
                  <THead>
                    <TR>
                      <TH className="w-32">{groupBy === 'days' ? 'День' : groupBy === 'weeks' ? 'Неделя' : 'Месяц'}</TH>
                      <TH className="text-right">Кол-во (текущий)</TH>
                      <TH className="text-right">Кол-во (год назад)</TH>
                      <TH className="text-right">Кол-во (разница)</TH>
                      <TH className="text-right">Кол-во (разница %)</TH>
                      <TH className="text-right">Выручка (текущий)</TH>
                      <TH className="text-right">Выручка (год назад)</TH>
                      <TH className="text-right">Выручка (разница)</TH>
                      <TH className="text-right">Выручка (разница %)</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {chartData.map((row, idx) => {
                      const qtyDiff = (row.qtyCurrent || 0) - (row.qtyLastYear || 0)
                      const revDiff = (row.revenueCurrent || 0) - (row.revenueLastYear || 0)
                      
                      const qtyDiffPercent = row.qtyLastYear && row.qtyLastYear !== 0 
                        ? Math.round((qtyDiff / row.qtyLastYear) * 100) 
                        : null
                      
                      const revDiffPercent = row.revenueLastYear && row.revenueLastYear !== 0 
                        ? Math.round((revDiff / row.revenueLastYear) * 100) 
                        : null
                      
                      return (
                        <TR key={idx}>
                          <TD className="font-medium">{row.x}</TD>
                          <TD className="text-right">{row.qtyCurrent !== null ? formatNumber(row.qtyCurrent) : ''}</TD>
                          <TD className="text-right">{row.qtyLastYear !== null ? formatNumber(row.qtyLastYear) : ''}</TD>
                          <TD className={`text-right font-medium ${
                            qtyDiff > 0 ? 'text-green-600' : qtyDiff < 0 ? 'text-red-600' : ''
                          }`}>
                            {row.qtyCurrent !== null && row.qtyLastYear !== null ? formatNumber(qtyDiff) : ''}
                          </TD>
                          <TD className={`text-right font-medium ${
                            qtyDiffPercent !== null ? (qtyDiffPercent > 0 ? 'text-green-600' : qtyDiffPercent < 0 ? 'text-red-600' : '') : ''
                          }`}>
                            {qtyDiffPercent !== null ? `${qtyDiffPercent > 0 ? '+' : ''}${qtyDiffPercent}%` : ''}
                          </TD>
                          <TD className="text-right">{row.revenueCurrent !== null ? formatNumber(row.revenueCurrent) : ''}</TD>
                          <TD className="text-right">{row.revenueLastYear !== null ? formatNumber(row.revenueLastYear) : ''}</TD>
                          <TD className={`text-right font-medium ${
                            revDiff > 0 ? 'text-green-600' : revDiff < 0 ? 'text-red-600' : ''
                          }`}>
                            {row.revenueCurrent !== null && row.revenueLastYear !== null ? formatNumber(revDiff) : ''}
                          </TD>
                          <TD className={`text-right font-medium ${
                            revDiffPercent !== null ? (revDiffPercent > 0 ? 'text-green-600' : revDiffPercent < 0 ? 'text-red-600' : '') : ''
                          }`}>
                            {revDiffPercent !== null ? `${revDiffPercent > 0 ? '+' : ''}${revDiffPercent}%` : ''}
                          </TD>
                        </TR>
                      )
                    })}
                    </TBody>
                  </Table>
                </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
