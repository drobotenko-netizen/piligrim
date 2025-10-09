'use client'

import { useState } from 'react'
import { useCrud } from '@/hooks/use-crud'
import { DepartmentFilter, StatusFilter, type Department, type Status } from '@/components/filters'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { MoreHorizontal } from 'lucide-react'

type Position = { 
  id: string
  name: string
  kind?: string | null
  department?: string | null 
}

type Employee = { 
  id: string
  fullName: string
  active: boolean
  positionId?: string | null
  position?: { 
    name: string
    kind?: string | null
    department?: string | null 
  } | null 
}

export default function EmployeesClient({ 
  initialPositions, 
  initialEmployees 
}: { 
  initialPositions: Position[]
  initialEmployees: Employee[] 
}) {
  // Используем новые хуки для работы с API
  const positions = useCrud<Position>('/api/positions', initialPositions)
  const employees = useCrud<Employee>('/api/employees', initialEmployees)

  // Локальное состояние для формы и фильтров
  const [form, setForm] = useState<{ fullName: string; positionId: string }>({ 
    fullName: '', 
    positionId: 'none' 
  })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [activeDept, setActiveDept] = useState<Department>('ALL')
  const [statusFilter, setStatusFilter] = useState<Status>('ACTIVE')

  /**
   * Сохранить сотрудника (создать или обновить)
   */
  async function save() {
    if (!form.fullName.trim()) return

    const payload = { 
      fullName: form.fullName, 
      positionId: form.positionId === 'none' ? null : form.positionId 
    }

    try {
      if (editingId) {
        await employees.update(editingId, payload)
        setEditingId(null)
      } else {
        await employees.create(payload)
      }
      
      setForm({ fullName: '', positionId: 'none' })
    } catch (error) {
      console.error('Failed to save employee:', error)
    }
  }

  /**
   * Начать редактирование сотрудника
   */
  function startEdit(emp: Employee) {
    setEditingId(emp.id)
    setForm({ 
      fullName: emp.fullName, 
      positionId: emp.positionId ?? 'none' 
    })
  }

  /**
   * Сбросить форму к созданию нового
   */
  function resetToCreate() {
    setEditingId(null)
    setForm({ fullName: '', positionId: 'none' })
  }

  /**
   * Обновить сотрудника (уволить/принять)
   */
  async function updateEmployee(id: string, action: 'fire' | 'hire') {
    try {
      await employees.update(id, { action })
    } catch (error) {
      console.error('Failed to update employee:', error)
    }
  }

  /**
   * Фильтрация сотрудников
   */
  const filteredEmployees = employees.items
    .filter(emp => {
      // Фильтр по отделу
      if (activeDept !== 'ALL' && emp.position?.department !== activeDept) {
        return false
      }
      // Фильтр по статусу
      if (statusFilter === 'ACTIVE') {
        return emp.active
      } else {
        return !emp.active
      }
    })

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Список сотрудников */}
      <Card className="lg:col-span-2">
        <CardContent className="p-4 flex flex-col h-[calc(100vh-4rem)] min-h-0">
          
          {/* Фильтры */}
          <div className="mb-2 flex items-center justify-between gap-2">
            <DepartmentFilter 
              value={activeDept} 
              onChange={setActiveDept}
            />
            <StatusFilter 
              value={statusFilter} 
              onChange={setStatusFilter}
            />
          </div>

          {/* Таблица */}
          <div className="flex-1 overflow-auto">
            {employees.loading ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">Загрузка...</p>
              </div>
            ) : employees.error ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-red-500">Ошибка: {employees.error}</p>
              </div>
            ) : (
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
                  {filteredEmployees.map(emp => (
                    <TR 
                      key={emp.id} 
                      onClick={() => startEdit(emp)} 
                      className={editingId === emp.id ? 'bg-accent' : 'cursor-pointer'}
                    >
                      <TD className="py-1.5 px-2">{emp.fullName}</TD>
                      <TD className="py-1.5 px-2 whitespace-nowrap">
                        {emp.position?.name ?? '—'}
                      </TD>
                      <TD className="py-1.5 px-2">
                        {emp.active ? (
                          <span className="text-green-600">Работает</span>
                        ) : (
                          <span className="text-slate-500">Уволен</span>
                        )}
                      </TD>
                      <TD className="py-1.5 px-2 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {emp.active ? (
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation()
                                updateEmployee(emp.id, 'fire')
                              }}>
                                Уволить
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation()
                                updateEmployee(emp.id, 'hire')
                              }}>
                                Принять
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Форма создания/редактирования */}
      <section className="space-y-6">
        <Card>
          <CardContent className="p-4 space-y-3">
            <Input
              placeholder="ФИО"
              value={form.fullName}
              onChange={e => setForm(v => ({ ...v, fullName: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && save()}
            />
            <Select 
              value={form.positionId} 
              onValueChange={v => setForm(s => ({ ...s, positionId: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Без должности" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Без должности</SelectItem>
                {positions.items.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button 
                onClick={save}
                disabled={employees.loading || !form.fullName.trim()}
              >
                {editingId ? 'Сохранить' : 'Добавить'}
              </Button>
              {editingId && (
                <Button variant="outline" onClick={resetToCreate}>
                  Новый
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
