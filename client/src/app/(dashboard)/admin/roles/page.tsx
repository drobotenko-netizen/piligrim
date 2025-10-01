import RolesClient from '@/app/admin/roles/ui/RolesClient'

export const dynamic = 'force-dynamic'

export default async function AdminRolesPage() {
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000'
  let roles: any[] = []
  let permissions: any[] = []
  try {
    const [r, p] = await Promise.all([
      fetch(`${API_BASE}/api/admin/roles`, { cache: 'no-store', credentials: 'include' as any }).then(r => r.json()),
      fetch(`${API_BASE}/api/admin/permissions`, { cache: 'no-store', credentials: 'include' as any }).then(r => r.json()),
    ])
    roles = r.items || []
    permissions = p.items || []
  } catch {}
  return (
    <div className="p-6">
      <RolesClient initialRoles={roles} allPermissions={permissions} />
    </div>
  )
}


