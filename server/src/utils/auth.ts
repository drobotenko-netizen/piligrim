import { Request, Response, NextFunction } from 'express'
import { PrismaClient } from '@prisma/client'

export function requireRole(allowed: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const role = String((req as any).role || req.get('x-role') || '').toUpperCase()
    // deny-by-default: if no role resolved or role not allowed -> 403
    if (!role) return res.status(403).json({ error: 'forbidden' })
    if (allowed.includes(role)) return next()
    return res.status(403).json({ error: 'forbidden' })
  }
}

export function getUserId(req: Request): string | null {
  const authUserId = (req as any).auth?.userId
  if (authUserId) return String(authUserId)
  const id = String(req.get('x-user-id') || '').trim()
  return id || null
}

export async function hasPermission(prisma: PrismaClient, req: Request, permission: string): Promise<boolean> {
  const auth = (req as any).auth || {}
  const headerRole = ((req as any).role || req.get('x-role') || '').toString().toUpperCase()
  const rolesSet = new Set<string>()
  const rolesArr: string[] = Array.isArray(auth.roles) ? auth.roles : []
  for (const r of rolesArr) rolesSet.add(String(r).toUpperCase())
  if (headerRole) rolesSet.add(headerRole)
  const roles = Array.from(rolesSet)
  if (roles.includes('ADMIN')) return true
  if (roles.length === 0) return false
  const rp = await prisma.rolePermission.count({
    where: { role: { name: { in: roles } }, permission: { name: permission } }
  })
  return rp > 0
}

export function requirePermission(prisma: PrismaClient, permission: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ok = await hasPermission(prisma, req, permission)
      if (!ok) return res.status(403).json({ error: 'forbidden' })
      next()
    } catch {
      return res.status(500).json({ error: 'internal_error' })
    }
  }
}


