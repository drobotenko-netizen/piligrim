import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { getTenant } from '../../utils/tenant'
import { requireRole } from '../../utils/auth'

function ensureTableSQL() {
  return `CREATE TABLE IF NOT EXISTS CounterpartyType (
    id TEXT PRIMARY KEY,
    tenantId TEXT NOT NULL,
    name TEXT NOT NULL,
    label TEXT NOT NULL,
    active INTEGER NOT NULL DEFAULT 1,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(tenantId, name)
  );`
}

export function createCounterpartyTypesRouter(prisma: PrismaClient) {
  const router = Router()

  async function ensureTable() {
    await (prisma as any).$executeRawUnsafe(ensureTableSQL())
  }

  router.get('/', async (req, res) => {
    await ensureTable()
    const tenant = await getTenant(prisma, req as any)
    const rows: any[] = await (prisma as any).$queryRawUnsafe(
      `SELECT id, name, label, active FROM CounterpartyType WHERE tenantId = ? ORDER BY name ASC`,
      tenant.id
    )
    res.json({ items: rows.map(r => ({ ...r, active: !!r.active })) })
  })

  function slugify(input: string): string {
    const map: Record<string, string> = {
      а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'e',ж:'zh',з:'z',и:'i',й:'y',к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'h',ц:'c',ч:'ch',ш:'sh',щ:'sch',ъ:'',ы:'y',ь:'',э:'e',ю:'yu',я:'ya'
    }
    const s = input.toLowerCase().split('').map(ch => map[ch] ?? ch).join('')
    return s.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').replace(/-{2,}/g, '-')
  }

  async function ensureUniqueName(tenantId: string, base: string): Promise<string> {
    let candidate = base || 'type'
    let i = 1
    // check existing
    while (true) {
      const dup: any[] = await (prisma as any).$queryRawUnsafe(
        `SELECT 1 FROM CounterpartyType WHERE tenantId = ? AND name = ? LIMIT 1`, tenantId, candidate
      )
      if (!dup || dup.length === 0) return candidate
      i += 1
      candidate = `${base}-${i}`
    }
  }

  router.post('/', requireRole(['ADMIN','ACCOUNTANT']), async (req, res) => {
    await ensureTable()
    const schema = z.object({ name: z.string().trim().optional(), label: z.string().trim().min(1), active: z.boolean().optional() })
    const parsed = schema.safeParse(req.body || {})
    if (!parsed.success) return res.status(400).json({ error: 'bad request', details: parsed.error.flatten() })
    const { name, label, active = true } = parsed.data
    const tenant = await getTenant(prisma, req as any)
    const id = (global as any).crypto?.randomUUID?.() || Math.random().toString(36).slice(2)
    const base = (name && name.trim()) || slugify(label)
    const unique = await ensureUniqueName(tenant.id, base)
    try {
      await (prisma as any).$executeRawUnsafe(
        `INSERT INTO CounterpartyType (id, tenantId, name, label, active) VALUES (?, ?, ?, ?, ?)`,
        id, tenant.id, unique, label, active ? 1 : 0
      )
      return res.json({ data: { id, name: unique, label, active } })
    } catch (e) {
      return res.status(409).json({ error: 'duplicate', message: 'name must be unique per tenant' })
    }
  })

  router.patch('/:id', requireRole(['ADMIN','ACCOUNTANT']), async (req, res) => {
    await ensureTable()
    const id = req.params.id
    const schema = z.object({ name: z.string().trim().optional(), label: z.string().trim().optional(), active: z.boolean().optional() })
    const parsed = schema.safeParse(req.body || {})
    if (!parsed.success) return res.status(400).json({ error: 'bad request', details: parsed.error.flatten() })
    const fields = parsed.data
    const sets: string[] = []
    const params: any[] = []
    if (fields.name !== undefined) { sets.push('name = ?'); params.push(fields.name) }
    if (fields.label !== undefined) { sets.push('label = ?'); params.push(fields.label) }
    if (fields.active !== undefined) { sets.push('active = ?'); params.push(fields.active ? 1 : 0) }
    sets.push(`updatedAt = datetime('now')`)
    params.push(id)
    await (prisma as any).$executeRawUnsafe(`UPDATE CounterpartyType SET ${sets.join(', ')} WHERE id = ?`, ...params)
    return res.json({ ok: true })
  })

  router.delete('/:id', requireRole(['ADMIN','ACCOUNTANT']), async (req, res) => {
    await ensureTable()
    const id = req.params.id
    await (prisma as any).$executeRawUnsafe(`DELETE FROM CounterpartyType WHERE id = ?`, id)
    res.json({ ok: true })
  })

  return router
}


