import { Router, Request, Response } from 'express'
import { asyncHandler } from '../../utils/common-middleware'

export function createIikoEntitiesRouter(client: any) {
  const router = Router()

  router.get('/products', asyncHandler(async (_req: Request, res: Response) => {
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
  }))

  router.get('/stores', asyncHandler(async (_req: Request, res: Response) => {
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
  }))

  router.get('/employees', asyncHandler(async (_req: Request, res: Response) => {
    const employees = await client.getEmployees()
    res.json({ items: employees, count: employees.length })
  }))

  return router
}

