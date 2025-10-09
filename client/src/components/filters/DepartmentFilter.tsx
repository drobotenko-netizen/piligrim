'use client'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export type Department = 'ALL' | 'KITCHEN' | 'HALL' | 'BAR' | 'OPERATORS' | 'OFFICE'

const DEPARTMENTS: Record<Department, string> = {
  ALL: 'Все отделы',
  KITCHEN: 'Кухня',
  HALL: 'Зал',
  BAR: 'Бар',
  OPERATORS: 'Операторы',
  OFFICE: 'Офис'
}

interface DepartmentFilterProps {
  value: Department
  onChange: (value: Department) => void
  className?: string
  placeholder?: string
  includeAll?: boolean
}

/**
 * Переиспользуемый фильтр по отделам
 * 
 * @example
 * const [dept, setDept] = useState<Department>('ALL')
 * <DepartmentFilter value={dept} onChange={setDept} />
 */
export function DepartmentFilter({ 
  value, 
  onChange, 
  className = "w-48",
  placeholder,
  includeAll = true
}: DepartmentFilterProps) {
  const departments = includeAll 
    ? DEPARTMENTS 
    : Object.fromEntries(
        Object.entries(DEPARTMENTS).filter(([key]) => key !== 'ALL')
      ) as Record<Department, string>

  return (
    <Select value={value} onValueChange={(v) => onChange(v as Department)}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder || 'Выберите отдел'} />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(departments).map(([key, label]) => (
          <SelectItem key={key} value={key}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

/**
 * Получить название отдела по коду
 */
export function getDepartmentLabel(dept: Department): string {
  return DEPARTMENTS[dept] || dept
}

