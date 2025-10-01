import AccountsClient from './ui/AccountsClient'

export const dynamic = 'force-dynamic'

export default async function AccountsPage() {
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000'
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
