import crypto from 'crypto'

export type IikoReportType = 'SALES' | 'TRANSACTIONS' | 'DELIVERIES'

export type IikoClientOptions = {
  host?: string
  login?: string
  passSha1?: string
  passPlain?: string
}

function sha1Hex(input: string): string {
  return crypto.createHash('sha1').update(input).digest('hex')
}

function toIsoDateTime(date: Date): string {
  // yyyy-MM-ddTHH:mm:ss.SSS (UTC)
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  const hh = String(date.getUTCHours()).padStart(2, '0')
  const mm = String(date.getUTCMinutes()).padStart(2, '0')
  const ss = String(date.getUTCSeconds()).padStart(2, '0')
  const ms = String(date.getUTCMilliseconds()).padStart(3, '0')
  return `${y}-${m}-${d}T${hh}:${mm}:${ss}.${ms}`
}

export function buildDayRangeIso(yyyyMmDd: string): { from: string; to: string } {
  const [y, m, d] = yyyyMmDd.split('-').map(x => Number(x))
  if (!y || !m || !d) throw new Error('Invalid date')
  const from = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0))
  const to = new Date(Date.UTC(y, m - 1, d + 1, 0, 0, 0, 0))
  return { from: toIsoDateTime(from), to: toIsoDateTime(to) }
}

export function buildMonthRangeIso(year: number, month: number): { from: string; to: string } {
  const from = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0))
  const to = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0)) // Первый день следующего месяца
  return { from: toIsoDateTime(from), to: toIsoDateTime(to) }
}

export class IikoClient {
  private host: string
  private login: string
  private passSha1: string
  private token: string | null = null
  private tokenTs = 0

  constructor(opts: IikoClientOptions = {}) {
    this.host = (opts.host || process.env.IIKO_HOST || '').replace(/\/$/, '')
    this.login = opts.login || process.env.IIKO_LOGIN || ''
    const passSha1 = opts.passSha1 || process.env.IIKO_PASS_SHA1
    const passPlain = opts.passPlain || process.env.IIKO_PASS
    if (passSha1) this.passSha1 = passSha1
    else if (passPlain) this.passSha1 = sha1Hex(passPlain)
    else this.passSha1 = ''
    if (!this.host || !this.login || !this.passSha1) {
      // Allow instantiation; requests will fail with explicit error
    }
  }

  private baseUrl(path: string): string {
    if (/^https?:\/\//i.test(path)) return path
    const p = path.startsWith('/') ? path : `/${path}`
    return `https://${this.host}${p}`
  }

  async getToken(): Promise<string> {
    const now = Date.now()
    // reuse token for 50 minutes
    if (this.token && now - this.tokenTs < 50 * 60 * 1000) return this.token
    if (!this.host || !this.login || !this.passSha1) {
      throw new Error('IIKO credentials are not configured')
    }
    const url = this.baseUrl(`/resto/api/auth?login=${encodeURIComponent(this.login)}&pass=${this.passSha1}`)
    const res = await fetch(url, { method: 'GET' })
    if (!res.ok) throw new Error(`iiko auth failed: ${res.status}`)
    const key = await res.text()
    if (!key || key.length < 8) throw new Error('iiko auth: empty token')
    this.token = key
    this.tokenTs = now
    return key
  }

  private async requestJson<T = any>(path: string, init?: RequestInit): Promise<T> {
    const key = await this.getToken()
    const url = new URL(this.baseUrl(path))
    url.searchParams.set('key', key)
    const res = await fetch(url, init)
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`iiko request failed ${res.status}: ${text?.slice(0, 200)}`)
    }
    return (await res.json()) as T
  }

  async getOlapColumns(reportType: IikoReportType): Promise<any> {
    return await this.requestJson(`/resto/api/v2/reports/olap/columns?reportType=${encodeURIComponent(reportType)}`)
  }

  async postOlap<T = any>(body: any): Promise<T> {
    const key = await this.getToken()
    const url = new URL(this.baseUrl('/resto/api/v2/reports/olap'))
    url.searchParams.set('key', key)
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`iiko olap failed ${res.status}: ${text?.slice(0, 200)}`)
    }
    return (await res.json()) as T
  }

  async getStoreBalances(params: { timestampIso: string; departmentIds?: string[]; storeIds?: string[]; productIds?: string[] }): Promise<any[]> {
    const url = new URL(this.baseUrl('/resto/api/v2/reports/balance/stores'))
    const key = await this.getToken()
    url.searchParams.set('key', key)
    url.searchParams.set('timestamp', params.timestampIso)
    for (const id of params.departmentIds || []) url.searchParams.append('department', id)
    for (const id of params.storeIds || []) url.searchParams.append('store', id)
    for (const id of params.productIds || []) url.searchParams.append('product', id)
    const res = await fetch(url)
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`iiko balances failed ${res.status}: ${text?.slice(0, 200)}`)
    }
    return (await res.json()) as any[]
  }

  async getRecipeTree(params: { date: string; productId: string; departmentId?: string }): Promise<any> {
    const key = await this.getToken()
    const url = new URL(this.baseUrl('/resto/api/v2/assemblyCharts/getTree'))
    url.searchParams.set('key', key)
    url.searchParams.set('date', params.date)
    url.searchParams.set('productId', params.productId)
    if (params.departmentId) url.searchParams.set('departmentId', params.departmentId)
    const res = await fetch(url)
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`iiko getTree failed ${res.status}: ${text?.slice(0, 200)}`)
    }
    return await res.json()
  }

  async getCashShifts(params: { openDateFrom: string; openDateTo: string; status?: string }): Promise<any[]> {
    const key = await this.getToken()
    const url = new URL(this.baseUrl('/resto/api/v2/cashshifts/list'))
    url.searchParams.set('key', key)
    url.searchParams.set('openDateFrom', params.openDateFrom)
    url.searchParams.set('openDateTo', params.openDateTo)
    url.searchParams.set('status', params.status || 'ANY')
    const res = await fetch(url)
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`iiko cashshifts failed ${res.status}: ${text?.slice(0, 200)}`)
    }
    return (await res.json()) as any[]
  }

  async getRecipePrepared(params: { date: string; productId: string; departmentId?: string }): Promise<any> {
    const key = await this.getToken()
    const url = new URL(this.baseUrl('/resto/api/v2/assemblyCharts/getPrepared'))
    url.searchParams.set('key', key)
    url.searchParams.set('date', params.date)
    url.searchParams.set('productId', params.productId)
    if (params.departmentId) url.searchParams.set('departmentId', params.departmentId)
    const res = await fetch(url)
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`iiko getPrepared failed ${res.status}: ${text?.slice(0, 200)}`)
    }
    return await res.json()
  }

  async listProducts(params?: { includeDeleted?: boolean }): Promise<any> {
    const includeDeleted = params?.includeDeleted ? 'true' : 'false'
    return await this.requestJson(`/resto/api/v2/entities/products/list?includeDeleted=${includeDeleted}`)
  }

  async listProductsByIds(ids: string[], includeDeleted = false): Promise<any> {
    const key = await this.getToken()
    const url = new URL(this.baseUrl('/resto/api/v2/entities/products/list'))
    url.searchParams.set('key', key)
    url.searchParams.set('includeDeleted', includeDeleted ? 'true' : 'false')
    for (const id of ids) url.searchParams.append('ids', id)
    const res = await fetch(url)
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`iiko products by ids failed ${res.status}: ${text?.slice(0, 200)}`)
    }
    return await res.json()
  }

  async listStores(params?: { includeDeleted?: boolean }): Promise<any> {
    const includeDeleted = params?.includeDeleted ? 'true' : 'false'
    // Known working path for stores in many versions:
    return await this.requestJson(`/resto/api/v2/reports/balance/stores?timestamp=${encodeURIComponent('2010-01-01T00:00:00')}`)
  }

  async salesSummary(dateIso: string): Promise<{ gross: number; net: number; discount: number }> {
    const { from, to } = buildDayRangeIso(dateIso)
    const body = {
      reportType: 'SALES',
      buildSummary: true,
      groupByRowFields: ['OpenDate.Typed'],
      groupByColFields: [],
      aggregateFields: ['DishSumInt', 'DishDiscountSumInt'],
      filters: {
        'OpenDate.Typed': { filterType: 'DateRange', periodType: 'CUSTOM', from, to },
        DeletedWithWriteoff: { filterType: 'IncludeValues', values: ['NOT_DELETED'] },
        OrderDeleted: { filterType: 'IncludeValues', values: ['NOT_DELETED'] }
      }
    }
    const j: any = await this.postOlap(body)
    const rows = Array.isArray(j?.data) ? j.data : []
    const gross = rows.reduce((a: number, r: any) => a + (Number(r?.DishSumInt) || 0), 0)
    const net = rows.reduce((a: number, r: any) => a + (Number(r?.DishDiscountSumInt) || 0), 0)
    return { gross, net, discount: gross - net }
  }

  async salesByHour(dateIso: string): Promise<Array<{ hour: string; net: number }>> {
    const { from, to } = buildDayRangeIso(dateIso)
    const body = {
      reportType: 'SALES',
      buildSummary: true,
      groupByRowFields: ['HourClose'],
      groupByColFields: [],
      aggregateFields: ['DishDiscountSumInt'],
      filters: {
        'OpenDate.Typed': { filterType: 'DateRange', periodType: 'CUSTOM', from, to },
        DeletedWithWriteoff: { filterType: 'IncludeValues', values: ['NOT_DELETED'] },
        OrderDeleted: { filterType: 'IncludeValues', values: ['NOT_DELETED'] }
      }
    }
    const j: any = await this.postOlap(body)
    const rows = Array.isArray(j?.data) ? j.data : []
    return rows
      .map((r: any) => ({ hour: String(r?.HourClose ?? '').padStart(2, '0'), net: Number(r?.DishDiscountSumInt) || 0 }))
      .sort((a: any, b: any) => a.hour.localeCompare(b.hour))
  }

  async salesByPaytype(dateIso: string): Promise<Array<{ payType: string; gross: number; net: number; discount: number }>> {
    const { from, to } = buildDayRangeIso(dateIso)
    const body = {
      reportType: 'SALES',
      buildSummary: true,
      groupByRowFields: ['PayTypes'],
      groupByColFields: [],
      aggregateFields: ['DishSumInt', 'DishDiscountSumInt'],
      filters: {
        'OpenDate.Typed': { filterType: 'DateRange', periodType: 'CUSTOM', from, to },
        DeletedWithWriteoff: { filterType: 'IncludeValues', values: ['NOT_DELETED'] },
        OrderDeleted: { filterType: 'IncludeValues', values: ['NOT_DELETED'] }
      }
    }
    const j: any = await this.postOlap(body)
    const rows = Array.isArray(j?.data) ? j.data : []
    return rows.map((r: any) => {
      const gross = Number(r?.DishSumInt) || 0
      const net = Number(r?.DishDiscountSumInt) || 0
      return { payType: r?.PayTypes || '(n/a)', gross, net, discount: gross - net }
    })
  }

  async salesByWaiter(dateIso: string): Promise<Array<{ waiter: string; net: number }>> {
    const { from, to } = buildDayRangeIso(dateIso)
    const body = {
      reportType: 'SALES',
      buildSummary: true,
      groupByRowFields: ['WaiterName'],
      groupByColFields: [],
      aggregateFields: ['DishDiscountSumInt'],
      filters: {
        'OpenDate.Typed': { filterType: 'DateRange', periodType: 'CUSTOM', from, to },
        DeletedWithWriteoff: { filterType: 'IncludeValues', values: ['NOT_DELETED'] },
        OrderDeleted: { filterType: 'IncludeValues', values: ['NOT_DELETED'] }
      }
    }
    const j: any = await this.postOlap(body)
    const rows = Array.isArray(j?.data) ? j.data : []
    return rows
      .map((r: any) => ({ waiter: r?.WaiterName || '(n/a)', net: Number(r?.DishDiscountSumInt) || 0 }))
      .sort((a: any, b: any) => b.net - a.net)
  }

  async salesRevenueByDay(year: number, month: number): Promise<Array<{ date: string; net: number; gross: number; discount: number }>> {
    const { from, to } = buildMonthRangeIso(year, month)
    const body = {
      reportType: 'SALES',
      buildSummary: true,
      groupByRowFields: ['OpenDate.Typed'],
      groupByColFields: [],
      aggregateFields: ['DishSumInt', 'DishDiscountSumInt'],
      filters: {
        'OpenDate.Typed': { filterType: 'DateRange', periodType: 'CUSTOM', from, to },
        DeletedWithWriteoff: { filterType: 'IncludeValues', values: ['NOT_DELETED'] },
        OrderDeleted: { filterType: 'IncludeValues', values: ['NOT_DELETED'] }
      }
    }
    const j: any = await this.postOlap(body)
    const rows = Array.isArray(j?.data) ? j.data : []
    return rows
      .map((r: any) => {
        // Пробуем разные варианты названий поля даты
        const dateStr = String(r?.OpenDate_Typed || r?.OpenDate || r?.['OpenDate.Typed'] || '')
        const gross = Number(r?.DishSumInt) || 0
        const net = Number(r?.DishDiscountSumInt) || 0
        return { 
          date: dateStr, 
          net, 
          gross, 
          discount: gross - net 
        }
      })
      .sort((a: any, b: any) => a.date.localeCompare(b.date))
  }

  async salesReturnsByDay(year: number, month: number): Promise<Array<{ date: string; net: number; gross: number; discount: number }>> {
    const { from, to } = buildMonthRangeIso(year, month)
    const body = {
      reportType: 'SALES',
      buildSummary: true,
      groupByRowFields: ['OpenDate.Typed'],
      groupByColFields: [],
      aggregateFields: ['DishSumInt', 'DishDiscountSumInt', 'DishReturnSum'],
      filters: {
        'OpenDate.Typed': { filterType: 'DateRange', periodType: 'CUSTOM', from, to },
        Storned: { filterType: 'IncludeValues', values: ['TRUE'] }
      }
    }
    const j: any = await this.postOlap(body)
    const rows = Array.isArray(j?.data) ? j.data : []
    return rows
      .map((r: any) => {
        const dateStr = String(r?.OpenDate_Typed || r?.OpenDate || r?.['OpenDate.Typed'] || '')
        const gross = Number(r?.DishSumInt) || 0
        const net = Number(r?.DishReturnSum) || 0 // Для возвратов используем DishReturnSum
        return { 
          date: dateStr, 
          net, 
          gross, 
          discount: gross - net 
        }
      })
      .sort((a: any, b: any) => a.date.localeCompare(b.date))
  }

  async salesDeletedByDay(year: number, month: number): Promise<Array<{ date: string; net: number; gross: number; discount: number }>> {
    const { from, to } = buildMonthRangeIso(year, month)
    const body = {
      reportType: 'SALES',
      buildSummary: true,
      groupByRowFields: ['OpenDate.Typed'],
      groupByColFields: [],
      aggregateFields: ['DishSumInt', 'DishDiscountSumInt'],
      filters: {
        'OpenDate.Typed': { filterType: 'DateRange', periodType: 'CUSTOM', from, to },
        OrderDeleted: { filterType: 'IncludeValues', values: ['DELETED'] }
      }
    }
    const j: any = await this.postOlap(body)
    const rows = Array.isArray(j?.data) ? j.data : []
    return rows
      .map((r: any) => {
        const dateStr = String(r?.OpenDate_Typed || r?.OpenDate || r?.['OpenDate.Typed'] || '')
        const gross = Number(r?.DishSumInt) || 0
        const net = Number(r?.DishSumInt) || 0 // Для удаленных используем DishSumInt (оригинальная сумма)
        return { 
          date: dateStr, 
          net, 
          gross, 
          discount: gross - net 
        }
      })
      .sort((a: any, b: any) => a.date.localeCompare(b.date))
  }

  async salesTotalByDay(year: number, month: number): Promise<Array<{ date: string; net: number; gross: number; discount: number }>> {
    const { from, to } = buildMonthRangeIso(year, month)
    const body = {
      reportType: 'SALES',
      buildSummary: true,
      groupByRowFields: ['OpenDate.Typed'],
      groupByColFields: [],
      aggregateFields: ['DishSumInt', 'DishDiscountSumInt', 'DishReturnSum'],
      filters: {
        'OpenDate.Typed': { filterType: 'DateRange', periodType: 'CUSTOM', from, to }
        // Без фильтров - получаем все данные
      }
    }
    const j: any = await this.postOlap(body)
    const rows = Array.isArray(j?.data) ? j.data : []
    return rows
      .map((r: any) => {
        const dateStr = String(r?.OpenDate_Typed || r?.OpenDate || r?.['OpenDate.Typed'] || '')
        const gross = Number(r?.DishSumInt) || 0
        const net = Number(r?.DishDiscountSumInt) || 0
        const returnSum = Number(r?.DishReturnSum) || 0
        
        // Для общего итога: выручка + возвраты + удаленные
        // Возвраты уже учтены в DishDiscountSumInt как отрицательные значения
        return { 
          date: dateStr, 
          net: net + returnSum, // Добавляем возвраты
          gross, 
          discount: gross - net 
        }
      })
      .sort((a: any, b: any) => a.date.localeCompare(b.date))
  }
}


