import { Suspense } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Calculator, Package, Users, Calendar, BarChart3 } from 'lucide-react'
import PurchasingClient from './ui/PurchasingClient'

export default function PurchasingPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Система закупа</h1>
          <p className="text-muted-foreground">
            Автоматический расчет и формирование заказов поставщикам
          </p>
        </div>
      </div>

      <Suspense fallback={<div>Загрузка...</div>}>
        <PurchasingClient />
      </Suspense>
    </div>
  )
}
