import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { getTenant } from '../../utils/tenant'
import { getUserId } from '../../utils/auth'

export function createPurchasingSettingsRouter(prisma: PrismaClient) {
  const router = Router()

  // GET настройки
  router.get('/', async (req, res) => {
    try {
      const tenant = await getTenant(prisma, req as any)
      
      let settings = await (prisma as any).purchasingSettings?.findUnique({
        where: { tenantId: tenant.id }
      })

      // Если настроек нет - создаем с дефолтными значениями
      if (!settings) {
        settings = await (prisma as any).purchasingSettings?.create({
          data: {
            tenantId: tenant.id,
            purchaseWindowDays: 3,
            analysisWindowDays: 30,
            createdBy: getUserId(req as any)
          }
        })
      }

      res.json({ settings })
    } catch (error: any) {
      console.error('Error loading purchasing settings:', error)
      res.status(500).json({ error: error?.message || 'Failed to load settings' })
    }
  })

  // PATCH обновление настроек
  router.patch('/', async (req, res) => {
    try {
      const tenant = await getTenant(prisma, req as any)
      const { purchaseWindowDays, analysisWindowDays } = req.body

      const data: any = {
        updatedBy: getUserId(req as any)
      }

      if (typeof purchaseWindowDays === 'number' && purchaseWindowDays > 0) {
        data.purchaseWindowDays = Math.max(1, Math.min(30, Math.floor(purchaseWindowDays)))
      }

      if (typeof analysisWindowDays === 'number' && analysisWindowDays > 0) {
        data.analysisWindowDays = Math.max(7, Math.min(365, Math.floor(analysisWindowDays)))
      }

      const settings = await (prisma as any).purchasingSettings?.upsert({
        where: { tenantId: tenant.id },
        update: data,
        create: {
          tenantId: tenant.id,
          purchaseWindowDays: data.purchaseWindowDays || 3,
          analysisWindowDays: data.analysisWindowDays || 30,
          createdBy: getUserId(req as any)
        }
      })

      res.json({ settings })
    } catch (error: any) {
      console.error('Error updating purchasing settings:', error)
      res.status(500).json({ error: error?.message || 'Failed to update settings' })
    }
  })

  return router
}

