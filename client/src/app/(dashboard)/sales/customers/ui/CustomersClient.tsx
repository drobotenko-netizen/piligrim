"use client"
import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table'
import { Button } from '@/components/ui/button'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000'

interface Customer {
  name: string
  phone: string
  totalOrders: number
  totalAmount: number
  avgOrderAmount: number
  firstOrder: string
  lastOrder: string
  orderTypes: string[]
  waiters: string[]
  weeksWithOrders: number
  orderCycle: number
  recency: number
  recencyRatio: number
  orders: Array<{
    orderNum: string
    date: string
    amount: number
    waiter: string
    orderType: string
    deliveryServiceType: string
  }>
}

function formatNumber(value: number): string {
  return value.toLocaleString('ru-RU')
}

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr)
    return date.toLocaleDateString('ru-RU', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    })
  } catch {
    return dateStr
  }
}

export function CustomersClient() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(false)
  const [fromDate, setFromDate] = useState('2025-01-01')
  const [toDate, setToDate] = useState('2025-09-30')
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)

  const loadCustomers = async () => {
    setLoading(true)
    try {
      const response = await fetch(`${API_BASE}/api/iiko/local/sales/customers?from=${fromDate}&to=${toDate}`)
      const data = await response.json()
      setCustomers(data.customers || [])
    } catch (error) {
      console.error('Ошибка при загрузке клиентов:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCustomers()
  }, [fromDate, toDate])

  const totalRevenue = customers.reduce((sum, customer) => sum + customer.totalAmount, 0)
  const totalOrders = customers.reduce((sum, customer) => sum + customer.totalOrders, 0)
  const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0

  return (
    <div className="flex flex-col gap-6 h-full min-h-0">
      {/* Фильтры */}
      <Card>
        <CardContent className="p-6">
          <div className="flex gap-4 items-end">
            <div>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <Button onClick={loadCustomers} disabled={loading}>
              {loading ? 'Загрузка...' : 'Обновить'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold">{customers.length}</div>
            <div className="text-sm text-muted-foreground">Всего клиентов</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold">{formatNumber(totalRevenue)} ₽</div>
            <div className="text-sm text-muted-foreground">Общая выручка</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold">{totalOrders}</div>
            <div className="text-sm text-muted-foreground">Всего заказов</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold">{formatNumber(avgOrderValue)} ₽</div>
            <div className="text-sm text-muted-foreground">Средний чек</div>
          </CardContent>
        </Card>
      </div>

      {/* Таблица клиентов */}
      <Card className="flex-1 min-h-0 flex flex-col">
        <CardContent className="p-0 flex-1 min-h-0">
          <div className="h-full overflow-auto">
          <Table>
            <THead className="sticky top-0 bg-background z-10">
              <TR>
                <TH className="text-xs w-[150px]">Клиент</TH>
                <TH className="text-xs w-[150px]">Телефон</TH>
                <TH className="text-xs">Заказов</TH>
                <TH className="text-xs">Сумма</TH>
                <TH className="text-xs">Средний чек</TH>
                <TH className="text-xs">
                  Недель
                  <abbr
                    title="Количество недель с заказами"
                    className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full border text-[10px] text-muted-foreground no-underline cursor-help"
                  >
                    ?
                  </abbr>
                </TH>
                <TH className="text-xs">
                  Цикл (дни)
                  <abbr
                    title="Средний интервал между заказами в днях"
                    className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full border text-[10px] text-muted-foreground no-underline cursor-help"
                  >
                    ?
                  </abbr>
                </TH>
                <TH className="text-xs">
                  Recency (дни)
                  <abbr
                    title="Дней с последнего заказа"
                    className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full border text-[10px] text-muted-foreground no-underline cursor-help"
                  >
                    ?
                  </abbr>
                </TH>
                <TH className="text-xs">
                  Давность
                  <abbr
                    title="Отношение recency к циклу (зеленый < 1, желтый < 2, красный ≥ 2)"
                    className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full border text-[10px] text-muted-foreground no-underline cursor-help"
                  >
                    ?
                  </abbr>
                </TH>
                <TH className="text-xs">Последний заказ</TH>
              </TR>
            </THead>
            <TBody>
              {customers.map((customer, index) => (
                <TR key={index}>
                  <TD className="font-medium text-xs">{customer.name || 'Не указано'}</TD>
                  <TD className="text-xs whitespace-normal break-words">{customer.phone || 'Не указано'}</TD>
                  <TD className="text-xs">{customer.totalOrders}</TD>
                  <TD className="text-xs">{formatNumber(customer.totalAmount)} ₽</TD>
                  <TD className="text-xs">{formatNumber(customer.avgOrderAmount)} ₽</TD>
                  <TD className="text-xs">{customer.weeksWithOrders}</TD>
                  <TD className="text-xs">{customer.orderCycle}</TD>
                  <TD className="text-xs">{customer.recency}</TD>
                  <TD className="text-xs">
                    <span className={`px-2 py-1 rounded text-xs ${
                      customer.recencyRatio < 1 ? 'bg-green-100 text-green-800' :
                      customer.recencyRatio < 2 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {customer.recencyRatio}
                    </span>
                  </TD>
                  <TD className="text-xs">{formatDate(customer.lastOrder)}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
          </div>
        </CardContent>
      </Card>

      {/* Модальное окно с деталями клиента */}
      {selectedCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-4xl max-h-[80vh] overflow-y-auto">
            <CardContent className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">
                  {selectedCustomer.name || 'Клиент'} 
                  {selectedCustomer.phone && ` (${selectedCustomer.phone})`}
                </h2>
                <Button 
                  variant="outline" 
                  onClick={() => setSelectedCustomer(null)}
                >
                  Закрыть
                </Button>
              </div>

              {/* Статистика клиента */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold">{selectedCustomer.totalOrders}</div>
                  <div className="text-sm text-muted-foreground">Заказов</div>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold">{formatNumber(selectedCustomer.totalAmount)} ₽</div>
                  <div className="text-sm text-muted-foreground">Общая сумма</div>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold">{formatNumber(selectedCustomer.avgOrderAmount)} ₽</div>
                  <div className="text-sm text-muted-foreground">Средний чек</div>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold">
                    {selectedCustomer.orderTypes.length}
                  </div>
                  <div className="text-sm text-muted-foreground">Типов заказов</div>
                </div>
              </div>

              {/* Типы заказов и официанты */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <h3 className="font-semibold mb-2">Типы заказов:</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedCustomer.orderTypes.map((type, index) => (
                      <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                        {type}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Официанты:</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedCustomer.waiters.map((waiter, index) => (
                      <span key={index} className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm">
                        {waiter}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* История заказов */}
              <div>
                <h3 className="font-semibold mb-4">История заказов:</h3>
                <Table>
                  <THead>
                    <TR>
                      <TH>№ заказа</TH>
                      <TH>Дата</TH>
                      <TH>Сумма</TH>
                      <TH>Официант</TH>
                      <TH>Тип заказа</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {selectedCustomer.orders
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .map((order, index) => (
                      <TR key={index}>
                        <TD className="font-medium">{order.orderNum}</TD>
                        <TD>{formatDate(order.date)}</TD>
                        <TD>{formatNumber(order.amount)} ₽</TD>
                        <TD>{order.waiter || 'Не указано'}</TD>
                        <TD>{order.orderType || 'Не указано'}</TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
