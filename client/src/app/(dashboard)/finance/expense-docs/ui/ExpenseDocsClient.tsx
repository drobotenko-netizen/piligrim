"use client"

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { MoreHorizontal } from 'lucide-react'
import { api } from '@/lib/api-client'

export default function ExpenseDocsClient() {
  const [docs, setDocs] = useState<any[]>([])
  const [vendors, setVendors] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  
  const [form, setForm] = useState({
    vendorId: '',
    categoryId: '',
    operationDate: new Date().toISOString().slice(0, 10),
    postingPeriod: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10),
    amount: '',
    status: 'draft' as 'draft' | 'unpaid' | 'partial' | 'paid' | 'void',
    memo: ''
  })

  const [filters, setFilters] = useState({
    status: 'all',
    vendorId: 'all'
  })

  useEffect(() => {
    loadDocs()
    loadVendors()
    loadCategories()
  }, [filters])

  async function loadDocs() {
    try {
      const params: any = {}
      if (filters.status && filters.status !== 'all') params.status = filters.status
      if (filters.vendorId && filters.vendorId !== 'all') params.vendorId = filters.vendorId

      const data: any = await api.get('/api/expense-docs', { params })
      setDocs(data.items || [])
    } catch (e) {
      console.error(e)
    }
  }

  async function loadVendors() {
    try {
      const data: any = await api.get('/api/counterparties')
      setVendors(data.items || [])
    } catch (e) {
      console.error(e)
    }
  }

  async function loadCategories() {
    try {
      const data: any = await api.get('/api/categories')
      
      // Flatten categories
      const flatCats: any[] = []
      function walk(items: any[], depth = 0) {
        items.forEach(cat => {
          flatCats.push({ ...cat, depth })
          if (cat.children?.length) walk(cat.children, depth + 1)
        })
      }
      walk(data.items || [])
      setCategories(flatCats)
    } catch (e) {
      console.error(e)
    }
  }

  async function saveDoc() {
    try {
      const body = {
        vendorId: (form.vendorId && form.vendorId !== 'none') ? form.vendorId : undefined,
        categoryId: form.categoryId,
        operationDate: form.operationDate,
        postingPeriod: form.postingPeriod,
        amount: parseFloat(form.amount),
        status: form.status,
        memo: form.memo || undefined
      }

      if (editingId) {
        await api.patch(`/api/expense-docs/${editingId}`, body)
      } else {
        await api.post('/api/expense-docs', body)
      }

      resetForm()
      loadDocs()
    } catch (e) {
      console.error(e)
      alert('Ошибка: ' + e)
    }
  }

  function resetForm() {
    setForm({
      vendorId: '',
      categoryId: '',
      operationDate: new Date().toISOString().slice(0, 10),
      postingPeriod: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10),
      amount: '',
      status: 'draft',
      memo: ''
    })
    setEditingId(null)
    setShowForm(false)
  }

  function editDoc(doc: any) {
    setForm({
      vendorId: doc.vendorId || '',
      categoryId: doc.categoryId,
      operationDate: new Date(doc.operationDate).toISOString().slice(0, 10),
      postingPeriod: new Date(doc.postingPeriod).toISOString().slice(0, 10),
      amount: String(doc.amount / 100),
      status: doc.status,
      memo: doc.memo || ''
    })
    setEditingId(doc.id)
    setShowForm(true)
  }

  async function voidDoc(id: string) {
    if (!confirm('Отменить документ?')) return
    try {
      await api.delete(`/api/expense-docs/${id}`)
      loadDocs()
    } catch (e) {
      console.error(e)
    }
  }

  function rubFmt(cents: number) {
    return new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 2 }).format(cents / 100) + ' ₽'
  }

  function getStatusBadge(status: string) {
    const colors: Record<string, string> = {
      draft: 'bg-gray-200 text-gray-800',
      unpaid: 'bg-red-100 text-red-800',
      partial: 'bg-yellow-100 text-yellow-800',
      paid: 'bg-green-100 text-green-800',
      void: 'bg-gray-300 text-gray-600'
    }
    const labels: Record<string, string> = {
      draft: 'Черновик',
      unpaid: 'Не оплачен',
      partial: 'Частично',
      paid: 'Оплачен',
      void: 'Отменён'
    }
    return (
      <span className={`px-2 py-1 rounded text-xs font-semibold ${colors[status] || ''}`}>
        {labels[status] || status}
      </span>
    )
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Документы расходов</h1>
        <Button
          onClick={() => setShowForm(!showForm)}
          className="bg-orange-500 hover:bg-orange-600 text-white"
        >
          {showForm ? 'Скрыть форму' : 'Создать документ'}
        </Button>
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardContent className="p-6">
            <h2 className="text-xl font-bold mb-4">{editingId ? 'Редактировать' : 'Новый'} документ</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Поставщик</Label>
                <Select value={form.vendorId} onValueChange={v => setForm({ ...form, vendorId: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите поставщика" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Без поставщика</SelectItem>
                    {vendors.map(v => (
                      <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Категория расхода*</Label>
                <Select value={form.categoryId} onValueChange={v => setForm({ ...form, categoryId: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите категорию" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.filter(c => c.type === 'expense').map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        {'— '.repeat(c.depth)}{c.name} {c.kind && `(${c.kind})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Дата счёта (operation_date)*</Label>
                <Input
                  type="date"
                  value={form.operationDate}
                  onChange={e => setForm({ ...form, operationDate: e.target.value })}
                />
              </div>

              <div>
                <Label>Месяц учёта (posting_period)*</Label>
                <Input
                  type="date"
                  value={form.postingPeriod}
                  onChange={e => setForm({ ...form, postingPeriod: e.target.value })}
                />
                <div className="text-xs text-gray-500 mt-1">Должно быть 1-е число месяца</div>
              </div>

              <div>
                <Label>Сумма*</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.amount}
                  onChange={e => setForm({ ...form, amount: e.target.value })}
                  placeholder="0.00"
                />
              </div>

              <div>
                <Label>Статус*</Label>
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v as any })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Черновик</SelectItem>
                    <SelectItem value="unpaid">Не оплачен</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-2">
                <Label>Примечание</Label>
                <Input
                  value={form.memo}
                  onChange={e => setForm({ ...form, memo: e.target.value })}
                  placeholder="Комментарий"
                />
              </div>
            </div>

            <div className="flex gap-4 mt-6">
              <Button
                onClick={saveDoc}
                className="bg-orange-500 hover:bg-orange-600 text-white"
                disabled={!form.categoryId || !form.amount}
              >
                {editingId ? 'Обновить' : 'Создать'}
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
          <div className="flex gap-4 mb-4">
            <Select value={filters.status} onValueChange={v => setFilters({ ...filters, status: v })}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Все статусы" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все статусы</SelectItem>
                <SelectItem value="draft">Черновик</SelectItem>
                <SelectItem value="unpaid">Не оплачен</SelectItem>
                <SelectItem value="partial">Частично</SelectItem>
                <SelectItem value="paid">Оплачен</SelectItem>
                <SelectItem value="void">Отменён</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.vendorId} onValueChange={v => setFilters({ ...filters, vendorId: v })}>
              <SelectTrigger className="w-48">
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

          <Table>
            <THead>
              <TR>
                <TH>Поставщик</TH>
                <TH>Категория</TH>
                <TH>Дата счёта</TH>
                <TH>Месяц учёта</TH>
                <TH>Сумма</TH>
                <TH>Оплачено</TH>
                <TH>Остаток</TH>
                <TH>Статус</TH>
                <TH></TH>
              </TR>
            </THead>
            <TBody>
              {docs.map(doc => {
                const balance = doc.amount - doc.paidAmount
                const ageDays = Math.floor(
                  (new Date().getTime() - new Date(doc.operationDate).getTime()) / (1000 * 60 * 60 * 24)
                )

                return (
                  <TR key={doc.id}>
                    <TD>{doc.vendor?.name || '—'}</TD>
                    <TD>{doc.category?.name}</TD>
                    <TD>{new Date(doc.operationDate).toLocaleDateString('ru')}</TD>
                    <TD>{new Date(doc.postingPeriod).toLocaleDateString('ru', { year: 'numeric', month: 'long' })}</TD>
                    <TD>{rubFmt(doc.amount)}</TD>
                    <TD className="text-green-600">{rubFmt(doc.paidAmount)}</TD>
                    <TD className={balance > 0 ? 'text-red-600 font-semibold' : ''}>
                      {rubFmt(balance)}
                      {balance > 0 && doc.status !== 'void' && (
                        <span className="text-xs text-gray-500 ml-1">({ageDays}д)</span>
                      )}
                    </TD>
                    <TD>{getStatusBadge(doc.status)}</TD>
                    <TD>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onClick={() => editDoc(doc)}>
                            Редактировать
                          </DropdownMenuItem>
                          {doc.status !== 'void' && (
                            <DropdownMenuItem onClick={() => voidDoc(doc.id)} className="text-red-600">
                              Отменить
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TD>
                  </TR>
                )
              })}
              {docs.length === 0 && (
                <TR>
                  <TD colSpan={9} className="text-center text-gray-500">
                    Нет документов
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

