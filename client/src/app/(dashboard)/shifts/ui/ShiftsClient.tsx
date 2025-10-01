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
  const [importMode, setImportMode] = useState<'merge' | 'separate'>('merge')

  useEffect(() => {
    loadShifts()
    loadReconciliation()
  }, [])

  async function loadShifts() {
    try {
      const res = await fetch(`${API_BASE}/api/shifts`, { credentials: 'include' })
      const data = await res.json()
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
    return new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 2 }).format(cents / 100) + ' ₽'
  }

  async function importFromIiko() {
    const mode = importMode === 'merge' ? 'объединять смены в одну за день' : 'создавать отдельную смену для каждой кассы'
    if (!confirm(`Импортировать смены из iiko за последние 30 дней?\n\nРежим: ${mode}`)) return
    
    setImporting(true)
    try {
      const to = new Date()
      const from = new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000)
      
      const payload = {
        fromDate: from.toISOString().slice(0, 10),
        toDate: to.toISOString().slice(0, 10),
        mergeByDay: importMode === 'merge'
      }
      
      console.log('📤 Import mode state:', importMode)
      console.log('📤 mergeByDay value:', importMode === 'merge')
      console.log('📤 Full payload:', JSON.stringify(payload, null, 2))
      
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

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Смены (импорт из iiko)</h1>
        <div className="flex items-center gap-4">
          <Tabs value={importMode} onValueChange={(v) => {
            console.log('🔄 Tab changed to:', v)
            setImportMode(v as 'merge' | 'separate')
          }}>
            <TabsList>
              <TabsTrigger value="merge">Объединять за день</TabsTrigger>
              <TabsTrigger value="separate">Раздельно (кассы)</TabsTrigger>
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
                  <TH>Закрыл</TH>
                  <TH>Кол-во чеков</TH>
                  <TH>Выручка</TH>
                  <TH>Возвраты (шт)</TH>
                  <TH>Возвраты (₽)</TH>
                  <TH>Удаления (шт)</TH>
                  <TH>Удаления (₽)</TH>
                </TR>
              </THead>
              <TBody>
                {shifts.map(shift => {
                  const totalNetto = shift.sales?.reduce((sum: number, s: any) => 
                    sum + (s.grossAmount - s.discounts - s.refunds), 0
                  ) || 0
                  
                  const shiftDate = new Date(shift.openAt).toISOString().slice(0, 10)
                  const receiptsLink = `http://localhost:3001/iiko/sales/receipts?date=${shiftDate}`
                  
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
                      <TD>{shift.closedBy || '—'}</TD>
                      <TD className="text-center">{shift.stats?.receiptsTotal || 0}</TD>
                      <TD className="font-semibold text-green-700">{rubFmt(totalNetto)}</TD>
                      <TD className="text-center text-orange-600">
                        {shift.stats?.receiptsReturns || 0}
                      </TD>
                      <TD className="text-orange-600">
                        {shift.stats?.sumReturns ? rubFmt(shift.stats.sumReturns) : '—'}
                      </TD>
                      <TD className="text-center text-red-600">
                        {shift.stats?.receiptsDeleted || 0}
                      </TD>
                      <TD className="text-red-600">
                        {shift.stats?.sumDeleted ? rubFmt(shift.stats.sumDeleted) : '—'}
                      </TD>
                    </TR>
                  )
                })}
                {shifts.length === 0 && (
                  <TR>
                    <TD colSpan={8} className="text-center text-gray-500">
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

