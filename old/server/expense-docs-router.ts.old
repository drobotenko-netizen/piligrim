import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { getTenant } from '../../utils/tenant'
import { requireRole, getUserId } from '../../utils/auth'

export function createExpenseDocsRouter(prisma: PrismaClient) {
  const router = Router()

  // GET /api/expense-docs - список документов расходов
  router.get('/', async (req, res) => {
    try {
      const tenant = await getTenant(prisma, req as any)
      const { status, vendorId, categoryId, from, to } = req.query
      
      const where: any = { tenantId: tenant.id }
      if (status) where.status = String(status)
      if (vendorId) where.vendorId = String(vendorId)
      if (categoryId) where.categoryId = String(categoryId)
      
      if (from || to) {
        where.operationDate = {}
        if (from) where.operationDate.gte = new Date(String(from))
        if (to) where.operationDate.lt = new Date(String(to))
      }

      const items = await prisma.expenseDoc.findMany({
        where,
        include: {
          vendor: true,
          category: true,
          allocations: {
            include: {
              payment: true
            }
          }
        },
        orderBy: { operationDate: 'desc' }
      })

      res.json({ items })
    } catch (e: any) {
      res.status(500).json({ error: String(e?.message || e) })
    }
  })

  // GET /api/expense-docs/:id - детали документа
  router.get('/:id', async (req, res) => {
    try {
      const item = await prisma.expenseDoc.findUnique({
        where: { id: req.params.id },
        include: {
          vendor: true,
          category: true,
          allocations: {
            include: {
              payment: true
            }
          }
        }
      })

      if (!item) {
        return res.status(404).json({ error: 'not_found' })
      }

      res.json({ data: item })
    } catch (e: any) {
      res.status(500).json({ error: String(e?.message || e) })
    }
  })

  // POST /api/expense-docs - создать документ расхода
  router.post('/', requireRole(['ADMIN', 'ACCOUNTANT']), async (req, res) => {
    try {
      const schema = z.object({
        vendorId: z.string().optional(),
        categoryId: z.string().min(1),
        operationDate: z.string().min(1),
        postingPeriod: z.string().min(1),
        amount: z.number(),
        status: z.enum(['draft', 'unpaid', 'partial', 'paid', 'void']).optional(),
        activity: z.enum(['operating', 'investing', 'financing']).optional(),
        memo: z.string().optional()
      })
      
      const parsed = schema.safeParse(req.body)
      if (!parsed.success) {
        return res.status(400).json({ error: 'bad request', details: parsed.error.flatten() })
      }

      const tenant = await getTenant(prisma, req as any)
      const userId = getUserId(req as any)

      // Получаем категорию для дефолтного activity
      const category = await prisma.category.findUnique({
        where: { id: parsed.data.categoryId }
      })

      // Валидация: postingPeriod должен быть 1-м числом месяца
      const postingDate = new Date(parsed.data.postingPeriod)
      if (postingDate.getDate() !== 1) {
        return res.status(400).json({ 
          error: 'invalid_posting_period', 
          message: 'posting_period должен быть 1-м числом месяца' 
        })
      }

      const created = await prisma.expenseDoc.create({
        data: {
          tenantId: tenant.id,
          vendorId: parsed.data.vendorId || null,
          categoryId: parsed.data.categoryId,
          operationDate: new Date(parsed.data.operationDate),
          postingPeriod: postingDate,
          amount: Math.round(parsed.data.amount * 100), // в копейки
          status: parsed.data.status || 'draft',
          activity: parsed.data.activity || category?.activity || 'operating',
          memo: parsed.data.memo,
          createdBy: userId
        }
      })

      res.json({ data: created })
    } catch (e: any) {
      res.status(500).json({ error: String(e?.message || e) })
    }
  })

  // PATCH /api/expense-docs/:id - обновить документ
  router.patch('/:id', requireRole(['ADMIN', 'ACCOUNTANT']), async (req, res) => {
    try {
      const schema = z.object({
        vendorId: z.string().optional(),
        categoryId: z.string().optional(),
        operationDate: z.string().optional(),
        postingPeriod: z.string().optional(),
        amount: z.number().optional(),
        status: z.enum(['draft', 'unpaid', 'partial', 'paid', 'void']).optional(),
        activity: z.enum(['operating', 'investing', 'financing']).optional(),
        memo: z.string().optional()
      })
      
      const parsed = schema.safeParse(req.body)
      if (!parsed.success) {
        return res.status(400).json({ error: 'bad request', details: parsed.error.flatten() })
      }

      const userId = getUserId(req as any)
      const data: any = { updatedBy: userId }

      if (parsed.data.vendorId !== undefined) data.vendorId = parsed.data.vendorId || null
      if (parsed.data.categoryId) data.categoryId = parsed.data.categoryId
      if (parsed.data.operationDate) data.operationDate = new Date(parsed.data.operationDate)
      if (parsed.data.postingPeriod) {
        const postingDate = new Date(parsed.data.postingPeriod)
        if (postingDate.getDate() !== 1) {
          return res.status(400).json({ 
            error: 'invalid_posting_period', 
            message: 'posting_period должен быть 1-м числом месяца' 
          })
        }
        data.postingPeriod = postingDate
      }
      if (parsed.data.amount !== undefined) data.amount = Math.round(parsed.data.amount * 100)
      if (parsed.data.status) data.status = parsed.data.status
      if (parsed.data.activity) data.activity = parsed.data.activity
      if (parsed.data.memo !== undefined) data.memo = parsed.data.memo

      const updated = await prisma.expenseDoc.update({
        where: { id: req.params.id },
        data
      })

      res.json({ data: updated })
    } catch (e: any) {
      res.status(500).json({ error: String(e?.message || e) })
    }
  })

  // DELETE /api/expense-docs/:id - пометить как void
  router.delete('/:id', requireRole(['ADMIN', 'ACCOUNTANT']), async (req, res) => {
    try {
      const userId = getUserId(req as any)
      const updated = await prisma.expenseDoc.update({
        where: { id: req.params.id },
        data: { 
          status: 'void',
          updatedBy: userId
        }
      })

      res.json({ data: updated })
    } catch (e: any) {
      res.status(500).json({ error: String(e?.message || e) })
    }
  })

  return router
}

