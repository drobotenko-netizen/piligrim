import { Router, Request, Response } from 'express'
import { asyncHandler } from '../../utils/common-middleware'

export function createIikoRecipesRouter(client: any) {
  const router = Router()

  router.get('/tree', asyncHandler(async (req: Request, res: Response) => {
    const date = String(req.query.date || '').trim()
    const productId = String(req.query.productId || '').trim()
    const departmentId = String(req.query.departmentId || '').trim() || undefined
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: 'date=YYYY-MM-DD required' })
    if (!productId) return res.status(400).json({ error: 'productId required' })
    
    const data = await client.getRecipeTree({ date, productId, departmentId })
    res.json(data)
  }))

  router.get('/prepared', asyncHandler(async (req: Request, res: Response) => {
    const date = String(req.query.date || '').trim()
    const productId = String(req.query.productId || '').trim()
    const departmentId = String(req.query.departmentId || '').trim() || undefined
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: 'date=YYYY-MM-DD required' })
    if (!productId) return res.status(400).json({ error: 'productId required' })
    
    const data = await client.getRecipePrepared({ date, productId, departmentId })
    res.json(data)
  }))

  router.get('/units', asyncHandler(async (req: Request, res: Response) => {
    const date = String(req.query.date || '').trim()
    const ids = ([] as string[])
      .concat(req.query.id as any || [])
      .concat(req.query.productId as any || [])
      .map(x => String(x)).filter(Boolean)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: 'date=YYYY-MM-DD required' })
    if (!ids.length) return res.json({ units: {} })
    
    const from = `${date}T00:00:00.000`
    const to = `${date}T00:00:00.000`
    const filters: any = { 'DateTime.Typed': { filterType: 'DateRange', periodType: 'CUSTOM', from, to }, 'Product.Id': { filterType: 'IncludeValues', values: ids } }
    const body = { reportType: 'TRANSACTIONS', buildSummary: false, groupByRowFields: ['Product.Id','Product.MeasureUnit'], groupByColFields: [], aggregateFields: ['Amount'], filters }
    const j: any = await client.postOlap(body)
    const units: Record<string, string> = {}
    for (const r of (Array.isArray(j?.data) ? j.data : [])) {
      const id = String(r?.['Product.Id'] || '')
      const u = String(r?.['Product.MeasureUnit'] || '')
      if (id && u && !units[id]) units[id] = u
    }
    res.json({ units })
  }))

  return router
}

