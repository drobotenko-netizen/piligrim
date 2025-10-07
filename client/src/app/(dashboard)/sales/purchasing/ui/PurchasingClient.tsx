"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Calculator, Package, Users, Calendar, BarChart3, Plus, Edit, Trash2, ShoppingCart } from 'lucide-react'
import { getApiBase } from '@/lib/api'

interface OrderCalculation {
  productId: string
  productName: string
  supplierId: string
  supplierName: string
  isPrimarySupplier: boolean
  weeklyConsumption: number
  bufferStock: number
  currentStock: number
  orderQuantity: number
  price?: number
  totalAmount?: number
  deliveryDays: number
  unit: string
}

interface ProductBuffer {
  id: string
  productId: string
  productName: string
  bufferDays: number
  minBuffer: number
  maxBuffer?: number
  isActive: boolean
  notes?: string
}

interface ProductSupplier {
  id: string
  productId: string
  productName: string
  supplierId: string
  supplier: {
    id: string
    name: string
  }
  isPrimary: boolean
  priority: number
  isActive: boolean
  minOrderAmount?: number
  deliveryDays: number
  price?: number
  unit: string
  notes?: string
}

interface SupplierOrder {
  id: string
  supplierId: string
  supplier: {
    id: string
    name: string
  }
  status: string
  orderDate: string
  scheduledDate: string
  deliveryDate?: string
  totalAmount: number
  items: Array<{
    id: string
    productId: string
    productName: string
    quantity: number
    unit: string
    price?: number
    totalAmount: number
  }>
  notes?: string
}

interface ProductStock {
  id: string
  productId: string
  productName: string
  storeId: string
  storeName: string
  currentStock: number
  reservedStock: number
  lastUpdated: string
  lastSyncWithIiko: string
  notes?: string
}

export default function PurchasingClient() {
  const [calculations, setCalculations] = useState<OrderCalculation[]>([])
  const [stocks, setStocks] = useState<ProductStock[]>([])
  const [buffers, setBuffers] = useState<ProductBuffer[]>([])
  const [productSuppliers, setProductSuppliers] = useState<ProductSupplier[]>([])
  const [orders, setOrders] = useState<SupplierOrder[]>([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('calculate')

  const API_BASE = getApiBase()

  // Загрузка данных
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [calculationsRes, stocksRes, buffersRes, suppliersRes, ordersRes] = await Promise.all([
        fetch(`${API_BASE}/api/purchasing/calculate-orders`, { credentials: 'include' }),
        fetch(`${API_BASE}/api/purchasing/stocks`, { credentials: 'include' }),
        fetch(`${API_BASE}/api/purchasing/buffers`, { credentials: 'include' }),
        fetch(`${API_BASE}/api/purchasing/product-suppliers`, { credentials: 'include' }),
        fetch(`${API_BASE}/api/purchasing/orders`, { credentials: 'include' })
      ])

      if (calculationsRes.ok) {
        const data = await calculationsRes.json()
        setCalculations(data.calculations || [])
      }

      if (stocksRes.ok) {
        const data = await stocksRes.json()
        setStocks(data.stocks || [])
      }

      if (buffersRes.ok) {
        const data = await buffersRes.json()
        setBuffers(data.buffers || [])
      }

      if (suppliersRes.ok) {
        const data = await suppliersRes.json()
        setProductSuppliers(data.productSuppliers || [])
      }

      if (ordersRes.ok) {
        const data = await ordersRes.json()
        setOrders(data.orders || [])
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateOrders = async () => {
    setLoading(true)
    try {
      const response = await fetch(`${API_BASE}/api/purchasing/calculate-orders`, {
        credentials: 'include'
      })
      if (response.ok) {
        const data = await response.json()
        setCalculations(data.calculations || [])
      }
    } catch (error) {
      console.error('Error calculating orders:', error)
    } finally {
      setLoading(false)
    }
  }

  const createOrder = async (calculations: OrderCalculation[]) => {
    if (calculations.length === 0) return

    // Группируем по поставщикам
    const ordersBySupplier = calculations.reduce((acc, calc) => {
      if (!acc[calc.supplierId]) {
        acc[calc.supplierId] = {
          supplierId: calc.supplierId,
          supplierName: calc.supplierName,
          items: []
        }
      }
      acc[calc.supplierId].items.push({
        productId: calc.productId,
        productName: calc.productName,
        quantity: calc.orderQuantity,
        unit: calc.unit,
        price: calc.price,
        totalAmount: calc.totalAmount || 0
      })
      return acc
    }, {} as Record<string, any>)

    // Создаем заказы для каждого поставщика
    for (const [supplierId, orderData] of Object.entries(ordersBySupplier)) {
      try {
        const response = await fetch(`${API_BASE}/api/purchasing/orders`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            supplierId,
            scheduledDate: new Date().toISOString(),
            items: orderData.items
          })
        })

        if (response.ok) {
          console.log(`Order created for supplier ${orderData.supplierName}`)
        }
      } catch (error) {
        console.error(`Error creating order for supplier ${orderData.supplierName}:`, error)
      }
    }

    // Перезагружаем данные
    loadData()
  }

  const syncStocks = async () => {
    setLoading(true)
    try {
      const response = await fetch(`${API_BASE}/api/purchasing/sync-stocks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({})
      })

      if (response.ok) {
        const data = await response.json()
        console.log('Sync result:', data)
        // Перезагружаем остатки
        const stocksRes = await fetch(`${API_BASE}/api/purchasing/stocks`, { credentials: 'include' })
        if (stocksRes.ok) {
          const stocksData = await stocksRes.json()
          setStocks(stocksData.stocks || [])
        }
      }
    } catch (error) {
      console.error('Error syncing stocks:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      DRAFT: { label: 'Черновик', variant: 'outline' },
      SENT: { label: 'Отправлен', variant: 'secondary' },
      CONFIRMED: { label: 'Подтвержден', variant: 'default' },
      DELIVERED: { label: 'Доставлен', variant: 'default' },
      CANCELLED: { label: 'Отменен', variant: 'destructive' }
    }
    const config = statusMap[status] || { label: status, variant: 'outline' }
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0
    }).format(amount / 100)
  }

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
      <TabsList className="grid w-full grid-cols-6">
        <TabsTrigger value="calculate" className="flex items-center gap-2">
          <Calculator className="h-4 w-4" />
          Расчет
        </TabsTrigger>
        <TabsTrigger value="stocks" className="flex items-center gap-2">
          <Package className="h-4 w-4" />
          Остатки
        </TabsTrigger>
        <TabsTrigger value="buffers" className="flex items-center gap-2">
          <Package className="h-4 w-4" />
          Буферы
        </TabsTrigger>
        <TabsTrigger value="suppliers" className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          Поставщики
        </TabsTrigger>
        <TabsTrigger value="orders" className="flex items-center gap-2">
          <ShoppingCart className="h-4 w-4" />
          Заказы
        </TabsTrigger>
        <TabsTrigger value="reports" className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          Отчеты
        </TabsTrigger>
      </TabsList>

      {/* Расчет заказов */}
      <TabsContent value="calculate" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Расчет заказов</CardTitle>
            <CardDescription>
              Автоматический расчет количества к заказу на основе расхода и буферных запасов
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <Button onClick={calculateOrders} disabled={loading}>
                <Calculator className="h-4 w-4 mr-2" />
                Рассчитать заказы
              </Button>
              {calculations.length > 0 && (
                <Button 
                  onClick={() => createOrder(calculations)} 
                  disabled={loading}
                  variant="default"
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Создать заказы
                </Button>
              )}
            </div>

            {calculations.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Результаты расчета</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Продукт</TableHead>
                      <TableHead>Поставщик</TableHead>
                      <TableHead>Расход/нед</TableHead>
                      <TableHead>Буфер</TableHead>
                      <TableHead>Остаток</TableHead>
                      <TableHead>К заказу</TableHead>
                      <TableHead>Цена</TableHead>
                      <TableHead>Сумма</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {calculations.map((calc) => (
                      <TableRow key={`${calc.productId}-${calc.supplierId}`}>
                        <TableCell className="font-medium">{calc.productName}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {calc.supplierName}
                            {calc.isPrimarySupplier && (
                              <Badge variant="default" className="text-xs">Основной</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{calc.weeklyConsumption.toFixed(1)} {calc.unit}</TableCell>
                        <TableCell>{calc.bufferStock.toFixed(1)} {calc.unit}</TableCell>
                        <TableCell>{calc.currentStock.toFixed(1)} {calc.unit}</TableCell>
                        <TableCell className="font-semibold text-green-600">
                          {calc.orderQuantity.toFixed(1)} {calc.unit}
                        </TableCell>
                        <TableCell>
                          {calc.price ? formatCurrency(calc.price) : '—'}
                        </TableCell>
                        <TableCell className="font-semibold">
                          {calc.totalAmount ? formatCurrency(calc.totalAmount) : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* Остатки */}
      <TabsContent value="stocks" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Остатки продуктов</CardTitle>
            <CardDescription>
              Текущие остатки продуктов на складах, синхронизированные с iiko
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <Button onClick={syncStocks} disabled={loading}>
                <Package className="h-4 w-4 mr-2" />
                Синхронизировать с iiko
              </Button>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Продукт</TableHead>
                  <TableHead>Склад</TableHead>
                  <TableHead>Текущий остаток</TableHead>
                  <TableHead>Зарезервировано</TableHead>
                  <TableHead>Последняя синхронизация</TableHead>
                  <TableHead>Статус</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stocks.map((stock) => {
                  const isLowStock = stock.currentStock <= 10
                  const lastSync = new Date(stock.lastSyncWithIiko)
                  const isStale = Date.now() - lastSync.getTime() > 24 * 60 * 60 * 1000 // 24 часа
                  
                  return (
                    <TableRow key={stock.id}>
                      <TableCell className="font-medium">{stock.productName}</TableCell>
                      <TableCell>{stock.storeName}</TableCell>
                      <TableCell className={isLowStock ? 'text-red-600 font-semibold' : ''}>
                        {stock.currentStock.toFixed(1)}
                      </TableCell>
                      <TableCell>{stock.reservedStock.toFixed(1)}</TableCell>
                      <TableCell>
                        {lastSync.toLocaleString('ru-RU')}
                        {isStale && (
                          <Badge variant="destructive" className="ml-2 text-xs">
                            Устарело
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {isLowStock ? (
                          <Badge variant="destructive">Мало</Badge>
                        ) : (
                          <Badge variant="default">Норма</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>

            {stocks.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                Остатки не найдены. Нажмите "Синхронизировать с iiko" для загрузки данных.
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* Буферы */}
      <TabsContent value="buffers" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Буферные запасы</CardTitle>
            <CardDescription>
              Управление буферными запасами для каждого продукта
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center mb-4">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Добавить буфер
              </Button>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Продукт</TableHead>
                  <TableHead>Дни буфера</TableHead>
                  <TableHead>Мин. буфер</TableHead>
                  <TableHead>Макс. буфер</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {buffers.map((buffer) => (
                  <TableRow key={buffer.id}>
                    <TableCell className="font-medium">{buffer.productName}</TableCell>
                    <TableCell>{buffer.bufferDays} дней</TableCell>
                    <TableCell>{buffer.minBuffer}</TableCell>
                    <TableCell>{buffer.maxBuffer || '—'}</TableCell>
                    <TableCell>
                      <Badge variant={buffer.isActive ? 'default' : 'secondary'}>
                        {buffer.isActive ? 'Активен' : 'Неактивен'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Поставщики */}
      <TabsContent value="suppliers" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Поставщики продуктов</CardTitle>
            <CardDescription>
              Управление связями между продуктами и поставщиками
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center mb-4">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Добавить поставщика
              </Button>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Продукт</TableHead>
                  <TableHead>Поставщик</TableHead>
                  <TableHead>Тип</TableHead>
                  <TableHead>Приоритет</TableHead>
                  <TableHead>Дни доставки</TableHead>
                  <TableHead>Цена</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {productSuppliers.map((ps) => (
                  <TableRow key={ps.id}>
                    <TableCell className="font-medium">{ps.productName}</TableCell>
                    <TableCell>{ps.supplier.name}</TableCell>
                    <TableCell>
                      <Badge variant={ps.isPrimary ? 'default' : 'secondary'}>
                        {ps.isPrimary ? 'Основной' : 'Запасной'}
                      </Badge>
                    </TableCell>
                    <TableCell>{ps.priority}</TableCell>
                    <TableCell>{ps.deliveryDays} дней</TableCell>
                    <TableCell>
                      {ps.price ? formatCurrency(ps.price) : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={ps.isActive ? 'default' : 'secondary'}>
                        {ps.isActive ? 'Активен' : 'Неактивен'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Заказы */}
      <TabsContent value="orders" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Заказы поставщикам</CardTitle>
            <CardDescription>
              История и управление заказами поставщикам
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Дата заказа</TableHead>
                  <TableHead>Поставщик</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Сумма</TableHead>
                  <TableHead>Позиций</TableHead>
                  <TableHead>Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>
                      {new Date(order.orderDate).toLocaleDateString('ru-RU')}
                    </TableCell>
                    <TableCell className="font-medium">{order.supplier.name}</TableCell>
                    <TableCell>{getStatusBadge(order.status)}</TableCell>
                    <TableCell className="font-semibold">
                      {formatCurrency(order.totalAmount)}
                    </TableCell>
                    <TableCell>{order.items.length}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Отчеты */}
      <TabsContent value="reports" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Отчеты по закупкам</CardTitle>
            <CardDescription>
              Аналитика и отчеты по системе закупа
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              Отчеты находятся в разработке
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
