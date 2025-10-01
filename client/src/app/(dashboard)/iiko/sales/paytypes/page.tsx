import PaytypesClient from './ui/PaytypesClient'

export default async function IikoSalesPaytypesPage() {
  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">iiko · Продажи по типам оплат</h1>
      <PaytypesClient />
    </div>
  )
}


