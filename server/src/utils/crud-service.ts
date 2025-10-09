import { PrismaClient } from '@prisma/client'
import { z } from 'zod'

/**
 * Опции для CRUD сервиса
 */
export interface CrudServiceOptions<T> {
  model: string                    // Имя модели Prisma
  include?: any                    // Include опции для findMany
  orderBy?: any                    // Сортировка по умолчанию
  createSchema?: z.ZodSchema<any>  // Zod схема для создания
  updateSchema?: z.ZodSchema<any>  // Zod схема для обновления
  withTenant?: boolean             // Автоматически добавлять tenantId
  softDelete?: boolean             // Soft delete (active: false) вместо удаления
}

/**
 * Базовый CRUD сервис для простых операций
 * 
 * @example
 * const employeeService = new CrudService(prisma, {
 *   model: 'employee',
 *   include: { position: true },
 *   orderBy: { fullName: 'asc' },
 *   withTenant: true
 * })
 * 
 * const employees = await employeeService.findMany({ active: true })
 * const employee = await employeeService.create({ fullName: 'Иван', tenantId })
 */
export class CrudService<T extends { id: string }> {
  constructor(
    private prisma: PrismaClient,
    private options: CrudServiceOptions<T>
  ) {}

  /**
   * Получить модель Prisma
   */
  private get model() {
    return (this.prisma as any)[this.options.model]
  }

  /**
   * Валидация данных через Zod схему
   */
  private validate(data: any, schema?: z.ZodSchema<any>) {
    if (!schema) return { success: true, data }
    return schema.safeParse(data)
  }

  /**
   * Получить список записей
   */
  async findMany(where: any = {}, options?: { include?: any; orderBy?: any }): Promise<T[]> {
    const finalWhere = this.options.withTenant 
      ? { ...where } 
      : where

    return await this.model.findMany({
      where: finalWhere,
      include: options?.include || this.options.include,
      orderBy: options?.orderBy || this.options.orderBy
    })
  }

  /**
   * Получить одну запись
   */
  async findOne(id: string, options?: { include?: any }): Promise<T | null> {
    return await this.model.findUnique({
      where: { id },
      include: options?.include || this.options.include
    })
  }

  /**
   * Создать запись
   */
  async create(data: any, tenantId?: string): Promise<T> {
    // Валидация
    if (this.options.createSchema) {
      const validated = this.validate(data, this.options.createSchema)
      if (!validated.success) {
        const errorDetails = (validated as any).error || 'Validation failed'
        throw new Error(`Validation error: ${JSON.stringify(errorDetails)}`)
      }
      data = validated.data
    }

    // Добавляем tenantId если нужно
    if (this.options.withTenant && tenantId) {
      data.tenantId = tenantId
    }

    return await this.model.create({ data })
  }

  /**
   * Обновить запись
   */
  async update(id: string, data: any): Promise<T> {
    // Валидация
    if (this.options.updateSchema) {
      const validated = this.validate(data, this.options.updateSchema)
      if (!validated.success) {
        const errorDetails = (validated as any).error || 'Validation failed'
        throw new Error(`Validation error: ${JSON.stringify(errorDetails)}`)
      }
      data = validated.data
    }

    return await this.model.update({
      where: { id },
      data
    })
  }

  /**
   * Удалить запись (или soft delete)
   */
  async delete(id: string): Promise<T | void> {
    if (this.options.softDelete) {
      return await this.model.update({
        where: { id },
        data: { active: false }
      })
    }

    return await this.model.delete({
      where: { id }
    })
  }

  /**
   * Подсчёт записей
   */
  async count(where: any = {}): Promise<number> {
    const finalWhere = this.options.withTenant 
      ? { ...where } 
      : where

    return await this.model.count({ where: finalWhere })
  }

  /**
   * Проверка существования
   */
  async exists(id: string): Promise<boolean> {
    const count = await this.model.count({ where: { id } })
    return count > 0
  }
}

/**
 * Создать базовый CRUD роутер на основе сервиса
 * Упрощает создание стандартных CRUD endpoints
 * 
 * @example
 * import { createBasicCrudRouter } from '../../utils/crud-service'
 * 
 * export function createEmployeesRouter(prisma: PrismaClient) {
 *   return createBasicCrudRouter(prisma, {
 *     model: 'employee',
 *     include: { position: true },
 *     orderBy: { fullName: 'asc' }
 *   })
 * }
 */
export function createBasicCrudRouter(
  prisma: PrismaClient,
  options: CrudServiceOptions<any>
) {
  const { Router, Request, Response } = require('express')
  const router = Router()
  const { asyncHandler, validateId } = require('./common-middleware')
  const { getTenant } = require('./tenant')
  
  const service = new CrudService(prisma, options)

  // GET / - список
  router.get('/', asyncHandler(async (req: any, res: any) => {
    const tenant = await getTenant(prisma, req)
    const where = options.withTenant ? { tenantId: tenant.id } : {}
    const items = await service.findMany(where)
    res.json({ items })
  }))

  // GET /:id - один элемент
  router.get('/:id', validateId(), asyncHandler(async (req: any, res: any) => {
    const item = await service.findOne(req.params.id)
    if (!item) {
      return res.status(404).json({ error: 'not_found' })
    }
    res.json({ data: item })
  }))

  // POST / - создать
  router.post('/', asyncHandler(async (req: any, res: any) => {
    const tenant = await getTenant(prisma, req)
    const created = await service.create(req.body, tenant.id)
    res.json({ data: created })
  }))

  // PATCH /:id - обновить
  router.patch('/:id', validateId(), asyncHandler(async (req: any, res: any) => {
    const updated = await service.update(req.params.id, req.body)
    res.json({ data: updated })
  }))

  // DELETE /:id - удалить
  router.delete('/:id', validateId(), asyncHandler(async (req: any, res: any) => {
    await service.delete(req.params.id)
    res.json({ ok: true })
  }))

  return router
}

