import CashflowClient from './ui/CashflowClient'
import { getApiBase } from "@/lib/api"
// import { fetchWithRole } from '@/lib/utils' // Устарело, используем credentials: 'include'

export const dynamic = 'force-dynamic'

export default async function CashflowReportPage() {
  const API_BASE = getApiBase()
  const now = new Date()
  const currentYear = now.getUTCFullYear()
  const currentMonth = now.getUTCMonth() + 1
  
  // По умолчанию: с января по текущий месяц
  const yFrom = currentYear
  const mFrom = 1 // январь
  const yTo = currentYear
  const mTo = currentMonth
  
  let initial: any = { items: [], total: 0, months: [] }
  try {
    const res = await fetch(`${API_BASE}/api/reports/cashflow?yFrom=${yFrom}&mFrom=${mFrom}&yTo=${yTo}&mTo=${mTo}`, { cache: 'no-store', credentials: 'include' })
    initial = await res.json()
  } catch (e) {
    console.error('Failed to fetch cashflow report', e)
  }
  return (
    <div className="p-6">
      <CashflowClient 
        initialYFrom={yFrom} 
        initialMFrom={mFrom} 
        initialYTo={yTo} 
        initialMTo={mTo} 
        initialItems={initial.items || []} 
        initialTotal={initial.total || 0} 
        initialMonths={initial.months || []}
      />
    </div>
  )
}
