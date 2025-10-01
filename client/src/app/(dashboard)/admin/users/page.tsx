import UsersClient from '@/app/admin/users/ui/UsersClient'

export const dynamic = 'force-dynamic'

export default async function AdminUsersPage() {
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000'
  let initialItems: any[] = []
  try {
    const res = await fetch(`${API_BASE}/api/admin/users`, { cache: 'no-store', credentials: 'include' as any })
    const json = await res.json()
    initialItems = json.items || []
  } catch {}
  return (
    <div className="p-6">
      <UsersClient initialItems={initialItems} />
    </div>
  )
}


