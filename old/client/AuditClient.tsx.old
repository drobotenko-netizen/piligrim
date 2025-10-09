'use client'

import { useEffect, useState } from 'react'
import { getApiBase } from "@/lib/api"
import { Card, CardContent } from '@/components/ui/card'
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export default function AuditClient({ initialItems }: { initialItems: any[] }) {
  const API_BASE = getApiBase()
  const [items, setItems] = useState<any[]>(initialItems)
  const [year, setYear] = useState<string>('all')
  const [month, setMonth] = useState<string>('all')
  const [entity, setEntity] = useState<string>('all')
  const [userId, setUserId] = useState<string>('all')
  const [users, setUsers] = useState<any[]>([])
  const [employeeId, setEmployeeId] = useState<string>('all')
  const [employees, setEmployees] = useState<any[]>([])
  const [openIds, setOpenIds] = useState<Record<string, boolean>>({})

  async function reload() {
    const qs = new URLSearchParams()
    if (year && year !== 'all') qs.set('year', year)
    if (month && month !== 'all') qs.set('month', month)
    if (entity && entity !== 'all') qs.set('entity', entity)
    if (userId && userId !== 'all') qs.set('userId', userId)
    if (employeeId && employeeId !== 'all') qs.set('employeeId', employeeId)
    qs.set('view', 'compact')
    const suffix = qs.toString() ? `?${qs.toString()}` : ''
    const r = await fetch(`${API_BASE}/api/admin/audit${suffix}`, { credentials: 'include' })
    const j = await r.json()
    setItems(j.items || [])
  }

  useEffect(() => {
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    ;(async () => {
      const [ru, re] = await Promise.all([
        fetch(`${API_BASE}/api/admin/users`, { credentials: 'include' }),
        fetch(`${API_BASE}/api/employees`, { credentials: 'include' })
      ])
      const ju = await ru.json()
      const je = await re.json()
      setUsers(ju.items || [])
      setEmployees(je.data || [])
    })()
  }, [])

  return (
    <Card>
      <CardContent className="p-4 flex flex-col h-[calc(100vh-4rem)] min-h-0">
        <div className="flex flex-wrap items-center gap-2">
          <Select value={year} onValueChange={v => setYear(v)}>
            <SelectTrigger className="w-[120px]"><SelectValue placeholder="Год" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все годы</SelectItem>
              {Array.from({ length: 6 }).map((_, i) => {
                const y = String(new Date().getFullYear() - i)
                return <SelectItem key={y} value={y}>{y}</SelectItem>
              })}
            </SelectContent>
          </Select>
          <Select value={month} onValueChange={v => setMonth(v)}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Месяц" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все месяцы</SelectItem>
              {[
                { v: '1', l: 'Январь' },
                { v: '2', l: 'Февраль' },
                { v: '3', l: 'Март' },
                { v: '4', l: 'Апрель' },
                { v: '5', l: 'Май' },
                { v: '6', l: 'Июнь' },
                { v: '7', l: 'Июль' },
                { v: '8', l: 'Август' },
                { v: '9', l: 'Сентябрь' },
                { v: '10', l: 'Октябрь' },
                { v: '11', l: 'Ноябрь' },
                { v: '12', l: 'Декабрь' },
              ].map(m => (<SelectItem key={m.v} value={m.v}>{m.l}</SelectItem>))}
            </SelectContent>
          </Select>
          <Select value={userId} onValueChange={v => setUserId(v)}>
            <SelectTrigger className="w-[220px]"><SelectValue placeholder="Пользователь" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все пользователи</SelectItem>
              {users.map((u: any) => (
                <SelectItem key={u.id} value={u.id}>{u.fullName || u.phone}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={employeeId} onValueChange={v => setEmployeeId(v)}>
            <SelectTrigger className="w-[240px]"><SelectValue placeholder="Сотрудник" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все сотрудники</SelectItem>
              {employees.map((e: any) => (
                <SelectItem key={e.id} value={e.id}>{e.fullName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={entity} onValueChange={v => setEntity(v)}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Сущность" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все сущности</SelectItem>
              <SelectItem value="Timesheet">Табель</SelectItem>
              <SelectItem value="Employee">Сотрудник</SelectItem>
              <SelectItem value="Adjustment">Корректировка</SelectItem>
              <SelectItem value="Transaction">Транзакция</SelectItem>
              <SelectItem value="Account">Счёт</SelectItem>
              <SelectItem value="Category">Категория</SelectItem>
              <SelectItem value="Payout">Выплата</SelectItem>
              <SelectItem value="Counterparty">Контрагент</SelectItem>
              <SelectItem value="User">Пользователь</SelectItem>
              <SelectItem value="Role">Роль</SelectItem>
              <SelectItem value="Permission">Право</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Button onClick={reload} className="whitespace-nowrap">Показать</Button>
            <Button variant="secondary" onClick={() => { setYear('all'); setMonth('all'); setEntity('all'); setUserId('all'); setEmployeeId('all'); reload() }}>Сброс</Button>
          </div>
        </div>
        <div className="flex-1 overflow-auto min-h-0">
          <Table className="w-full table-fixed">
            <THead className="sticky top-0 bg-card z-10">
              <TR>
                <TH className="w-[200px] !h-8 px-3">Время</TH>
                <TH className="w-[180px] !h-8 px-3">Пользователь</TH>
                <TH className="w-[280px] !h-8 px-3">Действие</TH>
                <TH className="w-[140px] !h-8 px-3 text-right">Значение</TH>
                <TH className="w-auto !h-8 px-3">Детали</TH>
              </TR>
            </THead>
            <TBody>
              {items.map((a: any) => {
                const userLabel = a.userLabel || a.user?.fullName || a.user?.phone || a.userId || ''
                const changes: string[] = (a.resolvedChanges || []).map((c: any) => `${c.label}: ${c.from ?? '—'} → ${c.to ?? '—'}`)
                const actionText = (a.compact?.kind === 'timesheet')
                  ? `Корректировка табеля ${a.entityDisplay || ''}`.trim()
                  : (a.humanAction
                      ? a.humanAction
                      : `${a.entityLabel}${a.entityDisplay ? `: ${a.entityDisplay}` : ''}`)
                return (
                  <TR key={a.id}>
                    <TD className="w-[200px] !p-2">{new Date(a.createdAt).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</TD>
                    <TD className="w-[180px] !p-2">{userLabel}</TD>
                    <TD className="w-[280px] !p-2">
                      <div className="text-sm">{actionText}</div>
                      {a.compact?.kind === 'timesheet' && null}
                    </TD>
                    <TD className="w-[140px] !p-2 align-middle text-right">
                      <div className="text-sm">{a.keyValue || ''}</div>
                    </TD>
                    <TD className="w-auto align-top whitespace-normal break-words !p-2">
                      <div className="text-xs">
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="secondary" onClick={() => setOpenIds(s => ({ ...s, [a.id]: !s[a.id] }))}>
                            {openIds[a.id] ? '−' : '+'}
                          </Button>
                          <span className="text-muted-foreground">{a.compact?.kind === 'timesheet' ? `Строк: ${a.compact.days?.length || 0}` : `Строк: ${changes.length}`}</span>
                        </div>
                        {openIds[a.id] && (
                          <div className="mt-2 space-y-1">
                            {a.compact?.kind === 'timesheet' ? (
                              <div className="space-y-1">
                                {a.compact.days?.map((d: any) => {
                                  const fromHours = (d.fromMinutes ?? 0) / 60
                                  const toHours = (d.toMinutes ?? 0) / 60
                                  const dateRu = new Date(`${d.date}T00:00:00.000Z`).toLocaleDateString('ru-RU')
                                  return (
                                    <div key={d.date} className="truncate" title={`${dateRu}: ${fromHours}ч -> ${toHours}ч`}>
                                      {dateRu}: {fromHours.toLocaleString('ru-RU', { maximumFractionDigits: 2 })}ч → {toHours.toLocaleString('ru-RU', { maximumFractionDigits: 2 })}ч
                                    </div>
                                  )
                                })}
                                {Array.isArray(a.compact.days) && (
                                  <div className="font-medium pt-1">
                                    Итого: {((a.compact.days.reduce((s: number, x: any) => s + (x.toMinutes || 0), 0)) / 60).toLocaleString('ru-RU', { maximumFractionDigits: 2 })} ч
                                  </div>
                                )}
                              </div>
                            ) : changes.length > 0 ? (
                              <div className="space-y-1">
                                {changes.map((c, idx) => (<div key={idx} className="truncate" title={c}>{c}</div>))}
                              </div>
                            ) : (
                              <div className="truncate" title={a.diff}>{a.diff}</div>
                            )}
                          </div>
                        )}
                      </div>
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


