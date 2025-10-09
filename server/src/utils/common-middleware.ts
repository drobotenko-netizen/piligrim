import { Request, Response, NextFunction } from 'express'
import { PrismaClient } from '@prisma/client'
import { getTenant } from './tenant'

/**
 * Автоматическая обработка ошибок для async роутов
 * Использование: router.get('/path', asyncHandler(async (req, res) => { ... }))
 */
export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next))
      .catch((e: any) => {
        console.error('API Error:', e)
        res.status(500).json({ error: String(e?.message || e) })
      })
  }
}

/**
 * Валидация query параметра date в формате YYYY-MM-DD
 * Добавляет проверенную дату в req.date
 */
export function validateDate(paramName: string = 'date') {
  return (req: Request, res: Response, next: NextFunction) => {
    const date = String(req.query[paramName] || '').trim()
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ 
        error: `${paramName}=YYYY-MM-DD required` 
      })
    }
    ;(req as any)[paramName] = date
    next()
  }
}

/**
 * Валидация year и month в query параметрах
 * Добавляет проверенные значения в req.year и req.month
 */
export function validateYearMonth() {
  return (req: Request, res: Response, next: NextFunction) => {
    const year = Number(req.query.year)
    const month = Number(req.query.month)
    
    if (!year || !month || month < 1 || month > 12) {
      return res.status(400).json({ 
        error: 'year=YYYY&month=MM required (month 1-12)' 
      })
    }
    
    ;(req as any).year = year
    ;(req as any).month = month
    next()
  }
}

/**
 * Валидация date range (from/to) в query параметрах
 * Добавляет проверенные значения в req.dateRange
 */
export function validateDateRange(required: boolean = false) {
  return (req: Request, res: Response, next: NextFunction) => {
    const from = String(req.query.from || '').trim()
    const to = String(req.query.to || '').trim()
    
    if (required && (!from || !to)) {
      return res.status(400).json({ 
        error: 'from=YYYY-MM-DD&to=YYYY-MM-DD required' 
      })
    }
    
    if (from && !/^\d{4}-\d{2}-\d{2}$/.test(from)) {
      return res.status(400).json({ error: 'from must be YYYY-MM-DD' })
    }
    
    if (to && !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
      return res.status(400).json({ error: 'to must be YYYY-MM-DD' })
    }
    
    if (from && to) {
      ;(req as any).dateRange = {
        from: new Date(from),
        to: new Date(to)
      }
    }
    
    next()
  }
}

/**
 * Автоматически добавляет tenant в req.tenant
 * Использовать перед роутами, которым нужен tenant
 */
export function attachTenant(prisma: PrismaClient) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      ;(req as any).tenant = await getTenant(prisma, req)
      next()
    } catch (e: any) {
      res.status(500).json({ error: 'Failed to get tenant' })
    }
  }
}

/**
 * Валидация обязательного ID в params
 */
export function validateId(paramName: string = 'id') {
  return (req: Request, res: Response, next: NextFunction) => {
    const id = req.params[paramName]
    if (!id || typeof id !== 'string' || id.length === 0) {
      return res.status(400).json({ 
        error: `${paramName} parameter required` 
      })
    }
    next()
  }
}

/**
 * Middleware для логирования запросов
 */
export function requestLogger() {
  return (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now()
    const { method, path } = req
    
    res.on('finish', () => {
      const duration = Date.now() - start
      const { statusCode } = res
      console.log(`${method} ${path} ${statusCode} - ${duration}ms`)
    })
    
    next()
  }
}

