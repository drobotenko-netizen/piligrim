"use client"
import { useEffect, useState, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000'

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
  
  const [selectedSupplier, setSelectedSupplier] = useState<string>('all')
  const [groupBy, setGroupBy] = useState<'days' | 'weeks' | 'months'>('months')
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [dataCurrent, setDataCurrent] = useState<any[]>([])
  const [dataLastYear, setDataLastYear] = useState<any[]>([])
  const [totalRevenue, setTotalRevenue] = useState<number>(0)
  const [totalRevenueByPeriod, setTotalRevenueByPeriod] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  // Загрузка списка поставщиков
  const loadSuppliers = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/counterparties?type=supplier`, { credentials: 'include' })
      const json = await res.json()
      console.log('Loaded suppliers:', json)
      setSuppliers(json.counterparties || [])
      // Автоматически выбираем первого поставщика
      if (json.counterparties?.length > 0) {
        setSelectedSupplier(json.counterparties[0].id)
      }
    } catch (e) {
      console.error('Error loading suppliers:', e)
    }
  }

  // Загрузка данных по поставщику
  const loadData = async () => {
    if (selectedSupplier === 'all') return
    
    console.log('Loading data for supplier:', selectedSupplier)
    setLoading(true)
    try {
      // Вычисляем период год назад
      const fromDate = new Date(dateFrom)
      const toDate = new Date(dateTo)
      
      const lastYearFrom = new Date(fromDate)
      lastYearFrom.setFullYear(lastYearFrom.getFullYear() - 1)
      
      const lastYearTo = new Date(toDate)
      lastYearTo.setFullYear(lastYearTo.getFullYear() - 1)
      
      const [resCurrent, resLastYear, resTotalRevenue] = await Promise.all([
        fetch(`${API_BASE}/api/payments?counterpartyId=${selectedSupplier}&from=${dateFrom}&to=${dateTo}`, { credentials: 'include' }),
        fetch(`${API_BASE}/api/payments?counterpartyId=${selectedSupplier}&from=${lastYearFrom.toISOString().slice(0, 10)}&to=${lastYearTo.toISOString().slice(0, 10)}`, { credentials: 'include' }),
        fetch(`${API_BASE}/api/payments?from=${dateFrom}&to=${dateTo}`, { credentials: 'include' })
      ])
      
      const jsonCurrent = await resCurrent.json()
      const jsonLastYear = await resLastYear.json()
      const jsonTotalRevenue = await resTotalRevenue.json()
      
      console.log('Current data:', jsonCurrent)
      console.log('Last year data:', jsonLastYear)
      console.log('Total revenue data:', jsonTotalRevenue)
      console.log('Last year period:', lastYearFrom.toISOString().slice(0, 10), 'to', lastYearTo.toISOString().slice(0, 10))
      
      // Рассчитываем общую выручку
      const totalRevenueAmount = jsonTotalRevenue.items?.reduce((sum: number, payment: any) => sum + (payment.amount || 0), 0) || 0
      setTotalRevenue(totalRevenueAmount / 100) // Конвертируем из копеек в рубли
      
      // Группируем общую выручку по периодам для расчета процентов
      const revenueByPeriod = jsonTotalRevenue.items?.reduce((acc: any, item: any) => {
        const date = new Date(item.date)
        let key: string
        
        if (groupBy === 'days') {
          key = date.toISOString().slice(0, 10)
        } else if (groupBy === 'weeks') {
          const weekStart = new Date(date)
          weekStart.setDate(date.getDate() - date.getDay())
          key = weekStart.toISOString().slice(0, 10)
        } else { // months
          // Используем тот же формат, что и в chartData: MM.YY
          const month = String(date.getMonth() + 1).padStart(2, '0')
          const year = String(date.getFullYear()).slice(-2)
          key = `${month}.${year}`
        }
        
        if (!acc[key]) {
          acc[key] = { period: key, amount: 0 }
        }
        acc[key].amount += (item.amount || 0) / 100 // Конвертируем из копеек в рубли
        return acc
      }, {}) || {}
      
      setTotalRevenueByPeriod(Object.values(revenueByPeriod))
      
      // Группируем данные по дням
      const currentByDate = new Map<string, { date: string; amount: number; count: number }>()
      const lastYearByDate = new Map<string, { date: string; amount: number; count: number }>()
      
      // Обрабатываем текущие данные
      jsonCurrent.payments?.forEach((payment: any) => {
        const date = payment.date.slice(0, 10)
        const existing = currentByDate.get(date) || { date, amount: 0, count: 0 }
        existing.amount += (payment.amount || 0) / 100 // Конвертируем из копеек в рубли
        existing.count += 1
        currentByDate.set(date, existing)
      })
      
      // Обрабатываем данные прошлого года
      jsonLastYear.payments?.forEach((payment: any) => {
        const date = payment.date.slice(0, 10)
        const existing = lastYearByDate.get(date) || { date, amount: 0, count: 0 }
        existing.amount += (payment.amount || 0) / 100 // Конвертируем из копеек в рубли
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
    loadSuppliers()
  }, [])

  useEffect(() => {
    loadData()
  }, [dateFrom, dateTo, selectedSupplier, groupBy])

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

  const selectedSupplierData = suppliers.find(s => s.id === selectedSupplier)

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

              {/* Выбор поставщика */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Поставщик:</span>
                <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                  <SelectTrigger className="w-[300px]">
                    <SelectValue placeholder="Выберите поставщика" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[400px]">
                    {suppliers.map(supplier => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.name}
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
        {selectedSupplierData && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground">Поставщик</div>
                <div className="text-lg font-semibold">{selectedSupplierData.name}</div>
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

        {/* График */}
        <Card>
          <CardContent className="p-4">
            <div className="mb-4">
              <h3 className="text-lg font-semibold">Динамика платежей</h3>
            </div>
            {loading ? (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                Загрузка...
              </div>
            ) : dataCurrent.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-muted-foreground">
                <div className="text-lg mb-2">Нет данных за выбранный период</div>
                <div className="text-sm">Попробуйте изменить период или поставщика</div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="x" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={(value) => formatNumber(value)} tick={{ fontSize: 12 }} />
                  <Tooltip 
                    formatter={(value: any, name: string) => [
                      formatCurrency(value), 
                      name === 'amountCurrent' ? 'Текущий период' : 'Прошлый год'
                    ]}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="amountCurrent" 
                    stroke="#f97316" 
                    strokeWidth={2}
                    name="Текущий период"
                    dot={{ fill: '#f97316', strokeWidth: 2, r: 4 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="amountLastYear" 
                    stroke="#6b7280" 
                    strokeWidth={2}
                    name="Прошлый год"
                    dot={{ fill: '#6b7280', strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* График процентов */}
        <Card>
          <CardContent className="p-4">
            <div className="mb-4">
              <h3 className="text-lg font-semibold">Доля в общей выручке (%)</h3>
            </div>
            {loading ? (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                Загрузка...
              </div>
            ) : dataCurrent.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-muted-foreground">
                <div className="text-lg mb-2">Нет данных за выбранный период</div>
                <div className="text-sm">Попробуйте изменить период или поставщика</div>
              </div>
            ) : totalRevenue === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-muted-foreground">
                <div className="text-lg mb-2">Нет данных общей выручки</div>
                <div className="text-sm">Не удалось загрузить общую выручку за период</div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={percentageChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="x" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={(value) => `${value.toFixed(1)}%`} tick={{ fontSize: 12 }} />
                  <Tooltip 
                    formatter={(value: any) => [`${Number(value).toFixed(2)}%`, 'Доля в выручке']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="percentage" 
                    stroke="#f97316" 
                    strokeWidth={2}
                    name="Доля в выручке"
                    dot={{ fill: '#f97316', strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Детализация */}
        <Card>
          <CardContent className="p-4">
            <h3 className="text-lg font-semibold mb-4">Детализация платежей</h3>
            <div className="overflow-x-auto">
              <Table>
                <THead>
                  <TR>
                    <TH>Дата</TH>
                    <TH>Сумма (текущий период)</TH>
                    <TH>Сумма (прошлый год)</TH>
                    <TH>Изменение</TH>
                  </TR>
                </THead>
                <TBody>
                  {chartData.map((item, index) => {
                    const change = item.amountLastYear > 0 
                      ? ((item.amountCurrent - item.amountLastYear) / item.amountLastYear * 100)
                      : item.amountCurrent > 0 ? 100 : 0
                    
                    return (
                      <TR key={index}>
                        <TD>{item.x}</TD>
                        <TD>{formatCurrency(item.amountCurrent)}</TD>
                        <TD>{formatCurrency(item.amountLastYear)}</TD>
                        <TD className={change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : ''}>
                          {change > 0 ? '+' : ''}{change.toFixed(1)}%
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
  )
}
