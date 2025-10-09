import { Router } from 'express'
import { IikoClient } from './client'
import { requirePermission } from '../../utils/auth'

// Existing sub-routers
import { createIikoLocalRouter } from './local-router'
import { createIikoReportsRouter } from './reports-router'
import { createIikoStoresRouter } from './stores-router'
import { createIikoRecipesRouter } from './recipes-router'
import { createIikoEntitiesRouter } from './entities-router'
import { createIikoReceiptsRouter } from './receipts-router'

// New sub-routers
import { createIikoSummaryRouter } from './summary-router'
import { createIikoEtlRouter } from './etl-router'
import { createIikoImportRouter } from './import-router'
import { createIikoHelpersRouter } from './helpers-router'

/**
 * Главный роутер для iiko интеграции
 * Монтирует все под-роутеры для разных доменов
 */
export function createIikoRouter() {
  const router = Router()
  const client = new IikoClient()

  // Middleware для проверки iiko permissions
  const checkIikoPermission = async (req: any, res: any, next: any) => {
    try {
      const prisma = req.app.get('prisma')
      const userId = req.auth?.userId
      
      if (!userId) {
        return res.status(401).json({ error: 'unauthorized' })
      }

      // Check if user has iiko.read permission
      const userPermissions = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          roles: {
            include: {
              role: {
                include: {
                  rolePerms: {
                    include: {
                      permission: true
                    }
                  }
                }
              }
            }
          }
        }
      })

      const hasIikoPermission = userPermissions?.roles.some((userRole: any) => 
        userRole.role.rolePerms.some((rolePerm: any) => 
          rolePerm.permission.name === 'iiko.read'
        )
      )

      if (!hasIikoPermission) {
        return res.status(403).json({ error: 'access denied - iiko permission required' })
      }

      next()
    } catch (error) {
      console.error('Error checking iiko permissions:', error)
      return res.status(500).json({ error: 'internal server error' })
    }
  }

  // Middleware для добавления prisma в req
  const attachPrisma = (req: any, _res: any, next: any) => {
    req.prisma = req.prisma || req.app.get('prisma')
    next()
  }

  // ========================================
  // Монтирование под-роутеров
  // ========================================

  // Helper endpoints (auth/test, employees, cashshifts, last-data-date, setup-permissions)
  router.use('/', createIikoHelpersRouter(client))

  // Sales summary endpoints (summary, revenue, hours, paytypes, waiters, returns, deleted, total)
  router.use('/sales', createIikoSummaryRouter(client))

  // Reports (OLAP и другие отчеты)
  router.use('/reports', createIikoReportsRouter(client))

  // Stores (balances, consumption)
  router.use('/stores', createIikoStoresRouter(client))

  // Recipes (tree, prepared, units)
  router.use('/recipes', createIikoRecipesRouter(client))

  // Entities (products, stores)
  router.use('/entities', createIikoEntitiesRouter(client))

  // Receipts (local receipts endpoints)
  router.use('/local', attachPrisma, createIikoReceiptsRouter({ 
    buildDayRangeIso: (date: string) => {
      const d = new Date(date)
      const from = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0)
      const to = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59)
      return {
        from: from.toISOString(),
        to: to.toISOString()
      }
    },
    client 
  }))

  // Local router (local/sales/* endpoints из БД)
  router.use('/local', attachPrisma, checkIikoPermission, createIikoLocalRouter({ 
    buildDayRangeIso: (date: string) => {
      const d = new Date(date)
      const from = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0)
      const to = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59)
      return {
        from: from.toISOString(),
        to: to.toISOString()
      }
    }
  }))

  // ETL endpoints (receipts import)
  router.use('/etl', createIikoEtlRouter())

  // Import endpoints (shifts import)
  router.use('/import', createIikoImportRouter(client))

  return router
}
