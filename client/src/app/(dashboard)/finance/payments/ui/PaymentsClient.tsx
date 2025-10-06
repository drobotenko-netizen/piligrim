import { getApiBase } from '../../lib/api'
"use client"

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'

const API_BASE = getApiBase()

export default function PaymentsClient() {
  const [payments, setPayments] = useState<any[]>([])
  const [accounts, setAccounts] = useState<any[]>([])
  const [unpaidDocs, setUnpaidDocs] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  
  const [form, setForm] = useState({
    accountId: '',
    date: new Date().toISOString().slice(0, 10),
    memo: ''
  })

  const [allocations, setAllocations] = useState<Record<string, string>>({})

  useEffect(() => {
    loadPayments()
    loadAccounts()
    loadUnpaidDocs()
  }, [])

  async function loadPayments() {
    try {
      const res = await fetch(`${API_BASE}/api/payments`, { credentials: 'include' })
      const data = await res.json()
      setPayments(data.items || [])
    } catch (e) {
      console.error(e)
    }
  }

  async function loadAccounts() {
    try {
      const res = await fetch(`${API_BASE}/api/accounts`, { credentials: 'include' })
      const data = await res.json()
      setAccounts(data.items || [])
    } catch (e) {
      console.error(e)
    }
  }

  async function loadUnpaidDocs() {
    try {
      const res = await fetch(`${API_BASE}/api/expense-docs?status=unpaid`, { credentials: 'include' })
      const data1 = await res.json()
      const res2 = await fetch(`${API_BASE}/api/expense-docs?status=partial`, { credentials: 'include' })
      const data2 = await res2.json()
      setUnpaidDocs([...(data1.items || []), ...(data2.items || [])])
    } catch (e) {
      console.error(e)
    }
  }

  async function createPayment() {
    try {
      const allocsArray = Object.entries(allocations)
        .filter(([_, amount]) => parseFloat(amount || '0') > 0)
        .map(([expenseDocId, amount]) => ({
          expenseDocId,
          amount: parseFloat(amount)
        }))

      if (allocsArray.length === 0) {
        alert('Укажите хотя бы один документ для оплаты')
        return
      }

      const totalAmount = allocsArray.reduce((sum, a) => sum + a.amount, 0)

      const body = {
        accountId: form.accountId,
        date: form.date,
        amount: totalAmount,
        memo: form.memo || undefined,
        allocations: allocsArray
      }

      await fetch(`${API_BASE}/api/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body)
      })

      resetForm()
      loadPayments()
      loadUnpaidDocs()
    } catch (e) {
      console.error(e)
      alert('Ошибка: ' + e)
    }
  }

  function resetForm() {
    setForm({
      accountId: '',
      date: new Date().toISOString().slice(0, 10),
      memo: ''
    })
    setAllocations({})
    setShowForm(false)
  }

  async function deletePayment(id: string) {
    if (!confirm('Отменить платёж? Это пересчитает суммы в документах.')) return
    try {
      await fetch(`${API_BASE}/api/payments/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      })
      loadPayments()
      loadUnpaidDocs()
    } catch (e) {
      console.error(e)
    }
  }

  function rubFmt(cents: number) {
    return new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 2 }).format(cents / 100) + ' ₽'
  }

  const totalAllocation = Object.values(allocations).reduce((sum, v) => sum + parseFloat(v || '0'), 0)

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Платежи</h1>
        <Button
          onClick={() => setShowForm(!showForm)}
          className="bg-orange-500 hover:bg-orange-600 text-white"
        >
          {showForm ? 'Скрыть форму' : 'Создать платёж'}
        </Button>
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardContent className="p-6">
            <h2 className="text-xl font-bold mb-4">Новый платёж</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <Label>Счёт*</Label>
                <Select value={form.accountId} onValueChange={v => setForm({ ...form, accountId: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Откуда платим" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map(a => (
                      <SelectItem key={a.id} value={a.id}>{a.name} ({a.kind})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Дата платежа*</Label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={e => setForm({ ...form, date: e.target.value })}
                />
              </div>

              <div>
                <Label>Примечание</Label>
                <Input
                  value={form.memo}
                  onChange={e => setForm({ ...form, memo: e.target.value })}
                  placeholder="Комментарий"
                />
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-bold mb-3">Распределение на документы:</h3>
              
              {unpaidDocs.length === 0 && (
                <div className="text-center text-gray-500 py-4">
                  Нет неоплаченных документов
                </div>
              )}

              {unpaidDocs.length > 0 && (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {unpaidDocs.map(doc => {
                    const balance = doc.amount - doc.paidAmount
                    return (
                      <div key={doc.id} className="flex items-center gap-4 p-2 border rounded">
                        <div className="flex-1">
                          <div className="font-semibold">{doc.vendor?.name || 'Без поставщика'}</div>
                          <div className="text-sm text-gray-600">
                            {doc.category?.name} • {new Date(doc.operationDate).toLocaleDateString('ru')}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-gray-600">Остаток:</div>
                          <div className="font-bold text-red-600">{rubFmt(balance)}</div>
                        </div>
                        <div>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            className="w-32"
                            value={allocations[doc.id] || ''}
                            onChange={e => setAllocations({ ...allocations, [doc.id]: e.target.value })}
                          />
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setAllocations({ ...allocations, [doc.id]: String(balance / 100) })}
                        >
                          Полностью
                        </Button>
                      </div>
                    )
                  })}
                </div>
              )}

              <div className="mt-4 p-4 bg-blue-50 rounded">
                <div className="flex justify-between items-center">
                  <span className="font-bold">Итого к оплате:</span>
                  <span className="text-2xl font-bold text-green-600">
                    {new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 2 }).format(totalAllocation)} ₽
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-4 mt-6">
              <Button
                onClick={createPayment}
                className="bg-orange-500 hover:bg-orange-600 text-white"
                disabled={!form.accountId || totalAllocation === 0}
              >
                Провести платёж
              </Button>
              <Button onClick={resetForm} variant="outline">
                Отмена
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-4">
          <h2 className="text-xl font-bold mb-4">История платежей</h2>
          <Table>
            <THead>
              <TR>
                <TH>Дата</TH>
                <TH>Счёт</TH>
                <TH>Контрагент</TH>
                <TH>Категория</TH>
                <TH>Сумма</TH>
                <TH>Распределено на</TH>
                <TH>Примечание</TH>
                <TH></TH>
              </TR>
            </THead>
            <TBody>
              {payments.map(payment => (
                <TR key={payment.id}>
                  <TD>{new Date(payment.date).toLocaleDateString('ru')}</TD>
                  <TD>{payment.account?.name}</TD>
                  <TD>
                    {payment.expenseDoc?.vendor?.name || 
                     (payment.allocations?.length > 0 && payment.allocations[0]?.expenseDoc?.vendor?.name) || 
                     '—'}
                  </TD>
                  <TD>
                    {payment.expenseDoc?.category?.name || 
                     (payment.allocations?.length > 0 && payment.allocations[0]?.expenseDoc?.category?.name) || 
                     '—'}
                  </TD>
                  <TD className="font-semibold">{rubFmt(payment.amount)}</TD>
                  <TD>
                    {payment.allocations?.length > 0 ? (
                      <div className="text-sm">
                        {payment.allocations.map((alloc: any, idx: number) => (
                          <div key={idx}>
                            {alloc.expenseDoc?.vendor?.name || 'Без поставщика'}: {rubFmt(alloc.amount)}
                          </div>
                        ))}
                      </div>
                    ) : payment.expenseDoc ? (
                      <div className="text-sm text-gray-600">
                        {payment.expenseDoc.vendor?.name || 'Без поставщика'}
                      </div>
                    ) : (
                      '—'
                    )}
                  </TD>
                  <TD>{payment.memo || '—'}</TD>
                  <TD>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deletePayment(payment.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Отменить
                    </Button>
                  </TD>
                </TR>
              ))}
              {payments.length === 0 && (
                <TR>
                  <TD colSpan={8} className="text-center text-gray-500">
                    Нет платежей
                  </TD>
                </TR>
              )}
            </TBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

