'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Bar, ComposedChart } from 'recharts'
import { getApiBase } from '@/lib/api'

interface BufferChartDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  productId: string
  productName: string
}

export default function BufferChartDialog({ open, onOpenChange, productId, productName }: BufferChartDialogProps) {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<any>(null)
  const API_BASE = getApiBase()

  useEffect(() => {
    if (open && productId) {
      loadChartData()
    }
  }, [open, productId])

  const loadChartData = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/purchasing/buffers-calc/calculate/${productId}`, {
        credentials: 'include'
      })

      if (res.ok) {
        const chartData = await res.json()
        setData(chartData)
      }
    } catch (error) {
      console.error('Error loading chart data:', error)
    } finally {
      setLoading(false)
    }
  }

  const chartDataFormatted = data?.dailyConsumption?.map((day: any, index: number) => {
    const windowData = data.windowSums?.find((w: any) => w.date === day.date)
    return {
      date: new Date(day.date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }),
      consumption: day.consumption,
      windowSum: windowData?.windowSum || null
    }
  }) || []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>График расхода: {productName}</DialogTitle>
          <DialogDescription>
            Анализ расхода за {data?.analysisWindowDays || 30} дней с окном закупа {data?.purchaseWindowDays || 3} дней
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="py-8 text-center text-gray-500">
            Загрузка данных...
          </div>
        )}

        {!loading && data && (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-sm text-blue-600 font-medium">Автоматический буфер</div>
                <div className="text-2xl font-bold text-blue-900">{data.autoBuffer?.toFixed(1)} кг</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-sm text-green-600 font-medium">Окно закупа</div>
                <div className="text-2xl font-bold text-green-900">{data.purchaseWindowDays} дней</div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="text-sm text-purple-600 font-medium">Срок анализа</div>
                <div className="text-2xl font-bold text-purple-900">{data.analysisWindowDays} дней</div>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold mb-2">Как читать график:</h4>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• <span className="text-blue-600 font-medium">Синие столбики</span> — ежедневный расход</li>
                <li>• <span className="text-orange-600 font-medium">Оранжевая линия</span> — скользящая сумма за окно закупа ({data.purchaseWindowDays} дней)</li>
                <li>• Буфер = максимальное значение оранжевой линии ({data.maxWindowSum?.toFixed(1)} кг)</li>
              </ul>
            </div>

            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartDataFormatted}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis label={{ value: 'Количество (кг)', angle: -90, position: 'insideLeft' }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="consumption" fill="#3b82f6" name="Расход за день" />
                  <Line 
                    type="monotone" 
                    dataKey="windowSum" 
                    stroke="#f97316" 
                    strokeWidth={2}
                    name={`Скользящая сумма (${data.purchaseWindowDays} дней)`}
                    dot={{ r: 3 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {!loading && !data && (
          <div className="py-8 text-center text-gray-500">
            Нет данных для отображения
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

