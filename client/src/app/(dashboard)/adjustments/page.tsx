import AdjustmentsClient from './ui/AdjustmentsClient'

export default async function AdjustmentsPage() {
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000'
  const now = new Date()
  const y = now.getUTCFullYear()
  const m = now.getUTCMonth() + 1
  let emps: any = { data: [] }
  let items: any = { items: [] }
  try {
    const [empsRes, itemsRes] = await Promise.all([
      fetch(`${API_BASE}/api/employees`, { cache: 'no-store' }),
      fetch(`${API_BASE}/api/adjustments?y=${y}&m=${m}`, { cache: 'no-store' })
    ])
    emps = await empsRes.json()
    items = await itemsRes.json()
  } catch (e) {
    // fallback to empty if API is unavailable
  }
  return (
    <div className="p-6">
      <AdjustmentsClient initialY={y} initialM={m} initialEmployees={emps.data} initialItems={items.items} />
    </div>
  )
}

