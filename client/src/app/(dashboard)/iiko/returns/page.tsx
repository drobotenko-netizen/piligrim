import ReturnsClient from './ui/ReturnsClient'

export default async function IikoReturnsPage() {
  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">iiko · Возвраты</h1>
      <ReturnsClient />
    </div>
  )
}


