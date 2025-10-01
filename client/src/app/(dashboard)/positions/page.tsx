import PositionsClient from './ui/PositionsClient'
import { fetchWithRole } from '@/lib/utils'

export default async function PositionsPage() {
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000'
  let json: any = { data: [] }
  try {
    const res = await fetchWithRole(`${API_BASE}/api/positions`, { cache: 'no-store' })
    json = await res.json()
  } catch (e) {
    // fallback to empty to avoid runtime error when API is down
  }
  return (
    <div className="p-6">
      <PositionsClient initialPositions={json.data} />
    </div>
  )
}

