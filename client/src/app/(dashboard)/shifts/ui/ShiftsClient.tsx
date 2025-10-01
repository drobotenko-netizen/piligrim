"use client"

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000'

export default function ShiftsClient() {
  const [shifts, setShifts] = useState<any[]>([])
  const [importing, setImporting] = useState(false)
  const [reconciliation, setReconciliation] = useState<any[]>([])
  const [viewMode, setViewMode] = useState<'merge' | 'separate'>('merge')

  useEffect(() => {
    loadShifts()
    loadReconciliation()
  }, [])

  async function loadShifts() {
    try {
      const res = await fetch(`${API_BASE}/api/shifts`, { credentials: 'include' })
      const data = await res.json()
      console.log('📥 Loaded shifts from API:', data.items?.length || 0)
      setShifts(data.items || [])
    } catch (e) {
      console.error(e)
    }
  }

  async function loadReconciliation() {
    try {
      const res = await fetch(`${API_BASE}/api/reports/shifts-reconciliation`, { credentials: 'include' })
      const data = await res.json()
      setReconciliation(data.items || [])
    } catch (e) {
      console.error(e)
    }
  }

  function rubFmt(cents: number) {
    return new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(cents / 100) + ' ₽'
  }

  async function importFromIiko() {
    if (!confirm('Импортировать смены из iiko за последние 30 дней?')) return
    
    setImporting(true)
    try {
      const to = new Date()
      const from = new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000)
      
      const payload = {
        fromDate: from.toISOString().slice(0, 10),
        toDate: to.toISOString().slice(0, 10),
        mergeByDay: false // Всегда импортируем раздельно
      }
      
      const res = await fetch(`${API_BASE}/api/iiko/import/shifts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      })
      
      const data = await res.json()
      if (data.ok) {
        alert('Импорт завершён!\n\n' + data.output)
        await loadShifts()
        await loadReconciliation()
      } else {
        alert('Ошибка импорта: ' + data.error)
      }
    } catch (e) {
      console.error(e)
      alert('Ошибка: ' + e)
    } finally {
      setImporting(false)
    }
  }

  // Группируем смены по дням если режим "По дням"
  const displayShifts = viewMode === 'merge' 
    ? (() => {
        const grouped = new Map<string, any[]>()
        shifts.forEach(shift => {
          const day = new Date(shift.openAt).toISOString().slice(0, 10)
          if (!grouped.has(day)) grouped.set(day, [])
          grouped.get(day)!.push(shift)
        })
        
        return Array.from(grouped.entries()).map(([day, dayShifts]) => {
          const firstShift = dayShifts[0]
          const totalNetto = dayShifts.reduce((sum, s) => 
            sum + (s.sales?.reduce((sSum: number, sale: any) => 
              sSum + (sale.grossAmount - sale.discounts - sale.refunds), 0
            ) || 0), 0
          )
          
          const totalStats = {
            receiptsTotal: dayShifts.reduce((sum, s) => sum + (s.stats?.receiptsTotal || 0), 0),
            receiptsReturns: dayShifts.reduce((sum, s) => sum + (s.stats?.receiptsReturns || 0), 0),
            receiptsDeleted: dayShifts.reduce((sum, s) => sum + (s.stats?.receiptsDeleted || 0), 0),
            sumReturns: dayShifts.reduce((sum, s) => sum + (s.stats?.sumReturns || 0), 0),
            sumDeleted: dayShifts.reduce((sum, s) => sum + (s.stats?.sumDeleted || 0), 0),
          }
          
          // Номера всех смен дня
          const sessionNumbers = dayShifts
            .map(s => s.iikoSessionNum)
            .filter(n => n)
            .join(', ')
          
          return {
            ...firstShift,
            id: day,
            note: `${dayShifts.length} смен(ы)`,
            iikoSessionNum: null, // Группа, нет одного номера
            groupedSessions: sessionNumbers, // Все номера смен
            totalNetto,
            stats: totalStats,
            isGrouped: true
          }
        })
      })()
    : shifts

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Смены (импорт из iiko)</h1>
        <div className="flex items-center gap-4">
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'merge' | 'separate')}>
            <TabsList>
              <TabsTrigger value="merge">По дням</TabsTrigger>
              <TabsTrigger value="separate">По кассам</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button 
            onClick={importFromIiko} 
            disabled={importing}
            className="bg-orange-500 hover:bg-orange-600 text-white"
          >
            {importing ? 'Импортируем...' : 'Импортировать из iiko'}
          </Button>
        </div>
      </div>

      {(
        <Card className="mt-4">
          <CardContent className="p-4">
            <Table>
              <THead>
                <TR>
                  <TH>Дата смены</TH>
                  <TH>№ смены</TH>
                  <TH>Закрыл</TH>
                  <TH className="text-right">Кол-во чеков</TH>
                  <TH className="text-right w-32">Выручка</TH>
                  <TH className="text-right">Возвраты (шт)</TH>
                  <TH className="text-right">Возвраты (₽)</TH>
                  <TH className="text-right">Удаления (шт)</TH>
                  <TH className="text-right">Удаления (₽)</TH>
                </TR>
              </THead>
              <TBody>
                {displayShifts.map(shift => {
                  const totalNetto = shift.totalNetto ?? (shift.sales?.reduce((sum: number, s: any) => 
                    sum + (s.grossAmount - s.discounts - s.refunds), 0
                  ) || 0)
                  
                  const shiftDate = new Date(shift.openAt).toISOString().slice(0, 10)
                  
                  // Номер смены: для группы - все номера, для одной - один
                  const sessionNumber = shift.isGrouped 
                    ? (shift.groupedSessions || '—')
                    : (shift.iikoSessionNum || shift.note?.match(/#(\d+)/)?.[1] || '—')
                  
                  // Ссылка с датой и номером смены
                  const receiptsLink = shift.iikoSessionNum 
                    ? `http://localhost:3001/iiko/sales/receipts?date=${shiftDate}&session=${shift.iikoSessionNum}`
                    : `http://localhost:3001/iiko/sales/receipts?date=${shiftDate}`
                  
                  return (
                    <TR key={shift.id}>
                      <TD>
                        <a 
                          href={receiptsLink} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline font-semibold"
                        >
                          {new Date(shift.openAt).toLocaleDateString('ru', { 
                            day: '2-digit', 
                            month: '2-digit', 
                            year: 'numeric' 
                          })}
                        </a>
                      </TD>
                      <TD className="text-gray-600">
                        {shift.isGrouped ? `#${sessionNumber}` : `#${sessionNumber}`}
                      </TD>
                      <TD>{shift.closedBy || '—'}</TD>
                      <TD className="text-right">{shift.stats?.receiptsTotal || 0}</TD>
                      <TD className="text-right font-semibold text-green-700">{rubFmt(totalNetto)}</TD>
                      <TD className="text-right text-orange-600">
                        {shift.stats?.receiptsReturns || 0}
                      </TD>
                      <TD className="text-right text-orange-600">
                        {shift.stats?.sumReturns ? rubFmt(shift.stats.sumReturns) : '—'}
                      </TD>
                      <TD className="text-right text-red-600">
                        {shift.stats?.receiptsDeleted || 0}
                      </TD>
                      <TD className="text-right text-red-600">
                        {shift.stats?.sumDeleted ? rubFmt(shift.stats.sumDeleted) : '—'}
                      </TD>
                    </TR>
                  )
                })}
                {displayShifts.length === 0 && (
                  <TR>
                    <TD colSpan={9} className="text-center text-gray-500">
                      Нет смен. Нажмите "Импортировать из iiko"
                    </TD>
                  </TR>
                )}
              </TBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {reconciliation.length > 0 && (
        <Card className="mt-6">
          <CardContent className="p-4">
            <h2 className="text-xl font-bold mb-4">Сверка: iiko чеки vs импортированные смены</h2>
            <Table>
              <THead>
                <TR>
                  <TH>Дата</TH>
                  <TH>Чеков в iiko</TH>
                  <TH>Выручка по чекам</TH>
                  <TH>Смен создано</TH>
                  <TH>Выручка по сменам</TH>
                  <TH>Разница</TH>
                  <TH>Статус</TH>
                </TR>
              </THead>
              <TBody>
                {reconciliation.map((r: any, idx: number) => {
                  const diff = r.shiftsTotal - r.receiptsTotal
                  const isDiff = Math.abs(diff) > 100 // больше 1 рубля
                  return (
                    <TR key={idx} className={isDiff ? 'bg-red-50' : ''}>
                      <TD>{r.date}</TD>
                      <TD>{r.receiptsCount}</TD>
                      <TD>{rubFmt(r.receiptsTotal)}</TD>
                      <TD>{r.shiftsCount}</TD>
                      <TD>{rubFmt(r.shiftsTotal)}</TD>
                      <TD className={isDiff ? 'text-red-600 font-bold' : 'text-green-600'}>
                        {diff > 0 ? '+' : ''}{rubFmt(diff)}
                      </TD>
                      <TD>
                        {isDiff ? (
                          <span className="text-xs px-2 py-1 bg-red-100 text-red-800 rounded">Расхождение</span>
                        ) : (
                          <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded">OK</span>
                        )}
                      </TD>
                    </TR>
                  )
                })}
              </TBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

