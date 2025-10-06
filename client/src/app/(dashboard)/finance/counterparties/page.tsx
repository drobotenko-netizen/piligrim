import { getApiBase } from '../../lib/api'
import CounterpartiesClient from './ui/CounterpartiesClient'

export const dynamic = 'force-dynamic'

export default async function CounterpartiesPage() {
  const API_BASE = getApiBase()
  let initialItems: any[] = []
  try {
    const res = await fetch(`${API_BASE}/api/counterparties`, { cache: 'no-store' })
    const json = await res.json()
    initialItems = json.items || []
  } catch (e) {
    console.error('Failed to fetch counterparties', e)
  }
  return (
    <div className="p-6">
      <CounterpartiesClient initialItems={initialItems} />
    </div>
  )
}
