import { getApiBase } from '../../lib/api'
import PayoutsClient from './ui/PayoutsClient'

export const dynamic = 'force-dynamic'

export default async function PayoutsPage() {
  const API_BASE = getApiBase()
  const now = new Date()
  const y = now.getUTCFullYear()
  const m = now.getUTCMonth() + 1
  let initialEmployees: any[] = []
  let initialAccounts: any[] = []
  let initialItems: any[] = []
  try {
    const [emps, accs, items] = await Promise.all([
      fetch(`${API_BASE}/api/employees`, { cache: 'no-store', credentials: 'include' }).then(r => r.json()),
      fetch(`${API_BASE}/api/accounts`, { cache: 'no-store', credentials: 'include' }).then(r => r.json()),
      fetch(`${API_BASE}/api/payouts?y=${y}&m=${m}`, { cache: 'no-store', credentials: 'include' }).then(r => r.json()),
    ])
    initialEmployees = emps.data || []
    initialAccounts = accs.items || accs.data || []
    initialItems = items.items || []
  } catch (e) {
    console.error('Failed to fetch initial data for payouts', e)
  }
  return (
    <div className="p-6">
      <PayoutsClient initialY={y} initialM={m} initialEmployees={initialEmployees} initialAccounts={initialAccounts} initialItems={initialItems} />
    </div>
  )
}
