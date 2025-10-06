import AccountsClient from './ui/AccountsClient'
import { getApiBase } from "@/lib/api"

export const dynamic = 'force-dynamic'

export default async function AccountsPage() {
  const API_BASE = getApiBase()
  let initialAccounts: any[] = []
  try {
    const res = await fetch(`${API_BASE}/api/accounts`, { cache: 'no-store' })
    const json = await res.json()
    initialAccounts = json.items || []
  } catch (e) {
    console.error('Failed to fetch accounts', e)
  }
  return (
    <div className="p-6">
      <AccountsClient initialAccounts={initialAccounts} />
    </div>
  )
}
