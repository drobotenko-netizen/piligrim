"use client"
import { useEffect, useMemo, useState } from 'react'
import { getApiBase } from "@/lib/api"
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'

function dtToYMD(d: Date) {
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

type Ingredient = { id: string; name: string; amount?: number | null; unit?: string | null }

export default function RecipesClient() {
  const API_BASE = getApiBase()
  const [date, setDate] = useState(() => {
    // Используем вчерашний день или последний день декабря 2024, если есть данные
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(today.getDate() - 1)
    return dtToYMD(yesterday)
  })
  const [products, setProducts] = useState<Array<{ id: string; name: string }>>([])
  const [allProducts, setAllProducts] = useState<Array<{ id: string; name: string }>>([])
  const [categories, setCategories] = useState<string[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [prodMap, setProdMap] = useState<Record<string, string>>({})
  const [unitMap, setUnitMap] = useState<Record<string, string>>({})
  const [productId, setProductId] = useState('')
  const [prepared, setPrepared] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  async function loadCategories() {
    try {
      const params = new URLSearchParams({ from: date, to: date })
      const res = await fetch(`${API_BASE}/api/iiko/local/sales/dish-categories?${params.toString()}`, { credentials: 'include' })
      const json = await res.json()
      setCategories(json.categories || [])
    } catch (e) {
      console.error('Error loading categories:', e)
    }
  }

  async function loadDishes() {
    try {
      const params = new URLSearchParams({ from: date, to: date, limit: '300' })
      if (selectedCategory !== 'all') params.set('category', selectedCategory)
      const url = `${API_BASE}/api/iiko/local/sales/dishes?${params.toString()}`
      
      const res = await fetch(url, { credentials: 'include' })
      const json = await res.json()
      const dishes = json.dishes || []
      
      // Преобразуем в формат { id, name, category }
      const dishProducts = dishes.map((d: any) => ({
        id: d.dishId,
        name: d.dishName,
        category: d.dishCategory
      }))
      setAllProducts(dishProducts)
    } catch (e) {
      console.error('Error loading dishes:', e)
    }
  }

  async function loadProducts() {
    try {
      const r = await fetch(`${API_BASE}/api/iiko/entities/products`, { cache: 'no-store', credentials: 'include' })
      const j = await r.json()
      const items = Array.isArray(j?.items) ? j.items : []
      
      // Создадим map id->name для отображения ингредиентов по id
      const map: Record<string, string> = {}
      const umap: Record<string, string> = {}
      for (const it of items) {
        if (it?.id) map[it.id] = it?.name || it.id
        if (it?.id && it?.unitName) umap[it.id] = it.unitName
      }
      setProdMap(map)
      setUnitMap(umap)
    } catch {}
  }

  async function loadRecipe() {
    if (!productId) return
    setLoading(true)
    try {
      const r = await fetch(`${API_BASE}/api/iiko/recipes/prepared?date=${date}&productId=${productId}`, { cache: 'no-store', credentials: 'include' })
      const j = await r.json()
      setPrepared(j)
    } catch { setPrepared(null) }
    setLoading(false)
  }

  // Обновляем список продуктов при изменении категории
  useEffect(() => {
    setProducts(allProducts)
    if (allProducts[0] && !allProducts.find(p => p.id === productId)) {
      setProductId(allProducts[0].id)
    }
  }, [allProducts, productId])

  useEffect(() => { 
    loadProducts()
    loadCategories()
  }, [])

  useEffect(() => {
    loadDishes()
  }, [selectedCategory, date])

  const ingredientsIds = useMemo(() => {
    const items = prepared?.preparedCharts?.[0]?.items || []
    return Array.from(new Set(items.map((it: any) => String(it?.productId || '')).filter(Boolean)))
  }, [prepared])

  const [txUnits, setTxUnits] = useState<Record<string, string>>({})

  // Загружаем единицы измерения ингредиентов из TRANSACTIONS по текущей дате
  useEffect(() => {
    (async () => {
      if (!ingredientsIds.length) { setTxUnits({}); return }
      try {
        const params = new URLSearchParams({ date })
        for (const id of ingredientsIds) params.append('id', String(id))
        const r = await fetch(`${API_BASE}/api/iiko/recipes/units?${params.toString()}`, { cache: 'no-store', credentials: 'include' })
        const j = await r.json()
        setTxUnits(j?.units || {})
      } catch { setTxUnits({}) }
    })()
  }, [date, ingredientsIds])

  const ingredients: Ingredient[] = useMemo(() => {
    // распарсим preparedCharts[0].items[] -> productId/amount
    const items = prepared?.preparedCharts?.[0]?.items || []
    return items.map((it: any) => {
      const id = it?.productId || ''
      const name = prodMap[id] || it?.productName || id
      const unit = txUnits[id] || unitMap[id] || it?.measureUnitName || it?.unitName || it?.unit || null
      return { id, name, amount: it?.amount, unit }
    })
  }, [prepared, prodMap, unitMap, txUnits])

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <input type="date" value={date} onChange={e => setDate(e.target.value)} className="border rounded px-2 py-1 text-sm h-9" />
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-48 h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все категории</SelectItem>
            {categories.map(category => (
              <SelectItem key={category} value={category}>{category}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <select value={productId} onChange={e => setProductId(e.target.value)} className="border rounded px-2 py-1 text-sm min-w-[280px] h-9">
          {products.slice(0, 500).map(p => (
            <option key={p.id} value={p.id}>{p.name || p.id}</option>
          ))}
        </select>
        <button onClick={loadRecipe} className="border rounded px-3 py-1 text-sm h-9">Показать</button>
      </div>

      {loading && <div className="text-sm">Загрузка…</div>}

      {!!ingredients.length && (
        <div className="rounded-lg border p-2">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="px-2 py-1">Наименование</th>
                <th className="px-2 py-1">Ед. изм.</th>
                <th className="px-2 py-1">Кол-во</th>
              </tr>
            </thead>
            <tbody>
              {ingredients.map((ing, i) => (
                <tr key={i} className="border-t">
                  <td className="px-2 py-1">{ing.name}</td>
                  <td className="px-2 py-1">{ing.unit || ''}</td>
                  <td className="px-2 py-1">{ing.amount ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && !ingredients.length && (
        <div className="text-sm text-muted-foreground">Нет данных технологической карты на выбранную дату или блюдо.</div>
      )}
    </div>
  )
}


