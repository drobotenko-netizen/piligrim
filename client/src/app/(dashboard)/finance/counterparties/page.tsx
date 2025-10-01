import CounterpartiesClient from './ui/CounterpartiesClient'

export const dynamic = 'force-dynamic'

export default async function CounterpartiesPage() {
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000'
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
