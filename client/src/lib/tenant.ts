import { prisma } from './prisma'

export async function getDefaultTenantId(): Promise<string> {
  const existing = await prisma.tenant.findFirst()
  if (existing) return existing.id
  const created = await prisma.tenant.create({ data: { name: 'Default' } })
  return created.id
}

