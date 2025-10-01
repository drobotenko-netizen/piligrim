import CategoriesClient from './ui/CategoriesClient'

export const dynamic = 'force-dynamic'

export default async function CategoriesPage() {
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000'
  let initialCategories: any[] = []
  try {
    const res = await fetch(`${API_BASE}/api/categories`, { cache: 'no-store' })
    const json = await res.json()
    initialCategories = json.items || []
  } catch (e) {
    console.error('Failed to fetch categories', e)
  }
  return (
    <div className="p-6">
      <CategoriesClient initialCategories={initialCategories} />
    </div>
  )
}
