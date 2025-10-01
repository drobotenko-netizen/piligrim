import ImportClient from './ui/ImportClient'

export default async function IikoImportPage() {
  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">iiko · Загрузка данных</h1>
      <ImportClient />
    </div>
  )
}


