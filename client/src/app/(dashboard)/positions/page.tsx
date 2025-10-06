import PositionsClient from './ui/PositionsClient'
import { getApiBase } from "@/lib/api"
// import { fetchWithRole } from '@/lib/utils' // Устарело, используем credentials: 'include'

export default async function PositionsPage() {
  const API_BASE = getApiBase()
  let json: any = { data: [] }
  try {
    const res = await fetch(`${API_BASE}/api/positions`, { cache: 'no-store', credentials: 'include' })
    json = await res.json()
  } catch (e) {
    // fallback to empty to avoid runtime error when API is down
  }
  return (
    <div className="p-6">
      <PositionsClient initialPositions={json.data || []} />
    </div>
  )
}

