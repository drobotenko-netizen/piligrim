// import { fetchWithRole } from '@/lib/utils' // Устарело, используем credentials: 'include'

export default async function IikoAuthTestPage() {
  const API_BASE = getApiBase()
  let json: any = {}
  try {
    const r = await fetch(`${API_BASE}/api/iiko/auth/test`, { cache: 'no-store', credentials: 'include' })
    json = await r.json()
  } catch {}
  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">iiko · Проверка доступа</h1>
      <div className="rounded-lg border p-4">
        <pre className="text-sm overflow-auto">{JSON.stringify(json, null, 2)}</pre>
      </div>
    </div>
  )
}


