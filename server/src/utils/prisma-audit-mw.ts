import { Prisma, PrismaClient } from '@prisma/client'
import { getRequestContext } from './als'

export function installPrismaAuditMiddleware(prisma: PrismaClient) {
  prisma.$use(async (params, next) => {
    const action = params.action
    const model = params.model
    if (!model) return next(params)
    if (!['create', 'update', 'delete', 'upsert', 'updateMany', 'deleteMany'].includes(action)) {
      return next(params)
    }

    // пропускаем сам аудит, чтобы не зациклиться
    if (model === 'AuditLog') return next(params)

    const ctx = getRequestContext()
    const delegateName = model.charAt(0).toLowerCase() + model.slice(1)
    const delegate: any = (prisma as any)[delegateName]
    const args: any = params.args || {}

    let before: any = undefined
    let result: any = undefined
    let entityId: string | undefined

    // попытка извлечь id из where
    if (args.where && typeof args.where === 'object') {
      const keys = Object.keys(args.where)
      const idKey = keys.find(k => k === 'id' || k.endsWith('_id') || k.endsWith('Id'))
      if (idKey && typeof (args.where as any)[idKey] === 'string') entityId = (args.where as any)[idKey]
    }

    try {
      if (action === 'update' || action === 'delete' || action === 'upsert') {
        if (delegate && args.where) {
          try { before = await delegate.findUnique({ where: args.where }) } catch {}
        }
      }

      result = await next(params)

      const tenantId = ctx.tenantId || (result && result.tenantId) || (before && before.tenantId) || undefined
      if (!tenantId) return result

      let after: any = undefined
      if (action === 'create' || action === 'update' || action === 'upsert') after = result
      if (action === 'delete') after = null

      // updateMany/deleteMany: сохраняем только счётчик и условие
      if (action === 'updateMany' || action === 'deleteMany') {
        const count = (result && typeof result.count === 'number') ? result.count : undefined
        const diff = JSON.stringify({ where: args.where || null, data: args.data || null, affected: count })
        await prisma.auditLog.create({ data: {
          tenantId,
          userId: ctx.userId || undefined,
          action,
          entity: model,
          entityId,
          diff,
          ip: ctx.ip || undefined,
          ua: ctx.ua || undefined
        } })
        return result
      }

      // вычисляем изменённые поля (плоское сравнение)
      const changed: Record<string, { from: any; to: any }> = {}
      const keys = new Set<string>([...Object.keys(before || {}), ...Object.keys(after || {})])
      for (const k of keys) {
        if (k === 'updatedAt' || k === 'createdAt') continue
        const b = before ? (before as any)[k] : undefined
        const a = after ? (after as any)[k] : undefined
        if (JSON.stringify(b) !== JSON.stringify(a)) changed[k] = { from: b, to: a }
      }
      const diff = JSON.stringify({ before: before ?? null, after: after ?? null, changed })

      await prisma.auditLog.create({
        data: {
          tenantId,
          userId: ctx.userId || undefined,
          action,
          entity: model,
          entityId,
          diff,
          ip: ctx.ip || undefined,
          ua: ctx.ua || undefined
        }
      })

      return result
    } catch (e) {
      // если что-то пошло не так в аудите — не ломаем основной запрос
      try { return result ?? await next(params) } catch { throw e }
    }
  })
}


