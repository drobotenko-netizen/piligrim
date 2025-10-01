import TransactionsClient from './ui/TransactionsClient'
import { fetchWithRole } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function TransactionsPage() {
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000'
  const now = new Date()
  const y = now.getUTCFullYear()
  const m = now.getUTCMonth() + 1
  const startDate = new Date(Date.UTC(y, m - 1, 1)).toISOString()
  const endDate = new Date(Date.UTC(y, m, 1)).toISOString()

  let initialAccounts: any[] = []
  let initialCategories: any[] = []
  let initialItems: any[] = []
  try {
    const [accs, cats, txs] = await Promise.all([
      fetchWithRole(`${API_BASE}/api/accounts`, { cache: 'no-store' }).then(r => r.json()),
      fetchWithRole(`${API_BASE}/api/categories`, { cache: 'no-store' }).then(r => r.json()),
      fetchWithRole(`${API_BASE}/api/transactions?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`, { cache: 'no-store' }).then(r => r.json()),
    ])
    initialAccounts = accs.items || []
    initialCategories = cats.items || []
    initialItems = txs.items || []
  } catch (e) {
    console.error('Failed to fetch transactions data', e)
  }

  return (
    <div className="p-6">
      <TransactionsClient initialY={y} initialM={m} initialAccounts={initialAccounts} initialCategories={initialCategories} initialItems={initialItems} />
    </div>
  )
}
