export default async function IikoStoreBalancesPage() {
  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">iiko · Остатки на складах</h1>
      <BalancesClient />
    </div>
  )
}
import BalancesClient from './ui/BalancesClient'


