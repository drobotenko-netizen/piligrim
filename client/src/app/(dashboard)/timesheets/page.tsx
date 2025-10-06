import { getApiBase } from '../../lib/api'
import TimesheetsClient from './ui/TimesheetsClient'

export default async function TimesheetsPage() {
  const API_BASE = getApiBase()
  const now = new Date()
  const y = now.getUTCFullYear()
  const m = now.getUTCMonth() + 1
  let json: any = { employees: [], entries: [] }
  try {
    const res = await fetch(`${API_BASE}/api/timesheets?y=${y}&m=${m}`, { cache: 'no-store', credentials: 'include' })
    json = await res.json()
  } catch (e) {
    // fallback to empty to avoid runtime error if API is unavailable
  }
  return (
    <div className="p-6">
      <TimesheetsClient initialY={y} initialM={m} initialEmployees={json.employees || []} initialEntries={json.entries || []} />
    </div>
  )
}

