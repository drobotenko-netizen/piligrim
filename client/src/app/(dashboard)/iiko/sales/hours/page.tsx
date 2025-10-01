import HoursClient from './ui/HoursClient'

export default async function IikoSalesHoursPage() {
  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">iiko · Продажи по часам</h1>
      <HoursClient />
    </div>
  )
}


