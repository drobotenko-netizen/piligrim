import AuditClient from '@/app/admin/audit/ui/AuditClient'

export const dynamic = 'force-dynamic'

export default async function AdminAuditPage() {
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000'
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


