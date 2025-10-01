import { fetchWithRole } from '@/lib/utils'

export default async function IikoAuthTestPage() {
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000'
  let json: any = {}
  try {
    const r = await fetchWithRole(`${API_BASE}/api/iiko/auth/test`, { cache: 'no-store' })
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


