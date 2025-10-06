"use client"
import { useEffect, useState, useMemo } from 'react'
import { getApiBase } from "@/lib/api"
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'

function dtToIso(d: Date) {
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${dd}T12:00:00.000`
}

export default function BalancesClient() {
  const API_BASE = getApiBase()
  const [timestamp, setTimestamp] = useState('2024-12-15T12:00:00.000') // Используем дату с данными
  const [tableData, setTableData] = useState<any>(null) // Готовая таблица с сервера
  const [loading, setLoading] = useState(false)
  const [selectedType, setSelectedType] = useState<string>('ALL')
  const [selectedProduct, setSelectedProduct] = useState<string>('all')
  
  // Новые состояния для выбора блюда
  const [categories, setCategories] = useState<string[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [dishes, setDishes] = useState<Array<{ id: string; name: string; category: string }>>([])
  const [selectedDish, setSelectedDish] = useState<string>('all')
  const [dishIngredients, setDishIngredients] = useState<string[]>([])
  
  // Период для расхода
  const [fromDate, setFromDate] = useState('2024-12-01')
  const [toDate, setToDate] = useState('2024-12-15')

  async function loadTableData() {
    try {
      const res = await fetch(`${API_BASE}/api/iiko/stores/balances-table`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          timestamp, 
          from: fromDate, 
          to: toDate,
          category: selectedCategory !== 'all' ? selectedCategory : undefined,
          dishId: (selectedDish !== 'all' && selectedDish !== 'category') ? selectedDish : undefined
        }),
        cache: 'no-store',
        credentials: 'include'
      })
      const json = await res.json()
      setTableData(json)
    } catch (e) {
      console.error('Error loading table data:', e)
      setTableData(null)
    }
  }

  async function loadCategories() {
    try {
      // Загружаем категории из API продаж (используем фиксированную дату с данными)
      const params = new URLSearchParams({ from: '2024-12-15', to: '2024-12-15' })
      const res = await fetch(`${API_BASE}/api/iiko/local/sales/dish-categories?${params.toString()}`, { credentials: 'include' })
      const json = await res.json()
      setCategories(json.categories || [])
    } catch (e) {
      console.error('Error loading categories:', e)
    }
  }

  async function loadDishes() {
    try {
      // Загружаем блюда с категориями из API продаж (используем фиксированную дату с данными)
      const params = new URLSearchParams({ from: '2024-12-15', to: '2024-12-15', limit: '500' })
      if (selectedCategory !== 'all') params.set('category', selectedCategory)
      const url = `${API_BASE}/api/iiko/local/sales/dishes?${params.toString()}`
      
      const res = await fetch(url, { credentials: 'include' })
      const json = await res.json()
      const dishList = json.dishes || []
      
      // Преобразуем в нужный формат
      const dishProducts = dishList.map((d: any) => ({
        id: d.dishId,
        name: d.dishName,
        category: d.dishCategory
      }))
      
      setDishes(dishProducts)
    } catch (e) {
      console.error('Error loading dishes:', e)
    }
  }

  async function loadDishIngredients() {
    if (selectedDish === 'all' || selectedDish === 'category') {
      setDishIngredients([])
      return
    }
    
    try {
      const dateStr = timestamp.split('T')[0]
      const res = await fetch(`${API_BASE}/api/iiko/recipes/prepared?date=${dateStr}&productId=${selectedDish}`, { 
        cache: 'no-store', 
        credentials: 'include' 
      })
      const json = await res.json()
      const items = json?.preparedCharts?.[0]?.items || []
      const ingredientIds = Array.from(new Set(items.map((it: any) => String(it?.productId || '')).filter(Boolean)))
      setDishIngredients(ingredientIds)
    } catch (e) {
      console.error('Error loading dish ingredients:', e)
      setDishIngredients([])
    }
  }



  // Первоначальная загрузка категорий и данных таблицы
  useEffect(() => { 
    async function initialLoad() {
      setLoading(true)
      try {
        await Promise.all([
          loadCategories(),
          loadTableData()
        ])
      } finally {
        setLoading(false)
      }
    }
    initialLoad()
  }, [])

  // Сброс выбранного продукта при смене типа
  useEffect(() => {
    setSelectedProduct('all')
  }, [selectedType])

  // Обработка смены категории - загрузка блюд и данных
  useEffect(() => {
    async function handleCategoryChange() {
      setLoading(true)
      
      try {
        // 1. Устанавливаем правильный selectedDish
        if (selectedCategory !== 'all') {
          setSelectedDish('category')
        } else {
          setSelectedDish('all')
        }
        
        // 2. Загружаем блюда
        await loadDishes()
        
        // 3. Загружаем данные таблицы
        await loadTableData()
        
      } catch (error) {
        console.error('Error handling category change:', error)
      } finally {
        setLoading(false)
      }
    }
    
    handleCategoryChange()
  }, [selectedCategory])

  // Обновляем данные таблицы при изменении других параметров
  useEffect(() => {
    async function updateTableData() {
      setLoading(true)
      
      try {
        // Загружаем данные таблицы
        await loadTableData()
        
        // Загружаем ингредиенты только для конкретного блюда (для отображения в UI)
        if (selectedDish !== 'all' && selectedDish !== 'category') {
          await loadDishIngredients()
        }
        
      } catch (error) {
        console.error('Error updating table data:', error)
      } finally {
        setLoading(false)
      }
    }
    
    updateTableData()
  }, [selectedDish, fromDate, toDate, timestamp])

  // Фильтруем строки таблицы
  const filteredRows = useMemo(() => {
    if (!tableData?.rows) return []
    
    let filtered = tableData.rows

    // Фильтр по типу (если не используется фильтр по ингредиентам)
    if (selectedType !== 'ALL' && selectedDish === 'all') {
      filtered = filtered.filter(row => row.productType === selectedType)
    }

    // Фильтр по продукту (если не используется фильтр по ингредиентам)
    if (selectedProduct !== 'all' && selectedDish === 'all') {
      filtered = filtered.filter(row => row.product === selectedProduct)
    }
    
    return filtered
  }, [tableData, selectedType, selectedProduct, selectedDish])

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        {/* Селекты для выбора блюда */}
        <div className="flex items-center gap-2">
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
          <Select value={selectedDish} onValueChange={setSelectedDish}>
            <SelectTrigger className="w-80 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              {selectedCategory === 'all' && (
                <SelectItem value="all">Все блюда</SelectItem>
              )}
            {selectedCategory !== 'all' && (
              <SelectItem value="category">Все из категории</SelectItem>
            )}
              {dishes.map(dish => (
                <SelectItem key={dish.id} value={dish.id}>
                  {dish.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {/* Период для расхода */}
        <div className="flex items-center gap-1">
          <input 
            type="date" 
            value={fromDate} 
            onChange={e => setFromDate(e.target.value)} 
            className="border rounded px-2 py-1 text-sm h-9 w-36" 
          />
          <span className="text-sm text-muted-foreground">-</span>
          <input 
            type="date" 
            value={toDate} 
            onChange={e => setToDate(e.target.value)} 
            className="border rounded px-2 py-1 text-sm h-9 w-36" 
          />
        </div>
      </div>

      <div className="rounded-lg border p-2 h-[calc(100vh-100px)] overflow-hidden flex flex-col relative">
        {/* Фиксированные границы заголовков */}
        <div className="absolute top-[36px] left-2 right-2 h-0 border-b pointer-events-none z-10"></div>
        {filteredRows.length > 0 && (
          <div className="absolute top-[64px] left-2 right-2 h-0 border-b-2 border-gray-300 pointer-events-none z-10"></div>
        )}
        
        <div className="flex-1 overflow-auto relative">
          {/* Плавная анимация контента */}
          <div className={`transition-opacity duration-300 ${loading ? 'opacity-50' : 'opacity-100'}`}>
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white">
                <tr className="text-left text-muted-foreground">
                  <th className="px-2 py-1">№</th>
                  <th className="px-2 py-1">Склад</th>
                  <th className="px-2 py-1">Продукт</th>
                  <th className="px-2 py-1">Тип</th>
                  <th className="px-2 py-1 text-right">Сумма</th>
                  <th className="px-2 py-1 text-right">Остаток</th>
                  <th className="px-2 py-1 text-right">Расход</th>
                </tr>
                {/* Строка итого */}
                {filteredRows.length > 0 && (
                  <tr className="font-semibold">
                    <td className="px-2 py-1"></td>
                    <td className="px-2 py-1"></td>
                    <td className="px-2 py-1">Итого:</td>
                    <td className="px-2 py-1"></td>
                    <td className="px-2 py-1"></td>
                    <td className="px-2 py-1 text-right">
                      {Math.round(filteredRows.reduce((sum, r) => sum + (parseFloat(r.sum) || 0), 0)).toLocaleString('ru-RU')}
                    </td>
                    <td className="px-2 py-1 text-right">
                      {Math.round(filteredRows.reduce((sum, r) => sum + (parseFloat(r.consumption) || 0), 0)).toLocaleString('ru-RU')}
                    </td>
                  </tr>
                )}
              </thead>
              <tbody>
                {filteredRows.map((r: any, i: number) => (
                  <tr key={i} className="border-t">
                    <td className="px-2 py-1 text-xs text-muted-foreground">{i + 1}</td>
                    <td className="px-2 py-1">{r.storeName}</td>
                    <td className="px-2 py-1">{r.productName}</td>
                    <td className="px-2 py-1 text-xs text-muted-foreground">{r.productType}</td>
                    <td className="px-2 py-1 text-right">
                      {Math.round(parseFloat(r.sum || 0)).toLocaleString('ru-RU')}
                    </td>
                    <td className="px-2 py-1 text-right">
                      {parseFloat(r.amount || 0).toFixed(2).replace(/\.?0+$/, '')}
                    </td>
                    <td className="px-2 py-1 text-right">
                      {(r.consumption || 0).toFixed(2).replace(/\.?0+$/, '')}
                    </td>
                  </tr>
                ))}
                {!filteredRows.length && <tr><td className="px-2 py-3 text-sm text-muted-foreground" colSpan={7}>
                  {selectedDish === 'category'
                    ? `Нет данных об ингредиентах для категории "${selectedCategory}"`
                    : selectedDish !== 'all'
                      ? `Нет данных об ингредиентах для блюда "${dishes.find(d => d.id === selectedDish)?.name || selectedDish}"`
                      : selectedType === 'ALL' && selectedProduct === 'all' 
                        ? 'Нет данных на дату' 
                        : selectedProduct !== 'all' 
                          ? `Нет данных для продукта "${selectedProduct}"`
                          : `Нет данных для типа "${selectedType}"`
                  }
                </td></tr>}
              </tbody>
            </table>
          </div>
          
          {/* Индикатор загрузки */}
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 pointer-events-none">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                Обновление...
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


