'use client'

import { useEffect, useMemo, useState } from 'react'
import { api } from '@/lib/api-client'
import { DepartmentFilter, type Department } from '@/components/filters'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'
import { getRussianHolidaysIsoSet } from '@/lib/holidays-ru'

type Employee = { 
  id: string
  fullName: string
  position?: { department?: string | null } | null 
}

type Entry = { 
  id: string
  employeeId: string
  workDate: string
  minutes: number
  status: string 
}

interface TimesheetsClientProps {
  initialY: number
  initialM: number
  initialEmployees?: Employee[]
  initialEntries?: Entry[]
}

export default function TimesheetsClient({ 
  initialY, 
  initialM, 
  initialEmployees, 
  initialEntries 
}: TimesheetsClientProps) {
  // Состояние периода и данных
  const [y, setY] = useState(initialY)
  const [m, setM] = useState(initialM)
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees || [])
  const [entries, setEntries] = useState<Entry[]>(initialEntries || [])
  const [loading, setLoading] = useState(false)
  
  // UI состояние
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const [activeDept, setActiveDept] = useState<Department>('ALL')

  const MONTHS = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь']

  /**
   * Загрузить данные табеля
   */
  async function reload() {
    try {
      setLoading(true)
      const data = await api.get<{ employees: Employee[]; entries: Entry[] }>(
        '/api/timesheets',
        { y, m }
      )
      setEmployees(data.employees || [])
      setEntries(data.entries || [])
    } catch (error) {
      console.error('Failed to load timesheets:', error)
    } finally {
      setLoading(false)
    }
  }

  // Автообновление при смене месяца/года
  useEffect(() => {
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [y, m])

  /**
   * Установить часы для сотрудника на день
   */
  async function setMinutes(employeeId: string, day: number, minutes: number) {
    const workDate = new Date(Date.UTC(y, m - 1, day)).toISOString()
    
    try {
      await api.post('/api/timesheets', { 
        employeeId, 
        workDate, 
        minutes, 
        status: 'draft' 
      })
      await reload()
    } catch (error) {
      console.error('Failed to set minutes:', error)
    }
  }

  /**
   * Получить часы сотрудника на день
   */
  function getMinutes(employeeId: string, day: number): number {
    try {
      const targetDate = new Date(Date.UTC(y, m - 1, day))
      const targetIso = targetDate.toISOString().slice(0, 10)
      
      const e = entries.find(x => {
        if (x.employeeId !== employeeId) return false
        try {
          const entryDate = new Date(x.workDate)
          const entryIso = entryDate.toISOString().slice(0, 10)
          return entryIso === targetIso
        } catch {
          return false
        }
      })
      
      return e?.minutes ?? 0
    } catch {
      return 0
    }
  }

  /**
   * Форматировать минуты в часы
   */
  function formatHours(mins: number): string {
    if (!Number.isFinite(mins)) return ''
    if (mins % 60 === 0) return String(mins / 60)
    const h = mins / 60
    return (Math.round(h * 10) / 10).toFixed(1)
  }

  /**
   * Дни месяца
   */
  const days = useMemo(() => {
    const d = new Date(Date.UTC(y, m, 0)).getUTCDate()
    return Array.from({ length: d }, (_, i) => i + 1)
  }, [y, m])

  /**
   * Фильтрованные сотрудники
   */
  const filteredEmployees = useMemo(() => {
    if (activeDept === 'ALL') return employees
    return employees.filter(emp => emp.position?.department === activeDept)
  }, [employees, activeDept])

  /**
   * Праздничные дни
   */
  const holidays = useMemo(() => {
    try {
      const set = getRussianHolidaysIsoSet()
      return days.filter(day => {
        try {
          const iso = new Date(Date.UTC(y, m - 1, day)).toISOString().slice(0, 10)
          return set.has(iso)
        } catch {
          return false
        }
      })
    } catch {
      return []
    }
  }, [days, y, m])

  /**
   * Выходные дни
   */
  const weekends = useMemo(() => {
    return days.filter(day => {
      try {
        const date = new Date(Date.UTC(y, m - 1, day))
        const dow = date.getUTCDay()
        return dow === 0 || dow === 6
      } catch {
        return false
      }
    })
  }, [days, y, m])

  return (
    <Card>
      <CardContent className="p-4 space-y-3 flex flex-col h-[calc(100vh-4rem)] min-h-0">
        
        {/* Фильтры и выбор периода */}
        <div className="flex items-center gap-3 justify-between">
          <DepartmentFilter value={activeDept} onChange={setActiveDept} />
          
          <div className="flex items-center gap-3">
            <Select value={String(y)} onValueChange={v => setY(Number(v))}>
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[2024, 2025, 2026].map(year => (
                  <SelectItem key={year} value={String(year)}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={String(m)} onValueChange={v => setM(Number(v))}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((name, i) => (
                  <SelectItem key={i + 1} value={String(i + 1)}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button 
              variant="outline" 
              onClick={reload}
              disabled={loading}
            >
              {loading ? 'Загрузка...' : 'Обновить'}
            </Button>
          </div>
        </div>

        {/* Таблица табеля */}
        <div className="flex-1 overflow-auto">
          <Table>
            <THead className="sticky top-0 bg-card z-10">
              <TR>
                <TH className="sticky left-0 bg-card z-20 min-w-[200px]">Сотрудник</TH>
                {days.map(day => (
                  <TH 
                    key={day} 
                    className={`text-center min-w-[50px] ${
                      holidays.includes(day) ? 'bg-red-50' :
                      weekends.includes(day) ? 'bg-slate-50' : ''
                    }`}
                  >
                    {day}
                  </TH>
                ))}
                <TH className="text-center min-w-[60px]">Итого</TH>
              </TR>
            </THead>
            <TBody>
              {filteredEmployees.map(emp => {
                const totalMinutes = days.reduce((sum, day) => 
                  sum + getMinutes(emp.id, day), 0
                )
                
                return (
                  <TR key={emp.id}>
                    <TD className="sticky left-0 bg-card z-10">
                      {emp.fullName}
                    </TD>
                    {days.map(day => {
                      const mins = getMinutes(emp.id, day)
                      const isHoliday = holidays.includes(day)
                      const isWeekend = weekends.includes(day)
                      
                      return (
                        <TD 
                          key={day}
                          className={`text-center cursor-pointer hover:bg-accent ${
                            isHoliday ? 'bg-red-50' :
                            isWeekend ? 'bg-slate-50' : ''
                          } ${selectedDay === day ? 'ring-2 ring-primary' : ''}`}
                          onClick={() => setSelectedDay(day)}
                        >
                          <input
                            type="number"
                            value={mins === 0 ? '' : mins}
                            onChange={(e) => {
                              const val = Number(e.target.value)
                              setMinutes(emp.id, day, val || 0)
                            }}
                            className="w-full bg-transparent text-center border-none focus:outline-none"
                            placeholder="0"
                          />
                        </TD>
                      )
                    })}
                    <TD className="text-center font-semibold">
                      {formatHours(totalMinutes)}
                    </TD>
                  </TR>
                )
              })}
            </TBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
