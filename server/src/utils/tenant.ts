import { PrismaClient } from '@prisma/client'
import { Request } from 'express'

export async function getTenant(prisma: PrismaClient, req: Request) {
  const authTen = (req as any).auth?.tenantId
  if (authTen) {
    const found = await prisma.tenant.findUnique({ where: { id: authTen } })
    if (found) return found
  }
  const headerId = String(req.get('x-tenant-id') || '').trim()
  if (headerId) {
    const found = await prisma.tenant.findUnique({ where: { id: headerId } })
    if (found) return found
  }
  const first = await prisma.tenant.findFirst()
  if (first) return first
  return await prisma.tenant.create({ data: { name: 'Default' } })
}


