'use client'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export type Status = 'ALL' | 'ACTIVE' | 'INACTIVE'

const STATUSES: Record<Status, string> = {
  ALL: 'Все',
  ACTIVE: 'Активные',
  INACTIVE: 'Неактивные'
}

interface StatusFilterProps {
  value: Status
  onChange: (value: Status) => void
  className?: string
  placeholder?: string
}

/**
 * Переиспользуемый фильтр по статусу (активные/неактивные)
 * 
 * @example
 * const [status, setStatus] = useState<Status>('ACTIVE')
 * <StatusFilter value={status} onChange={setStatus} />
 */
export function StatusFilter({ 
  value, 
  onChange, 
  className = "w-48",
  placeholder
}: StatusFilterProps) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as Status)}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder || 'Выберите статус'} />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(STATUSES).map(([key, label]) => (
          <SelectItem key={key} value={key}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

/**
 * Получить название статуса
 */
export function getStatusLabel(status: Status): string {
  return STATUSES[status] || status
}

