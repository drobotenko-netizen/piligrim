import { Router, Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { getTenant } from '../../utils/tenant'
import { requireRole } from '../../utils/auth'
import { asyncHandler, validateId } from '../../utils/common-middleware'

export function createChannelsRouter(prisma: PrismaClient) {
  const router = Router()

  // GET / - список каналов
  router.get('/', asyncHandler(async (req: Request, res: Response) => {
    const tenant = await getTenant(prisma, req as any)
    const items = await prisma.channel.findMany({
      where: { tenantId: tenant.id, active: true },
      orderBy: { name: 'asc' }
    })
    res.json({ items })
  }))

  // POST / - создать канал
  router.post('/', requireRole(['ADMIN']), asyncHandler(async (req: Request, res: Response) => {
    const schema = z.object({
      name: z.string().min(1)
    })
    
    const parsed = schema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ 
        error: 'bad request', 
        details: parsed.error.flatten() 
      })
    }

    const tenant = await getTenant(prisma, req as any)
    const created = await prisma.channel.create({
      data: {
        tenantId: tenant.id,
        name: parsed.data.name
      }
    })

    res.json({ data: created })
  }))

  // PATCH /:id - обновить канал
  router.patch('/:id', validateId(), requireRole(['ADMIN']), asyncHandler(async (req: Request, res: Response) => {
    const schema = z.object({
      name: z.string().min(1).optional(),
      active: z.boolean().optional()
    })
    
    const parsed = schema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ 
        error: 'bad request', 
        details: parsed.error.flatten() 
      })
    }

    const updated = await prisma.channel.update({
      where: { id: req.params.id },
      data: parsed.data
    })

    res.json({ data: updated })
  }))

  // DELETE /:id - деактивировать канал
  router.delete('/:id', validateId(), requireRole(['ADMIN']), asyncHandler(async (req: Request, res: Response) => {
    const updated = await prisma.channel.update({
      where: { id: req.params.id },
      data: { active: false }
    })
    res.json({ data: updated })
  }))

  return router
}
