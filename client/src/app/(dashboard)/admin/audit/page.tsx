import { getApiBase } from '../../lib/api'
import AuditClient from '@/app/admin/audit/ui/AuditClient'

export const dynamic = 'force-dynamic'

export default async function AdminAuditPage() {
  const API_BASE = getApiBase()
  let items: any[] = []
  try {
    const r = await fetch(`${API_BASE}/api/admin/audit`, { cache: 'no-store', credentials: 'include' as any })
    const j = await r.json()
    items = j.items || []
  } catch {}
  return (
    <div className="p-6">
      <AuditClient initialItems={items} />
    </div>
  )
}


