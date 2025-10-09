"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Calculator, Package, Users, Calendar, BarChart3, ShoppingCart } from 'lucide-react'
import { usePurchasingData } from '../hooks/usePurchasingData'

export default function PurchasingClient() {
  const { 
    calculations, 
    stocks, 
    buffers, 
    productSuppliers, 
    orders, 
    ingredients,
    counterparties,
    loading,
    refetch 
  } = usePurchasingData()

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Закупки</h1>
        <p className="text-muted-foreground">
          Управление закупками, поставщиками, буферными запасами и заказами
        </p>
      </div>

      <Tabs defaultValue="calculate" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="calculate">
            <Calculator className="h-4 w-4 mr-2" />
            Расчет заказов
          </TabsTrigger>
          <TabsTrigger value="stocks">
            <Package className="h-4 w-4 mr-2" />
            Ингредиенты ({ingredients.length})
          </TabsTrigger>
          <TabsTrigger value="buffers">
            <BarChart3 className="h-4 w-4 mr-2" />
            Буферы ({buffers.length})
          </TabsTrigger>
          <TabsTrigger value="suppliers">
            <Users className="h-4 w-4 mr-2" />
            Поставщики ({productSuppliers.length})
          </TabsTrigger>
          <TabsTrigger value="orders">
            <ShoppingCart className="h-4 w-4 mr-2" />
            Заказы ({orders.length})
          </TabsTrigger>
          <TabsTrigger value="reports">
            <Calendar className="h-4 w-4 mr-2" />
            Отчеты
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calculate">
          <div className="text-muted-foreground">Расчет заказов - TODO: вынести в отдельный компонент</div>
        </TabsContent>

        <TabsContent value="stocks">
          <div className="text-muted-foreground">Ингредиенты ({ingredients.length})</div>
        </TabsContent>

        <TabsContent value="buffers">
          <div className="text-muted-foreground">Буферы ({buffers.length})</div>
        </TabsContent>

        <TabsContent value="suppliers">
          <div className="text-muted-foreground">Поставщики ({productSuppliers.length})</div>
        </TabsContent>

        <TabsContent value="orders">
          <div className="text-muted-foreground">Заказы ({orders.length})</div>
        </TabsContent>

        <TabsContent value="reports">
          <div className="text-muted-foreground">Отчеты - TODO</div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

