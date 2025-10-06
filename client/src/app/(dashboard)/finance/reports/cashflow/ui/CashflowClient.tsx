"use client"

import { useEffect, useMemo, useState, Fragment } from 'react'
import { getApiBase } from "@/lib/api"
import { Card, CardContent } from '@/components/ui/card'
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { ChevronDown, ChevronRight } from 'lucide-react'

const MONTHS = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь']

export default function CashflowClient({ initialYFrom, initialMFrom, initialYTo, initialMTo, initialItems, initialTotal, initialMonths }: { 
  initialYFrom: number; 
  initialMFrom: number; 
  initialYTo: number; 
  initialMTo: number; 
  initialItems: any[]; 
  initialTotal: number; 
  initialMonths: Array<{ year: number; month: number; key: string; label: string }>
}) {
  const [yFrom, setYFrom] = useState(initialYFrom)
  const [mFrom, setMFrom] = useState(initialMFrom)
  const [yTo, setYTo] = useState(initialYTo)
  const [mTo, setMTo] = useState(initialMTo)
  const [items, setItems] = useState<any[]>(initialItems)
  const [months, setMonths] = useState<Array<{ year: number; month: number; key: string; label: string }>>(initialMonths)
  const [total, setTotal] = useState<number>(initialTotal)
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set())
  const API_BASE = getApiBase()

  function rubFmt(cents: number) { return new Intl.NumberFormat('ru-RU').format(Math.round(cents/100)) + ' ₽' }

  function toggleCategory(categoryId: string) {
    const newCollapsed = new Set(collapsedCategories)
    if (newCollapsed.has(categoryId)) {
      newCollapsed.delete(categoryId)
    } else {
      newCollapsed.add(categoryId)
    }
    setCollapsedCategories(newCollapsed)
  }

  function isCategoryCollapsed(categoryId: string) {
    return collapsedCategories.has(categoryId)
  }

  function collapseAllCategories() {
    const allCategories = new Set<string>()
    for (const [actKey, entry] of grouped.entries()) {
      for (const [catKey, cat] of entry.categories.entries()) {
        allCategories.add(`in-${cat.categoryId || 'none'}`)
        allCategories.add(`out-${cat.categoryId || 'none'}`)
      }
    }
    setCollapsedCategories(allCategories)
  }

  function expandAllCategories() {
    setCollapsedCategories(new Set())
  }

  function getSectionOrder(actKey: string) {
    const order = {
      'OPERATING': 1,
      'INVESTING': 2,
      'FINANCING': 3
    }
    return order[actKey as keyof typeof order] || 999
  }

  async function reload() {
    const qs = new URLSearchParams({ yFrom: String(yFrom), mFrom: String(mFrom), yTo: String(yTo), mTo: String(mTo) })
    const res = await fetch(`${API_BASE}/api/reports/cashflow?${qs.toString()}`)
    const json = await res.json()
    setItems(json.items || [])
    setMonths(json.months || [])
    setTotal(json.total || 0)
  }

  useEffect(() => { reload() }, [yFrom, mFrom, yTo, mTo])

  const grouped = useMemo(() => {
    const actMap = new Map<string, any>()
    for (const r of items) {
      // Группируем по виду деятельности
      let sectionKey = r.activity || 'Операционная'
      
      const entry = actMap.get(sectionKey) || { activity: sectionKey, categories: new Map<string, any>() }
      const cKey = r.categoryId || 'none'
      const cat = entry.categories.get(cKey) || { categoryId: r.categoryId, categoryName: r.categoryName || '', inflow: new Map<string, number>(), outflow: new Map<string, number>(), articles: new Map<string, any>() }
      const artKey = r.articleId || 'none'
      const art = cat.articles.get(artKey) || { articleId: r.articleId, articleName: r.articleName || '', inflow: new Map<string, number>(), outflow: new Map<string, number>() }
      const mk = `${r.year}-${String(r.month).padStart(2,'0')}`
      if (r.type === 'income') {
        art.inflow.set(mk, (art.inflow.get(mk) || 0) + r.amount)
        // Убираем двойное суммирование - категория будет суммироваться из статей
      } else {
        art.outflow.set(mk, (art.outflow.get(mk) || 0) + r.amount)
        // Убираем двойное суммирование - категория будет суммироваться из статей
      }
      cat.articles.set(artKey, art)
      entry.categories.set(cKey, cat)
      actMap.set(sectionKey, entry)
    }
    
    // Рассчитываем суммы категорий из статей
    for (const [actKey, entry] of actMap.entries()) {
      for (const [catKey, cat] of entry.categories.entries()) {
        // Очищаем старые суммы категории
        cat.inflow.clear()
        cat.outflow.clear()
        
        // Суммируем из всех статей категории
        for (const [artKey, art] of cat.articles.entries()) {
          for (const [monthKey, amount] of art.inflow.entries()) {
            cat.inflow.set(monthKey, (cat.inflow.get(monthKey) || 0) + amount)
          }
          for (const [monthKey, amount] of art.outflow.entries()) {
            cat.outflow.set(monthKey, (cat.outflow.get(monthKey) || 0) + amount)
          }
        }
      }
    }
    
    return actMap
  }, [items])

  return (
    <Card>
      <CardContent className="p-4 space-y-3 flex flex-col h-[calc(100vh-4rem)] min-h-0">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={expandAllCategories}>
              Развернуть все
            </Button>
            <Button variant="outline" size="sm" onClick={collapseAllCategories}>
              Свернуть все
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Select value={String(yFrom)} onValueChange={v => setYFrom(Number(v))}>
              <SelectTrigger className="w-28"><SelectValue placeholder="Год от" /></SelectTrigger>
              <SelectContent>
                {[yFrom-1, yFrom, yFrom+1].map(yy => (<SelectItem key={yy} value={String(yy)}>{yy}</SelectItem>))}
              </SelectContent>
            </Select>
            <Select value={String(mFrom)} onValueChange={v => setMFrom(Number(v))}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Месяц от" /></SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, i) => i + 1).map(mm => (
                  <SelectItem key={mm} value={String(mm)}>{MONTHS[mm-1]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Select value={String(yTo)} onValueChange={v => setYTo(Number(v))}>
              <SelectTrigger className="w-28"><SelectValue placeholder="Год до" /></SelectTrigger>
              <SelectContent>
                {[yTo-1, yTo, yTo+1].map(yy => (<SelectItem key={yy} value={String(yy)}>{yy}</SelectItem>))}
              </SelectContent>
            </Select>
            <Select value={String(mTo)} onValueChange={v => setMTo(Number(v))}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Месяц до" /></SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, i) => i + 1).map(mm => (
                  <SelectItem key={mm} value={String(mm)}>{MONTHS[mm-1]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex-1 overflow-auto">
          <Table className="w-full table-fixed">
            <THead className="sticky top-0 bg-card z-10">
              <TR>
                <TH className="h-8 px-2 w-[300px] sticky left-0 bg-card z-20">Категория / Статья</TH>
                {months.map(mo => (
                  <TH key={mo.key} className="h-8 px-2 text-right w-[140px]">{mo.label}</TH>
                ))}
                <TH className="h-8 px-2 text-right w-[160px]">Итого</TH>
              </TR>
            </THead>
            <TBody>
              {[...grouped.entries()].sort(([a], [b]) => getSectionOrder(a) - getSectionOrder(b)).map(([actKey, entry]) => {
                const categories = [...entry.categories.values()]
                const inflowCats = categories.filter((c: any) => months.some(mo => (c.inflow.get(mo.key) || 0) > 0))
                const outflowCats = categories.filter((c: any) => months.some(mo => (c.outflow.get(mo.key) || 0) > 0))
                
                // Разделяем расходы на себестоимость и операционные издержки только для OPERATING
                let costOfGoodsSoldCats: any[] = []
                let operatingExpensesCats: any[] = []
                
                if (actKey === 'OPERATING') {
                  const costOfGoodsSoldCategoryNames = [
                    'Продукты и сырье',
                    'Упаковка и инвентарь', 
                    'Упаковка/хозка',
                    'Доставка',
                    'Доставка из Владивостока',
                    'Доставка по городу',
                    'Стирка',
                    'бой посуды',
                    'ИЗЛИШКИ',
                    'НЕДОСДАЧА'
                  ]
                  costOfGoodsSoldCats = outflowCats.filter((c: any) => costOfGoodsSoldCategoryNames.includes(c.categoryName))
                  operatingExpensesCats = outflowCats.filter((c: any) => !costOfGoodsSoldCategoryNames.includes(c.categoryName))
                } else {
                  // Для INVESTING и FINANCING просто показываем все расходы как есть
                  operatingExpensesCats = outflowCats
                }
                
                // Рассчитываем суммы для каждого подраздела
                const inflowTotals = months.map(mo => 
                  inflowCats.reduce((sum, cat) => sum + (cat.inflow.get(mo.key) || 0), 0)
                )
                const inflowTotal = inflowTotals.reduce((sum, val) => sum + val, 0)
                
                const costOfGoodsSoldTotals = months.map(mo => 
                  costOfGoodsSoldCats.reduce((sum, cat) => sum + (cat.outflow.get(mo.key) || 0), 0)
                )
                const costOfGoodsSoldTotal = costOfGoodsSoldTotals.reduce((sum, val) => sum + val, 0)
                
                const operatingExpensesTotals = months.map(mo => 
                  operatingExpensesCats.reduce((sum, cat) => sum + (cat.outflow.get(mo.key) || 0), 0)
                )
                const operatingExpensesTotal = operatingExpensesTotals.reduce((sum, val) => sum + val, 0)
                return (
                  <Fragment key={`act-${actKey}`}>
                    <TR className="bg-muted/50 hover:bg-muted/70 transition-colors">
                      <TD className="py-1.5 px-2 font-semibold sticky left-0 bg-muted/50 z-10 hover:bg-muted/70 transition-colors">{
                        actKey === 'OPERATING' ? 'Операционная деятельность' : 
                        actKey === 'INVESTING' ? 'Инвестиционная деятельность' : 
                        actKey === 'FINANCING' ? 'Финансовая деятельность' : 
                        actKey
                      }</TD>
                      {months.map(mo => (<TD key={mo.key} className="py-1.5 px-2 bg-muted/50 font-semibold"></TD>))}
                      <TD className="py-1.5 px-2 bg-muted/50 font-semibold"></TD>
                    </TR>
                    {/* Выручка — показываем для всех видов деятельности */}
                    {inflowCats.length > 0 && (
                      <Fragment key={`act-${actKey}-inflow`}>
                        <TR className="hover:bg-muted/30 transition-colors">
                          <TD className="py-1.5 px-2 italic text-muted-foreground sticky left-0 bg-card z-10 hover:bg-muted/30 transition-colors">
                            {actKey === 'OPERATING' ? 'Выручка' : 'Доходы'}
                          </TD>
                          {inflowTotals.map((total, i) => (
                            <TD key={i} className="py-1.5 px-2 text-right italic text-muted-foreground">{rubFmt(total)}</TD>
                          ))}
                          <TD className="py-1.5 px-2 text-right italic text-muted-foreground">{rubFmt(inflowTotal)}</TD>
                    </TR>
                        {inflowCats.sort((a: any, b: any) => {
                      const aSum = months.map(mo => a.inflow.get(mo.key) || 0).reduce((sum: number, val: number) => sum + val, 0)
                      const bSum = months.map(mo => b.inflow.get(mo.key) || 0).reduce((sum: number, val: number) => sum + val, 0)
                      return bSum - aSum // Сортировка по убыванию
                    }).map((cat: any) => {
                      const catInByMonth = months.map(mo => cat.inflow.get(mo.key) || 0)
                      const catInSum = catInByMonth.reduce((a: number, b: number) => a + b, 0)
                      const inflowArticles = [...cat.articles.values()].filter((a: any) => months.some(mo => (a.inflow.get(mo.key) || 0) > 0))
                      return (
                        <Fragment key={`cat-${cat.categoryId || 'none'}-in`}>
                                      <TR className="hover:bg-muted/20 transition-colors">
                                        <TD className="py-1.5 px-2 font-medium sticky left-0 bg-card z-10 hover:bg-muted/20 transition-colors">
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={() => toggleCategory(`in-${cat.categoryId || 'none'}`)}
                                >
                                  {isCategoryCollapsed(`in-${cat.categoryId || 'none'}`) ? (
                                    <ChevronRight className="h-4 w-4" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4" />
                                  )}
                                </Button>
                                {cat.categoryName || 'Без категории'}
                              </div>
                            </TD>
                            {catInByMonth.map((v, i) => (<TD key={i} className="py-1.5 px-2 text-right font-medium">{rubFmt(v)}</TD>))}
                            <TD className="py-1.5 px-2 text-right font-medium">{rubFmt(catInSum)}</TD>
                          </TR>
                          {!isCategoryCollapsed(`in-${cat.categoryId || 'none'}`) && inflowArticles.sort((a: any, b: any) => {
                            const aSum = months.map(mo => a.inflow.get(mo.key) || 0).reduce((sum: number, val: number) => sum + val, 0)
                            const bSum = months.map(mo => b.inflow.get(mo.key) || 0).reduce((sum: number, val: number) => sum + val, 0)
                            return bSum - aSum // Сортировка по убыванию
                          }).map((art: any, idx: number) => {
                            const cells = months.map(mo => art.inflow.get(mo.key) || 0)
                            const sum = cells.reduce((a: number, b: number) => a + b, 0)
                            return (
                              <TR key={`art-in-${actKey}-${art.articleId || 'none'}-${idx}`}>
                                <TD className="py-1.5 pl-10 sticky left-0 bg-card z-10">{art.articleName || '—'}</TD>
                                {cells.map((v: number, i: number) => (<TD key={i} className="py-1.5 px-2 text-right">{rubFmt(v)}</TD>))}
                                <TD className="py-1.5 px-2 text-right">{rubFmt(sum)}</TD>
                              </TR>
                            )
                          })}
                        </Fragment>
                      )
                    })}
                    </Fragment>
                    )}
                    {/* Себестоимость — одним блоком для раздела OPERATING */}
                    {actKey === 'OPERATING' && costOfGoodsSoldCats.length > 0 && (
                      <Fragment key={`act-${actKey}-cost`}>
                        <TR className="hover:bg-muted/30 transition-colors">
                          <TD className="py-1.5 px-2 italic text-muted-foreground sticky left-0 bg-card z-10 hover:bg-muted/30 transition-colors">Себестоимость</TD>
                          {costOfGoodsSoldTotals.map((total, i) => (
                            <TD key={i} className="py-1.5 px-2 text-right italic text-muted-foreground">{rubFmt(total)}</TD>
                          ))}
                          <TD className="py-1.5 px-2 text-right italic text-muted-foreground">{rubFmt(costOfGoodsSoldTotal)}</TD>
                    </TR>
                        {costOfGoodsSoldCats.sort((a: any, b: any) => {
                      const aSum = months.map(mo => a.outflow.get(mo.key) || 0).reduce((sum: number, val: number) => sum + val, 0)
                      const bSum = months.map(mo => b.outflow.get(mo.key) || 0).reduce((sum: number, val: number) => sum + val, 0)
                      return bSum - aSum // Сортировка по убыванию
                    }).map((cat: any) => {
                      const catOutByMonth = months.map(mo => cat.outflow.get(mo.key) || 0)
                      const catOutSum = catOutByMonth.reduce((a: number, b: number) => a + b, 0)
                      const outflowArticles = [...cat.articles.values()].filter((a: any) => months.some(mo => (a.outflow.get(mo.key) || 0) > 0))
                      return (
                        <Fragment key={`cat-${cat.categoryId || 'none'}-out`}>
                          <TR>
                            <TD className="py-1.5 px-2 font-medium sticky left-0 bg-card z-10">
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={() => toggleCategory(`out-${cat.categoryId || 'none'}`)}
                                >
                                  {isCategoryCollapsed(`out-${cat.categoryId || 'none'}`) ? (
                                    <ChevronRight className="h-4 w-4" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4" />
                                  )}
                                </Button>
                                {cat.categoryName || 'Без категории'}
                              </div>
                            </TD>
                            {catOutByMonth.map((v, i) => (<TD key={i} className="py-1.5 px-2 text-right font-medium">{rubFmt(v)}</TD>))}
                            <TD className="py-1.5 px-2 text-right font-medium">{rubFmt(catOutSum)}</TD>
                          </TR>
                          {!isCategoryCollapsed(`out-${cat.categoryId || 'none'}`) && outflowArticles.sort((a: any, b: any) => {
                            const aSum = months.map(mo => a.outflow.get(mo.key) || 0).reduce((sum: number, val: number) => sum + val, 0)
                            const bSum = months.map(mo => b.outflow.get(mo.key) || 0).reduce((sum: number, val: number) => sum + val, 0)
                            return bSum - aSum // Сортировка по убыванию
                          }).map((art: any, idx: number) => {
                            const cells = months.map(mo => art.outflow.get(mo.key) || 0)
                            const sum = cells.reduce((a: number, b: number) => a + b, 0)
                            return (
                              <TR key={`art-out-${actKey}-${art.articleId || 'none'}-${idx}`}>
                                <TD className="py-1.5 pl-10 sticky left-0 bg-card z-10">{art.articleName || '—'}</TD>
                                {cells.map((v: number, i: number) => (<TD key={i} className="py-1.5 px-2 text-right">{rubFmt(v)}</TD>))}
                                <TD className="py-1.5 px-2 text-right">{rubFmt(sum)}</TD>
                              </TR>
                            )
                          })}
                        </Fragment>
                      )
                    })}
                    </Fragment>
                    )}
                    
                    {/* Операционные издержки — одним блоком для раздела OPERATING */}
                    {actKey === 'OPERATING' && operatingExpensesCats.length > 0 && (
                      <Fragment key={`act-${actKey}-operating`}>
                        <TR className="hover:bg-muted/30 transition-colors">
                          <TD className="py-1.5 px-2 italic text-muted-foreground sticky left-0 bg-card z-10 hover:bg-muted/30 transition-colors">Операционные издержки</TD>
                          {operatingExpensesTotals.map((total, i) => (
                            <TD key={i} className="py-1.5 px-2 text-right italic text-muted-foreground">{rubFmt(total)}</TD>
                          ))}
                          <TD className="py-1.5 px-2 text-right italic text-muted-foreground">{rubFmt(operatingExpensesTotal)}</TD>
                        </TR>
                        {operatingExpensesCats.sort((a: any, b: any) => {
                          const aSum = months.map(mo => a.outflow.get(mo.key) || 0).reduce((sum: number, val: number) => sum + val, 0)
                          const bSum = months.map(mo => b.outflow.get(mo.key) || 0).reduce((sum: number, val: number) => sum + val, 0)
                          return bSum - aSum // Сортировка по убыванию
                        }).map((cat: any) => {
                          const catOutByMonth = months.map(mo => cat.outflow.get(mo.key) || 0)
                          const catOutSum = catOutByMonth.reduce((a: number, b: number) => a + b, 0)
                          const outflowArticles = [...cat.articles.values()].filter((a: any) => months.some(mo => (a.outflow.get(mo.key) || 0) > 0))
                          return (
                            <Fragment key={`cat-${cat.categoryId || 'none'}-out`}>
                              <TR>
                                <TD className="py-1.5 px-2 font-medium sticky left-0 bg-card z-10">
                                  <div className="flex items-center gap-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0"
                                      onClick={() => toggleCategory(`out-${cat.categoryId || 'none'}`)}
                                    >
                                      {isCategoryCollapsed(`out-${cat.categoryId || 'none'}`) ? (
                                        <ChevronRight className="h-4 w-4" />
                                      ) : (
                                        <ChevronDown className="h-4 w-4" />
                                      )}
                                    </Button>
                                    {cat.categoryName || 'Без категории'}
                                  </div>
                                </TD>
                                {catOutByMonth.map((v, i) => (<TD key={i} className="py-1.5 px-2 text-right">{rubFmt(v)}</TD>))}
                                <TD className="py-1.5 px-2 text-right font-semibold">{rubFmt(catOutSum)}</TD>
                              </TR>
                              {!isCategoryCollapsed(`out-${cat.categoryId || 'none'}`) && outflowArticles.sort((a: any, b: any) => {
                                const aSum = months.map(mo => a.outflow.get(mo.key) || 0).reduce((sum: number, val: number) => sum + val, 0)
                                const bSum = months.map(mo => b.outflow.get(mo.key) || 0).reduce((sum: number, val: number) => sum + val, 0)
                                return bSum - aSum // Сортировка по убыванию
                              }).map((art: any, idx: number) => {
                                const cells = months.map(mo => art.outflow.get(mo.key) || 0)
                                const sum = cells.reduce((a: number, b: number) => a + b, 0)
                                return (
                                  <TR key={`art-out-${actKey}-${art.articleId || 'none'}-${idx}`}>
                                    <TD className="py-1.5 pl-10 sticky left-0 bg-card z-10">{art.articleName || '—'}</TD>
                                    {cells.map((v: number, i: number) => (<TD key={i} className="py-1.5 px-2 text-right">{rubFmt(v)}</TD>))}
                                    <TD className="py-1.5 px-2 text-right">{rubFmt(sum)}</TD>
                                  </TR>
                                )
                              })}
                            </Fragment>
                          )
                        })}
                      </Fragment>
                    )}
                    
                    {/* Расходы для INVESTING и FINANCING */}
                    {(actKey === 'INVESTING' || actKey === 'FINANCING') && operatingExpensesCats.length > 0 && (
                      <Fragment key={`act-${actKey}-expenses`}>
                        <TR className="hover:bg-muted/30 transition-colors">
                          <TD className="py-1.5 px-2 italic text-muted-foreground sticky left-0 bg-card z-10 hover:bg-muted/30 transition-colors">Расходы</TD>
                          {operatingExpensesTotals.map((total, i) => (
                            <TD key={i} className="py-1.5 px-2 text-right italic text-muted-foreground">{rubFmt(total)}</TD>
                          ))}
                          <TD className="py-1.5 px-2 text-right italic text-muted-foreground">{rubFmt(operatingExpensesTotal)}</TD>
                        </TR>
                        {operatingExpensesCats.sort((a: any, b: any) => {
                          const aSum = months.map(mo => a.outflow.get(mo.key) || 0).reduce((sum: number, val: number) => sum + val, 0)
                          const bSum = months.map(mo => b.outflow.get(mo.key) || 0).reduce((sum: number, val: number) => sum + val, 0)
                          return bSum - aSum // Сортировка по убыванию
                        }).map((cat: any) => {
                          const catOutByMonth = months.map(mo => cat.outflow.get(mo.key) || 0)
                          const catOutSum = catOutByMonth.reduce((a: number, b: number) => a + b, 0)
                          const outflowArticles = [...cat.articles.values()].filter((a: any) => months.some(mo => (a.outflow.get(mo.key) || 0) > 0))
                          return (
                            <Fragment key={`cat-${cat.categoryId || 'none'}-out`}>
                              <TR className="hover:bg-muted/20 transition-colors">
                                <TD className="py-1.5 px-2 font-medium sticky left-0 bg-card z-10 hover:bg-muted/20 transition-colors">
                                  <div className="flex items-center gap-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0"
                                      onClick={() => toggleCategory(`out-${cat.categoryId || 'none'}`)}
                                    >
                                      {isCategoryCollapsed(`out-${cat.categoryId || 'none'}`) ? (
                                        <ChevronRight className="h-4 w-4" />
                                      ) : (
                                        <ChevronDown className="h-4 w-4" />
                                      )}
                                    </Button>
                                    {cat.categoryName || 'Без категории'}
                                  </div>
                                </TD>
                                {catOutByMonth.map((v, i) => (<TD key={i} className="py-1.5 px-2 text-right">{rubFmt(v)}</TD>))}
                                <TD className="py-1.5 px-2 text-right font-semibold">{rubFmt(catOutSum)}</TD>
                              </TR>
                              {!isCategoryCollapsed(`out-${cat.categoryId || 'none'}`) && outflowArticles.sort((a: any, b: any) => {
                                const aSum = months.map(mo => a.outflow.get(mo.key) || 0).reduce((sum: number, val: number) => sum + val, 0)
                                const bSum = months.map(mo => b.outflow.get(mo.key) || 0).reduce((sum: number, val: number) => sum + val, 0)
                                return bSum - aSum // Сортировка по убыванию
                              }).map((art: any, idx: number) => {
                                const cells = months.map(mo => art.outflow.get(mo.key) || 0)
                                const sum = cells.reduce((a: number, b: number) => a + b, 0)
                                return (
                                  <TR key={`art-out-${actKey}-${art.articleId || 'none'}-${idx}`}>
                                    <TD className="py-1.5 pl-10 sticky left-0 bg-card z-10">{art.articleName || '—'}</TD>
                                    {cells.map((v: number, i: number) => (<TD key={i} className="py-1.5 px-2 text-right">{rubFmt(v)}</TD>))}
                                    <TD className="py-1.5 px-2 text-right">{rubFmt(sum)}</TD>
                                  </TR>
                                )
                              })}
                            </Fragment>
                          )
                        })}
                      </Fragment>
                    )}
                    
                    {/* Итого по разделу */}
                    {(() => {
                      const inTotals = new Map<string, number>()
                      const outTotals = new Map<string, number>()
                      for (const cat of categories) {
                        for (const art of cat.articles.values()) {
                          for (const [mk, v] of art.inflow.entries()) inTotals.set(mk, (inTotals.get(mk) || 0) + v)
                          for (const [mk, v] of art.outflow.entries()) outTotals.set(mk, (outTotals.get(mk) || 0) + v)
                        }
                      }
                      const netTotals = months.map(mo => (inTotals.get(mo.key) || 0) - (outTotals.get(mo.key) || 0))
                      const netSum = netTotals.reduce((a, b) => a + b, 0)
                      return (
                        <TR key={`act-${actKey}-total`}>
                          <TD className="py-1.5 px-2 font-semibold sticky left-0 bg-card z-10">Итого по разделу</TD>
                          {netTotals.map((v, i) => (<TD key={i} className="py-1.5 px-2 text-right font-semibold">{rubFmt(v)}</TD>))}
                          <TD className="py-1.5 px-2 text-right font-semibold">{rubFmt(netSum)}</TD>
                        </TR>
                      )
                    })()}
                  </Fragment>
                )
              })}
              {(() => {
                // Рассчитываем общие суммы по месяцам для всех разделов
                const monthlyTotals = months.map(mo => {
                  let monthTotal = 0
                  for (const [actKey, entry] of grouped.entries()) {
                    const categories = [...entry.categories.values()]
                    const inflowCats = categories.filter((c: any) => months.some(m => (c.inflow.get(m.key) || 0) > 0))
                    const outflowCats = categories.filter((c: any) => months.some(m => (c.outflow.get(m.key) || 0) > 0))
                    
                    // Суммы по доходам
                    const inflowTotal = inflowCats.reduce((sum, cat) => sum + (cat.inflow.get(mo.key) || 0), 0)
                    
                    // Суммы по расходам
                    const outflowTotal = outflowCats.reduce((sum, cat) => sum + (cat.outflow.get(mo.key) || 0), 0)
                    
                    monthTotal += inflowTotal - outflowTotal
                  }
                  return monthTotal
                })
                
                // Пересчитываем общий итог из месячных сумм
                const recalculatedTotal = monthlyTotals.reduce((sum, monthTotal) => sum + monthTotal, 0)
                
                return (
                  <TR>
                    <TD className="py-1.5 px-2 font-semibold sticky left-0 bg-card z-10">Итого</TD>
                    {monthlyTotals.map((monthTotal, i) => (
                      <TD key={i} className="py-1.5 px-2 text-right font-semibold">{rubFmt(monthTotal)}</TD>
                    ))}
                    <TD className="py-1.5 px-2 text-right font-semibold">{rubFmt(recalculatedTotal)}</TD>
              </TR>
                )
              })()}
            </TBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
