import { Router } from 'express'

export function createIikoEntitiesRouter(client: any) {
  const router = Router()

  router.get('/products', async (_req, res) => {
    try {
      const includeDeleted = false
      const rows = await client.listProducts({ includeDeleted })
      const items = Array.isArray(rows) ? rows : (rows?.items || rows?.data || [])
      const map = (Array.isArray(items) ? items : []).map((p: any) => ({
        id: p?.id,
        name: p?.name,
        type: p?.type || p?.productType || null,
        unitName: p?.measureUnit?.name || p?.measureUnitName || p?.unitName || p?.unit || null
      }))
      res.json({ items: map })
    } catch (e: any) {
      res.status(500).json({ error: String(e?.message || e) })
    }
  })

  router.get('/stores', async (_req, res) => {
    try {
      const now = new Date()
      const yyyy = now.getUTCFullYear()
      const mm = String(now.getUTCMonth() + 1).padStart(2, '0')
      const dd = String(now.getUTCDate()).padStart(2, '0')
      const timestamp = `${yyyy}-${mm}-${dd}T00:00:00`
      const rows = await client.getStoreBalances({ timestampIso: timestamp })
      const uniq = new Map<string, string>()
      for (const r of rows) {
        const store = String(r?.store || '')
        const name = String(r?.storeName || '')
        if (store && !uniq.has(store)) uniq.set(store, name || store)
      }
      res.json({ items: Array.from(uniq.entries()).map(([id, name]) => ({ id, name })) })
    } catch (e: any) {
      res.status(500).json({ error: String(e?.message || e) })
    }
  })

  router.get('/employees', async (_req, res) => {
    try {
      const employees = await client.getEmployees()
      res.json({ items: employees, count: employees.length })
    } catch (e: any) {
      res.status(500).json({ error: String(e?.message || e) })
    }
  })

  return router
}


