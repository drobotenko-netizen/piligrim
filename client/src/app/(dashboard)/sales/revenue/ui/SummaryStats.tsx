"use client"

type Props = {
  year1: number
  month1: number
  year2: number
  month2: number
  total1: number
  total2: number
  displayMode: 'sales' | 'receipts'
}

export default function SummaryStats({ year1, month1, year2, month2, total1, total2, displayMode }: Props) {
  const diff = total1 - total2
  const percent = total2 > 0 ? Math.round((diff / total2) * 100) : null
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="rounded-lg border p-4">
        <div className="text-sm text-muted-foreground">
          <span className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gray-700"></div>
            {new Date(Date.UTC(year1, month1 - 1)).toLocaleDateString('ru-RU', { month: 'long' })} {year1}
          </span>
        </div>
        <div className="text-2xl font-bold">
          {displayMode === 'sales' ? `${Math.round(total1).toLocaleString('ru-RU')} ₽` : `${Math.round(total1).toLocaleString('ru-RU')} чеков`}
        </div>
      </div>
      <div className="rounded-lg border p-4">
        <div className="text-sm text-muted-foreground">
          <span className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-orange-500"></div>
            {new Date(Date.UTC(year2, month2 - 1)).toLocaleDateString('ru-RU', { month: 'long' })} {year2}
          </span>
        </div>
        <div className="text-2xl font-bold">
          {displayMode === 'sales' ? `${Math.round(total2).toLocaleString('ru-RU')} ₽` : `${Math.round(total2).toLocaleString('ru-RU')} чеков`}
        </div>
      </div>
      <div className="rounded-lg border p-4">
        <div className="text-sm text-muted-foreground">Разница</div>
        <div className={`text-2xl font-bold ${diff > 0 ? 'text-green-600' : diff < 0 ? 'text-red-600' : ''}`}>
          {displayMode === 'sales' ? `${diff > 0 ? '+' : ''}${Math.round(diff).toLocaleString('ru-RU')} ₽` : `${diff > 0 ? '+' : ''}${Math.round(diff).toLocaleString('ru-RU')} чеков`}
        </div>
      </div>
      <div className="rounded-lg border p-4">
        <div className="text-sm text-muted-foreground">Разница %</div>
        <div className={`text-2xl font-bold ${percent !== null ? (diff > 0 ? 'text-green-600' : diff < 0 ? 'text-red-600' : '') : 'text-muted-foreground'}`}>
          {percent !== null ? `${diff > 0 ? '+' : ''}${percent}%` : 'Нет данных'}
        </div>
      </div>
    </div>
  )
}


