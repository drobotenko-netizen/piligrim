import { Router, Request, Response } from 'express'
import { IikoClient } from './client'
import { asyncHandler } from '../../utils/common-middleware'

/**
 * Helper endpoints - тестирование, сотрудники, последняя дата данных
 */
export function createIikoHelpersRouter(client: IikoClient) {
  const router = Router()

  // GET /auth/test - проверка подключения к iiko API
  router.get('/auth/test', asyncHandler(async (_req: Request, res: Response) => {
    const key = await client.getToken()
    res.json({ ok: true, tokenSample: key.slice(0, 8) })
  }))

  // GET /employees - список сотрудников
  router.get('/employees', asyncHandler(async (_req: Request, res: Response) => {
    const employees = await client.getEmployees()
    res.json({ employees })
  }))

  // GET /cashshifts - смены кассиров
  router.get('/cashshifts', asyncHandler(async (req: Request, res: Response) => {
    const { from, to } = req.query as any
    if (!from || !to) {
      return res.status(400).json({ 
        error: 'from and to query params required',
        example: '?from=2025-01-01&to=2025-01-31'
      })
    }
    const shifts = await (client as any).getCashShifts(String(from), String(to))
    res.json({ shifts })
  }))

  // GET /last-data-date - последняя дата с данными в локальной БД
  router.get('/last-data-date', asyncHandler(async (req: Request, res: Response) => {
    const prisma = (req as any).prisma || (req as any).app.get('prisma')
    if (!prisma) {
      return res.status(503).json({ error: 'prisma not available' })
    }

    const lastReceipt = await prisma.iikoReceipt.findFirst({
      orderBy: { date: 'desc' },
      select: { date: true }
    })

    if (!lastReceipt) {
      return res.json({ 
        lastDate: null,
        message: 'no data in database' 
      })
    }

    const date = lastReceipt.date.toISOString().split('T')[0]
    res.json({ lastDate: date })
  }))

  // POST /setup-permissions - настройка разрешений (admin only)
  router.post('/setup-permissions', asyncHandler(async (req: Request, res: Response) => {
    const prisma = (req as any).prisma || (req as any).app.get('prisma')
    if (!prisma) {
      return res.status(503).json({ error: 'prisma not available' })
    }

    // Проверяем наличие разрешения iiko.read
    let permission = await prisma.permission.findUnique({
      where: { name: 'iiko.read' }
    })

    if (!permission) {
      permission = await prisma.permission.create({
        data: {
          name: 'iiko.read',
          description: 'Доступ к данным iiko'
        }
      })
    }

    // Назначаем всем админам
    const adminRole = await prisma.role.findFirst({
      where: { name: 'ADMIN' },
      include: { rolePerms: true }
    })

    if (adminRole) {
      const hasPermission = adminRole.rolePerms.some(
        (rp: any) => rp.permissionId === permission.id
      )

      if (!hasPermission) {
        await prisma.rolePerm.create({
          data: {
            roleId: adminRole.id,
            permissionId: permission.id
          }
        })
      }
    }

    res.json({ 
      success: true,
      permission: {
        id: permission.id,
        name: permission.name
      }
    })
  }))

  return router
}

