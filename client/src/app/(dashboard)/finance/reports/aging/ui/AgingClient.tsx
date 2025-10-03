"use client"

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000'

export default function AgingClient() {
  const [items, setItems] = useState<any[]>([])
  const [summary, setSummary] = useState<any>({})
  const [vendors, setVendors] = useState<any[]>([])
  const [filters, setFilters] = useState({
    vendorId: 'all',
    asOfDate: new Date().toISOString().slice(0, 10)
  })

  useEffect(() => {
    loadData()
    loadVendors()
  }, [filters])

  async function loadData() {
    try {
      const params = new URLSearchParams()
      if (filters.vendorId && filters.vendorId !== 'all') params.set('vendorId', filters.vendorId)
      if (filters.asOfDate) params.set('asOfDate', filters.asOfDate)

      const res = await fetch(`${API_BASE}/api/reports/aging?${params}`, { credentials: 'include' })
      const data = await res.json()
      setItems(data.items || [])
      setSummary(data.summary || {})
    } catch (e) {
      console.error(e)
    }
  }

  async function loadVendors() {
    try {
      const res = await fetch(`${API_BASE}/api/counterparties`, { credentials: 'include' })
      const data = await res.json()
      setVendors(data.items || [])
    } catch (e) {
      console.error(e)
    }
  }

  function rubFmt(cents: number) {
    return new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 2 }).format(cents / 100) + ' ₽'
  }

  function getBucketColor(bucket: string) {
    const colors: Record<string, string> = {
      '0-30': 'bg-green-100 text-green-800',
      '31-60': 'bg-yellow-100 text-yellow-800',
      '61-90': 'bg-orange-100 text-orange-800',
      '90+': 'bg-red-100 text-red-800'
    }
    return colors[bucket] || ''
  }

  // Группируем по поставщикам
  const groupedByVendor: Record<string, any[]> = {}
  items.forEach(item => {
    const key = item.vendorName
    if (!groupedByVendor[key]) groupedByVendor[key] = []
    groupedByVendor[key].push(item)
  })

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Отчёт по долгам (Aging)</h1>

      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex gap-4 items-end">
            <div className="w-64">
              <label className="block text-sm font-semibold mb-1">Поставщик</label>
              <Select value={filters.vendorId} onValueChange={v => setFilters({ ...filters, vendorId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Все поставщики" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все поставщики</SelectItem>
                  {vendors.map(v => (
                    <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-48">
              <label className="block text-sm font-semibold mb-1">На дату</label>
              <input
                type="date"
                value={filters.asOfDate}
                onChange={e => setFilters({ ...filters, asOfDate: e.target.value })}
                className="w-full px-3 py-2 border rounded"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardContent className="p-6">
          <h2 className="text-xl font-bold mb-4">Сводка по срокам</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="p-4 bg-green-50 rounded">
              <div className="text-sm text-gray-600">0-30 дней</div>
              <div className="text-2xl font-bold text-green-700">{rubFmt(summary['0-30'] || 0)}</div>
            </div>
            <div className="p-4 bg-yellow-50 rounded">
              <div className="text-sm text-gray-600">31-60 дней</div>
              <div className="text-2xl font-bold text-yellow-700">{rubFmt(summary['31-60'] || 0)}</div>
            </div>
            <div className="p-4 bg-orange-50 rounded">
              <div className="text-sm text-gray-600">61-90 дней</div>
              <div className="text-2xl font-bold text-orange-700">{rubFmt(summary['61-90'] || 0)}</div>
            </div>
            <div className="p-4 bg-red-50 rounded">
              <div className="text-sm text-gray-600">90+ дней</div>
              <div className="text-2xl font-bold text-red-700">{rubFmt(summary['90+'] || 0)}</div>
            </div>
            <div className="p-4 bg-blue-50 rounded">
              <div className="text-sm text-gray-600">Итого долг</div>
              <div className="text-2xl font-bold text-blue-700">{rubFmt(summary.total || 0)}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <h2 className="text-xl font-bold mb-4">Детализация по документам</h2>
          
          {Object.entries(groupedByVendor).map(([vendorName, docs]) => {
            const vendorTotal = docs.reduce((sum, d) => sum + d.balance, 0)
            return (
              <div key={vendorName} className="mb-6">
                <div className="flex justify-between items-center mb-2 p-2 bg-gray-100 rounded">
                  <h3 className="font-bold text-lg">{vendorName}</h3>
                  <span className="font-bold text-red-600">{rubFmt(vendorTotal)}</span>
                </div>
                
                <Table>
                  <THead>
                    <TR>
                      <TH>Дата счёта</TH>
                      <TH>Месяц учёта</TH>
                      <TH>Категория</TH>
                      <TH>Сумма</TH>
                      <TH>Оплачено</TH>
                      <TH>Остаток</TH>
                      <TH>Возраст</TH>
                      <TH>Bucket</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {docs.map((doc: any) => (
                      <TR key={doc.id}>
                        <TD>{new Date(doc.operationDate).toLocaleDateString('ru')}</TD>
                        <TD>{new Date(doc.postingPeriod).toLocaleDateString('ru', { year: 'numeric', month: 'long' })}</TD>
                        <TD>{doc.categoryName}</TD>
                        <TD>{rubFmt(doc.amount)}</TD>
                        <TD className="text-green-600">{rubFmt(doc.paidAmount)}</TD>
                        <TD className="font-semibold text-red-600">{rubFmt(doc.balance)}</TD>
                        <TD>{doc.ageDays} дней</TD>
                        <TD>
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${getBucketColor(doc.bucket)}`}>
                            {doc.bucket}
                          </span>
                        </TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </div>
            )
          })}

          {items.length === 0 && (
            <div className="text-center text-gray-500 py-8">
              Нет долгов
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

