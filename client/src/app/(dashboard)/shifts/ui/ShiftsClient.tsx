"use client"

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table'
import { Button } from '@/components/ui/button'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000'

export default function ShiftsClient() {
  const [shifts, setShifts] = useState<any[]>([])
  const [importing, setImporting] = useState(false)
  const [reconciliation, setReconciliation] = useState<any[]>([])

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

  function rubFmt(n: number) {
    return new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 2 }).format(n) + ' ₽'
  }

  async function importFromIiko() {
    if (!confirm('Импортировать смены из iiko за последние 30 дней?')) return
    
    setImporting(true)
    try {
      const to = new Date()
      const from = new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000)
      
      const res = await fetch(`${API_BASE}/api/iiko/import/shifts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          fromDate: from.toISOString().slice(0, 10),
          toDate: to.toISOString().slice(0, 10)
        })
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
        <Button 
          onClick={importFromIiko} 
          disabled={importing}
          className="bg-orange-500 hover:bg-orange-600 text-white"
        >
          {importing ? 'Импортируем...' : 'Импортировать из iiko'}
        </Button>
      </div>

      {(
        <Card className="mt-4">
          <CardContent className="p-4">
            <Table>
              <THead>
                <TR>
                  <TH>Дата открытия</TH>
                  <TH>Дата закрытия</TH>
                  <TH>Открыл</TH>
                  <TH>Закрыл</TH>
                  <TH>Нетто выручка</TH>
                  <TH>Продаж</TH>
                  <TH>Примечание</TH>
                </TR>
              </THead>
              <TBody>
                {shifts.map(shift => {
                  const totalNetto = shift.sales?.reduce((sum: number, s: any) => 
                    sum + (s.grossAmount - s.discounts - s.refunds), 0
                  ) || 0
                  
                  return (
                    <TR key={shift.id}>
                      <TD>{new Date(shift.openAt).toLocaleString('ru')}</TD>
                      <TD>{shift.closeAt ? new Date(shift.closeAt).toLocaleString('ru') : '—'}</TD>
                      <TD>{shift.openedBy || '—'}</TD>
                      <TD>{shift.closedBy || '—'}</TD>
                      <TD className="font-semibold">{rubFmt(totalNetto / 100)}</TD>
                      <TD>
                        <details className="cursor-pointer">
                          <summary className="text-blue-600 hover:underline">
                            {shift.sales?.length || 0} позиций
                          </summary>
                          <div className="mt-2 text-sm space-y-1">
                            {shift.sales?.map((s: any, idx: number) => (
                              <div key={idx}>
                                {s.channel?.name} × {s.tenderType?.name}: {rubFmt((s.grossAmount - s.discounts - s.refunds) / 100)}
                              </div>
                            ))}
                          </div>
                        </details>
                      </TD>
                      <TD>{shift.note || '—'}</TD>
                    </TR>
                  )
                })}
                {shifts.length === 0 && (
                  <TR>
                    <TD colSpan={6} className="text-center text-gray-500">
                      Нет смен
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
                      <TD>{rubFmt(r.receiptsTotal / 100)}</TD>
                      <TD>{r.shiftsCount}</TD>
                      <TD>{rubFmt(r.shiftsTotal / 100)}</TD>
                      <TD className={isDiff ? 'text-red-600 font-bold' : 'text-green-600'}>
                        {diff > 0 ? '+' : ''}{rubFmt(diff / 100)}
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

