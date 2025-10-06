import { getApiBase } from '../../lib/api'
"use client"

import { useEffect, useState, useMemo, Fragment } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { ChevronDown, ChevronRight } from 'lucide-react'

const MONTHS = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь']

export default function PnlClient({ initialYFrom, initialMFrom, initialYTo, initialMTo }: { 
  initialYFrom: number
  initialMFrom: number
  initialYTo: number
  initialMTo: number
}) {
  const [yFrom, setYFrom] = useState(initialYFrom)
  const [mFrom, setMFrom] = useState(initialMFrom)
  const [yTo, setYTo] = useState(initialYTo)
  const [mTo, setMTo] = useState(initialMTo)
  const [data, setData] = useState<any>(null)
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
  
  function expandAllCategories() {
    setCollapsedCategories(new Set<string>())
  }
  
  function collapseAllCategories() {
    if (!data?.expenseDetails) return
    const allCategoryIds = new Set<string>(
      data.expenseDetails.map((r: any) => String(r.categoryId))
    )
    setCollapsedCategories(allCategoryIds)
  }

  async function reload() {
    const res = await fetch(`${API_BASE}/api/reports/pnl?yFrom=${yFrom}&mFrom=${mFrom}&yTo=${yTo}&mTo=${mTo}`, { credentials: 'include' })
    const json = await res.json()
    setData(json)
  }

  useEffect(() => { reload() }, [yFrom, mFrom, yTo, mTo])

  // Группировка expenseDetails по kind → категориям → статьям для раскрывашек
  const groupedExpenses = useMemo(() => {
    if (!data?.expenseDetails) return null
    
    const kindMap = new Map<string, Map<string, { 
      categoryId: string;
      categoryName: string; 
      articles: Map<string, { articleId: string; articleName: string; byMonth: Map<string, number> }>;
      totalByMonth: Map<string, number>;
    }>>()
    
    for (const row of data.expenseDetails) {
      const monthKey = `${row.year}-${String(row.month).padStart(2,'0')}`
      
      if (!kindMap.has(row.kind)) {
        kindMap.set(row.kind, new Map())
      }
      
      const categoryMap = kindMap.get(row.kind)!
      
      if (!categoryMap.has(row.categoryId)) {
        categoryMap.set(row.categoryId, {
          categoryId: row.categoryId,
          categoryName: row.categoryName,
          articles: new Map(),
          totalByMonth: new Map()
        })
      }
      
      const category = categoryMap.get(row.categoryId)!
      
      if (!category.articles.has(row.articleId)) {
        category.articles.set(row.articleId, {
          articleId: row.articleId,
          articleName: row.articleName,
          byMonth: new Map()
        })
      }
      
      const article = category.articles.get(row.articleId)!
      article.byMonth.set(monthKey, (article.byMonth.get(monthKey) || 0) + row.amount)
      category.totalByMonth.set(monthKey, (category.totalByMonth.get(monthKey) || 0) + row.amount)
    }
    
    return kindMap
  }, [data])

  if (!data) return <div>Загрузка...</div>

  const { months, revenue, expenses } = data

  // Подсчёт итогов
  const calcTotal = (byMonth: Record<string, number>) => {
    return months.reduce((sum: number, mo: any) => sum + (byMonth[mo.key] || 0), 0)
  }

  const revenueTotal = calcTotal(revenue.byMonth)
  const cogsTotal = calcTotal(expenses.cogs.byMonth)
  const grossProfitByMonth: Record<string, number> = {}
  months.forEach((mo: any) => {
    grossProfitByMonth[mo.key] = (revenue.byMonth[mo.key] || 0) - (expenses.cogs.byMonth[mo.key] || 0)
  })
  const grossProfitTotal = calcTotal(grossProfitByMonth)
  
  const opexTotal = calcTotal(expenses.opex.byMonth)
  const operatingProfitByMonth: Record<string, number> = {}
  months.forEach((mo: any) => {
    operatingProfitByMonth[mo.key] = grossProfitByMonth[mo.key] - (expenses.opex.byMonth[mo.key] || 0)
  })
  const operatingProfitTotal = calcTotal(operatingProfitByMonth)
  
  const taxTotal = calcTotal(expenses.tax.byMonth)
  const feeTotal = calcTotal(expenses.fee.byMonth)
  const otherTotal = calcTotal(expenses.other.byMonth)
  const capexTotal = calcTotal(expenses.capex.byMonth)
  const netProfitByMonth: Record<string, number> = {}
  months.forEach((mo: any) => {
    netProfitByMonth[mo.key] = operatingProfitByMonth[mo.key] - (expenses.tax.byMonth[mo.key] || 0) - (expenses.fee.byMonth[mo.key] || 0) - (expenses.other.byMonth[mo.key] || 0)
  })
  const netProfitTotal = calcTotal(netProfitByMonth)

  // Helper для рендеринга категорий с раскрывашками
  const renderCategoryRows = (kind: string) => {
    if (!groupedExpenses) return null
    const categoriesForKind = groupedExpenses.get(kind)
    if (!categoriesForKind) return null
    
    // Сортируем категории по убыванию суммы
    const sortedCategories = Array.from(categoriesForKind.values()).sort((a, b) => {
      const totalA = Array.from(a.totalByMonth.values()).reduce((sum, val) => sum + val, 0)
      const totalB = Array.from(b.totalByMonth.values()).reduce((sum, val) => sum + val, 0)
      return totalB - totalA
    })
    
    return sortedCategories.map(category => {
      const isCollapsed = collapsedCategories.has(category.categoryId)
      const categoryTotal = Array.from(category.totalByMonth.values()).reduce((sum, val) => sum + val, 0)
      
      // Сортируем статьи по убыванию суммы
      const sortedArticles = Array.from(category.articles.values()).sort((a, b) => {
        const totalA = Array.from(a.byMonth.values()).reduce((sum, val) => sum + val, 0)
        const totalB = Array.from(b.byMonth.values()).reduce((sum, val) => sum + val, 0)
        return totalB - totalA
      })
      
      return (
        <Fragment key={category.categoryId}>
          {/* Категория */}
          <TR className="hover:bg-muted/20 transition-colors">
            <TD className="pl-6 py-1.5 sticky left-0 bg-card">
              <button
                onClick={() => toggleCategory(category.categoryId)}
                className="inline-flex items-center gap-1 hover:text-primary"
              >
                {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                <span>{category.categoryName}</span>
              </button>
            </TD>
            {months.map((mo: any) => (
              <TD key={mo.key} className="text-right py-1.5">−{rubFmt(category.totalByMonth.get(mo.key) || 0)}</TD>
            ))}
            <TD className="text-right py-1.5">−{rubFmt(categoryTotal)}</TD>
          </TR>
          
          {/* Статьи (раскрываемые) */}
          {!isCollapsed && sortedArticles.map(article => {
            const articleTotal = Array.from(article.byMonth.values()).reduce((sum, val) => sum + val, 0)
            return (
              <TR key={article.articleId} className="hover:bg-muted/10 transition-colors">
                <TD className="pl-12 py-1 text-sm text-muted-foreground sticky left-0 bg-card">{article.articleName}</TD>
                {months.map((mo: any) => (
                  <TD key={mo.key} className="text-right py-1 text-sm text-muted-foreground">−{rubFmt(article.byMonth.get(mo.key) || 0)}</TD>
                ))}
                <TD className="text-right py-1 text-sm text-muted-foreground">−{rubFmt(articleTotal)}</TD>
              </TR>
            )
          })}
        </Fragment>
      )
    })
  }

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
                <TH className="h-8 px-2 w-[300px] sticky left-0 bg-card z-20">Показатель</TH>
                {months.map((mo: any) => (
                  <TH key={mo.key} className="h-8 px-2 text-right w-[140px]">{mo.label}</TH>
                ))}
                <TH className="h-8 px-2 text-right w-[160px]">Итого</TH>
              </TR>
            </THead>
            <TBody>
              {/* Выручка */}
              <TR className="hover:bg-muted/30 transition-colors">
                <TD className="font-bold py-1.5 sticky left-0 bg-card">ВЫРУЧКА (нетто)</TD>
                {months.map((mo: any) => (
                  <TD key={mo.key} className="text-right py-1.5 font-bold">{rubFmt(revenue.byMonth[mo.key] || 0)}</TD>
                ))}
                <TD className="text-right py-1.5 font-bold">{rubFmt(revenueTotal)}</TD>
              </TR>
              {Object.entries(revenue.byChannelByMonth || {})
                .sort(([, byMonthA]: any, [, byMonthB]: any) => calcTotal(byMonthB) - calcTotal(byMonthA))
                .map(([channel, byMonth]: any) => (
                <TR key={channel} className="hover:bg-muted/20 transition-colors">
                  <TD className="pl-8 py-1.5 sticky left-0 bg-card">{channel}</TD>
                  {months.map((mo: any) => (
                    <TD key={mo.key} className="text-right py-1.5">{rubFmt(byMonth[mo.key] || 0)}</TD>
                  ))}
                  <TD className="text-right py-1.5">{rubFmt(calcTotal(byMonth))}</TD>
                </TR>
              ))}

              {/* COGS */}
              <TR className="hover:bg-muted/30 transition-colors">
                <TD className="font-bold py-1.5 sticky left-0 bg-card">Себестоимость (COGS)</TD>
                {months.map((mo: any) => (
                  <TD key={mo.key} className="text-right py-1.5 font-bold">−{rubFmt(expenses.cogs.byMonth[mo.key] || 0)}</TD>
                ))}
                <TD className="text-right py-1.5 font-bold">−{rubFmt(cogsTotal)}</TD>
              </TR>
              {renderCategoryRows('COGS')}

              {/* Валовая прибыль */}
              <TR className="bg-muted/50 hover:bg-muted/70 transition-colors border-t">
                <TD className="font-bold py-1.5 sticky left-0 bg-muted">ВАЛОВАЯ ПРИБЫЛЬ</TD>
                {months.map((mo: any) => (
                  <TD key={mo.key} className="text-right py-1.5 font-bold bg-muted/50">{rubFmt(grossProfitByMonth[mo.key] || 0)}</TD>
                ))}
                <TD className="text-right py-1.5 font-bold bg-muted/50">{rubFmt(grossProfitTotal)}</TD>
              </TR>

              {/* OPEX */}
              <TR className="hover:bg-muted/30 transition-colors">
                <TD className="font-bold py-1.5 sticky left-0 bg-card">Операционные расходы (OPEX)</TD>
                {months.map((mo: any) => (
                  <TD key={mo.key} className="text-right py-1.5 font-bold">−{rubFmt(expenses.opex.byMonth[mo.key] || 0)}</TD>
                ))}
                <TD className="text-right py-1.5 font-bold">−{rubFmt(opexTotal)}</TD>
              </TR>
              {renderCategoryRows('OPEX')}

              {/* Операционная прибыль */}
              <TR className="bg-muted/50 hover:bg-muted/70 transition-colors border-t">
                <TD className="font-bold py-1.5 sticky left-0 bg-muted">ОПЕРАЦИОННАЯ ПРИБЫЛЬ</TD>
                {months.map((mo: any) => (
                  <TD key={mo.key} className="text-right py-1.5 font-bold bg-muted/50">{rubFmt(operatingProfitByMonth[mo.key] || 0)}</TD>
                ))}
                <TD className="text-right py-1.5 font-bold bg-muted/50">{rubFmt(operatingProfitTotal)}</TD>
              </TR>

              {/* Прочие расходы */}
              {(feeTotal > 0 || taxTotal > 0 || otherTotal > 0) && (
                <>
                  {feeTotal > 0 && (
                    <>
                      <TR className="hover:bg-muted/30 transition-colors">
                        <TD className="font-semibold py-1.5 sticky left-0 bg-card">Комиссии и сборы</TD>
                        {months.map((mo: any) => (
                          <TD key={mo.key} className="text-right py-1.5 font-semibold">−{rubFmt(expenses.fee.byMonth[mo.key] || 0)}</TD>
                        ))}
                        <TD className="text-right py-1.5 font-semibold">−{rubFmt(feeTotal)}</TD>
                      </TR>
                      {renderCategoryRows('FEE')}
                    </>
                  )}

                  {taxTotal > 0 && (
                    <>
                      <TR className="hover:bg-muted/30 transition-colors">
                        <TD className="font-semibold py-1.5 sticky left-0 bg-card">Налоги</TD>
                        {months.map((mo: any) => (
                          <TD key={mo.key} className="text-right py-1.5 font-semibold">−{rubFmt(expenses.tax.byMonth[mo.key] || 0)}</TD>
                        ))}
                        <TD className="text-right py-1.5 font-semibold">−{rubFmt(taxTotal)}</TD>
                      </TR>
                      {renderCategoryRows('TAX')}
                    </>
                  )}

                  {otherTotal > 0 && (
                    <>
                      <TR className="hover:bg-muted/30 transition-colors">
                        <TD className="font-semibold py-1.5 sticky left-0 bg-card">Прочие расходы</TD>
                        {months.map((mo: any) => (
                          <TD key={mo.key} className="text-right py-1.5 font-semibold">−{rubFmt(expenses.other.byMonth[mo.key] || 0)}</TD>
                        ))}
                        <TD className="text-right py-1.5 font-semibold">−{rubFmt(otherTotal)}</TD>
                      </TR>
                      {renderCategoryRows('OTHER')}
                    </>
                  )}
                </>
              )}

              {/* Чистая прибыль */}
              <TR className="bg-muted/50 hover:bg-muted/70 transition-colors border-t-2">
                <TD className="font-bold py-2 sticky left-0 bg-muted/50">ЧИСТАЯ ПРИБЫЛЬ</TD>
                {months.map((mo: any) => (
                  <TD key={mo.key} className="text-right py-2 font-bold bg-muted/50">{rubFmt(netProfitByMonth[mo.key] || 0)}</TD>
                ))}
                <TD className="text-right py-2 font-bold bg-muted/50">{rubFmt(netProfitTotal)}</TD>
              </TR>
            </TBody>
          </Table>

          {/* CAPEX отдельно (не влияет на прибыль, но показываем для информации) */}
          {capexTotal > 0 && (
            <div className="mt-6 pt-6 border-t">
              <h3 className="font-bold mb-3 text-muted-foreground">Капитальные расходы (не влияют на P&L):</h3>
              <Table className="w-full table-fixed">
                <THead className="sticky top-0 bg-card z-10">
                  <TR>
                    <TH className="h-8 px-2 w-[300px] sticky left-0 bg-card z-20">Категория</TH>
                    {months.map((mo: any) => (
                      <TH key={mo.key} className="h-8 px-2 text-right w-[140px]">{mo.label}</TH>
                    ))}
                    <TH className="h-8 px-2 text-right w-[160px]">Итого</TH>
                  </TR>
                </THead>
                <TBody>
                  {renderCategoryRows('CAPEX')?.map(element => {
                    // Убираем минусы для CAPEX (информационный раздел)
                    return element
                  })}
                  <TR className="border-t hover:bg-muted/30 transition-colors">
                    <TD className="font-bold py-1.5 sticky left-0 bg-card">Итого CAPEX</TD>
                    {months.map((mo: any) => (
                      <TD key={mo.key} className="text-right py-1.5 font-bold">{rubFmt(expenses.capex.byMonth[mo.key] || 0)}</TD>
                    ))}
                    <TD className="text-right py-1.5 font-bold">{rubFmt(capexTotal)}</TD>
                  </TR>
                </TBody>
              </Table>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
