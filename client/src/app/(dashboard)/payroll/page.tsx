import PayrollClient from './ui/PayrollClient'

export const dynamic = 'force-dynamic'

export default async function PayrollPage() {
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000'
  const now = new Date()
  const y = now.getUTCFullYear()
  const m = now.getUTCMonth() + 1
  let initialItems: any[] = []
  try {
    const res = await fetch(`${API_BASE}/api/payroll?y=${y}&m=${m}`, { cache: 'no-store', credentials: 'include' })
    const json = await res.json()
    initialItems = json.items || []
  } catch (e) {
    console.error('Failed to fetch payroll data', e)
  }
  return (
    <div className="p-6">
      <PayrollClient initialY={y} initialM={m} initialItems={initialItems} />
    </div>
  )
}
