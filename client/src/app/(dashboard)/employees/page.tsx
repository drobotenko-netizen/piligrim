import EmployeesClient from './ui/EmployeesClient'
import { getApiBase } from "@/lib/api"
// import { fetchWithRole } from '@/lib/utils' // Устарело, используем credentials: 'include'

export const dynamic = 'force-dynamic'

export default async function EmployeesPage() {
  const API_BASE = getApiBase()
  let positionsJson: any = { data: [] }
  let employeesJson: any = { data: [] }
  try {
    const [positionsRes, employeesRes] = await Promise.all([
      fetch(`${API_BASE}/api/positions`, { cache: 'no-store', credentials: 'include' }),
      fetch(`${API_BASE}/api/employees`, { cache: 'no-store', credentials: 'include' })
    ])
    positionsJson = await positionsRes.json()
    employeesJson = await employeesRes.json()
  } catch (e) {
    // fallback to empty
  }
  return (
    <div className="p-6">
      <EmployeesClient initialPositions={positionsJson.data || []} initialEmployees={employeesJson.data || []} />
    </div>
  )
}

