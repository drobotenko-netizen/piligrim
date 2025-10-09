'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Save } from 'lucide-react'
import { useApi } from '@/hooks/use-api'
import { api } from '@/lib/api-client'

interface Settings {
  id: string
  purchaseWindowDays: number
  analysisWindowDays: number
}

export default function PurchasingSettingsClient() {
  const { data, loading, refetch } = useApi<{ settings: Settings }>('/api/purchasing/settings')
  const [saving, setSaving] = useState(false)
  const [purchaseWindowDays, setPurchaseWindowDays] = useState(3)
  const [analysisWindowDays, setAnalysisWindowDays] = useState(30)

  useEffect(() => {
    if (data?.settings) {
      setPurchaseWindowDays(data.settings.purchaseWindowDays)
      setAnalysisWindowDays(data.settings.analysisWindowDays)
    }
  }, [data])

  const saveSettings = async () => {
    setSaving(true)
    try {
      await api.patch('/api/purchasing/settings', {
        purchaseWindowDays,
        analysisWindowDays
      })
      await refetch()
      alert('Настройки сохранены!')
    } catch (error) {
      console.error('Error saving settings:', error)
      alert('Ошибка при сохранении настроек')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="p-8">Загрузка настроек...</div>
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Настройки закупок</h1>
        <p className="text-gray-600 mt-1">
          Параметры для автоматического расчета буферных запасов
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Параметры анализа</CardTitle>
          <CardDescription>
            Настройки для расчета буферных запасов на основе истории расходов
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="purchaseWindow">
              Окно закупа (дней)
            </Label>
            <Input
              id="purchaseWindow"
              type="number"
              min="1"
              max="30"
              value={purchaseWindowDays}
              onChange={(e) => setPurchaseWindowDays(parseInt(e.target.value) || 1)}
            />
            <p className="text-sm text-gray-500">
              Период между заказами. Например, если заказы делаются каждые 3 дня, то укажите 3.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="analysisWindow">
              Срок анализа (дней)
            </Label>
            <Input
              id="analysisWindow"
              type="number"
              min="7"
              max="365"
              value={analysisWindowDays}
              onChange={(e) => setAnalysisWindowDays(parseInt(e.target.value) || 7)}
            />
            <p className="text-sm text-gray-500">
              За какой период анализировать историю расходов для расчета буфера. Рекомендуется 30-60 дней.
            </p>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-semibold text-blue-900 mb-2">Как работает расчет:</h4>
            <p className="text-sm text-blue-800">
              Система анализирует расход каждого ингредиента за последние <strong>{analysisWindowDays} дней</strong>.
              Для каждого окна в <strong>{purchaseWindowDays} дней</strong> рассчитывается суммарный расход.
              Буфер устанавливается равным максимальному расходу за такое окно.
              Это гарантирует, что запаса хватит на период между заказами даже в пиковые дни.
            </p>
          </div>

          <Button onClick={saveSettings} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Сохранение...' : 'Сохранить настройки'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

