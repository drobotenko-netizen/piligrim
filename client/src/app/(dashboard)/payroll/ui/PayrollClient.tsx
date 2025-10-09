"use client"

import { useEffect, useMemo, useState } from 'react'
import { api } from '@/lib/api-client'
import { DepartmentFilter, type Department } from '@/components/filters'
import { Card, CardContent } from '@/components/ui/card'
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'

interface PayrollClientProps {
  initialY: number
  initialM: number
  initialItems?: any[]
}

export default function PayrollClient({ initialY, initialM, initialItems }: PayrollClientProps) {
  // Период
  const [y, setY] = useState(initialY)
  const [m, setM] = useState(initialM)
  
  // Данные
  const [items, setItems] = useState<any[]>(initialItems || [])
  const [loading, setLoading] = useState(false)
  
  // UI состояние
  const [dept, setDept] = useState<Department>('ALL')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const MONTHS = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь']

  /**
   * Загрузить данные расчёта зарплаты
   */
  async function reload() {
    try {
      setLoading(true)
      const data = await api.get<{ items: any[] }>('/api/payroll', { y, m })
      setItems(data.items || [])
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { reload() }, [y, m])

  /**
   * Фильтрованные записи
   */
  const filtered = useMemo(() => 
    items.filter(i => dept === 'ALL' || (i.department || '').toUpperCase() === dept), 
    [items, dept]
  )

  /**
   * Автовыбор первого сотрудника с данными
   */
  useEffect(() => {
    if (filtered.length === 0) { 
      setSelectedId(null)
      return 
    }
    
    const exists = filtered.some(r => r.employeeId === selectedId)
    if (!exists) {
      const candidate = filtered.find(r => 
        (r.hours || 0) > 0 || 
        (r.totalAmount || 0) !== 0 || 
        (r.adjustments || 0) !== 0
      ) || filtered[0]
      setSelectedId(candidate?.employeeId || null)
    }
  }, [filtered, selectedId])

  /**
   * Выбранный сотрудник
   */
  const selected = useMemo(() => 
    filtered.find(r => r.employeeId === selectedId) || null, 
    [filtered, selectedId]
  )

  /**
   * Итоги по отделу
   */
  const totals = useMemo(() => {
    return filtered.reduce((acc, i) => {
      acc.baseAmount += i.baseAmount || 0
      acc.adjustments += i.adjustments || 0
      acc.totalAmount += i.totalAmount || 0
      return acc
    }, { baseAmount: 0, adjustments: 0, totalAmount: 0 })
  }, [filtered])

  /**
   * Форматировать рубли
   */
  function rub(cents: number) { 
    return new Intl.NumberFormat('ru-RU').format(Math.round(cents / 100)) + ' ₽' 
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* Таблица расчётов */}
      <Card className="lg:col-span-2">
        <CardContent className="p-4 space-y-3 flex flex-col h-[calc(100vh-4rem)] min-h-0">
          
          {/* Фильтры */}
          <div className="flex items-center justify-between gap-3">
            <DepartmentFilter value={dept} onChange={setDept} />
            
            <div className="flex items-center gap-3">
              <Select value={String(y)} onValueChange={v => setY(Number(v))}>
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[y - 1, y, y + 1].map(yy => (
                    <SelectItem key={yy} value={String(yy)}>{yy}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={String(m)} onValueChange={v => setM(Number(v))}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(mm => (
                    <SelectItem key={mm} value={String(mm)}>
                      {MONTHS[mm - 1]}
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
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">Загрузка...</p>
              </div>
            ) : (
              <Table className="w-full">
                <THead className="sticky top-0 bg-card z-10">
                  <TR>
                    <TH className="h-8 px-2">ФИО</TH>
                    <TH className="h-8 px-2">Должность</TH>
                    <TH className="h-8 px-2 text-right">Часы</TH>
                    <TH className="h-8 px-2 text-right">База</TH>
                    <TH className="h-8 px-2 text-right">Операции</TH>
                    <TH className="h-8 px-2 text-right">Итого</TH>
                  </TR>
                </THead>
                <TBody>
                  {filtered.map((row: any) => (
                    <TR 
                      key={row.employeeId} 
                      onClick={() => setSelectedId(row.employeeId)}
                      className={selectedId === row.employeeId ? 'bg-accent cursor-pointer' : 'cursor-pointer'}
                    >
                      <TD className="py-1.5 px-2">{row.fullName}</TD>
                      <TD className="py-1.5 px-2">{row.position || '—'}</TD>
                      <TD className="py-1.5 px-2 text-right">
                        {row.hours ? row.hours.toFixed(1) : '—'}
                      </TD>
                      <TD className="py-1.5 px-2 text-right">{rub(row.baseAmount || 0)}</TD>
                      <TD className="py-1.5 px-2 text-right">
                        <span className={row.adjustments > 0 ? 'text-green-600' : row.adjustments < 0 ? 'text-red-600' : ''}>
                          {rub(row.adjustments || 0)}
                        </span>
                      </TD>
                      <TD className="py-1.5 px-2 text-right font-semibold">
                        {rub(row.totalAmount || 0)}
                      </TD>
                    </TR>
                  ))}
                  
                  {/* Итого */}
                  {filtered.length > 0 && (
                    <TR className="border-t-2 font-semibold">
                      <TD className="py-2 px-2" colSpan={3}>ИТОГО:</TD>
                      <TD className="py-2 px-2 text-right">{rub(totals.baseAmount)}</TD>
                      <TD className="py-2 px-2 text-right">
                        <span className={totals.adjustments > 0 ? 'text-green-600' : totals.adjustments < 0 ? 'text-red-600' : ''}>
                          {rub(totals.adjustments)}
                        </span>
                      </TD>
                      <TD className="py-2 px-2 text-right">{rub(totals.totalAmount)}</TD>
                    </TR>
                  )}
                </TBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Детали выбранного сотрудника */}
      {selected && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <h3 className="font-semibold">{selected.fullName}</h3>
            <p className="text-sm text-muted-foreground">{selected.position}</p>
            
            <div className="space-y-2 pt-2">
              <div className="flex justify-between">
                <span className="text-sm">Часы:</span>
                <span className="font-medium">{selected.hours?.toFixed(1) || '0'}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm">Оклад:</span>
                <span className="font-medium">{rub(selected.salaryAmount || 0)}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm">За часы:</span>
                <span className="font-medium">{rub(selected.hoursAmount || 0)}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm">% от выручки:</span>
                <span className="font-medium">{rub(selected.revenueAmount || 0)}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm">Премии:</span>
                <span className="font-medium text-green-600">{rub(selected.bonusAmount || 0)}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm">Штрафы:</span>
                <span className="font-medium text-red-600">{rub(selected.fineAmount || 0)}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm">Вычеты:</span>
                <span className="font-medium text-red-600">{rub(selected.deductionAmount || 0)}</span>
              </div>
              
              <div className="border-t pt-2 flex justify-between font-semibold">
                <span>Начислено:</span>
                <span>{rub(selected.totalAmount || 0)}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm">Выплачено:</span>
                <span className="font-medium">{rub(selected.payoutsTotal || 0)}</span>
              </div>
              
              <div className="border-t pt-2 flex justify-between font-semibold">
                <span>К выплате:</span>
                <span className={selected.balance > 0 ? 'text-green-600' : selected.balance < 0 ? 'text-red-600' : ''}>
                  {rub(selected.balance || 0)}
                </span>
              </div>
            </div>
            
            {/* Список выплат */}
            {selected.payouts && selected.payouts.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm font-semibold mb-2">Выплаты:</p>
                <div className="space-y-1">
                  {selected.payouts.map((p: any) => (
                    <div key={p.id} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {new Date(p.date).toLocaleDateString('ru-RU')}
                      </span>
                      <span>{rub(p.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
