import AdjustmentsClient from './ui/AdjustmentsClient'
import { getApiBase } from "@/lib/api"

export default async function AdjustmentsPage() {
  const API_BASE = getApiBase()
  const now = new Date()
  const y = now.getUTCFullYear()
  const m = now.getUTCMonth() + 1
  let emps: any = { data: [] }
  let items: any = { items: [] }
  try {
    const [empsRes, itemsRes] = await Promise.all([
      fetch(`${API_BASE}/api/employees`, { cache: 'no-store', credentials: 'include' }),
      fetch(`${API_BASE}/api/adjustments?y=${y}&m=${m}`, { cache: 'no-store', credentials: 'include' })
    ])
    emps = await empsRes.json()
    items = await itemsRes.json()
  } catch (e) {
    // fallback to empty if API is unavailable
  }
  return (
    <div className="p-6">
      <AdjustmentsClient initialY={y} initialM={m} initialEmployees={emps.data || []} initialItems={items.items || []} />
    </div>
  )
}

