export type ChartPoint = {
  day: number
  month1: number | null
  month2: number | null
  count1?: number | null
  count2?: number | null
  dateMonth1: string
  dateMonth2: string
  weekdayMonth1?: number | null
  weekdayMonth2?: number | null
}

export function formatNumber(value: number | null): string {
  if (value === null || value === undefined) return '-'
  return value.toLocaleString('ru-RU')
}

export function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr)
    return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })
  } catch {
    return dateStr
  }
}

export function getWeekday(dateStr: string): number {
  try {
    const date = new Date(dateStr)
    return date.getDay()
  } catch {
    return 0
  }
}

export function getWeekdayName(weekday: number): string {
  const names = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб']
  return names[weekday]
}

export type WeekendArea = { x1: number, x2: number, fill: string, fillOpacity: number }

export function getWeekendAreas(chartData: ChartPoint[], byWeekday: boolean): WeekendArea[] {
  if (!byWeekday) return []
  const areas: WeekendArea[] = []
  let weekendStart: number | null = null
  for (let i = 0; i < chartData.length; i++) {
    const data = chartData[i]
    const isWeekend = (
      (data.weekdayMonth1 === 0 || data.weekdayMonth1 === 6) ||
      (data.weekdayMonth2 === 0 || data.weekdayMonth2 === 6)
    )
    if (isWeekend && weekendStart === null) {
      weekendStart = i + 1
    } else if (!isWeekend && weekendStart !== null) {
      areas.push({ x1: weekendStart, x2: i, fill: '#fecaca', fillOpacity: 0.35 })
      weekendStart = null
    }
  }
  if (weekendStart !== null) {
    areas.push({ x1: weekendStart, x2: chartData.length, fill: '#fecaca', fillOpacity: 0.35 })
  }
  return areas
}


