export default async function IikoStoreConsumptionPage() {
  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">iiko · Расход за период</h1>
      <ConsumptionClient />
    </div>
  )
}
import ConsumptionClient from './ui/ConsumptionClient'


