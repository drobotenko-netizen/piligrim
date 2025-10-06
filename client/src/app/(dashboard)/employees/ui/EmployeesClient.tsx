'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { MoreHorizontal } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

type Position = { id: string; name: string; kind?: string | null; department?: string | null }
type Employee = { id: string; fullName: string; active: boolean; positionId?: string | null; position?: { name: string; kind?: string | null; department?: string | null } | null }

export default function EmployeesClient({ initialPositions, initialEmployees }: { initialPositions: Position[]; initialEmployees: Employee[] }) {
  const [positions, setPositions] = useState<Position[]>(initialPositions || [])
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees || [])
  const [form, setForm] = useState<{ fullName: string; positionId: string }>({ fullName: '', positionId: 'none' })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [activeDept, setActiveDept] = useState<'ALL' | 'KITCHEN' | 'HALL' | 'BAR' | 'OPERATORS' | 'OFFICE'>('ALL')
  const [statusFilter, setStatusFilter] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE')
  const [newPos, setNewPos] = useState<{ name: string }>({ name: '' })

  const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000'

  async function refresh() {
    const [p, e] = await Promise.all([
      fetch(`${API_BASE}/api/positions`, { credentials: 'include' }).then(r => r.json()),
      fetch(`${API_BASE}/api/employees`, { credentials: 'include' }).then(r => r.json())
    ])
    setPositions(p.data)
    setEmployees(e.data)
  }

  async function save() {
    if (!form.fullName.trim()) return
    if (!editingId) {
      const payload = { fullName: form.fullName, positionId: form.positionId === 'none' ? null : form.positionId }
      await fetch(`${API_BASE}/api/employees`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), credentials: 'include' })
      setForm({ fullName: '', positionId: 'none' })
      await refresh()
      return
    }
    const patch: any = { fullName: form.fullName, positionId: form.positionId === 'none' ? null : form.positionId }
    await fetch(`${API_BASE}/api/employees/${editingId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch), credentials: 'include' })
    await refresh()
  }

  function startEdit(emp: Employee) {
    setEditingId(emp.id)
    setForm({ fullName: emp.fullName, positionId: emp.positionId ?? 'none' })
  }

  function resetToCreate() {
    setEditingId(null)
    setForm({ fullName: '', positionId: 'none' })
  }

  async function addPosition() {
    if (!newPos.name.trim()) return
    await fetch(`${API_BASE}/api/positions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newPos.name }), credentials: 'include' })
    setNewPos({ name: '' })
    await refresh()
  }

  async function updateEmployee(id: string, patch: any) {
    await fetch(`${API_BASE}/api/employees/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch), credentials: 'include' })
    await refresh()
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-2">
        <CardContent className="p-4 flex flex-col h-[calc(100vh-4rem)] min-h-0">
          <div className="mb-2 flex items-center justify-between">
            <Tabs value={activeDept} onValueChange={(value) => setActiveDept(value as any)}>
              <TabsList>
                <TabsTrigger value="ALL">Все</TabsTrigger>
                <TabsTrigger value="KITCHEN">Кухня</TabsTrigger>
                <TabsTrigger value="HALL">Зал</TabsTrigger>
                <TabsTrigger value="BAR">Бар</TabsTrigger>
                <TabsTrigger value="OPERATORS">Операторы</TabsTrigger>
                <TabsTrigger value="OFFICE">Офис</TabsTrigger>
              </TabsList>
            </Tabs>
            <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as 'ACTIVE' | 'INACTIVE')}>
              <TabsList>
                <TabsTrigger value="ACTIVE">Работает</TabsTrigger>
                <TabsTrigger value="INACTIVE">Уволен</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <div className="flex-1 overflow-auto">
            <Table className="w-full">
              <THead className="sticky top-0 bg-card z-10">
                <TR>
                  <TH className="h-8 px-2">Имя</TH>
                  <TH className="h-8 px-2">Должность</TH>
                  <TH className="h-8 px-2">Статус</TH>
                  <TH className="h-8 px-2"></TH>
                </TR>
              </THead>
              <TBody>
                {employees
                  .filter(emp => (activeDept === 'ALL' || emp.position?.department === activeDept))
                  .filter(emp => (statusFilter === 'ACTIVE' ? emp.active : !emp.active))
                  .map(emp => (
                    <TR key={emp.id} onClick={() => startEdit(emp)} className={editingId === emp.id ? 'bg-accent' : 'cursor-pointer'}>
                      <TD className="py-1.5 px-2">{emp.fullName}</TD>
                      <TD className="py-1.5 px-2 whitespace-nowrap">{emp.position?.name ?? '—'}</TD>
                      <TD className="py-1.5 px-2">
                        {emp.active ? <span className="text-green-600">Работает</span> : <span className="text-slate-500">Уволен</span>}
                      </TD>
                      <TD className="py-1.5 px-2 text-right">
                        {emp.active ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => updateEmployee(emp.id, { action: 'fire' })}>Уволить</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => updateEmployee(emp.id, { action: 'hire' })}>Принять</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TD>
                    </TR>
                  ))}
              </TBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      <section className="space-y-6">
        <Card>
          <CardContent className="p-4 space-y-3">
            <Input
              placeholder="ФИО"
              value={form.fullName}
              onChange={e => setForm(v => ({ ...v, fullName: e.target.value }))}
            />
            <Select value={form.positionId} onValueChange={v => setForm(s => ({ ...s, positionId: v }))}>
              <SelectTrigger><SelectValue placeholder="Без должности" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Без должности</SelectItem>
                {positions.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button onClick={save}>{editingId ? 'Сохранить' : 'Добавить'}</Button>
              {editingId && <Button variant="outline" onClick={resetToCreate}>Новый</Button>}
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}

