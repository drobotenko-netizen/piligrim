"use client"
import { useEffect, useMemo, useState } from 'react'

function dtToYMD(d: Date) {
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

type Ingredient = { id: string; name: string; amount?: number | null; unit?: string | null }

export default function RecipesClient() {
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000'
  const [date, setDate] = useState(dtToYMD(new Date()))
  const [products, setProducts] = useState<Array<{ id: string; name: string }>>([])
  const [prodMap, setProdMap] = useState<Record<string, string>>({})
  const [unitMap, setUnitMap] = useState<Record<string, string>>({})
  const [productId, setProductId] = useState('')
  const [prepared, setPrepared] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  async function loadProducts() {
    try {
      const r = await fetch(`${API_BASE}/api/iiko/entities/products`, { cache: 'no-store', headers: { 'x-role': 'ADMIN' } })
      const j = await r.json()
      const items = Array.isArray(j?.items) ? j.items : []
      // Предпочтительно фильтруем по типу (iiko ProductType): оставляем только блюда (DISH)
      const filtered = items.filter((p: any) => {
        const t = String(p?.type || p?.productType || '').toUpperCase()
        if (t) return t === 'DISH'
        // Фоллбек по названию, если тип отсутствует
        const name = String(p?.name || '').trim().toLowerCase()
        if (!name) return false
        if (name.startsWith('!')) return false
        if (name.startsWith('-')) return false
        if (name.includes('ингр')) return false
        if (name.includes('(инг')) return false
        return true
      })
      setProducts(filtered)
      if (filtered[0]) setProductId(filtered[0].id)
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
      const r = await fetch(`${API_BASE}/api/iiko/recipes/prepared?date=${date}&productId=${productId}`, { cache: 'no-store', headers: { 'x-role': 'ADMIN' } })
      const j = await r.json()
      setPrepared(j)
    } catch { setPrepared(null) }
    setLoading(false)
  }

  useEffect(() => { loadProducts() }, [])

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
        const r = await fetch(`${API_BASE}/api/iiko/recipes/units?${params.toString()}`, { cache: 'no-store', headers: { 'x-role': 'ADMIN' } })
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
      <div className="flex items-end gap-2">
        <div>
          <div className="text-xs text-muted-foreground">Дата</div>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="border rounded px-2 py-1 text-sm" />
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Блюдо</div>
          <select value={productId} onChange={e => setProductId(e.target.value)} className="border rounded px-2 py-1 text-sm min-w-[280px]">
            {products.slice(0, 500).map(p => (
              <option key={p.id} value={p.id}>{p.name || p.id}</option>
            ))}
          </select>
        </div>
        <button onClick={loadRecipe} className="border rounded px-3 py-1 text-sm">Показать</button>
      </div>

      {loading && <div className="text-sm">Загрузка…</div>}

      {!!ingredients.length && (
        <div className="rounded-lg border p-2">
          <div className="text-sm font-medium mb-2">Ингредиенты</div>
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


