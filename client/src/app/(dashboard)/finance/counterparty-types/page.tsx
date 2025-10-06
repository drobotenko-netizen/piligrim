import { getApiBase } from '../../lib/api'
import CounterpartyTypesClient from './ui/CounterpartyTypesClient'

export const dynamic = 'force-dynamic'

export default async function CounterpartyTypesPage() {
  const API_BASE = getApiBase()
  let initialItems: any[] = []
  try {
    const res = await fetch(`${API_BASE}/api/counterparty-types`, { cache: 'no-store', credentials: 'include' as any })
    const json = await res.json()
    initialItems = json.items || []
  } catch {}
  return (
    <div className="p-6">
      <CounterpartyTypesClient initialItems={initialItems} />
    </div>
  )
}


