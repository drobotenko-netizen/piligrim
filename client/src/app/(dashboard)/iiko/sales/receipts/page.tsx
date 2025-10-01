export default async function IikoSalesReceiptsPage() {
  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">iiko · Чеки</h1>
      <ReceiptsClient />
    </div>
  )
}
import ReceiptsClient from './ui/ReceiptsClient'


