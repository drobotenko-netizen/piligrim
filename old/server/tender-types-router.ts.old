import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { getTenant } from '../../utils/tenant'
import { requireRole, getUserId } from '../../utils/auth'

export function createTenderTypesRouter(prisma: PrismaClient) {
  const router = Router()

  // GET /api/tender-types - список способов оплаты
  router.get('/', async (req, res) => {
    try {
      const tenant = await getTenant(prisma, req as any)
      const items = await prisma.tenderType.findMany({
        where: { tenantId: tenant.id, active: true },
        orderBy: { name: 'asc' }
      })
      res.json({ items })
    } catch (e: any) {
      res.status(500).json({ error: String(e?.message || e) })
    }
  })

  // POST /api/tender-types - создать способ оплаты
  router.post('/', requireRole(['ADMIN']), async (req, res) => {
    try {
      const schema = z.object({
        name: z.string().min(1)
      })
      const parsed = schema.safeParse(req.body)
      if (!parsed.success) {
        return res.status(400).json({ error: 'bad request', details: parsed.error.flatten() })
      }

      const tenant = await getTenant(prisma, req as any)
      const created = await prisma.tenderType.create({
        data: {
          tenantId: tenant.id,
          name: parsed.data.name
        }
      })

      res.json({ data: created })
    } catch (e: any) {
      res.status(500).json({ error: String(e?.message || e) })
    }
  })

  // PATCH /api/tender-types/:id - обновить способ оплаты
  router.patch('/:id', requireRole(['ADMIN']), async (req, res) => {
    try {
      const schema = z.object({
        name: z.string().min(1).optional(),
        active: z.boolean().optional()
      })
      const parsed = schema.safeParse(req.body)
      if (!parsed.success) {
        return res.status(400).json({ error: 'bad request', details: parsed.error.flatten() })
      }

      const updated = await prisma.tenderType.update({
        where: { id: req.params.id },
        data: parsed.data
      })

      res.json({ data: updated })
    } catch (e: any) {
      res.status(500).json({ error: String(e?.message || e) })
    }
  })

  // DELETE /api/tender-types/:id - деактивировать способ оплаты
  router.delete('/:id', requireRole(['ADMIN']), async (req, res) => {
    try {
      const updated = await prisma.tenderType.update({
        where: { id: req.params.id },
        data: { active: false }
      })
      res.json({ data: updated })
    } catch (e: any) {
      res.status(500).json({ error: String(e?.message || e) })
    }
  })

  return router
}

