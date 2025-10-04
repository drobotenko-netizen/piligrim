"use client"
import { getWeekdayName, ChartPoint } from './utils'

export default function WeekdayLabels({ chartData }: { chartData: ChartPoint[] }) {
  if (!chartData.length) return null
  return (
    <div className="flex justify-between items-end" style={{ paddingTop: '4px', paddingBottom: '8px', paddingLeft: '50px', marginRight: '-10px' }}>
      {chartData.map((data, index) => (
        <div key={index} className="text-center flex-1">
          <div
            className="text-xs mb-1 h-4 flex items-center justify-center"
            style={{
              color:
                ((data.weekdayMonth1 != null) && (data.weekdayMonth1 === 0 || data.weekdayMonth1 === 6)) ||
                ((data.weekdayMonth2 != null) && (data.weekdayMonth2 === 0 || data.weekdayMonth2 === 6))
                  ? '#dc2626'
                  : '#6b7280',
            }}
          >
            {data.weekdayMonth1 != null
              ? getWeekdayName(data.weekdayMonth1)
              : data.weekdayMonth2 != null
              ? getWeekdayName(data.weekdayMonth2)
              : '\u00A0'}
          </div>
          <div className="w-full h-px bg-gray-300 mb-1"></div>
          <div className="text-xs mb-1 h-4 flex items-center justify-center" style={{ color: '#374151' }}>
            {data.dateMonth1 ? data.dateMonth1.split('.')[0] : '\u00A0'}
          </div>
          <div className="text-xs h-4 flex items-center justify-center" style={{ color: '#f97316' }}>
            {data.dateMonth2 ? data.dateMonth2.split('.')[0] : '\u00A0'}
          </div>
        </div>
      ))}
    </div>
  )
}


