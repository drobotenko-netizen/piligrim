'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api-client'
import { useCrud } from '@/hooks/use-crud'
import { DepartmentFilter, type Department } from '@/components/filters'
import { Card, CardContent } from '@/components/ui/card'
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { MoreHorizontal } from 'lucide-react'

type Employee = { 
  id: string
  fullName: string
  position?: { department?: string | null } | null 
}

type Item = { 
  id: string
  employeeId: string
  date: string
  kind: 'bonus' | 'fine' | 'deduction'
  amount: number
  reason?: string 
}

interface AdjustmentsClientProps {
  initialY: number
  initialM: number
  initialEmployees?: Employee[]
  initialItems?: Item[]
}

export default function AdjustmentsClient({ 
  initialY, 
  initialM, 
  initialEmployees, 
  initialItems 
}: AdjustmentsClientProps) {
  // Период
  const [y, setY] = useState(initialY)
  const [m, setM] = useState(initialM)
  
  // Данные
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees || [])
  const [items, setItems] = useState<Item[]>(initialItems || [])
  const [loading, setLoading] = useState(false)
  
  // UI состояние
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [activeDept, setActiveDept] = useState<Department>('ALL')
  const [formDept, setFormDept] = useState<'KITCHEN' | 'HALL' | 'BAR' | 'OPERATORS' | 'OFFICE'>('HALL')
  const [employeeQuery, setEmployeeQuery] = useState('')
  
  // Форма
  const [form, setForm] = useState<{ 
    employeeId: string
    kind: 'bonus' | 'fine' | 'deduction'
    amountRub: string
    dateIso: string
    reason?: string 
  }>({ 
    employeeId: '', 
    kind: 'bonus', 
    amountRub: '', 
    dateIso: `${initialY}-${String(initialM).padStart(2, '0')}-01` 
  })

  const MONTHS = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь']

  /**
   * Загрузить корректировки за месяц
   */
  async function reload() {
    try {
      setLoading(true)
      const data = await api.get<{ items: Item[] }>('/api/adjustments', { y, m })
      setItems(Array.isArray(data.items) ? data.items : [])
    } catch (e) {
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  /**
   * Загрузить сотрудников (если не переданы при SSR)
   */
  async function reloadEmployees() {
    try {
      const data = await api.get<{ data: Employee[] }>('/api/employees')
      if (Array.isArray(data.data) && data.data.length) {
        setEmployees(data.data)
      }
    } catch {
      // игнорируем ошибку
    }
  }

  // Загрузка при смене месяца
  useEffect(() => { reload() }, [y, m])

  // Загрузка сотрудников если пусто
  useEffect(() => {
    if (!employees?.length) reloadEmployees()
  }, [])

  // Синхронизация отдела формы с активной вкладкой
  useEffect(() => {
    if (activeDept !== 'ALL') {
      setFormDept(activeDept as any)
    }
  }, [activeDept])

  // Синхронизация даты формы с выбранным месяцем
  useEffect(() => {
    setForm(s => ({ 
      ...s, 
      dateIso: `${y}-${String(m).padStart(2, '0')}-01` 
    }))
  }, [y, m])

  /**
   * Форматировать дату для отображения
   */
  function formatDate(iso: string) {
    const d = new Date(iso)
    const dd = String(d.getUTCDate()).padStart(2, '0')
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
    const yyyy = d.getUTCFullYear()
    return `${dd}.${mm}.${yyyy}`
  }

  /**
   * Сотрудники для выбора в форме
   */
  const filteredEmployees = employees
    .filter(e => (e.position?.department || '').toUpperCase() === formDept)
    .filter(e => e.fullName.toLowerCase().includes(employeeQuery.toLowerCase().trim()))

  /**
   * Сохранить корректировку (создать или обновить)
   */
  async function saveItem() {
    if (!form.employeeId || !form.amountRub) return
    
    const parsed = parseFloat(form.amountRub.replace(',', '.'))
    if (!Number.isFinite(parsed)) return
    
    const amount = Math.round(parsed * 100)
    const payload = { 
      employeeId: form.employeeId, 
      date: form.dateIso, 
      kind: form.kind, 
      amount, 
      reason: form.reason 
    }

    try {
      if (selectedId) {
        await api.patch(`/api/adjustments/${selectedId}`, payload)
      } else {
        await api.post('/api/adjustments', payload)
      }
      
      setForm({ 
        employeeId: '', 
        kind: 'bonus', 
        amountRub: '', 
        dateIso: `${y}-${String(m).padStart(2, '0')}-01` 
      })
      setSelectedId(null)
      await reload()
    } catch (error) {
      console.error('Failed to save adjustment:', error)
    }
  }

  /**
   * Редактировать корректировку
   */
  function editItem(item: Item) {
    setSelectedId(item.id)
    setForm({
      employeeId: item.employeeId,
      kind: item.kind,
      amountRub: String((item.amount / 100).toFixed(2)),
      dateIso: item.date.slice(0, 10),
      reason: item.reason || ''
    })
  }

  /**
   * Удалить корректировку
   */
  async function deleteItem(id: string) {
    if (!confirm('Удалить корректировку?')) return
    
    try {
      await api.delete(`/api/adjustments/${id}`)
      await reload()
    } catch (error) {
      console.error('Failed to delete adjustment:', error)
    }
  }

  /**
   * Сбросить форму
   */
  function resetForm() {
    setSelectedId(null)
    setForm({ 
      employeeId: '', 
      kind: 'bonus', 
      amountRub: '', 
      dateIso: `${y}-${String(m).padStart(2, '0')}-01` 
    })
  }

  /**
   * Фильтрация по отделу для списка
   */
  const filteredItems = items.filter(item => {
    if (activeDept === 'ALL') return true
    const emp = employees.find(e => e.id === item.employeeId)
    return emp?.position?.department === activeDept
  })

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* Список корректировок */}
      <Card className="lg:col-span-2">
        <CardContent className="p-4 flex flex-col h-[calc(100vh-4rem)] min-h-0">
          
          {/* Фильтры */}
          <div className="mb-2 flex items-center justify-between gap-3">
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

          {/* Таблица */}
          <div className="flex-1 overflow-auto">
            <Table>
              <THead>
                <TR>
                  <TH>Дата</TH>
                  <TH>Сотрудник</TH>
                  <TH>Тип</TH>
                  <TH className="text-right">Сумма</TH>
                  <TH>Причина</TH>
                  <TH></TH>
                </TR>
              </THead>
              <TBody>
                {filteredItems.map(item => {
                  const emp = employees.find(e => e.id === item.employeeId)
                  const kindLabel = {
                    bonus: 'Премия',
                    fine: 'Штраф',
                    deduction: 'Вычет'
                  }[item.kind]
                  
                  return (
                    <TR 
                      key={item.id}
                      className={selectedId === item.id ? 'bg-accent' : ''}
                    >
                      <TD>{formatDate(item.date)}</TD>
                      <TD>{emp?.fullName || '—'}</TD>
                      <TD>{kindLabel}</TD>
                      <TD className="text-right">
                        {(item.amount / 100).toFixed(2)} ₽
                      </TD>
                      <TD>{item.reason || '—'}</TD>
                      <TD>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => editItem(item)}>
                              Редактировать
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => deleteItem(item.id)}>
                              Удалить
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TD>
                    </TR>
                  )
                })}
              </TBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Форма */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <h3 className="font-semibold">
            {selectedId ? 'Редактировать' : 'Добавить корректировку'}
          </h3>

          <Select value={formDept} onValueChange={v => setFormDept(v as any)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="KITCHEN">Кухня</SelectItem>
              <SelectItem value="HALL">Зал</SelectItem>
              <SelectItem value="BAR">Бар</SelectItem>
              <SelectItem value="OPERATORS">Операторы</SelectItem>
              <SelectItem value="OFFICE">Офис</SelectItem>
            </SelectContent>
          </Select>

          <Input
            placeholder="Поиск сотрудника..."
            value={employeeQuery}
            onChange={e => setEmployeeQuery(e.target.value)}
          />

          <Select 
            value={form.employeeId} 
            onValueChange={v => setForm(s => ({ ...s, employeeId: v }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Выберите сотрудника" />
            </SelectTrigger>
            <SelectContent>
              {filteredEmployees.map(emp => (
                <SelectItem key={emp.id} value={emp.id}>
                  {emp.fullName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select 
            value={form.kind} 
            onValueChange={v => setForm(s => ({ ...s, kind: v as any }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bonus">Премия</SelectItem>
              <SelectItem value="fine">Штраф</SelectItem>
              <SelectItem value="deduction">Вычет</SelectItem>
            </SelectContent>
          </Select>

          <Input
            type="text"
            placeholder="Сумма (руб)"
            value={form.amountRub}
            onChange={e => setForm(s => ({ ...s, amountRub: e.target.value }))}
          />

          <Input
            placeholder="Причина"
            value={form.reason || ''}
            onChange={e => setForm(s => ({ ...s, reason: e.target.value }))}
          />

          <div className="flex gap-2">
            <Button onClick={saveItem}>
              {selectedId ? 'Сохранить' : 'Добавить'}
            </Button>
            {selectedId && (
              <Button variant="outline" onClick={resetForm}>
                Отмена
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
