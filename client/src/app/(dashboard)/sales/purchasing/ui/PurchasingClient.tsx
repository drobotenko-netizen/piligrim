"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Calculator, Package, Users, Calendar, BarChart3, Plus, Edit, Trash2, ShoppingCart, RefreshCw } from 'lucide-react'
import { getApiBase } from '@/lib/api'
import BufferChartDialog from './BufferChartDialog'

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

interface Ingredient {
  productId: string
  productName: string
  productType?: string
  totalStock: number
}

interface Counterparty {
  id: string
  name: string
  kind: string
  active: boolean
}

export default function PurchasingClient() {
  const [calculations, setCalculations] = useState<OrderCalculation[]>([])
  const [stocks, setStocks] = useState<ProductStock[]>([])
  const [buffers, setBuffers] = useState<ProductBuffer[]>([])
  const [productSuppliers, setProductSuppliers] = useState<ProductSupplier[]>([])
  const [orders, setOrders] = useState<SupplierOrder[]>([])
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [counterparties, setCounterparties] = useState<Counterparty[]>([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('calculate')
  
  // Новые состояния для управления поставщиками ингредиента
  const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null)
  const [showSuppliersDialog, setShowSuppliersDialog] = useState(false)
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('')
  
  // Множественный выбор ингредиентов
  const [selectedIngredients, setSelectedIngredients] = useState<Set<string>>(new Set())
  const [showBulkSuppliersDialog, setShowBulkSuppliersDialog] = useState(false)
  
  // Модальное окно с графиком буфера
  const [showBufferChart, setShowBufferChart] = useState(false)
  const [selectedBufferProduct, setSelectedBufferProduct] = useState<{ id: string; name: string } | null>(null)

  const API_BASE = getApiBase()

  // Загрузка данных
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      console.log('[PurchasingClient] Loading data...')
      
      const [calculationsRes, buffersRes, suppliersRes, ordersRes, ingredientsRes, counterpartiesRes] = await Promise.all([
        fetch(`${API_BASE}/api/purchasing/calculate-orders`, { credentials: 'include' }),
        fetch(`${API_BASE}/api/purchasing/buffers-calc`, { credentials: 'include' }),
        fetch(`${API_BASE}/api/purchasing/product-suppliers`, { credentials: 'include' }),
        fetch(`${API_BASE}/api/purchasing/orders`, { credentials: 'include' }),
        fetch(`${API_BASE}/api/iiko/entities/products`, { credentials: 'include' }),
        fetch(`${API_BASE}/api/counterparties?type=supplier`, { credentials: 'include' })
      ])
      
      console.log('[PurchasingClient] ingredientsRes status:', ingredientsRes.status)

      if (calculationsRes.ok) {
        const data = await calculationsRes.json()
        setCalculations(data.calculations || [])
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

      if (ingredientsRes.ok) {
        const data = await ingredientsRes.json()
        console.log('[PurchasingClient] Products from iiko:', data.items?.length || 0)
        
        const items = data.items || []
        
        // Фильтруем - оставляем только ингредиенты (товары)
        const goodsItems = items.filter((item: any) => {
          if (!item.id || !item.name) return false
          const type = String(item.type || '').toUpperCase()
          return type === 'GOODS'
        })
        
        console.log('[PurchasingClient] Filtered GOODS:', goodsItems.length, 'items')
        
        // Загружаем остатки для этих товаров (используем фиксированную дату с данными)
        const timestamp = '2024-12-15T12:00:00.000'
        
        try {
          const balancesRes = await fetch(`${API_BASE}/api/iiko/stores/balances?timestamp=${encodeURIComponent(timestamp)}`, {
            credentials: 'include'
          })
          
          if (balancesRes.ok) {
            const balancesData = await balancesRes.json()
            const balances = balancesData.rows || []
            
            // Создаем мапу остатков по productId
            const stockMap = new Map()
            for (const balance of balances) {
              const productId = balance.product
              const currentStock = stockMap.get(productId) || 0
              stockMap.set(productId, currentStock + (Number(balance.amount) || 0))
            }
            
            // Создаем финальный список с остатками
            const ingredients = goodsItems
              .map((item: any) => ({
                productId: item.id,
                productName: item.name,
                productType: item.type,
                totalStock: stockMap.get(item.id) || 0
              }))
              .sort((a, b) => a.productName.localeCompare(b.productName))
            
            console.log('[PurchasingClient] Ingredients with stocks:', ingredients.length)
            setIngredients(ingredients)
          } else {
            // Если не удалось загрузить остатки, показываем без них
            const ingredients = goodsItems
              .map((item: any) => ({
                productId: item.id,
                productName: item.name,
                productType: item.type,
                totalStock: 0
              }))
              .sort((a, b) => a.productName.localeCompare(b.productName))
            setIngredients(ingredients)
          }
        } catch (e) {
          console.error('Error loading balances:', e)
          // Fallback без остатков
          const ingredients = goodsItems
            .map((item: any) => ({
              productId: item.id,
              productName: item.name,
              productType: item.type,
              totalStock: 0
            }))
            .sort((a, b) => a.productName.localeCompare(b.productName))
          setIngredients(ingredients)
        }
      } else {
        const errorData = await ingredientsRes.json().catch(() => ({ error: 'Unknown error' }))
        console.error('[PurchasingClient] Ingredients error:', errorData)
      }

      if (counterpartiesRes.ok) {
        const data = await counterpartiesRes.json()
        console.log('[PurchasingClient] Counterparties loaded:', data.items?.length || 0)
        console.log('[PurchasingClient] Sample counterparty:', data.items?.[0])
        setCounterparties(data.items || [])
      } else {
        console.error('[PurchasingClient] Counterparties error:', counterpartiesRes.status)
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

  // CRUD операции для буферов
  const [showBufferForm, setShowBufferForm] = useState(false)
  const [editingBuffer, setEditingBuffer] = useState<ProductBuffer | null>(null)

  const addBuffer = () => {
    setEditingBuffer(null)
    setShowBufferForm(true)
  }

  const editBuffer = (buffer: ProductBuffer) => {
    setEditingBuffer(buffer)
    setShowBufferForm(true)
  }

  const deleteBuffer = async (bufferId: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот буферный запас?')) return
    
    try {
      const response = await fetch(`${API_BASE}/api/purchasing/buffers/${bufferId}`, {
        method: 'DELETE',
        credentials: 'include'
      })
      
      if (response.ok) {
        // Перезагружаем данные
        const buffersRes = await fetch(`${API_BASE}/api/purchasing/buffers`, { credentials: 'include' })
        if (buffersRes.ok) {
          const data = await buffersRes.json()
          setBuffers(data.buffers || [])
        }
      }
    } catch (error) {
      console.error('Error deleting buffer:', error)
    }
  }

  // CRUD операции для поставщиков
  const [showSupplierForm, setShowSupplierForm] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<ProductSupplier | null>(null)

  const addSupplier = () => {
    setEditingSupplier(null)
    setShowSupplierForm(true)
  }

  const editSupplier = (supplier: ProductSupplier) => {
    setEditingSupplier(supplier)
    setShowSupplierForm(true)
  }

  const deleteSupplier = async (supplierId: string) => {
    if (!confirm('Вы уверены, что хотите удалить этого поставщика?')) return
    
    try {
      const response = await fetch(`${API_BASE}/api/purchasing/product-suppliers/${supplierId}`, {
        method: 'DELETE',
        credentials: 'include'
      })
      
      if (response.ok) {
        // Перезагружаем данные
        const suppliersRes = await fetch(`${API_BASE}/api/purchasing/product-suppliers`, { credentials: 'include' })
        if (suppliersRes.ok) {
          const data = await suppliersRes.json()
          setProductSuppliers(data.productSuppliers || [])
        }
      }
    } catch (error) {
      console.error('Error deleting supplier:', error)
    }
  }

  // Сохранение буфера
  const saveBuffer = async () => {
    const productName = (document.getElementById('productName') as HTMLInputElement)?.value
    const bufferDays = parseInt((document.getElementById('bufferDays') as HTMLInputElement)?.value || '7')
    const minBuffer = parseFloat((document.getElementById('minBuffer') as HTMLInputElement)?.value || '0')
    const maxBuffer = parseFloat((document.getElementById('maxBuffer') as HTMLInputElement)?.value || '0') || null
    const productId = (document.getElementById('productId') as HTMLInputElement)?.value || `prod_${Date.now()}`

    if (!productName) {
      alert('Укажите название продукта')
      return
    }

    try {
      setLoading(true)
      const url = editingBuffer 
        ? `${API_BASE}/api/purchasing/buffers/${editingBuffer.id}`
        : `${API_BASE}/api/purchasing/buffers`
      
      const method = editingBuffer ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          productName,
          bufferDays,
          minBuffer,
          maxBuffer,
          isActive: true
        })
      })

      if (response.ok) {
        setShowBufferForm(false)
        setEditingBuffer(null)
        // Перезагружаем данные
        const buffersRes = await fetch(`${API_BASE}/api/purchasing/buffers`, { credentials: 'include' })
        if (buffersRes.ok) {
          const data = await buffersRes.json()
          setBuffers(data.buffers || [])
        }
      } else {
        const error = await response.json()
        alert(`Ошибка: ${error.error || 'Не удалось сохранить'}`)
      }
    } catch (error) {
      console.error('Error saving buffer:', error)
      alert('Ошибка при сохранении')
    } finally {
      setLoading(false)
    }
  }

  // Сохранение поставщика
  const saveSupplier = async () => {
    const productName = (document.getElementById('supplierProductName') as HTMLInputElement)?.value
    const supplierName = (document.getElementById('supplierName') as HTMLInputElement)?.value
    const deliveryDays = parseInt((document.getElementById('deliveryDays') as HTMLInputElement)?.value || '1')
    const price = parseInt((document.getElementById('price') as HTMLInputElement)?.value || '0') || null
    const productId = (document.getElementById('supplierProductId') as HTMLInputElement)?.value || `prod_${Date.now()}`
    const supplierId = (document.getElementById('supplierIdInput') as HTMLInputElement)?.value || `supp_${Date.now()}`
    const isPrimary = (document.getElementById('isPrimary') as HTMLInputElement)?.checked || false
    const priority = parseInt((document.getElementById('priority') as HTMLInputElement)?.value || '1')

    if (!productName || !supplierName) {
      alert('Укажите название продукта и поставщика')
      return
    }

    try {
      setLoading(true)
      const url = editingSupplier 
        ? `${API_BASE}/api/purchasing/product-suppliers/${editingSupplier.id}`
        : `${API_BASE}/api/purchasing/product-suppliers`
      
      const method = editingSupplier ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          productName,
          supplierId,
          isPrimary,
          priority,
          deliveryDays,
          price,
          unit: 'кг',
          isActive: true
        })
      })

      if (response.ok) {
        setShowSupplierForm(false)
        setEditingSupplier(null)
        // Перезагружаем данные
        const suppliersRes = await fetch(`${API_BASE}/api/purchasing/product-suppliers`, { credentials: 'include' })
        if (suppliersRes.ok) {
          const data = await suppliersRes.json()
          setProductSuppliers(data.productSuppliers || [])
        }
      } else {
        const error = await response.json()
        alert(`Ошибка: ${error.error || 'Не удалось сохранить'}`)
      }
    } catch (error) {
      console.error('Error saving supplier:', error)
      alert('Ошибка при сохранении')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
      <TabsList className="grid w-full grid-cols-6">
        <TabsTrigger value="calculate" className="flex items-center gap-2">
          <Calculator className="h-4 w-4" />
          Расчет
        </TabsTrigger>
        <TabsTrigger value="stocks" className="flex items-center gap-2">
          <Package className="h-4 w-4" />
          Ингредиенты
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
                  <THead>
                    <TR>
                      <TH>Продукт</TH>
                      <TH>Поставщик</TH>
                      <TH>Расход/нед</TH>
                      <TH>Буфер</TH>
                      <TH>Остаток</TH>
                      <TH>К заказу</TH>
                      <TH>Цена</TH>
                      <TH>Сумма</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {calculations.map((calc) => (
                      <TR key={`${calc.productId}-${calc.supplierId}`}>
                        <TD className="font-medium">{calc.productName}</TD>
                        <TD>
                          <div className="flex items-center gap-2">
                            {calc.supplierName}
                            {calc.isPrimarySupplier && (
                              <Badge variant="default" className="text-xs">Основной</Badge>
                            )}
                          </div>
                        </TD>
                        <TD>{calc.weeklyConsumption.toFixed(1)} {calc.unit}</TD>
                        <TD>{calc.bufferStock.toFixed(1)} {calc.unit}</TD>
                        <TD>{calc.currentStock.toFixed(1)} {calc.unit}</TD>
                        <TD className="font-semibold text-green-600">
                          {calc.orderQuantity.toFixed(1)} {calc.unit}
                        </TD>
                        <TD>
                          {calc.price ? formatCurrency(calc.price) : '—'}
                        </TD>
                        <TD className="font-semibold">
                          {calc.totalAmount ? formatCurrency(calc.totalAmount) : '—'}
                        </TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* Ингредиенты */}
      <TabsContent value="stocks" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Ингредиенты</CardTitle>
            <CardDescription>
              Список всех ингредиентов из iiko с возможностью настройки поставщиков
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {ingredients.length > 0 && (
              <div className="flex justify-between items-center">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (selectedIngredients.size === ingredients.length) {
                        setSelectedIngredients(new Set())
                      } else {
                        setSelectedIngredients(new Set(ingredients.map(i => i.productId)))
                      }
                    }}
                  >
                    {selectedIngredients.size === ingredients.length ? 'Снять всё' : 'Выбрать всё'}
                  </Button>
                  {selectedIngredients.size > 0 && (
                    <Button
                      onClick={() => setShowBulkSuppliersDialog(true)}
                    >
                      <Users className="h-4 w-4 mr-2" />
                      Назначить поставщиков ({selectedIngredients.size})
                    </Button>
                  )}
                </div>
              </div>
            )}
            
            <Table>
              <THead>
                <TR>
                  <TH className="w-12">
                    <input
                      type="checkbox"
                      checked={selectedIngredients.size === ingredients.length && ingredients.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedIngredients(new Set(ingredients.map(i => i.productId)))
                        } else {
                          setSelectedIngredients(new Set())
                        }
                      }}
                      className="w-4 h-4"
                    />
                  </TH>
                  <TH>Ингредиент</TH>
                  <TH>Общий остаток</TH>
                  <TH>Поставщики</TH>
                  <TH>Действия</TH>
                </TR>
              </THead>
              <TBody>
                {ingredients.map((ingredient) => {
                  const ingredientSuppliers = productSuppliers.filter(
                    ps => ps.productId === ingredient.productId
                  )
                  const primarySupplier = ingredientSuppliers.find(ps => ps.isPrimary)
                  const isSelected = selectedIngredients.has(ingredient.productId)
                  
                  return (
                    <TR key={ingredient.productId} className={isSelected ? 'bg-blue-50' : ''}>
                      <TD>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            const newSet = new Set(selectedIngredients)
                            if (e.target.checked) {
                              newSet.add(ingredient.productId)
                            } else {
                              newSet.delete(ingredient.productId)
                            }
                            setSelectedIngredients(newSet)
                          }}
                          className="w-4 h-4"
                        />
                      </TD>
                      <TD className="font-medium">{ingredient.productName}</TD>
                      <TD>{ingredient.totalStock.toFixed(1)}</TD>
                      <TD>
                        {ingredientSuppliers.length === 0 ? (
                          <Badge variant="outline">Не настроено</Badge>
                        ) : (
                          <div className="flex gap-2 flex-wrap">
                            {primarySupplier && (
                              <Badge variant="default">{primarySupplier.supplier.name}</Badge>
                            )}
                            {ingredientSuppliers.filter(ps => !ps.isPrimary).length > 0 && (
                              <Badge variant="secondary">
                                +{ingredientSuppliers.filter(ps => !ps.isPrimary).length} запасных
                              </Badge>
                            )}
                          </div>
                        )}
                      </TD>
                      <TD>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            setSelectedIngredient(ingredient)
                            setShowSuppliersDialog(true)
                          }}
                        >
                          <Users className="h-4 w-4 mr-2" />
                          Настроить поставщиков
                        </Button>
                      </TD>
                    </TR>
                  )
                })}
              </TBody>
            </Table>

            {ingredients.length === 0 && !loading && (
              <div className="text-center py-8 text-muted-foreground">
                Нет данных об ингредиентах. Попробуйте обновить страницу.
              </div>
            )}
            
            {loading && (
              <div className="text-center py-8 text-muted-foreground">
                Загрузка ингредиентов...
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
              Автоматический расчет буферов на основе статистики расхода
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <Button
                onClick={async () => {
                  if (!confirm('Пересчитать буферы для всех ингредиентов? Это может занять несколько минут.')) return
                  
                  setLoading(true)
                  try {
                    const res = await fetch(`${API_BASE}/api/purchasing/buffers-calc/recalculate-all`, {
                      method: 'POST',
                      credentials: 'include'
                    })
                    
                    if (res.ok) {
                      const data = await res.json()
                      alert(data.message)
                      loadData()
                    } else {
                      alert('Ошибка при пересчете буферов')
                    }
                  } catch (error) {
                    console.error('Error recalculating buffers:', error)
                    alert('Ошибка при пересчете буферов')
                  } finally {
                    setLoading(false)
                  }
                }}
                disabled={loading}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                {loading ? 'Пересчет...' : 'Пересчитать буферы'}
              </Button>
            </div>

            <Table>
              <THead>
                <TR>
                  <TH>Продукт</TH>
                  <TH>Авто-буфер</TH>
                  <TH>Ручная корректировка</TH>
                  <TH>Итоговый буфер</TH>
                  <TH>Единицы</TH>
                  <TH>Действия</TH>
                </TR>
              </THead>
              <TBody>
                {buffers.map((buffer) => (
                  <TR key={buffer.id}>
                    <TD className="font-medium">{buffer.productName}</TD>
                    <TD>{buffer.autoBuffer.toFixed(1)}</TD>
                    <TD>
                      {buffer.manualBuffer !== null && buffer.manualBuffer !== undefined 
                        ? buffer.manualBuffer.toFixed(1) 
                        : '—'}
                    </TD>
                    <TD className="font-semibold">
                      {(buffer.manualBuffer !== null && buffer.manualBuffer !== undefined 
                        ? buffer.manualBuffer 
                        : buffer.autoBuffer).toFixed(1)}
                    </TD>
                    <TD>{buffer.unit}</TD>
                    <TD>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            setSelectedBufferProduct({ id: buffer.productId, name: buffer.productName })
                            setShowBufferChart(true)
                          }}
                        >
                          <BarChart3 className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => {
                            const newValue = prompt(
                              `Ручная корректировка буфера для "${buffer.productName}".\nАвто-буфер: ${buffer.autoBuffer.toFixed(1)} ${buffer.unit}\nВведите новое значение (или оставьте пустым для использования авто-буфера):`,
                              buffer.manualBuffer?.toString() || ''
                            )
                            
                            if (newValue === null) return
                            
                            const manualBuffer = newValue.trim() === '' ? null : parseFloat(newValue)
                            
                            fetch(`${API_BASE}/api/purchasing/buffers-calc/${buffer.id}`, {
                              method: 'PATCH',
                              credentials: 'include',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ manualBuffer })
                            }).then(() => {
                              loadData()
                            })
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>

            {buffers.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                Нет данных о буферах. Нажмите "Пересчитать буферы" для автоматического расчета.
              </div>
            )}
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
              <Button onClick={addSupplier}>
                <Plus className="h-4 w-4 mr-2" />
                Добавить поставщика
              </Button>
            </div>

            <Table>
              <THead>
                <TR>
                  <TH>Продукт</TH>
                  <TH>Поставщик</TH>
                  <TH>Тип</TH>
                  <TH>Приоритет</TH>
                  <TH>Дни доставки</TH>
                  <TH>Цена</TH>
                  <TH>Статус</TH>
                  <TH>Действия</TH>
                </TR>
              </THead>
              <TBody>
                {productSuppliers.map((ps) => (
                  <TR key={ps.id}>
                    <TD className="font-medium">{ps.productName}</TD>
                    <TD>{ps.supplier.name}</TD>
                    <TD>
                      <Badge variant={ps.isPrimary ? 'default' : 'secondary'}>
                        {ps.isPrimary ? 'Основной' : 'Запасной'}
                      </Badge>
                    </TD>
                    <TD>{ps.priority}</TD>
                    <TD>{ps.deliveryDays} дней</TD>
                    <TD>
                      {ps.price ? formatCurrency(ps.price) : '—'}
                    </TD>
                    <TD>
                      <Badge variant={ps.isActive ? 'default' : 'secondary'}>
                        {ps.isActive ? 'Активен' : 'Неактивен'}
                      </Badge>
                    </TD>
                    <TD>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => editSupplier(ps)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => deleteSupplier(ps.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TD>
                  </TR>
                ))}
              </TBody>
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
              <THead>
                <TR>
                  <TH>Дата заказа</TH>
                  <TH>Поставщик</TH>
                  <TH>Статус</TH>
                  <TH>Сумма</TH>
                  <TH>Позиций</TH>
                  <TH>Действия</TH>
                </TR>
              </THead>
              <TBody>
                {orders.map((order) => (
                  <TR key={order.id}>
                    <TD>
                      {new Date(order.orderDate).toLocaleDateString('ru-RU')}
                    </TD>
                    <TD className="font-medium">{order.supplier.name}</TD>
                    <TD>{getStatusBadge(order.status)}</TD>
                    <TD className="font-semibold">
                      {formatCurrency(order.totalAmount)}
                    </TD>
                    <TD>{order.items.length}</TD>
                    <TD>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </TD>
                  </TR>
                ))}
              </TBody>
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

    {/* Модальное окно для буферов */}
    <Dialog open={showBufferForm} onOpenChange={setShowBufferForm}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {editingBuffer ? 'Редактировать буферный запас' : 'Добавить буферный запас'}
          </DialogTitle>
          <DialogDescription>
            {editingBuffer ? 'Измените параметры буферного запаса' : 'Создайте новый буферный запас для продукта'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <input type="hidden" id="productId" defaultValue={editingBuffer?.productId || ''} />
          <div>
            <Label htmlFor="productName">Название продукта</Label>
            <Input 
              id="productName" 
              placeholder="Введите название продукта"
              defaultValue={editingBuffer?.productName || ''}
            />
          </div>
          <div>
            <Label htmlFor="bufferDays">Дни буфера</Label>
            <Input 
              id="bufferDays" 
              type="number" 
              placeholder="7"
              defaultValue={editingBuffer?.bufferDays || 7}
            />
          </div>
          <div>
            <Label htmlFor="minBuffer">Минимальный буфер</Label>
            <Input 
              id="minBuffer" 
              type="number" 
              step="0.1"
              placeholder="0"
              defaultValue={editingBuffer?.minBuffer || 0}
            />
          </div>
          <div>
            <Label htmlFor="maxBuffer">Максимальный буфер (опционально)</Label>
            <Input 
              id="maxBuffer" 
              type="number" 
              step="0.1"
              placeholder="Не указан"
              defaultValue={editingBuffer?.maxBuffer || ''}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowBufferForm(false)} disabled={loading}>
            Отмена
          </Button>
          <Button onClick={saveBuffer} disabled={loading}>
            {loading ? 'Сохранение...' : (editingBuffer ? 'Сохранить' : 'Создать')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Модальное окно для поставщиков */}
    <Dialog open={showSupplierForm} onOpenChange={setShowSupplierForm}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {editingSupplier ? 'Редактировать поставщика' : 'Добавить поставщика'}
          </DialogTitle>
          <DialogDescription>
            {editingSupplier ? 'Измените параметры поставщика' : 'Создайте новую связь продукт-поставщик'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <input type="hidden" id="supplierProductId" defaultValue={editingSupplier?.productId || ''} />
          <input type="hidden" id="supplierIdInput" defaultValue={editingSupplier?.supplierId || ''} />
          <div>
            <Label htmlFor="supplierProductName">Название продукта</Label>
            <Input 
              id="supplierProductName" 
              placeholder="Введите название продукта"
              defaultValue={editingSupplier?.productName || ''}
            />
          </div>
          <div>
            <Label htmlFor="supplierName">Название поставщика</Label>
            <Input 
              id="supplierName" 
              placeholder="Введите название поставщика"
              defaultValue={editingSupplier?.supplier.name || ''}
            />
          </div>
          <div className="flex items-center space-x-2">
            <input 
              type="checkbox" 
              id="isPrimary" 
              defaultChecked={editingSupplier?.isPrimary || false}
              className="w-4 h-4"
            />
            <Label htmlFor="isPrimary">Основной поставщик</Label>
          </div>
          <div>
            <Label htmlFor="priority">Приоритет (для запасных)</Label>
            <Input 
              id="priority" 
              type="number" 
              placeholder="1"
              defaultValue={editingSupplier?.priority || 1}
            />
          </div>
          <div>
            <Label htmlFor="deliveryDays">Дни доставки</Label>
            <Input 
              id="deliveryDays" 
              type="number" 
              placeholder="1"
              defaultValue={editingSupplier?.deliveryDays || 1}
            />
          </div>
          <div>
            <Label htmlFor="price">Цена за единицу (копейки)</Label>
            <Input 
              id="price" 
              type="number" 
              placeholder="0"
              defaultValue={editingSupplier?.price || ''}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowSupplierForm(false)} disabled={loading}>
            Отмена
          </Button>
          <Button onClick={saveSupplier} disabled={loading}>
            {loading ? 'Сохранение...' : (editingSupplier ? 'Сохранить' : 'Создать')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Модальное окно для управления поставщиками ингредиента */}
    <Dialog open={showSuppliersDialog} onOpenChange={setShowSuppliersDialog}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Настройка поставщиков для: {selectedIngredient?.productName}
          </DialogTitle>
          <DialogDescription>
            Выберите поставщиков для этого ингредиента и укажите основного
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Текущие поставщики */}
          <div>
            <h3 className="font-semibold mb-2">Текущие поставщики:</h3>
            {selectedIngredient && productSuppliers
              .filter(ps => ps.productId === selectedIngredient.productId)
              .length === 0 && (
              <p className="text-sm text-muted-foreground">Поставщики не назначены</p>
            )}
            <div className="space-y-2">
              {selectedIngredient && productSuppliers
                .filter(ps => ps.productId === selectedIngredient.productId)
                .map((ps) => (
                  <div key={ps.id} className="flex items-center justify-between border rounded p-3">
                    <div className="flex items-center gap-3">
                      <span className="font-medium">{ps.supplier.name}</span>
                      {ps.isPrimary && (
                        <Badge variant="default">Основной</Badge>
                      )}
                      {!ps.isPrimary && (
                        <Badge variant="secondary">Приоритет: {ps.priority}</Badge>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          // Сделать основным
                          const updatedSuppliers = productSuppliers.map(s => 
                            s.productId === selectedIngredient.productId
                              ? { ...s, isPrimary: s.id === ps.id }
                              : s
                          )
                          // TODO: сохранить изменения через API
                        }}
                        disabled={ps.isPrimary}
                      >
                        Сделать основным
                      </Button>
                      <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={() => deleteSupplier(ps.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Добавить нового поставщика */}
          <div>
            <h3 className="font-semibold mb-2">Добавить поставщика:</h3>
            <div className="space-y-3">
              <div>
                <Label>Выберите поставщика *</Label>
                <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите контрагента-поставщика" />
                  </SelectTrigger>
                  <SelectContent>
                    {counterparties.length === 0 ? (
                      <div className="px-2 py-1.5 text-sm text-gray-500">Загрузка...</div>
                    ) : (
                      counterparties.map((cp) => (
                        <SelectItem key={cp.id} value={cp.id}>
                          {cp.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {counterparties.length > 0 && (
                  <p className="text-xs text-gray-500 mt-1">Доступно поставщиков: {counterparties.length}</p>
                )}
              </div>
              
              <div className="flex items-center space-x-2">
                <input 
                  type="checkbox" 
                  id="newSupplierIsPrimary" 
                  className="w-4 h-4"
                />
                <Label htmlFor="newSupplierIsPrimary">Сделать основным поставщиком</Label>
              </div>
              <Button 
                onClick={async () => {
                  if (!selectedIngredient) return
                  
                  if (!selectedSupplierId) {
                    alert('Выберите поставщика')
                    return
                  }
                  
                  const isPrimary = (document.getElementById('newSupplierIsPrimary') as HTMLInputElement)?.checked || false

                  try {
                    setLoading(true)
                    const response = await fetch(`${API_BASE}/api/purchasing/product-suppliers`, {
                      method: 'POST',
                      credentials: 'include',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        productId: selectedIngredient.productId,
                        productName: selectedIngredient.productName,
                        supplierId: selectedSupplierId,
                        isPrimary,
                        priority: 1,
                        deliveryDays: 1,
                        price: null,
                        unit: 'кг',
                        isActive: true
                      })
                    })

                    if (response.ok) {
                      // Перезагружаем данные и очищаем форму
                      await loadData()
                      setSelectedSupplierId('')
                    } else {
                      const error = await response.json()
                      alert(`Ошибка: ${error.error || 'Не удалось добавить поставщика'}`)
                    }
                  } catch (error) {
                    console.error('Error adding supplier:', error)
                    alert('Ошибка при добавлении поставщика')
                  } finally {
                    setLoading(false)
                  }
                }}
                disabled={loading}
              >
                <Plus className="h-4 w-4 mr-2" />
                Добавить поставщика
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setShowSuppliersDialog(false)}>
            Закрыть
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Модальное окно для массового назначения поставщиков */}
    <Dialog open={showBulkSuppliersDialog} onOpenChange={setShowBulkSuppliersDialog}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Массовое назначение поставщика
          </DialogTitle>
          <DialogDescription>
            Назначить поставщика для {selectedIngredients.size} ингредиентов
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label>Выберите поставщика *</Label>
            <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите контрагента-поставщика" />
              </SelectTrigger>
              <SelectContent>
                {counterparties.length === 0 ? (
                  <div className="px-2 py-1.5 text-sm text-gray-500">Загрузка...</div>
                ) : (
                  counterparties.map((cp) => (
                    <SelectItem key={cp.id} value={cp.id}>
                      {cp.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {counterparties.length > 0 && (
              <p className="text-xs text-gray-500 mt-1">Доступно поставщиков: {counterparties.length}</p>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <input 
              type="checkbox" 
              id="bulkIsPrimary" 
              className="w-4 h-4"
              defaultChecked={true}
            />
            <Label htmlFor="bulkIsPrimary">Сделать основным поставщиком для всех</Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setShowBulkSuppliersDialog(false)}>
            Отмена
          </Button>
          <Button 
            onClick={async () => {
              if (!selectedSupplierId) {
                alert('Выберите поставщика')
                return
              }
              
              const isPrimary = (document.getElementById('bulkIsPrimary') as HTMLInputElement)?.checked || false

              try {
                setLoading(true)
                let successCount = 0
                let errorCount = 0
                
                for (const productId of selectedIngredients) {
                  const ingredient = ingredients.find(i => i.productId === productId)
                  if (!ingredient) continue
                  
                  try {
                    const response = await fetch(`${API_BASE}/api/purchasing/product-suppliers`, {
                      method: 'POST',
                      credentials: 'include',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        productId: ingredient.productId,
                        productName: ingredient.productName,
                        supplierId: selectedSupplierId,
                        isPrimary,
                        priority: 1,
                        deliveryDays: 1,
                        price: null,
                        unit: 'кг',
                        isActive: true
                      })
                    })

                    if (response.ok) {
                      successCount++
                    } else {
                      errorCount++
                    }
                  } catch (error) {
                    errorCount++
                  }
                }

                alert(`Готово! Успешно: ${successCount}, Ошибок: ${errorCount}`)
                await loadData()
                setSelectedIngredients(new Set())
                setSelectedSupplierId('')
                setShowBulkSuppliersDialog(false)
              } catch (error) {
                console.error('Error bulk assigning suppliers:', error)
                alert('Ошибка при назначении поставщиков')
              } finally {
                setLoading(false)
              }
            }}
            disabled={loading}
          >
            {loading ? 'Назначение...' : 'Назначить поставщика'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Модальное окно с графиком буфера */}
    {selectedBufferProduct && (
      <BufferChartDialog
        open={showBufferChart}
        onOpenChange={setShowBufferChart}
        productId={selectedBufferProduct.id}
        productName={selectedBufferProduct.name}
      />
    )}
    </>
  )
}
