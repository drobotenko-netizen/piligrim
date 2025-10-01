import { PrismaClient } from '@prisma/client'
import { Request } from 'express'
import { getRequestContext } from './als'

export async function writeAudit(
  prisma: PrismaClient,
  req: Request,
  params: { action: string; entity: string; entityId?: string | null; before?: any; after?: any }
) {
  const ctx = getRequestContext()
  const tenantId = ctx.tenantId || (req as any).auth?.tenantId || (await prisma.tenant.findFirst())?.id
  if (!tenantId) return
  const userId = ctx.userId || (req as any).auth?.userId || null
  const ip = ctx.ip || (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || ''
  const ua = ctx.ua || req.headers['user-agent'] || ''
  const diff = JSON.stringify({ before: params.before ?? null, after: params.after ?? null })
  await prisma.auditLog.create({ data: { tenantId, userId: userId || undefined, action: params.action, entity: params.entity, entityId: params.entityId || undefined, diff, ip, ua } })
}


