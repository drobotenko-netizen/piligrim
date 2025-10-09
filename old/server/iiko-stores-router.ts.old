import { Router } from 'express'

export function createIikoStoresRouter(client: any) {
  const router = Router()

  router.get('/balances', async (req, res) => {
    const timestamp = String(req.query.timestamp || '').trim()
    if (!timestamp) return res.status(400).json({ error: 'timestamp required (yyyy-MM-ddTHH:mm:ss.SSS)' })
    try {
      const departments: string[] = ([] as any[]).concat(req.query.department || []).map(String)
      const stores: string[] = ([] as any[]).concat(req.query.store || []).map(String)
      const products: string[] = ([] as any[]).concat(req.query.product || []).map(String)
      const data = await client.getStoreBalances({ timestampIso: timestamp, departmentIds: departments, storeIds: stores, productIds: products })
      res.json({ timestamp, rows: data })
    } catch (e: any) {
      res.status(500).json({ error: String(e?.message || e) })
    }
  })

  router.post('/consumption', async (req, res) => {
    try {
      const fromDate = String(req.body?.from || '').trim()
      const toDate = String(req.body?.to || '').trim()
      if (!/^\d{4}-\d{2}-\d{2}$/.test(fromDate) || !/^\d{4}-\d{2}-\d{2}$/.test(toDate)) {
        return res.status(400).json({ error: 'from/to must be YYYY-MM-DD' })
      }
      const from = `${fromDate}T00:00:00.000`
      const to = `${toDate}T00:00:00.000`
      const storeIds: string[] = Array.isArray(req.body?.storeIds) ? req.body.storeIds : []
      const productIds: string[] = Array.isArray(req.body?.productIds) ? req.body.productIds : []

      const filters: any = {
        'DateTime.Typed': { filterType: 'DateRange', periodType: 'CUSTOM', from, to },
      }
      if (storeIds.length) filters['Store'] = { filterType: 'IncludeValues', values: storeIds }
      if (productIds.length) filters['Product.Id'] = { filterType: 'IncludeValues', values: productIds }

      const body = {
        reportType: 'TRANSACTIONS',
        buildSummary: false,
        groupByRowFields: ['Product.Id','Product.Name'],
        groupByColFields: [],
        aggregateFields: ['Amount'],
        filters
      }
      const j: any = await client.postOlap(body)
      const rows = (Array.isArray(j?.data) ? j.data : []).map((r: any) => ({
        productId: r?.['Product.Id'] || null,
        productName: r?.['Product.Name'] || null,
        amount: Number(r?.Amount) || 0
      }))
      res.json({ from: fromDate, to: toDate, rows })
    } catch (e: any) {
      res.status(500).json({ error: String(e?.message || e) })
    }
  })

  return router
}


