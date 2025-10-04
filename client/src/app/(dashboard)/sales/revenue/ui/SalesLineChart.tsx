"use client"
import { ResponsiveContainer, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, ReferenceArea, Line } from 'recharts'
import WeekdayLabels from './WeekdayLabels'
import { ChartPoint, formatNumber, getWeekdayName, getWeekendAreas } from './utils'

type Props = {
  chartData: ChartPoint[]
  byWeekday: boolean
  displayMode: 'sales' | 'receipts'
  year1: number
  month1: number
  year2: number
  month2: number
}

export default function SalesLineChart({ chartData, byWeekday, displayMode, year1, month1, year2, month2 }: Props) {
  const areas = getWeekendAreas(chartData, byWeekday)
  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#9ca3af" strokeWidth={1} vertical={true} horizontal={true} />
          {byWeekday ? (
            <XAxis
              dataKey="day"
              type="number"
              domain={[1, (chartData && chartData.length) ? chartData.length : 'dataMax']}
              allowDecimals={false}
              tick={{ fill: 'transparent' }}
              height={20}
            />
          ) : (
            <XAxis
              dataKey="day"
              interval={0}
              tick={true}
              height={30}
            />
          )}
          <YAxis tickFormatter={(value) => formatNumber(value)} tick={{ fontSize: 12 }} />
          <Tooltip
            formatter={(value: any, name: string, props: any) => {
              if (value === null) return null
              const month1Name = new Date(Date.UTC(year1, month1 - 1)).toLocaleDateString('ru-RU', { month: 'long' })
              const month2Name = new Date(Date.UTC(year2, month2 - 1)).toLocaleDateString('ru-RU', { month: 'long' })
              const unit = displayMode === 'sales' ? '₽' : 'чеков'
              if (byWeekday) {
                const payload = props.payload
                const weekday = name === 'month1' ? payload.weekdayMonth1 : payload.weekdayMonth2
                const date = name === 'month1' ? payload.dateMonth1 : payload.dateMonth2
                return [
                  `${formatNumber(value)} ${unit} (${date}, ${getWeekdayName(weekday)})`,
                  name === 'month1' ? `${month1Name} ${year1}` : `${month2Name} ${year2}`,
                ]
              } else {
                return [
                  `${formatNumber(value)} ${unit}`,
                  name === 'month1' ? `${month1Name} ${year1}` : `${month2Name} ${year2}`,
                ]
              }
            }}
            labelFormatter={(label) => String(label).padStart(2, '0')}
          />
          {areas.map((area, index) => (
            <ReferenceArea key={`weekend-${index}`} x1={area.x1} x2={area.x2} fill={area.fill} fillOpacity={area.fillOpacity} />
          ))}
          <Line
            type="monotone"
            dataKey="month1"
            stroke="#374151"
            strokeWidth={2}
            name="month1"
            connectNulls={false}
            dot={(props: any) => {
              if (props.payload.month1 === null) return <g key={`month1-${props.index}`} />
              return <circle key={`month1-${props.index}`} cx={props.cx} cy={props.cy} r={3} fill="#374151" />
            }}
          />
          <Line
            type="monotone"
            dataKey="month2"
            stroke="#f97316"
            strokeWidth={2}
            name="month2"
            connectNulls={false}
            dot={(props: any) => {
              if (props.payload.month2 === null) return <g key={`month2-${props.index}`} />
              return <circle key={`month2-${props.index}`} cx={props.cx} cy={props.cy} r={3} fill="#f97316" />
            }}
          />
        </LineChart>
      </ResponsiveContainer>
      {/* Кастомные подписи теперь рендерятся в ChartArea выше графика */}
    </div>
  )
}


