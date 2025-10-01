import PnlClient from './ui/PnlClient'
import { fetchWithRole } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function PnlReportPage() {
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000'
  const now = new Date()
  const y = now.getUTCFullYear()
  const m = now.getUTCMonth() + 1
  let initial: any = { items: [], totals: { income: 0, expense: 0, net: 0 } }
  try {
    const res = await fetchWithRole(`${API_BASE}/api/reports/pnl?y=${y}&m=${m}`, { cache: 'no-store' })
    initial = await res.json()
  } catch (e) {
    console.error('Failed to fetch pnl report', e)
  }
  return (
    <div className="p-6">
      <PnlClient initialY={y} initialM={m} initialItems={initial.items || []} initialTotals={initial.totals || { income: 0, expense: 0, net: 0 }} />
    </div>
  )
}
