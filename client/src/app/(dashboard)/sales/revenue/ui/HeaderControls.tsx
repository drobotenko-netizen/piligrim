"use client"
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

type Props = {
  year1: number
  month1: number
  year2: number
  month2: number
  byWeekday: boolean
  setYear1: (v: number) => void
  setMonth1: (v: number) => void
  setYear2: (v: number) => void
  setMonth2: (v: number) => void
  setByWeekday: (v: boolean) => void
}

export default function HeaderControls({
  year1,
  month1,
  year2,
  month2,
  byWeekday,
  setYear1,
  setMonth1,
  setYear2,
  setMonth2,
  setByWeekday,
}: Props) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <select
            value={year1}
            onChange={(e) => setYear1(Number(e.target.value))}
            className="border rounded px-2 py-1 text-sm"
          >
            {Array.from({ length: 5 }).map((_, i) => {
              const year = new Date().getFullYear() - 2 + i
              return (
                <option key={year} value={year}>
                  {year}
                </option>
              )
            })}
          </select>
          <select
            value={month1}
            onChange={(e) => setMonth1(Number(e.target.value))}
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
        <span className="text-muted-foreground">-</span>
        <div className="flex items-center gap-2">
          <select
            value={year2}
            onChange={(e) => setYear2(Number(e.target.value))}
            className="border rounded px-2 py-1 text-sm"
          >
            {Array.from({ length: 5 }).map((_, i) => {
              const year = new Date().getFullYear() - 2 + i
              return (
                <option key={year} value={year}>
                  {year}
                </option>
              )
            })}
          </select>
          <select
            value={month2}
            onChange={(e) => setMonth2(Number(e.target.value))}
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
      </div>

      <Tabs value={byWeekday ? 'weekdays' : 'dates'} onValueChange={(value) => setByWeekday(value === 'weekdays')}>
        <TabsList className="grid w-full max-w-xs grid-cols-2">
          <TabsTrigger value="dates">По датам</TabsTrigger>
          <TabsTrigger value="weekdays">По дням недели</TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  )
}


