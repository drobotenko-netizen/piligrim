"use client"
import { useEffect, useState, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import HeaderControls from './HeaderControls'
import SummaryStats from './SummaryStats'
import ChartArea from './ChartArea'
import DataTable from './DataTable'
import { ChartPoint, formatDate, getWeekday } from './utils'
import { getApiBase } from '@/lib/api'

const API_BASE = getApiBase()

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
  const [displayMode, setDisplayMode] = useState<'sales' | 'receipts'>('sales')
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  // Функция для проверки аутентификации
  const checkAuth = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/auth/otp/me`, { credentials: 'include' })
      const data = await response.json()
      const isAuth = !!(data?.user)
      setIsAuthenticated(isAuth)
      return isAuth
    } catch (error) {
      console.error('Auth check failed:', error)
      setIsAuthenticated(false)
      return false
    }
  }

  // Функция для автоматической установки дат
  const setDefaultDates = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/iiko/local/sales/available-months`, { credentials: 'include' })
      if (!response.ok) {
        console.log('Available months request failed:', response.status)
        return
      }
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
    if (!isAuthenticated) {
      console.log('Not authenticated, skipping data load')
      return
    }
    
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
        fetch(endpoint1, { credentials: 'include' }),
        fetch(endpoint2, { credentials: 'include' })
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

  // Проверяем аутентификацию при загрузке компонента
  useEffect(() => {
    checkAuth()
  }, [])

  // Автоматически устанавливаем даты после аутентификации
  useEffect(() => {
    if (isAuthenticated) {
      setDefaultDates()
    }
  }, [isAuthenticated])

  useEffect(() => {
    if (isAuthenticated) {
      loadData()
    }
  }, [year1, month1, year2, month2, activeTab, isAuthenticated])

  // Объединяем данные для графика
  const chartData = useMemo<ChartPoint[]>(() => {
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
      const result: ChartPoint[] = []
      
      for (let i = 0; i < maxDays; i++) {
        const dayEarlier = earlierData[i]
        const dayLater = i >= shift ? laterData[i - shift] : null
        
        // month1 всегда соответствует year1/month1, month2 - year2/month2
        const month1Data = isEarlier ? dayEarlier : dayLater
        const month2Data = isEarlier ? dayLater : dayEarlier
        
         result.push({
           day: i + 1,
           month1: displayMode === 'sales' ? (month1Data?.net || null) : (month1Data?.count || null),
           month2: displayMode === 'sales' ? (month2Data?.net || null) : (month2Data?.count || null),
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
      const result: ChartPoint[] = []
      
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
          month1: (displayMode === 'sales' ? (month1Data?.net ?? null) : (month1Data?.count ?? null)) as number | null,
          month2: (displayMode === 'sales' ? (month2Data?.net ?? null) : (month2Data?.count ?? null)) as number | null,
          count1: month1Data?.count || null,
          count2: month2Data?.count || null,
          dateMonth1: month1Data?.date ? formatDate(month1Data.date) : '',
          dateMonth2: month2Data?.date ? formatDate(month2Data.date) : ''
        })
      }
      
      return result
    }
   }, [data1, data2, year1, month1, year2, month2, byWeekday, displayMode])

  // Объединяем данные для таблицы
  const tableData = useMemo(() => {
    if (byWeekday) {
      // Для режима "По дням недели" используем chartData для правильного сопоставления
      return chartData.map((row, idx) => ({
        day: idx + 1,
        date1: row.dateMonth1,
        net1: row.month1 || 0,
        gross1: null,
        discount1: null,
        date2: row.dateMonth2,
        net2: row.month2 || 0,
        gross2: null,
        discount2: null
      }))
    } else {
      // Для режима "По датам" - ежедневно + накопительно
      const maxDays = Math.max(data1.length, data2.length)
      const result = []
      let cumulative1 = 0
      let cumulative2 = 0
      
      for (let i = 0; i < maxDays; i++) {
        const day1 = data1[i]
        const day2 = data2[i]
        
        const value1 = (displayMode === 'sales' ? (day1?.net || 0) : (day1?.count || 0))
        const value2 = (displayMode === 'sales' ? (day2?.net || 0) : (day2?.count || 0))
        
        // Накопительно для режима "По датам"
        cumulative1 += value1
        cumulative2 += value2
        
        result.push({
          day: i + 1,
          date1: day1?.date ? formatDate(day1.date) : '',
          net1: value1, // Ежедневное значение (выручка/чеки)
          cumulative1: cumulative1, // Накопительная выручка
          gross1: day1?.gross || null,
          discount1: day1?.discount || null,
          date2: day2?.date ? formatDate(day2.date) : '',
          net2: value2, // Ежедневное значение (выручка/чеки)
          cumulative2: cumulative2, // Накопительная выручка
          gross2: day2?.gross || null,
          discount2: day2?.discount || null
        })
      }

      return result
    }
  }, [data1, data2, byWeekday, chartData])

  const total1 = data1.reduce((sum, d) => sum + (displayMode === 'sales' ? (d?.net || 0) : (d?.count || 0)), 0)
  const total2 = data2.reduce((sum, d) => sum + (displayMode === 'sales' ? (d?.net || 0) : (d?.count || 0)), 0)

  // Названия периодов для таблицы
  const month1Name = `${month1.toString().padStart(2, '0')}.${year1}`
  const month2Name = `${month2.toString().padStart(2, '0')}.${year2}`

  const handleSavePng = async () => {
                      const container = document.getElementById('chart-container')
    if (!container) return
                        try {
                          const html2canvas = (await import('html2canvas')).default
                          const canvas = await html2canvas(container, {
                            backgroundColor: '#ffffff',
        scale: 2,
                            useCORS: true,
        allowTaint: true,
                          })
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

  // Показываем индикатор загрузки, если не аутентифицированы
  if (!isAuthenticated) {
    return (
      <Card>
        <CardContent className="p-4 space-y-6">
          <div className="flex items-center justify-center h-32">
            <div className="w-8 h-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
            <span className="ml-3 text-muted-foreground">Проверка аутентификации...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="p-4 space-y-6">
        <HeaderControls
          year1={year1}
          month1={month1}
          year2={year2}
          month2={month2}
          byWeekday={byWeekday}
          setYear1={setYear1}
          setMonth1={setMonth1}
          setYear2={setYear2}
          setMonth2={setMonth2}
          setByWeekday={setByWeekday}
        />

        <SummaryStats
          year1={year1}
          month1={month1}
          year2={year2}
          month2={month2}
          total1={total1}
          total2={total2}
          displayMode={displayMode}
        />

        <div className="relative">
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/50 dark:bg-black/30 backdrop-blur-[1px]">
              <div className="w-8 h-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
                  </div>
          )}
          <div className={`space-y-6 transition-opacity duration-300 ${loading ? 'opacity-50' : 'opacity-100'}`}>
            <ChartArea
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              displayMode={displayMode}
              setDisplayMode={setDisplayMode}
              chartData={chartData}
              byWeekday={byWeekday}
              year1={year1}
              month1={month1}
              year2={year2}
              month2={month2}
              onSavePng={handleSavePng}
            />

            <DataTable rows={tableData as any} byWeekday={byWeekday} month1Name={month1Name} month2Name={month2Name} />
              </div>
        </div>
      </CardContent>
    </Card>
  )
}