import UsersClient from '@/app/admin/users/ui/UsersClient'
import { getApiBase } from "@/lib/api"

export const dynamic = 'force-dynamic'

export default async function AdminUsersPage() {
  const API_BASE = getApiBase()
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


