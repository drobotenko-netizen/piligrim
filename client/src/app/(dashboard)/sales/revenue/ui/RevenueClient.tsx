"use client"
import { useEffect, useState, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, ReferenceArea } from 'recharts'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000'

function formatNumber(value: number | null): string {
  if (value === null || value === undefined) return '-'
  return value.toLocaleString('ru-RU')
}

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr)
    return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })
  } catch {
    return dateStr
  }
}

function getWeekday(dateStr: string): number {
  try {
    const date = new Date(dateStr)
    return date.getDay() // 0 = воскресенье, 1 = понедельник, ..., 6 = суббота
  } catch {
    return 0
  }
}

function getWeekdayName(weekday: number): string {
  const names = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб']
  return names[weekday]
}

function groupByWeekday(data: any[]): { [key: number]: { sum: number, count: number, dates: string[] } } {
  const grouped: { [key: number]: { sum: number, count: number, dates: string[] } } = {}
  
  for (const item of data) {
    const weekday = getWeekday(item.date)
    if (!grouped[weekday]) {
      grouped[weekday] = { sum: 0, count: 0, dates: [] }
    }
    grouped[weekday].sum += item.net || 0
    grouped[weekday].count += 1
    grouped[weekday].dates.push(item.date)
  }
  
  return grouped
}


// Компонент для отображения подписей под графиком
const WeekdayLabels = ({ chartData }: { chartData: any[] }) => {
  if (!chartData.length) return null
  
  return (
    <div className="flex justify-between items-end" style={{ paddingTop: '4px', paddingBottom: '8px', paddingLeft: '50px', marginRight: '-10px' }}>
      {chartData.map((data, index) => (
        <div
          key={index}
          className="text-center flex-1"
        >
          {/* День недели */}
          <div className="text-xs mb-1 h-4 flex items-center justify-center" style={{ 
            color: (data.weekdayMonth1 !== null && (data.weekdayMonth1 === 0 || data.weekdayMonth1 === 6)) || 
                   (data.weekdayMonth2 !== null && (data.weekdayMonth2 === 0 || data.weekdayMonth2 === 6)) 
                   ? '#dc2626' : '#6b7280' 
          }}>
            {data.weekdayMonth1 !== null ? getWeekdayName(data.weekdayMonth1) : 
             data.weekdayMonth2 !== null ? getWeekdayName(data.weekdayMonth2) : '\u00A0'}
          </div>
          {/* Горизонтальная линия */}
          <div className="w-full h-px bg-gray-300 mb-1"></div>
          {/* Дата первого месяца */}
          <div className="text-xs mb-1 h-4 flex items-center justify-center" style={{ color: '#374151' }}>
            {data.dateMonth1 ? data.dateMonth1.split('.')[0] : '\u00A0'}
          </div>
          {/* Дата второго месяца */}
          <div className="text-xs h-4 flex items-center justify-center" style={{ color: '#f97316' }}>
            {data.dateMonth2 ? data.dateMonth2.split('.')[0] : '\u00A0'}
          </div>
        </div>
      ))}
    </div>
  )
}

export function RevenueClient() {
  const [year1, setYear1] = useState(2025)
  const [month1, setMonth1] = useState(9)
  const [year2, setYear2] = useState(2024)
  const [month2, setMonth2] = useState(9)
  
  const [data1, setData1] = useState<any[]>([])
  const [data2, setData2] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [byWeekday, setByWeekday] = useState(false)
  const [activeTab, setActiveTab] = useState('revenue')

  // Функция для автоматической установки дат
  const setDefaultDates = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/iiko/local/sales/available-months`)
      const data = await response.json()
      
      if (data.months && data.months.length > 0) {
        // Берем последний месяц с данными
        const latestMonth = data.months[0] // уже отсортированы по убыванию
        const [latestYear, latestMonthNum] = latestMonth.split('-').map(Number)
        
        // Устанавливаем последний месяц как первый
        setYear1(latestYear)
        setMonth1(latestMonthNum)
        
        // Ищем аналогичный месяц год назад
        const previousYear = latestYear - 1
        const previousMonthStr = `${previousYear}-${latestMonthNum.toString().padStart(2, '0')}`
        
        if (data.months.includes(previousMonthStr)) {
          // Если есть данные за аналогичный месяц год назад
          setYear2(previousYear)
          setMonth2(latestMonthNum)
        } else {
          // Если нет, берем предыдущий доступный месяц
          const previousMonth = data.months.find((month: string) => {
            const [year, monthNum] = month.split('-').map(Number)
            return year < latestYear || (year === latestYear && monthNum < latestMonthNum)
          })
          
          if (previousMonth) {
            const [prevYear, prevMonthNum] = previousMonth.split('-').map(Number)
            setYear2(prevYear)
            setMonth2(prevMonthNum)
          }
        }
      }
    } catch (error) {
      console.error('Ошибка при получении доступных месяцев:', error)
    }
  }

  const loadData = async () => {
    setLoading(true)
    console.log('Loading data for:', { year1, month1, year2, month2, activeTab })
    try {
      let endpoint1, endpoint2
      
      switch (activeTab) {
        case 'revenue':
          endpoint1 = `${API_BASE}/api/iiko/local/sales/revenue/month?year=${year1}&month=${month1}`
          endpoint2 = `${API_BASE}/api/iiko/local/sales/revenue/month?year=${year2}&month=${month2}`
          break
        case 'returns':
          endpoint1 = `${API_BASE}/api/iiko/local/sales/returns/month?year=${year1}&month=${month1}`
          endpoint2 = `${API_BASE}/api/iiko/local/sales/returns/month?year=${year2}&month=${month2}`
          break
        case 'deleted':
          endpoint1 = `${API_BASE}/api/iiko/local/sales/deleted/month?year=${year1}&month=${month1}`
          endpoint2 = `${API_BASE}/api/iiko/local/sales/deleted/month?year=${year2}&month=${month2}`
          break
        case 'total':
          endpoint1 = `${API_BASE}/api/iiko/local/sales/total/month?year=${year1}&month=${month1}`
          endpoint2 = `${API_BASE}/api/iiko/local/sales/total/month?year=${year2}&month=${month2}`
          break
        default:
          endpoint1 = `${API_BASE}/api/iiko/local/sales/revenue/month?year=${year1}&month=${month1}`
          endpoint2 = `${API_BASE}/api/iiko/local/sales/revenue/month?year=${year2}&month=${month2}`
      }
      
      const [res1, res2] = await Promise.all([
        fetch(endpoint1),
        fetch(endpoint2)
      ])
      
      console.log('API responses:', { res1: res1.status, res2: res2.status })
      
      const json1 = await res1.json()
      const json2 = await res2.json()
      
      console.log('API data:', { json1, json2 })
      
      setData1(json1.revenue || [])
      setData2(json2.revenue || [])
    } catch (e) {
      console.error('Error loading data:', e)
    } finally {
      setLoading(false)
    }
  }

  // Автоматически устанавливаем даты при загрузке компонента
  useEffect(() => {
    setDefaultDates()
  }, [])

  useEffect(() => {
    loadData()
  }, [year1, month1, year2, month2, activeTab])

  // Объединяем данные для графика
  const chartData = useMemo(() => {
    if (byWeekday) {
      // Режим по дням недели - сдвигаем данные так, чтобы дни недели совпадали
      const isEarlier = (year1 < year2) || (year1 === year2 && month1 < month2)
      const earlierData = isEarlier ? data1 : data2
      const laterData = isEarlier ? data2 : data1
      
      // Находим день недели первого дня каждого месяца
      const earlierFirstDay = earlierData[0]?.date ? getWeekday(earlierData[0].date) : 0
      const laterFirstDay = laterData[0]?.date ? getWeekday(laterData[0].date) : 0
      
      // Вычисляем сдвиг (сколько дней нужно сдвинуть более поздний месяц)
      let shift = laterFirstDay - earlierFirstDay
      if (shift < 0) shift += 7 // Если отрицательный, добавляем 7 дней
      
      const maxDays = Math.max(earlierData.length, laterData.length + shift)
      const result = []
      
      for (let i = 0; i < maxDays; i++) {
        const dayEarlier = earlierData[i]
        const dayLater = i >= shift ? laterData[i - shift] : null
        
        // month1 всегда соответствует year1/month1, month2 - year2/month2
        const month1Data = isEarlier ? dayEarlier : dayLater
        const month2Data = isEarlier ? dayLater : dayEarlier
        
        result.push({
          day: i + 1,
          month1: month1Data?.net || null,
          month2: month2Data?.net || null,
          count1: month1Data?.count || null,
          count2: month2Data?.count || null,
          dateMonth1: month1Data?.date ? formatDate(month1Data.date) : '',
          dateMonth2: month2Data?.date ? formatDate(month2Data.date) : '',
          weekdayMonth1: month1Data?.date ? getWeekday(month1Data.date) : null,
          weekdayMonth2: month2Data?.date ? getWeekday(month2Data.date) : null
        })
      }
      
      return result
    } else {
      // Обычный режим по дням
      const maxDays = Math.max(data1.length, data2.length)
      const result = []
      
      // Определяем, какой месяц раньше
      const isEarlier = (year1 < year2) || (year1 === year2 && month1 < month2)
      const earlierData = isEarlier ? data1 : data2
      const laterData = isEarlier ? data2 : data1
      
      for (let i = 0; i < maxDays; i++) {
        const dayEarlier = earlierData[i]
        const dayLater = laterData[i]
        
        // month1 всегда соответствует year1/month1, month2 - year2/month2
        const month1Data = isEarlier ? dayEarlier : dayLater
        const month2Data = isEarlier ? dayLater : dayEarlier
        
        result.push({
          day: i + 1,
          month1: month1Data?.net || null,
          month2: month2Data?.net || null,
          count1: month1Data?.count || null,
          count2: month2Data?.count || null,
          dateMonth1: month1Data?.date ? formatDate(month1Data.date) : '',
          dateMonth2: month2Data?.date ? formatDate(month2Data.date) : ''
        })
      }
      
      return result
    }
  }, [data1, data2, year1, month1, year2, month2, byWeekday])

  // Объединяем данные для таблицы
  const tableData = useMemo(() => {
    const maxDays = Math.max(data1.length, data2.length)
    const result = []
    
    for (let i = 0; i < maxDays; i++) {
      const day1 = data1[i]
      const day2 = data2[i]
      
      result.push({
        day: i + 1,
        date1: day1?.date ? formatDate(day1.date) : '',
        net1: day1?.net || null,
        gross1: day1?.gross || null,
        discount1: day1?.discount || null,
        date2: day2?.date ? formatDate(day2.date) : '',
        net2: day2?.net || null,
        gross2: day2?.gross || null,
        discount2: day2?.discount || null
      })
    }
    
    return result
  }, [data1, data2])

  const total1 = data1.reduce((sum, d) => sum + (d?.net || 0), 0)
  const total2 = data2.reduce((sum, d) => sum + (d?.net || 0), 0)

  // Функция для создания зон выходных дней
  const getWeekendAreas = () => {
    if (!byWeekday) return []
    
    const areas = []
    let weekendStart = null
    
    for (let i = 0; i < chartData.length; i++) {
      const data = chartData[i]
      const isWeekend = (data.weekdayEarlier === 0 || data.weekdayEarlier === 6) || 
                       (data.weekdayLater === 0 || data.weekdayLater === 6)
      
      if (isWeekend && weekendStart === null) {
        weekendStart = i + 1 // day начинается с 1
      } else if (!isWeekend && weekendStart !== null) {
        areas.push({
          x1: weekendStart,
          x2: i, // день перед окончанием выходных
          fill: '#fed7d7',
          fillOpacity: 0.5
        })
        weekendStart = null
      }
    }
    
    // Если выходные дошли до конца данных
    if (weekendStart !== null) {
      areas.push({
        x1: weekendStart,
        x2: chartData.length,
        fill: '#fed7d7',
        fillOpacity: 0.5
      })
    }
    
    return areas
  }

  return (
    <Card>
      <CardContent className="p-4 space-y-6">
        {/* Заголовок и селекторы */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Сравнение выручки</h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Месяц 1:</span>
              <select 
                value={year1} 
                onChange={e => setYear1(Number(e.target.value))}
                className="border rounded px-2 py-1 text-sm"
              >
                {Array.from({ length: 5 }).map((_, i) => {
                  const year = new Date().getFullYear() - 2 + i
                  return <option key={year} value={year}>{year}</option>
                })}
              </select>
              <select 
                value={month1} 
                onChange={e => setMonth1(Number(e.target.value))}
                className="border rounded px-2 py-1 text-sm"
              >
                {Array.from({ length: 12 }).map((_, i) => {
                  const month = i + 1
                  return (
                    <option key={month} value={month}>
                      {new Date(Date.UTC(2000, month - 1)).toLocaleDateString('ru-RU', { month: 'long' })}
                    </option>
                  )
                })}
              </select>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Месяц 2:</span>
              <select 
                value={year2} 
                onChange={e => setYear2(Number(e.target.value))}
                className="border rounded px-2 py-1 text-sm"
              >
                {Array.from({ length: 5 }).map((_, i) => {
                  const year = new Date().getFullYear() - 2 + i
                  return <option key={year} value={year}>{year}</option>
                })}
              </select>
              <select 
                value={month2} 
                onChange={e => setMonth2(Number(e.target.value))}
                className="border rounded px-2 py-1 text-sm"
              >
                {Array.from({ length: 12 }).map((_, i) => {
                  const month = i + 1
                  return (
                    <option key={month} value={month}>
                      {new Date(Date.UTC(2000, month - 1)).toLocaleDateString('ru-RU', { month: 'long' })}
                    </option>
                  )
                })}
              </select>
            </div>
            
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="byWeekday"
                checked={byWeekday}
                onChange={(e) => setByWeekday(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="byWeekday" className="text-sm">
                По дням недели
              </label>
            </div>
            
            <button 
              onClick={loadData}
              disabled={loading}
              className="border rounded px-3 py-1 text-sm disabled:opacity-50"
            >
              {loading ? 'Загрузка...' : 'Обновить'}
            </button>
          </div>
        </div>

        {/* Итоги */}
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg border p-4">
            <div className="text-sm text-muted-foreground">
                <span className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-gray-700"></div>
                  {new Date(Date.UTC(year1, month1 - 1)).toLocaleDateString('ru-RU', { month: 'long' })} {year1}
                </span>
            </div>
            <div className="text-2xl font-bold">{Math.round(total1).toLocaleString('ru-RU')} ₽</div>
          </div>
          <div className="rounded-lg border p-4">
            <div className="text-sm text-muted-foreground">
                <span className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                  {new Date(Date.UTC(year2, month2 - 1)).toLocaleDateString('ru-RU', { month: 'long' })} {year2}
                </span>
            </div>
            <div className="text-2xl font-bold">{Math.round(total2).toLocaleString('ru-RU')} ₽</div>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Загрузка данных...</div>
        ) : (
          <>
            {/* График с табами */}
            <div className="rounded-lg border p-4" id="chart-container">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="flex justify-between items-center mb-4">
                  <TabsList className="grid w-full max-w-md grid-cols-4">
                    <TabsTrigger value="revenue">Выручка</TabsTrigger>
                    <TabsTrigger value="returns">Возвраты</TabsTrigger>
                    <TabsTrigger value="deleted">Удалённые</TabsTrigger>
                    <TabsTrigger value="total">Всего</TabsTrigger>
                  </TabsList>
                <div className="relative">
                  <button
                    onClick={async () => {
                      const container = document.getElementById('chart-container')
                      if (container) {
                        try {
                          // Динамически импортируем html2canvas
                          const html2canvas = (await import('html2canvas')).default
                          
                          // Создаем canvas из контейнера
                          const canvas = await html2canvas(container, {
                            backgroundColor: '#ffffff',
                            scale: 2, // Увеличиваем качество
                            useCORS: true,
                            allowTaint: true
                          })
                          
                          // Конвертируем в PNG и скачиваем
                          const link = document.createElement('a')
                          link.download = `revenue-chart-${year1}-${month1}-vs-${year2}-${month2}.png`
                          link.href = canvas.toDataURL('image/png')
                          document.body.appendChild(link)
                          link.click()
                          document.body.removeChild(link)
                        } catch (error) {
                          console.error('Ошибка при сохранении:', error)
                          alert('Ошибка при сохранении изображения')
                        }
                      }
                    }}
                    className="p-2 hover:bg-gray-100 rounded-full"
                    title="Сохранить PNG"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="1"/>
                      <circle cx="19" cy="12" r="1"/>
                      <circle cx="5" cy="12" r="1"/>
                    </svg>
                  </button>
                </div>
              </div>
                
                <TabsContent value="revenue" className="mt-0">
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="day" 
                      tick={byWeekday ? false : true} // Hide ticks only when byWeekday is true
                      height={byWeekday ? 5 : 30} // Minimize height only when byWeekday is true
                    />
                    <YAxis 
                      tickFormatter={(value) => formatNumber(value)}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip 
                      formatter={(value: any, name: string, props: any) => {
                        if (value === null) return null
                        
                            // month1 всегда соответствует year1/month1, month2 - year2/month2
                            const month1Name = new Date(Date.UTC(year1, month1 - 1)).toLocaleDateString('ru-RU', { month: 'long' })
                            const month2Name = new Date(Date.UTC(year2, month2 - 1)).toLocaleDateString('ru-RU', { month: 'long' })
                        
                        if (byWeekday) {
                          const payload = props.payload
                          const weekday = name === 'month1' ? payload.weekdayMonth1 : payload.weekdayMonth2
                          const date = name === 'month1' ? payload.dateMonth1 : payload.dateMonth2
                          
                          return [
                            `${formatNumber(value)} ₽ (${date}, ${getWeekdayName(weekday)})`,
                            name === 'month1' ? 
                              `${month1Name} ${year1}` : 
                              `${month2Name} ${year2}`
                          ]
                        } else {
                          return [
                            formatNumber(value), 
                            name === 'month1' ? 
                              `${month1Name} ${year1}` : 
                              `${month2Name} ${year2}`
                          ]
                        }
                      }}
                      labelFormatter={(label) => String(label).padStart(2, '0')}
                    />
                    {/* Зоны выходных дней */}
                    {getWeekendAreas().map((area, index) => (
                      <ReferenceArea
                        key={`weekend-${index}`}
                        x1={area.x1}
                        x2={area.x2}
                        fill={area.fill}
                        fillOpacity={area.fillOpacity}
                      />
                    ))}
                    <Line 
                      type="monotone" 
                          dataKey="month1" 
                          stroke="#374151" 
                          strokeWidth={2}
                          name="month1"
                          connectNulls={false}
                          dot={(props: any) => {
                            if (props.payload.month1 === null) return null
                            return <circle key={`month1-${props.index}`} cx={props.cx} cy={props.cy} r={3} fill="#374151" />
                          }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="month2" 
                          stroke="#f97316" 
                          strokeWidth={2}
                          name="month2"
                          connectNulls={false}
                          dot={(props: any) => {
                            if (props.payload.month2 === null) return null
                            return <circle key={`month2-${props.index}`} cx={props.cx} cy={props.cy} r={3} fill="#f97316" />
                          }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  {byWeekday && <WeekdayLabels chartData={chartData} />}
                </TabsContent>
                
                <TabsContent value="returns" className="mt-0">
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="day" 
                          tick={byWeekday ? false : true}
                          height={byWeekday ? 5 : 30}
                        />
                        <YAxis 
                          tickFormatter={(value) => formatNumber(value)}
                          tick={{ fontSize: 12 }}
                        />
                        <Tooltip 
                          formatter={(value: any, name: string, props: any) => {
                            if (value === null) return null
                            
                            // month1 всегда соответствует year1/month1, month2 - year2/month2
                            const month1Name = new Date(Date.UTC(year1, month1 - 1)).toLocaleDateString('ru-RU', { month: 'long' })
                            const month2Name = new Date(Date.UTC(year2, month2 - 1)).toLocaleDateString('ru-RU', { month: 'long' })
                            
                            if (byWeekday) {
                              const payload = props.payload
                              const weekday = name === 'month1' ? payload.weekdayMonth1 : payload.weekdayMonth2
                              const date = name === 'month1' ? payload.dateMonth1 : payload.dateMonth2
                              
                              return [
                                `${formatNumber(value)} ₽ (${date}, ${getWeekdayName(weekday)})`,
                                name === 'month1' ? 
                                  `${month1Name} ${year1}` : 
                                  `${month2Name} ${year2}`
                              ]
                            } else {
                              return [
                                formatNumber(value), 
                                name === 'month1' ? 
                                  `${month1Name} ${year1}` : 
                                  `${month2Name} ${year2}`
                              ]
                            }
                          }}
                          labelFormatter={(label) => String(label).padStart(2, '0')}
                        />
                        {getWeekendAreas().map((area, index) => (
                          <ReferenceArea
                            key={`weekend-${index}`}
                            x1={area.x1}
                            x2={area.x2}
                            fill={area.fill}
                            fillOpacity={area.fillOpacity}
                          />
                        ))}
                        <Line 
                          type="monotone" 
                          dataKey="month1" 
                          stroke="#374151" 
                          strokeWidth={2}
                          name="month1"
                          connectNulls={false}
                          dot={(props: any) => {
                            if (props.payload.month1 === null) return null
                            return <circle key={`month1-${props.index}`} cx={props.cx} cy={props.cy} r={3} fill="#374151" />
                          }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="month2" 
                          stroke="#f97316" 
                          strokeWidth={2}
                          name="month2"
                          connectNulls={false}
                          dot={(props: any) => {
                            if (props.payload.month2 === null) return null
                            return <circle key={`month2-${props.index}`} cx={props.cx} cy={props.cy} r={3} fill="#f97316" />
                          }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  {byWeekday && <WeekdayLabels chartData={chartData} />}
                </TabsContent>
                
                <TabsContent value="deleted" className="mt-0">
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="day" 
                          tick={byWeekday ? false : true}
                          height={byWeekday ? 5 : 30}
                        />
                        <YAxis 
                          tickFormatter={(value) => formatNumber(value)}
                          tick={{ fontSize: 12 }}
                        />
                        <Tooltip 
                          formatter={(value: any, name: string, props: any) => {
                            if (value === null) return null
                            
                            // month1 всегда соответствует year1/month1, month2 - year2/month2
                            const month1Name = new Date(Date.UTC(year1, month1 - 1)).toLocaleDateString('ru-RU', { month: 'long' })
                            const month2Name = new Date(Date.UTC(year2, month2 - 1)).toLocaleDateString('ru-RU', { month: 'long' })
                            
                            if (byWeekday) {
                              const payload = props.payload
                              const weekday = name === 'month1' ? payload.weekdayMonth1 : payload.weekdayMonth2
                              const date = name === 'month1' ? payload.dateMonth1 : payload.dateMonth2
                              
                              return [
                                `${formatNumber(value)} ₽ (${date}, ${getWeekdayName(weekday)})`,
                                name === 'month1' ? 
                                  `${month1Name} ${year1}` : 
                                  `${month2Name} ${year2}`
                              ]
                            } else {
                              return [
                                formatNumber(value), 
                                name === 'month1' ? 
                                  `${month1Name} ${year1}` : 
                                  `${month2Name} ${year2}`
                              ]
                            }
                          }}
                          labelFormatter={(label) => String(label).padStart(2, '0')}
                        />
                        {getWeekendAreas().map((area, index) => (
                          <ReferenceArea
                            key={`weekend-${index}`}
                            x1={area.x1}
                            x2={area.x2}
                            fill={area.fill}
                            fillOpacity={area.fillOpacity}
                          />
                        ))}
                        <Line 
                          type="monotone" 
                          dataKey="month1" 
                          stroke="#374151" 
                          strokeWidth={2}
                          name="month1"
                          connectNulls={false}
                          dot={(props: any) => {
                            if (props.payload.month1 === null) return null
                            return <circle key={`month1-${props.index}`} cx={props.cx} cy={props.cy} r={3} fill="#374151" />
                          }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="month2" 
                          stroke="#f97316" 
                          strokeWidth={2}
                          name="month2"
                          connectNulls={false}
                          dot={(props: any) => {
                            if (props.payload.month2 === null) return null
                            return <circle key={`month2-${props.index}`} cx={props.cx} cy={props.cy} r={3} fill="#f97316" />
                          }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  {byWeekday && <WeekdayLabels chartData={chartData} />}
                </TabsContent>
                
                <TabsContent value="total" className="mt-0">
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="day" 
                          tick={byWeekday ? false : true}
                          height={byWeekday ? 5 : 30}
                        />
                        <YAxis 
                          tickFormatter={(value) => formatNumber(value)}
                          tick={{ fontSize: 12 }}
                        />
                        <Tooltip 
                          formatter={(value: any, name: string, props: any) => {
                            if (value === null) return null
                            
                            // month1 всегда соответствует year1/month1, month2 - year2/month2
                            const month1Name = new Date(Date.UTC(year1, month1 - 1)).toLocaleDateString('ru-RU', { month: 'long' })
                            const month2Name = new Date(Date.UTC(year2, month2 - 1)).toLocaleDateString('ru-RU', { month: 'long' })
                            
                            if (byWeekday) {
                              const payload = props.payload
                              const weekday = name === 'month1' ? payload.weekdayMonth1 : payload.weekdayMonth2
                              const date = name === 'month1' ? payload.dateMonth1 : payload.dateMonth2
                              
                              return [
                                `${formatNumber(value)} ₽ (${date}, ${getWeekdayName(weekday)})`,
                                name === 'month1' ? 
                                  `${month1Name} ${year1}` : 
                                  `${month2Name} ${year2}`
                              ]
                            } else {
                              return [
                                formatNumber(value), 
                                name === 'month1' ? 
                                  `${month1Name} ${year1}` : 
                                  `${month2Name} ${year2}`
                              ]
                            }
                          }}
                          labelFormatter={(label) => String(label).padStart(2, '0')}
                        />
                        {getWeekendAreas().map((area, index) => (
                          <ReferenceArea
                            key={`weekend-${index}`}
                            x1={area.x1}
                            x2={area.x2}
                            fill={area.fill}
                            fillOpacity={area.fillOpacity}
                          />
                        ))}
                        <Line 
                          type="monotone" 
                          dataKey="month1" 
                      stroke="#374151" 
                      strokeWidth={2}
                          name="month1"
                      connectNulls={false}
                      dot={(props: any) => {
                            if (props.payload.month1 === null) return null
                            return <circle key={`month1-${props.index}`} cx={props.cx} cy={props.cy} r={3} fill="#374151" />
                      }}
                    />
                    <Line 
                      type="monotone" 
                          dataKey="month2" 
                      stroke="#f97316" 
                      strokeWidth={2}
                          name="month2"
                      connectNulls={false}
                      dot={(props: any) => {
                            if (props.payload.month2 === null) return null
                            return <circle key={`month2-${props.index}`} cx={props.cx} cy={props.cy} r={3} fill="#f97316" />
                      }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              {byWeekday && <WeekdayLabels chartData={chartData} />}
                </TabsContent>
              </Tabs>
            </div>

            {/* График по количеству чеков */}
            <div className="rounded-lg border p-4">
              <h3 className="text-lg font-semibold mb-4">Количество чеков</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="day" 
                      tick={byWeekday ? false : true}
                      height={byWeekday ? 5 : 30}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis 
                      tickFormatter={(value) => formatNumber(value)}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip 
                      formatter={(value: any, name: string, props: any) => {
                        if (value === null) return null
                        
                        // month1 всегда соответствует year1/month1, month2 - year2/month2
                        const month1Name = new Date(Date.UTC(year1, month1 - 1)).toLocaleDateString('ru-RU', { month: 'long' })
                        const month2Name = new Date(Date.UTC(year2, month2 - 1)).toLocaleDateString('ru-RU', { month: 'long' })
                        
                        if (byWeekday) {
                          const payload = props.payload
                          const weekday = name === 'count1' ? payload.weekdayMonth1 : payload.weekdayMonth2
                          const date = name === 'count1' ? payload.dateMonth1 : payload.dateMonth2
                          
                          return [
                            `${formatNumber(value)} чеков (${date}, ${getWeekdayName(weekday)})`,
                            name === 'count1' ? 
                              `${month1Name} ${year1}` : 
                              `${month2Name} ${year2}`
                          ]
                        } else {
                          return [
                            `${formatNumber(value)} чеков`, 
                            name === 'count1' ? 
                              `${month1Name} ${year1}` : 
                              `${month2Name} ${year2}`
                          ]
                        }
                      }}
                      labelFormatter={(label) => String(label).padStart(2, '0')}
                    />
                    {/* Зоны выходных дней */}
                    {getWeekendAreas().map((area, index) => (
                      <ReferenceArea
                        key={`weekend-${index}`}
                        x1={area.x1}
                        x2={area.x2}
                        fill={area.fill}
                        fillOpacity={area.fillOpacity}
                      />
                    ))}
                    <Line 
                      type="monotone" 
                      dataKey="count1" 
                      stroke="#374151" 
                      strokeWidth={2}
                      name="count1"
                      connectNulls={false}
                      dot={(props: any) => {
                        if (props.payload.count1 === null) return null
                        return <circle key={`count1-${props.index}`} cx={props.cx} cy={props.cy} r={3} fill="#374151" />
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="count2" 
                      stroke="#f97316" 
                      strokeWidth={2}
                      name="count2"
                      connectNulls={false}
                      dot={(props: any) => {
                        if (props.payload.count2 === null) return null
                        return <circle key={`count2-${props.index}`} cx={props.cx} cy={props.cy} r={3} fill="#f97316" />
                      }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              {byWeekday && <WeekdayLabels chartData={chartData} />}
            </div>

            {/* Таблица */}
            <div className="rounded-lg border p-4">
              <h3 className="text-lg font-semibold mb-4">Таблица сравнения по дням</h3>
              <div className="overflow-auto">
                <Table className="w-full">
                  <THead>
                    <TR>
                      <TH className="w-16">День</TH>
                      <TH className="w-24">Дата 1</TH>
                      <TH className="text-right w-32">Выручка 1</TH>
                      <TH className="text-right w-32">Валовый 1</TH>
                      <TH className="text-right w-32">Скидка 1</TH>
                      <TH className="w-24">Дата 2</TH>
                      <TH className="text-right w-32">Выручка 2</TH>
                      <TH className="text-right w-32">Валовый 2</TH>
                      <TH className="text-right w-32">Скидка 2</TH>
                      <TH className="text-right w-32">Разница</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {tableData.map((row, idx) => (
                      <TR key={idx}>
                        <TD className="font-medium">{row.day}</TD>
                        <TD>{row.date1}</TD>
                        <TD className="text-right">{row.net1 !== null ? formatNumber(row.net1) : ''}</TD>
                        <TD className="text-right">{row.gross1 !== null ? formatNumber(row.gross1) : ''}</TD>
                        <TD className="text-right">{row.discount1 !== null ? formatNumber(row.discount1) : ''}</TD>
                        <TD>{row.date2}</TD>
                        <TD className="text-right">{row.net2 !== null ? formatNumber(row.net2) : ''}</TD>
                        <TD className="text-right">{row.gross2 !== null ? formatNumber(row.gross2) : ''}</TD>
                        <TD className="text-right">{row.discount2 !== null ? formatNumber(row.discount2) : ''}</TD>
                        <TD className={`text-right font-medium ${row.net1 !== null && row.net2 !== null ? (row.net1 - row.net2 > 0 ? 'text-green-600' : row.net1 - row.net2 < 0 ? 'text-red-600' : '') : ''}`}>
                          {row.net1 !== null && row.net2 !== null ? formatNumber(row.net1 - row.net2) : ''}
                        </TD>
                      </TR>
                    ))}
                    {!tableData.length && (
                      <TR>
                        <TD colSpan={10} className="text-center text-muted-foreground">
                          Нет данных для отображения
                        </TD>
                      </TR>
                    )}
                  </TBody>
                </Table>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}