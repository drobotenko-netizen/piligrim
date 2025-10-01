"use client"

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000'

export default function ShiftsClient() {
  const [shifts, setShifts] = useState<any[]>([])
  const [channels, setChannels] = useState<any[]>([])
  const [tenderTypes, setTenderTypes] = useState<any[]>([])
  const [tab, setTab] = useState<'list' | 'close'>('list')
  const [currentShift, setCurrentShift] = useState<any>(null)
  
  // Форма закрытия смены: матрица канал × способ оплаты
  const [salesMatrix, setSalesMatrix] = useState<Record<string, Record<string, { gross: string; discounts: string; refunds: string }>>>({})
  const [note, setNote] = useState('')

  useEffect(() => {
    loadShifts()
    loadChannels()
    loadTenderTypes()
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

  async function loadChannels() {
    try {
      const res = await fetch(`${API_BASE}/api/channels`, { credentials: 'include' })
      const data = await res.json()
      setChannels(data.items || [])
    } catch (e) {
      console.error(e)
    }
  }

  async function loadTenderTypes() {
    try {
      const res = await fetch(`${API_BASE}/api/tender-types`, { credentials: 'include' })
      const data = await res.json()
      setTenderTypes(data.items || [])
    } catch (e) {
      console.error(e)
    }
  }

  async function openShift() {
    try {
      const res = await fetch(`${API_BASE}/api/shifts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ openAt: new Date().toISOString() })
      })
      const data = await res.json()
      setCurrentShift(data.data)
      setTab('close')
      loadShifts()
    } catch (e) {
      console.error(e)
    }
  }

  function updateSale(channelId: string, tenderTypeId: string, field: 'gross' | 'discounts' | 'refunds', value: string) {
    setSalesMatrix(prev => ({
      ...prev,
      [channelId]: {
        ...prev[channelId],
        [tenderTypeId]: {
          ...prev[channelId]?.[tenderTypeId],
          [field]: value
        }
      }
    }))
  }

  async function closeShift() {
    if (!currentShift) return

    // Собираем sales из матрицы
    const sales: any[] = []
    for (const channelId of Object.keys(salesMatrix)) {
      for (const tenderTypeId of Object.keys(salesMatrix[channelId])) {
        const data = salesMatrix[channelId][tenderTypeId]
        const gross = parseFloat(data.gross || '0')
        const discounts = parseFloat(data.discounts || '0')
        const refunds = parseFloat(data.refunds || '0')
        
        if (gross > 0 || discounts > 0 || refunds > 0) {
          sales.push({
            channelId,
            tenderTypeId,
            grossAmount: gross,
            discounts,
            refunds
          })
        }
      }
    }

    try {
      await fetch(`${API_BASE}/api/shifts/${currentShift.id}/close`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          closeAt: new Date().toISOString(),
          note,
          sales
        })
      })

      // Сброс
      setCurrentShift(null)
      setSalesMatrix({})
      setNote('')
      setTab('list')
      loadShifts()
    } catch (e) {
      console.error(e)
    }
  }

  // Расчёт итогов
  const totals = { gross: 0, discounts: 0, refunds: 0, netto: 0, cash: 0 }
  for (const channelId of Object.keys(salesMatrix)) {
    for (const tenderTypeId of Object.keys(salesMatrix[channelId])) {
      const data = salesMatrix[channelId][tenderTypeId]
      const gross = parseFloat(data.gross || '0')
      const discounts = parseFloat(data.discounts || '0')
      const refunds = parseFloat(data.refunds || '0')
      const netto = gross - discounts - refunds

      totals.gross += gross
      totals.discounts += discounts
      totals.refunds += refunds
      totals.netto += netto

      const tenderType = tenderTypes.find(t => t.id === tenderTypeId)
      if (tenderType?.name === 'Наличные') {
        totals.cash += netto
      }
    }
  }

  function rubFmt(n: number) {
    return new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 2 }).format(n) + ' ₽'
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Смены</h1>
        {!currentShift && (
          <Button onClick={openShift} className="bg-orange-500 hover:bg-orange-600 text-white">
            Открыть смену
          </Button>
        )}
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList>
          <TabsTrigger value="list">История смен</TabsTrigger>
          {currentShift && <TabsTrigger value="close">Закрытие смены</TabsTrigger>}
        </TabsList>
      </Tabs>

      {tab === 'list' && (
        <Card className="mt-4">
          <CardContent className="p-4">
            <Table>
              <THead>
                <TR>
                  <TH>Дата открытия</TH>
                  <TH>Дата закрытия</TH>
                  <TH>Открыл</TH>
                  <TH>Закрыл</TH>
                  <TH>Продаж</TH>
                  <TH>Примечание</TH>
                </TR>
              </THead>
              <TBody>
                {shifts.map(shift => (
                  <TR key={shift.id}>
                    <TD>{new Date(shift.openAt).toLocaleString('ru')}</TD>
                    <TD>{shift.closeAt ? new Date(shift.closeAt).toLocaleString('ru') : '—'}</TD>
                    <TD>{shift.openedBy || '—'}</TD>
                    <TD>{shift.closedBy || '—'}</TD>
                    <TD>{shift.sales?.length || 0}</TD>
                    <TD>{shift.note || '—'}</TD>
                  </TR>
                ))}
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

      {tab === 'close' && currentShift && (
        <div className="mt-4 space-y-4">
          <Card>
            <CardContent className="p-4">
              <h2 className="text-xl font-bold mb-4">Матрица продаж (канал × способ оплаты)</h2>
              
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="border p-2 bg-gray-100">Канал</th>
                      {tenderTypes.map(tt => (
                        <th key={tt.id} className="border p-2 bg-gray-100" colSpan={3}>
                          {tt.name}
                        </th>
                      ))}
                    </tr>
                    <tr>
                      <th className="border p-2 bg-gray-50"></th>
                      {tenderTypes.map(tt => (
                        <>
                          <th key={`${tt.id}-g`} className="border p-1 bg-gray-50 text-xs">Брутто</th>
                          <th key={`${tt.id}-d`} className="border p-1 bg-gray-50 text-xs">Скидки</th>
                          <th key={`${tt.id}-r`} className="border p-1 bg-gray-50 text-xs">Возвр.</th>
                        </>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {channels.map(channel => (
                      <tr key={channel.id}>
                        <td className="border p-2 font-semibold">{channel.name}</td>
                        {tenderTypes.map(tt => (
                          <>
                            <td key={`${tt.id}-g`} className="border p-1">
                              <Input
                                type="number"
                                step="0.01"
                                className="w-20 h-8 text-sm"
                                value={salesMatrix[channel.id]?.[tt.id]?.gross || ''}
                                onChange={e => updateSale(channel.id, tt.id, 'gross', e.target.value)}
                              />
                            </td>
                            <td key={`${tt.id}-d`} className="border p-1">
                              <Input
                                type="number"
                                step="0.01"
                                className="w-20 h-8 text-sm"
                                value={salesMatrix[channel.id]?.[tt.id]?.discounts || ''}
                                onChange={e => updateSale(channel.id, tt.id, 'discounts', e.target.value)}
                              />
                            </td>
                            <td key={`${tt.id}-r`} className="border p-1">
                              <Input
                                type="number"
                                step="0.01"
                                className="w-20 h-8 text-sm"
                                value={salesMatrix[channel.id]?.[tt.id]?.refunds || ''}
                                onChange={e => updateSale(channel.id, tt.id, 'refunds', e.target.value)}
                              />
                            </td>
                          </>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-6 p-4 bg-blue-50 rounded">
                <h3 className="font-bold mb-2">Итоги:</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div>
                    <div className="text-sm text-gray-600">Брутто:</div>
                    <div className="text-lg font-bold">{rubFmt(totals.gross)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Скидки:</div>
                    <div className="text-lg font-bold text-red-600">−{rubFmt(totals.discounts)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Возвраты:</div>
                    <div className="text-lg font-bold text-red-600">−{rubFmt(totals.refunds)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Нетто:</div>
                    <div className="text-xl font-bold text-green-600">{rubFmt(totals.netto)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Наличные к инкассации:</div>
                    <div className="text-xl font-bold text-orange-600">{rubFmt(totals.cash)}</div>
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-semibold mb-1">Примечание:</label>
                <Input
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="Комментарий (недостачи/излишки)"
                />
              </div>

              <div className="mt-6 flex gap-4">
                <Button
                  onClick={closeShift}
                  className="bg-orange-500 hover:bg-orange-600 text-white"
                >
                  Закрыть смену
                </Button>
                <Button
                  onClick={() => {
                    setCurrentShift(null)
                    setSalesMatrix({})
                    setNote('')
                    setTab('list')
                  }}
                  variant="outline"
                >
                  Отмена
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

