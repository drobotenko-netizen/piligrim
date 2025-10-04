"use client"
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import SalesLineChart from './SalesLineChart'
import WeekdayLabels from './WeekdayLabels'
import { ChartPoint } from './utils'

type Props = {
  activeTab: string
  setActiveTab: (v: string) => void
  displayMode: 'sales' | 'receipts'
  setDisplayMode: (v: 'sales' | 'receipts') => void
  chartData: ChartPoint[]
  byWeekday: boolean
  year1: number
  month1: number
  year2: number
  month2: number
  onSavePng: () => void
}

export default function ChartArea({ activeTab, setActiveTab, displayMode, setDisplayMode, chartData, byWeekday, year1, month1, year2, month2, onSavePng }: Props) {
  return (
    <div className="rounded-lg border p-4" id="chart-container">
      <div className="flex justify-between items-center mb-4">
        <div className="flex gap-6">
          <Tabs value={displayMode} onValueChange={(value) => setDisplayMode(value as 'sales' | 'receipts')} className="w-auto">
            <TabsList className="grid w-auto grid-cols-2">
              <TabsTrigger value="sales">Продажи</TabsTrigger>
              <TabsTrigger value="receipts">Чеки</TabsTrigger>
            </TabsList>
          </Tabs>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-auto">
            <TabsList className="grid w-auto grid-cols-4">
              <TabsTrigger value="revenue">Выручка</TabsTrigger>
              <TabsTrigger value="returns">Возвраты</TabsTrigger>
              <TabsTrigger value="deleted">Удалённые</TabsTrigger>
              <TabsTrigger value="total">Всего</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <div className="relative">
          <button onClick={onSavePng} className="p-2 hover:bg-gray-100 rounded-full" title="Сохранить PNG">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="1" />
              <circle cx="19" cy="12" r="1" />
              <circle cx="5" cy="12" r="1" />
            </svg>
          </button>
        </div>
      </div>

      <Tabs value={displayMode} onValueChange={(value) => setDisplayMode(value as 'sales' | 'receipts')}>
        <TabsContent value="sales" className="mt-0">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsContent value="revenue" className="mt-0">
              <SalesLineChart chartData={chartData} byWeekday={byWeekday} displayMode={displayMode} year1={year1} month1={month1} year2={year2} month2={month2} />
              {byWeekday && (
                <div style={{ marginTop: '-10px' }}>
                  <WeekdayLabels chartData={chartData} />
                </div>
              )}
            </TabsContent>
            <TabsContent value="returns" className="mt-0">
              <SalesLineChart chartData={chartData} byWeekday={byWeekday} displayMode={displayMode} year1={year1} month1={month1} year2={year2} month2={month2} />
              {byWeekday && (
                <div style={{ marginTop: '-10px' }}>
                  <WeekdayLabels chartData={chartData} />
                </div>
              )}
            </TabsContent>
            <TabsContent value="deleted" className="mt-0">
              <SalesLineChart chartData={chartData} byWeekday={byWeekday} displayMode={displayMode} year1={year1} month1={month1} year2={year2} month2={month2} />
              {byWeekday && (
                <div style={{ marginTop: '-10px' }}>
                  <WeekdayLabels chartData={chartData} />
                </div>
              )}
            </TabsContent>
            <TabsContent value="total" className="mt-0">
              <SalesLineChart chartData={chartData} byWeekday={byWeekday} displayMode={displayMode} year1={year1} month1={month1} year2={year2} month2={month2} />
              {byWeekday && (
                <div style={{ marginTop: '-10px' }}>
                  <WeekdayLabels chartData={chartData} />
                </div>
              )}
            </TabsContent>
          </Tabs>
        </TabsContent>
        <TabsContent value="receipts" className="mt-0">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsContent value="revenue" className="mt-0">
              <SalesLineChart chartData={chartData} byWeekday={byWeekday} displayMode={displayMode} year1={year1} month1={month1} year2={year2} month2={month2} />
              {byWeekday && (
                <div style={{ marginTop: '-10px' }}>
                  <WeekdayLabels chartData={chartData} />
                </div>
              )}
            </TabsContent>
            <TabsContent value="returns" className="mt-0">
              <SalesLineChart chartData={chartData} byWeekday={byWeekday} displayMode={displayMode} year1={year1} month1={month1} year2={year2} month2={month2} />
              {byWeekday && (
                <div style={{ marginTop: '-10px' }}>
                  <WeekdayLabels chartData={chartData} />
                </div>
              )}
            </TabsContent>
            <TabsContent value="deleted" className="mt-0">
              <SalesLineChart chartData={chartData} byWeekday={byWeekday} displayMode={displayMode} year1={year1} month1={month1} year2={year2} month2={month2} />
              {byWeekday && (
                <div style={{ marginTop: '-10px' }}>
                  <WeekdayLabels chartData={chartData} />
                </div>
              )}
            </TabsContent>
            <TabsContent value="total" className="mt-0">
              <SalesLineChart chartData={chartData} byWeekday={byWeekday} displayMode={displayMode} year1={year1} month1={month1} year2={year2} month2={month2} />
              {byWeekday && (
                <div style={{ marginTop: '-10px' }}>
                  <WeekdayLabels chartData={chartData} />
                </div>
              )}
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>
    </div>
  )
}


