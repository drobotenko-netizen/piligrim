'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useApi } from '@/hooks/use-api'
import { api } from '@/lib/api-client'

export default function AuditClient({ initialItems }: { initialItems: any[] }) {
  const [year, setYear] = useState<string>('all')
  const [month, setMonth] = useState<string>('all')
  const [entity, setEntity] = useState<string>('all')
  const [userId, setUserId] = useState<string>('all')
  const [employeeId, setEmployeeId] = useState<string>('all')
  const [openIds, setOpenIds] = useState<Record<string, boolean>>({})

  const { data: usersData } = useApi<{ items: any[] }>('/api/admin/users')
  const { data: employeesData } = useApi<{ data: any[] }>('/api/employees')
  
  const users = usersData?.items || []
  const employees = employeesData?.data || []

  const params: any = { view: 'compact' }
  if (year && year !== 'all') params.year = year
  if (month && month !== 'all') params.month = month
  if (entity && entity !== 'all') params.entity = entity
  if (userId && userId !== 'all') params.userId = userId
  if (employeeId && employeeId !== 'all') params.employeeId = employeeId

  const { data, refetch } = useApi<{ items: any[] }>('/api/admin/audit', { 
    initialData: { items: initialItems },
    params 
  })

  const items = data?.items || []

  useEffect(() => {
    refetch(params)
  }, [year, month, entity, userId, employeeId])

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
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="Сущность" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все сущности</SelectItem>
              <SelectItem value="transaction">Транзакции</SelectItem>
              <SelectItem value="payment">Платежи</SelectItem>
              <SelectItem value="employee">Сотрудники</SelectItem>
              <SelectItem value="shift">Смены</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => refetch(params)} size="sm">Обновить</Button>
        </div>
        <div className="flex-1 overflow-auto mt-3">
          <Table className="w-full">
            <THead className="sticky top-0 bg-card z-10">
              <TR>
                <TH className="h-8">Дата</TH>
                <TH className="h-8">Пользователь</TH>
                <TH className="h-8">Сотрудник</TH>
                <TH className="h-8">Действие</TH>
                <TH className="h-8">Сущность</TH>
                <TH className="h-8">Значения</TH>
              </TR>
            </THead>
            <TBody>
              {items.map((it: any) => (
                <TR key={it.id} className="cursor-pointer" onClick={() => setOpenIds(old => ({ ...old, [it.id]: !old[it.id] }))}>
                  <TD className="py-1.5 text-xs">{new Date(it.createdAt).toLocaleString('ru')}</TD>
                  <TD className="py-1.5 text-xs">{it.userName || '—'}</TD>
                  <TD className="py-1.5 text-xs">{it.employeeName || '—'}</TD>
                  <TD className="py-1.5 text-xs">{it.action}</TD>
                  <TD className="py-1.5 text-xs">{it.entity}</TD>
                  <TD className="py-1.5 text-xs">
                    {openIds[it.id] ? (
                      <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(it.values, null, 2)}</pre>
                    ) : (
                      <div className="truncate max-w-xs">{JSON.stringify(it.values)}</div>
                    )}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

