import HoursClient from '@/app/(dashboard)/iiko/sales/hours/ui/HoursClient'

export const dynamic = 'force-dynamic'

export default async function ChecksByHourPage() {
  return (
    <div className="p-6 space-y-4">
      <HoursClient />
    </div>
  )
}


