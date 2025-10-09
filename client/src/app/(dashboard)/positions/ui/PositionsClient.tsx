'use client'

import { useState, useEffect } from 'react'
import { useCrud } from '@/hooks/use-crud'
import { api } from '@/lib/api-client'
import { DepartmentFilter, type Department } from '@/components/filters'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'

const MONTHS = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь']

type Position = { 
  id: string
  name: string
  kind: string
  department?: string | null
  revenuePercentBps?: number | null
  salaryAmount?: number | null
  baseHourRate?: number | null 
}

const KIND_LABEL: Record<string, string> = {
  SHIFTS_PLUS_REVENUE: 'Смены + % выручки',
  SALARY: 'Оклад',
  SALARY_PLUS_TASKS: 'Оклад + задачи'
}

export default function PositionsClient({ initialPositions }: { initialPositions?: Position[] }) {
  // CRUD операции через хук
  const positions = useCrud<Position>('/api/positions', initialPositions)
  
  // Локальное состояние
  const [form, setForm] = useState<{ 
    name: string
    kind: string
    department?: string
    revenuePercentBps?: string
    salaryAmount?: string
    baseHourRate?: string 
  }>({ 
    name: '', 
    kind: 'SHIFTS_PLUS_REVENUE', 
    department: 'HALL' 
  })
  
  const [editingId, setEditingId] = useState<string | null>(null)
  const [activeDept, setActiveDept] = useState<Department>('ALL')
  const [rates, setRates] = useState<any[]>([])
  const [rateForm, setRateForm] = useState<{ 
    year: string
    month: string
    baseHourRate?: string
    revenuePercentBps?: string
    salaryAmount?: string 
  }>({ 
    year: String(new Date().getUTCFullYear()), 
    month: String(new Date().getUTCMonth() + 1) 
  })
  
  const [viewY, setViewY] = useState(new Date().getUTCFullYear())
  const [viewM, setViewM] = useState(new Date().getUTCMonth() + 1)
  const [monthRates, setMonthRates] = useState<Record<string, any>>({})

  /**
   * Парсинг рублей в копейки
   */
  function parseRubToCents(input?: string): number | null {
    if (!input) return null
    const num = parseFloat(String(input).replace(',', '.'))
    if (Number.isNaN(num)) return null
    return Math.round(num * 100)
  }

  /**
   * Парсинг процентов в базисные пункты
   */
  function parsePercentToBps(input?: string): number | null {
    if (!input) return null
    const num = parseFloat(String(input).replace(',', '.'))
    if (Number.isNaN(num)) return null
    return Math.round(num * 100)
  }

  /**
   * Загрузить ставки для месяца
   */
  useEffect(() => {
    async function loadMonthRates() {
      try {
        const data = await api.get<{ data: any[] }>('/api/positions/rates', { 
          y: viewY, 
          m: viewM 
        })
        const map: Record<string, any> = {}
        ;(data.data || []).forEach((it: any) => { 
          map[it.positionId] = it 
        })
        setMonthRates(map)
      } catch { 
        setMonthRates({}) 
      }
    }
    loadMonthRates()
  }, [viewY, viewM])

  /**
   * Создать должность
   */
  async function createPosition() {
    if (!form.name.trim()) return
    
    const payload: any = { 
      name: form.name, 
      kind: form.kind, 
      department: form.department 
    }
    
    if (form.kind === 'SHIFTS_PLUS_REVENUE') {
      payload.baseHourRate = parseRubToCents(form.baseHourRate)
      payload.revenuePercentBps = parsePercentToBps(form.revenuePercentBps)
    }
    
    if (form.kind === 'SALARY' || form.kind === 'SALARY_PLUS_TASKS') {
      payload.salaryAmount = parseRubToCents(form.salaryAmount)
    }
    
    try {
      await positions.create(payload)
      setForm({ name: '', kind: 'SHIFTS_PLUS_REVENUE', department: 'HALL' })
    } catch (error) {
      console.error('Failed to create position:', error)
    }
  }

  /**
   * Сохранить изменения (создать или обновить)
   */
  async function save() {
    if (!form.name.trim()) return
    
    if (!editingId) {
      await createPosition()
      return
    }
    
    const patch: any = { 
      name: form.name, 
      kind: form.kind, 
      department: form.department 
    }
    
    if (form.kind === 'SHIFTS_PLUS_REVENUE') {
      patch.baseHourRate = parseRubToCents(form.baseHourRate)
      patch.revenuePercentBps = parsePercentToBps(form.revenuePercentBps)
    } else {
      patch.baseHourRate = null
      patch.revenuePercentBps = null
    }
    
    if (form.kind === 'SALARY' || form.kind === 'SALARY_PLUS_TASKS') {
      patch.salaryAmount = parseRubToCents(form.salaryAmount)
    } else {
      patch.salaryAmount = null
    }
    
    try {
      await positions.update(editingId, patch)
      setEditingId(null)
      setForm({ name: '', kind: 'SHIFTS_PLUS_REVENUE', department: 'HALL' })
    } catch (error) {
      console.error('Failed to update position:', error)
    }
  }

  /**
   * Начать редактирование
   */
  function startEdit(p: Position) {
    setEditingId(p.id)
    setForm({
      name: p.name,
      kind: p.kind,
      department: p.department ?? 'HALL',
      baseHourRate: p.baseHourRate != null ? String((p.baseHourRate / 100).toFixed(2)) : '',
      revenuePercentBps: p.revenuePercentBps != null ? String((p.revenuePercentBps / 100).toFixed(2)) : '',
      salaryAmount: p.salaryAmount != null ? String((p.salaryAmount / 100).toFixed(2)) : ''
    })
    
    // Загрузить историю ставок
    api.get<{ data: any[] }>(`/api/positions/${p.id}/rates`)
      .then(json => setRates(json.data || []))
      .catch(() => setRates([]))
  }

  /**
   * Сохранить ставку для периода
   */
  async function saveRate() {
    if (!editingId) return
    
    const payload: any = {
      year: Number(rateForm.year),
      month: Number(rateForm.month)
    }
    
    const pos = positions.items.find(p => p.id === editingId)
    
    if (pos?.kind === 'SHIFTS_PLUS_REVENUE') {
      payload.baseHourRate = parseRubToCents(rateForm.baseHourRate)
      payload.revenuePercentBps = parsePercentToBps(rateForm.revenuePercentBps)
    }
    
    if (pos?.kind === 'SALARY' || pos?.kind === 'SALARY_PLUS_TASKS') {
      payload.salaryAmount = parseRubToCents(rateForm.salaryAmount)
    }
    
    try {
      await api.post(`/api/positions/${editingId}/rates`, payload)
      
      // Перезагрузить историю ставок
      const json = await api.get<{ data: any[] }>(`/api/positions/${editingId}/rates`)
      setRates(json.data || [])
      
      setRateForm({ 
        year: String(new Date().getUTCFullYear()), 
        month: String(new Date().getUTCMonth() + 1) 
      })
    } catch (error) {
      console.error('Failed to save rate:', error)
    }
  }

  /**
   * Фильтрованные должности
   */
  const filteredPositions = positions.items.filter(p => 
    activeDept === 'ALL' || p.department === activeDept
  )

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* Список должностей */}
      <Card className="lg:col-span-2">
        <CardContent className="p-4 flex flex-col h-[calc(100vh-4rem)] min-h-0">
          
          <div className="mb-2">
            <DepartmentFilter value={activeDept} onChange={setActiveDept} />
          </div>

          <div className="flex-1 overflow-auto">
            {positions.loading ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">Загрузка...</p>
              </div>
            ) : (
              <Table className="w-full">
                <THead className="sticky top-0 bg-card z-10">
                  <TR>
                    <TH className="h-8 px-2">Название</TH>
                    <TH className="h-8 px-2">Тип</TH>
                    <TH className="h-8 px-2">Отдел</TH>
                    <TH className="h-8 px-2 text-right">Параметры</TH>
                  </TR>
                </THead>
                <TBody>
                  {filteredPositions.map(p => (
                    <TR 
                      key={p.id} 
                      onClick={() => startEdit(p)} 
                      className={editingId === p.id ? 'bg-accent cursor-pointer' : 'cursor-pointer'}
                    >
                      <TD className="py-1.5 px-2">{p.name}</TD>
                      <TD className="py-1.5 px-2">{KIND_LABEL[p.kind]}</TD>
                      <TD className="py-1.5 px-2">
                        {p.department === 'KITCHEN' ? 'Кухня' :
                         p.department === 'HALL' ? 'Зал' :
                         p.department === 'BAR' ? 'Бар' :
                         p.department === 'OPERATORS' ? 'Операторы' :
                         p.department === 'OFFICE' ? 'Офис' : '—'}
                      </TD>
                      <TD className="py-1.5 px-2 text-right text-sm text-muted-foreground">
                        {p.kind === 'SHIFTS_PLUS_REVENUE' && (
                          <>
                            {p.baseHourRate && `${(p.baseHourRate / 100).toFixed(0)} ₽/ч`}
                            {p.baseHourRate && p.revenuePercentBps && ' + '}
                            {p.revenuePercentBps && `${(p.revenuePercentBps / 100).toFixed(1)}%`}
                          </>
                        )}
                        {(p.kind === 'SALARY' || p.kind === 'SALARY_PLUS_TASKS') && p.salaryAmount && (
                          `${(p.salaryAmount / 100).toFixed(0)} ₽/мес`
                        )}
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
            <h3 className="font-semibold">
              {editingId ? 'Редактировать должность' : 'Новая должность'}
            </h3>
            
            <Input
              placeholder="Название"
              value={form.name}
              onChange={e => setForm(v => ({ ...v, name: e.target.value }))}
            />
            
            <Select 
              value={form.kind} 
              onValueChange={v => setForm(s => ({ ...s, kind: v }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SHIFTS_PLUS_REVENUE">Смены + % выручки</SelectItem>
                <SelectItem value="SALARY">Оклад</SelectItem>
                <SelectItem value="SALARY_PLUS_TASKS">Оклад + задачи</SelectItem>
              </SelectContent>
            </Select>
            
            <Select 
              value={form.department || 'HALL'} 
              onValueChange={v => setForm(s => ({ ...s, department: v }))}
            >
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
            
            {form.kind === 'SHIFTS_PLUS_REVENUE' && (
              <>
                <Input
                  placeholder="Ставка за час (руб)"
                  value={form.baseHourRate || ''}
                  onChange={e => setForm(s => ({ ...s, baseHourRate: e.target.value }))}
                />
                <Input
                  placeholder="% от выручки"
                  value={form.revenuePercentBps || ''}
                  onChange={e => setForm(s => ({ ...s, revenuePercentBps: e.target.value }))}
                />
              </>
            )}
            
            {(form.kind === 'SALARY' || form.kind === 'SALARY_PLUS_TASKS') && (
              <Input
                placeholder="Оклад (руб)"
                value={form.salaryAmount || ''}
                onChange={e => setForm(s => ({ ...s, salaryAmount: e.target.value }))}
              />
            )}
            
            <div className="flex gap-2">
              <Button onClick={save} disabled={positions.loading || !form.name.trim()}>
                {editingId ? 'Сохранить' : 'Добавить'}
              </Button>
              {editingId && (
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setEditingId(null)
                    setForm({ name: '', kind: 'SHIFTS_PLUS_REVENUE', department: 'HALL' })
                    setRates([])
                  }}
                >
                  Отмена
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
        
        {/* История ставок для выбранной должности */}
        {editingId && (
          <Card>
            <CardContent className="p-4 space-y-3">
              <h3 className="font-semibold">Ставки по периодам</h3>
              
              <div className="flex gap-2">
                <Select 
                  value={rateForm.year} 
                  onValueChange={v => setRateForm(s => ({ ...s, year: v }))}
                >
                  <SelectTrigger className="w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[2024, 2025, 2026].map(y => (
                      <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select 
                  value={rateForm.month} 
                  onValueChange={v => setRateForm(s => ({ ...s, month: v }))}
                >
                  <SelectTrigger className="flex-1">
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
              </div>
              
              {form.kind === 'SHIFTS_PLUS_REVENUE' && (
                <>
                  <Input
                    placeholder="Ставка за час (руб)"
                    value={rateForm.baseHourRate || ''}
                    onChange={e => setRateForm(s => ({ ...s, baseHourRate: e.target.value }))}
                  />
                  <Input
                    placeholder="% от выручки"
                    value={rateForm.revenuePercentBps || ''}
                    onChange={e => setRateForm(s => ({ ...s, revenuePercentBps: e.target.value }))}
                  />
                </>
              )}
              
              {(form.kind === 'SALARY' || form.kind === 'SALARY_PLUS_TASKS') && (
                <Input
                  placeholder="Оклад (руб)"
                  value={rateForm.salaryAmount || ''}
                  onChange={e => setRateForm(s => ({ ...s, salaryAmount: e.target.value }))}
                />
              )}
              
              <Button onClick={saveRate}>Сохранить ставку</Button>
              
              {rates.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-semibold mb-2">История:</p>
                  <div className="space-y-1 text-sm">
                    {rates.map((r: any) => (
                      <div key={`${r.year}-${r.month}`} className="text-muted-foreground">
                        {MONTHS[r.month - 1]} {r.year}:
                        {r.baseHourRate && ` ${(r.baseHourRate / 100).toFixed(0)}₽/ч`}
                        {r.revenuePercentBps && ` + ${(r.revenuePercentBps / 100).toFixed(1)}%`}
                        {r.salaryAmount && ` ${(r.salaryAmount / 100).toFixed(0)}₽/мес`}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  )
}
