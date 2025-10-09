"use client"
import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Paperclip } from 'lucide-react'
import { api } from '@/lib/api-client'

function ymd(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default function CashflowClient() {
  const spreadsheetId = '1vEuHUs31i9DVxLebJ9AxHiOYXCJxQR094NhY8u3IPi8'
  const sheet = 'ДДС месяц'

  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [wallet, setWallet] = useState('')
  const [fund, setFund] = useState('')
  const [flowType, setFlowType] = useState('')
  const [search, setSearch] = useState('')
  const [incompleteTransfer, setIncompleteTransfer] = useState('')
  const [notImported, setNotImported] = useState('')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(50)
  const [rows, setRows] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [meta, setMeta] = useState<{ minDate: string|null; maxDate: string|null; wallets: string[]; funds: string[]; flowTypes: string[] } | null>(null)
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<string | null>(null)
  const [loadingToTransactions, setLoadingToTransactions] = useState(false)
  const [loadingToPayments, setLoadingToPayments] = useState(false)

  async function loadMeta() {
    const j: any = await api.get('/api/gsheets/cashflow/meta', { 
      params: { spreadsheetId, sheet } 
    })
    setMeta(j)
    if (!dateFrom && j?.minDate) setDateFrom(j.minDate.slice(0,10))
    if (!dateTo && j?.maxDate) setDateTo(j.maxDate.slice(0,10))
  }

  async function load() {
    setLoading(true)
    try {
      const params: any = { spreadsheetId, sheet, page: String(page), limit: String(limit) }
      if (dateFrom) params.dateFrom = dateFrom
      if (dateTo) params.dateTo = dateTo
      if (wallet) params.wallet = wallet
      if (fund) params.fund = fund
      if (flowType) params.flowType = flowType
      if (search) params.search = search
      if (incompleteTransfer) params.incompleteTransfer = incompleteTransfer
      if (notImported) params.notImported = notImported
      
      const j: any = await api.get('/api/gsheets/cashflow', { params })
      setRows(Array.isArray(j?.rows) ? j.rows : [])
      setTotal(Number(j?.total || 0))
    } catch {
      setRows([]); setTotal(0)
    }
    setLoading(false)
  }

  async function refreshData() {
    setImporting(true)
    setImportResult(null)
    try {
      // Сначала очищаем старые данные
      setImportResult('🗑️ Очистка старых данных...')
      await api.post('/api/gsheets/cashflow/clear', { spreadsheetId, gid: '0' })
      
      // Затем импортируем новые данные
      setImportResult('🔄 Импорт новых данных...')
      const result: any = await api.post('/api/gsheets/cashflow/import', {
        spreadsheetId,
        gid: '0',
        from: 5,
        to: 15000
      })
      
      setImportResult(`✅ Обновление завершено! Обработано строк: ${result.processed || 'неизвестно'}`)
      await loadMeta()
      await load()
    } catch (error) {
      setImportResult(`❌ Ошибка обновления: ${error}`)
    }
    setImporting(false)
  }

  async function loadToTransactions() {
    setLoadingToTransactions(true)
    setImportResult(null)
    try {
      // Сначала удаляем все транзакции
      setImportResult('🗑️ Удаление старых транзакций...')
      await api.post('/api/transactions/clear', {})
      
      // Затем загружаем данные из Google Sheets в транзакции
      setImportResult('📊 Загрузка данных в транзакции...')
      const result: any = await api.post('/api/transactions/load-from-gsheets', { spreadsheetId, gid: '0' })
      
      const transferInfo = result.fullPairs ? `, обработано переводов: ${result.fullPairs}` : ''
      const incompleteInfo = result.incompletePairs ? `, неполных переводов: ${result.incompletePairs}` : ''
      setImportResult(`✅ Загрузка завершена! Создано транзакций: ${result.created || 'неизвестно'}${transferInfo}${incompleteInfo}`)
    } catch (error) {
      setImportResult(`❌ Ошибка загрузки в транзакции: ${error}`)
    }
    setLoadingToTransactions(false)
  }

  async function loadToPayments() {
    setLoadingToPayments(true)
    setImportResult(null)
    try {
      // Загружаем расходы из Google Sheets в ExpenseDoc + Payment
      setImportResult('📊 Загрузка расходов в платежи...')
      const result: any = await api.post('/api/payments/load-from-gsheets', { spreadsheetId, gid: '0' })
      
      const transferInfo = result.fullPairs ? `\nПолных переводов: ${result.fullPairs}` : ''
      const incompleteInfo = result.incompletePairs ? `\nНеполных переводов: ${result.incompletePairs}` : ''
      setImportResult(`✅ Загрузка завершена!\nУдалено платежей: ${result.deletedPayments}\nУдалено документов: ${result.deletedDocs}\nСоздано документов расходов: ${result.createdDocs}\nСоздано платежей: ${result.createdPayments}${transferInfo}${incompleteInfo}\nПропущено: ${result.skipped}`)
      await load()
    } catch (error) {
      setImportResult(`❌ Ошибка загрузки в платежи: ${error}`)
    }
    setLoadingToPayments(false)
  }

  useEffect(() => { loadMeta() }, [])
  useEffect(() => { load() }, [dateFrom, dateTo, wallet, fund, flowType, search, incompleteTransfer, notImported, page, limit])

  const pages = useMemo(() => Math.max(1, Math.ceil(total / Math.max(1, limit))), [total, limit])

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold">ДДС (Google)</h1>
          <a 
            href={`https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit#gid=0`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-500 hover:text-gray-700 transition-colors"
            title="Открыть таблицу в Google Sheets"
          >
            <Paperclip size={18} />
          </a>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            onClick={refreshData}
            disabled={importing || loadingToTransactions}
          >
            {importing ? 'Обновление...' : 'Обновить из Google Sheets'}
          </Button>
          <Button 
            onClick={loadToTransactions}
            disabled={importing || loadingToTransactions || loadingToPayments}
            variant="secondary"
          >
            {loadingToTransactions ? 'Загрузка...' : 'Загрузить в транзакции'}
          </Button>
          <Button 
            onClick={loadToPayments}
            disabled={importing || loadingToTransactions || loadingToPayments}
            variant="secondary"
          >
            {loadingToPayments ? 'Загрузка...' : 'Загрузить в платежи'}
          </Button>
        </div>
      </div>
      
      {importResult && (
        <div className={`p-3 rounded ${importResult.includes('✅') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {importResult}
        </div>
      )}
      <div className="grid grid-cols-2 md:grid-cols-7 gap-2">
        <div>
          <label className="block text-xs text-muted-foreground">С даты</label>
          <input type="date" value={dateFrom} onChange={e => { setPage(1); setDateFrom(e.target.value) }} className="border rounded px-2 py-1 w-full" />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground">По дату</label>
          <input type="date" value={dateTo} onChange={e => { setPage(1); setDateTo(e.target.value) }} className="border rounded px-2 py-1 w-full" />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground">Кошелёк</label>
          <select value={wallet} onChange={e => { setPage(1); setWallet(e.target.value) }} className="border rounded px-2 py-1 w-full">
            <option value="">—</option>
            {(meta?.wallets || []).map(w => <option key={w} value={w}>{w}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-muted-foreground">Фонд</label>
          <select value={fund} onChange={e => { setPage(1); setFund(e.target.value) }} className="border rounded px-2 py-1 w-full">
            <option value="">—</option>
            {(meta?.funds || []).map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-muted-foreground">Тип потока</label>
          <select value={flowType} onChange={e => { setPage(1); setFlowType(e.target.value) }} className="border rounded px-2 py-1 w-full">
            <option value="">—</option>
            {(meta?.flowTypes || []).map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-muted-foreground">Поиск</label>
          <input type="text" value={search} onChange={e => { setPage(1); setSearch(e.target.value) }} placeholder="Поставщик/комментарий" className="border rounded px-2 py-1 w-full" />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground">Неполные переводы</label>
          <select value={incompleteTransfer} onChange={e => { setPage(1); setIncompleteTransfer(e.target.value) }} className="border rounded px-2 py-1 w-full">
            <option value="">—</option>
            <option value="true">Только неполные</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-muted-foreground">Не импортировано</label>
          <select value={notImported} onChange={e => { setPage(1); setNotImported(e.target.value) }} className="border rounded px-2 py-1 w-full">
            <option value="">—</option>
            <option value="true">Только не импортированные</option>
          </select>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Всего: {total}</span>
        <div className="ml-auto flex items-center gap-2">
          <label className="text-sm">На странице:</label>
          <select value={limit} onChange={e => { setPage(1); setLimit(Number(e.target.value) || 50) }} className="border rounded px-2 py-1">
            {[25,50,100,200].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
          <button disabled={page<=1} onClick={() => setPage(p => Math.max(1, p-1))} className="border rounded px-2 py-1">←</button>
          <span className="text-sm">{page}/{pages}</span>
          <button disabled={page>=pages} onClick={() => setPage(p => Math.min(pages, p+1))} className="border rounded px-2 py-1">→</button>
        </div>
      </div>

      <div className="overflow-auto border rounded">
        <table className="min-w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="text-left px-2 py-1">Месяц</th>
              <th className="text-left px-2 py-1">Дата</th>
              <th className="text-left px-2 py-1">Сумма</th>
              <th className="text-left px-2 py-1">Кошелёк</th>
              <th className="text-left px-2 py-1">Поставщик</th>
              <th className="text-left px-2 py-1">Комментарий</th>
              <th className="text-left px-2 py-1">Фонд</th>
              <th className="text-left px-2 py-1">Тип</th>
              <th className="text-left px-2 py-1">Статус</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => {
              const amt = typeof r.amount === 'number' ? (r.amount/100).toFixed(2) : ''
              const d = r.date ? String(r.date).slice(0,10) : r.dateText || ''
              const rawData = r.raw ? JSON.parse(r.raw || '{}') : {}
              const isIncomplete = rawData.incompleteTransfer
              const transferType = rawData.transferType
              const isNotImported = rawData.notImported
              const notImportedReason = rawData.notImportedReason
              return (
                <tr key={r.id || idx} className={`border-t ${isIncomplete ? 'bg-yellow-50' : isNotImported ? 'bg-red-50' : ''}`}>
                  <td className="px-2 py-1 whitespace-nowrap">{r.monthName || '—'}</td>
                  <td className="px-2 py-1 whitespace-nowrap">{d}</td>
                  <td className="px-2 py-1 whitespace-nowrap">{amt}</td>
                  <td className="px-2 py-1">{r.wallet || ''}</td>
                  <td className="px-2 py-1">{r.supplier || ''}</td>
                  <td className="px-2 py-1">{r.comment || ''}</td>
                  <td className="px-2 py-1">{r.fund || ''}</td>
                  <td className="px-2 py-1">{r.flowType || ''}</td>
                  <td className="px-2 py-1">
                    {isIncomplete && (
                      <span className="text-xs text-orange-600" title={`Неполный перевод: ${transferType === 'outgoing_only' ? 'только выбытие' : 'только поступление'}`}>
                        ⚠️ Неполный перевод
                      </span>
                    )}
                    {isNotImported && (
                      <span className="text-xs text-red-600" title={`Не импортировано: ${notImportedReason}`}>
                        ❌ {notImportedReason === 'income_not_expense' ? 'Доход' : 
                            notImportedReason === 'transfer' ? 'Перевод' : 
                            notImportedReason === 'category_not_found' ? 'Нет категории' : 
                            notImportedReason === 'duplicate' ? 'Дубликат' : 
                            'Не импортировано'}
                      </span>
                    )}
                  </td>
                </tr>
              )
            })}
            {rows.length === 0 && (
              <tr><td className="px-2 py-4 text-muted-foreground" colSpan={9}>{loading ? 'Загрузка…' : 'Нет данных'}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}


