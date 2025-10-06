'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getRussianHolidaysIsoSet } from '@/lib/holidays-ru'

type Employee = { id: string; fullName: string; position?: { department?: string | null } | null }
type Entry = { id: string; employeeId: string; workDate: string; minutes: number; status: string }

export default function TimesheetsClient({ initialY, initialM, initialEmployees, initialEntries }: { initialY: number; initialM: number; initialEmployees?: Employee[]; initialEntries?: Entry[] }) {
  const [y, setY] = useState(initialY)
  const [m, setM] = useState(initialM)
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees || [])
  const [entries, setEntries] = useState<Entry[]>(initialEntries || [])
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000'

  const MONTHS = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь']

  function formatHours(mins: number): string {
    if (!Number.isFinite(mins)) return ''
    if (mins % 60 === 0) return String(mins / 60)
    const h = mins / 60
    return (Math.round(h * 10) / 10).toFixed(1)
  }

  const days = useMemo(() => {
    const d = new Date(Date.UTC(y, m, 0)).getUTCDate()
    return Array.from({ length: d }, (_, i) => i + 1)
  }, [y, m])
  const [activeDept, setActiveDept] = useState<'ALL' | 'KITCHEN' | 'HALL' | 'BAR' | 'OPERATORS' | 'OFFICE'>('ALL')

  async function reload() {
    const res = await fetch(`${API_BASE}/api/timesheets?y=${y}&m=${m}`, { credentials: 'include' })
    const json = await res.json()
    setEmployees(json.employees || [])
    setEntries(json.entries || [])
  }

  // Автообновление при смене месяца/года и при первом рендере
  useEffect(() => {
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [y, m])

  async function setMinutes(employeeId: string, day: number, minutes: number) {
    const workDate = new Date(Date.UTC(y, m - 1, day)).toISOString()
    await fetch(`${API_BASE}/api/timesheets`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ employeeId, workDate, minutes, status: 'draft' }) })
    await reload()
  }

  function getMinutes(employeeId: string, day: number) {
    const dateStr = new Date(Date.UTC(y, m - 1, day)).toISOString()
    const e = entries.find(x => x.employeeId === employeeId && new Date(x.workDate).toISOString() === dateStr)
    return e?.minutes ?? 0
  }

  return (
    <Card>
      <CardContent className="p-4 space-y-3 flex flex-col h-[calc(100vh-4rem)] min-h-0">
        <div className="flex items-center gap-3 justify-between">
          <div className="flex items-center gap-3">
            <Tabs value={activeDept} onValueChange={(v) => setActiveDept(v as any)}>
              <TabsList>
                <TabsTrigger value="ALL">Все</TabsTrigger>
                <TabsTrigger value="KITCHEN">Кухня</TabsTrigger>
                <TabsTrigger value="HALL">Зал</TabsTrigger>
                <TabsTrigger value="BAR">Бар</TabsTrigger>
                <TabsTrigger value="OPERATORS">Операторы</TabsTrigger>
                <TabsTrigger value="OFFICE">Офис</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <div className="flex items-center gap-3">
          <Select value={String(y)} onValueChange={v => setY(Number(v))}>
            <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[y-1, y, y+1].map(yy => (<SelectItem key={yy} value={String(yy)}>{yy}</SelectItem>))}
            </SelectContent>
          </Select>
          <Select value={String(m)} onValueChange={v => setM(Number(v))}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Array.from({ length: 12 }, (_, i) => i + 1).map(mm => (
                <SelectItem key={mm} value={String(mm)}>{MONTHS[mm-1]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
            <Button onClick={reload}>Сохранить</Button>
          </div>
        </div>
        <div className="flex-1 overflow-auto">
          <Table className="w-auto">
            <THead className="sticky top-0 bg-card z-10">
              <TR>
                <TH className="h-8 py-1 text-center w-16 sticky left-0 z-30 bg-card border-r border-border" style={{ boxShadow: 'inset -1px 0 0 0 hsl(var(--border))' }}>Дата</TH>
                {employees
                  .filter(e => activeDept === 'ALL' || e.position?.department === activeDept)
                  .map(emp => (
                    <TH key={emp.id} className="h-8 py-1 text-center" style={{ width: '10rem' }}>
                      <div className="whitespace-normal break-words">{emp.fullName}</div>
                    </TH>
                  ))}
                <TH className="h-8 py-1 text-center" style={{ width: '14rem' }}>Итог, ч</TH>
              </TR>
            </THead>
            <TBody>
              {days.map(d => {
                const emps = employees.filter(e => activeDept === 'ALL' || e.position?.department === activeDept)
                const totalMin = emps.reduce((acc, emp) => acc + getMinutes(emp.id, d), 0)
                const dateObj = new Date(Date.UTC(y, m - 1, d))
                const dow = dateObj.getUTCDay() // 0=Sun,6=Sat
                const isWeekend = dow === 0 || dow === 6
                const isHoliday = getRussianHolidaysIsoSet(y).has(dateObj.toISOString().slice(0,10))
                const rowBg = isWeekend ? 'bg-red-50' : (isHoliday ? 'bg-red-50/50' : '')
                const isSelected = selectedDay === d
                const rowSel = '' // подсветка по hover, не по клику
                const stickyBgBase = rowBg || 'bg-card'
                return (
                  <TR key={d} className={`${rowBg} ${rowSel} group hover:bg-accent/20`}>
                    <TD className={`p-2 whitespace-nowrap text-center sticky left-0 z-20 border-r border-border ${stickyBgBase} group-hover:bg-accent/20`} style={{ boxShadow: 'inset -1px 0 0 0 hsl(var(--border))' }}>{String(d).padStart(2, '0')}</TD>
                    {emps.map(emp => {
                      const minutes = getMinutes(emp.id, d)
                      const hours = formatHours(minutes)
                      const display = minutes === 0 ? '' : hours
                      return (
                        <TD key={emp.id} className="p-1 text-center" style={{ width: '10rem' }}>
                          <input
                            className="w-14 h-8 border rounded px-2 text-sm bg-background text-center"
                            defaultValue={display}
                            // подсветка по hover, не по клику
                            onBlur={e => {
                              const val = parseFloat(e.target.value.replace(',', '.'))
                              const newMin = Number.isNaN(val) ? 0 : Math.round(val * 60)
                              if (newMin !== minutes) setMinutes(emp.id, d, newMin)
                            }}
                          />
                        </TD>
                      )
                    })}
                    <TD className="p-2 text-center" style={{ width: '14rem' }}>{formatHours(totalMin)}</TD>
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


