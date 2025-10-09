import { Router, Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { getTenant } from '../../utils/tenant'
import { requirePermission } from '../../utils/auth'
import { asyncHandler } from '../../utils/common-middleware'

export function createAdminAuditRouter(prisma: PrismaClient) {
  const router = Router()

  const ENTITY_LABEL: Record<string, string> = {
    Timesheet: 'Табель',
    Employee: 'Сотрудник',
    Account: 'Счёт',
    Category: 'Категория',
    Transaction: 'Транзакция',
    Payout: 'Выплата',
    Counterparty: 'Контрагент',
    Adjustment: 'Корректировка',
    User: 'Пользователь',
    Role: 'Роль',
    Permission: 'Право'
  }

  async function resolveEntityDisplay(entity: string, entityId: string | null | undefined, diffRaw: string | null | undefined) {
    try {
      const diff = diffRaw ? JSON.parse(diffRaw) : null
      if (entity === 'Timesheet') {
        const after = diff?.after || diff?.before || null
        let employeeId: string | undefined = after?.employeeId || undefined
        let workDate: string | undefined = after?.workDate || undefined
        if ((!employeeId || !workDate) && entityId) {
          const ts = await prisma.timesheet.findUnique({ where: { id: entityId }, include: { employee: true } })
          if (ts) {
            employeeId = ts.employeeId
            workDate = ts.workDate.toISOString()
            return `${ts.employee?.fullName || employeeId} — ${workDate?.slice(0,10)}`
          }
        }
        if (employeeId || workDate) {
          const emp = employeeId ? await prisma.employee.findUnique({ where: { id: employeeId } }) : null
          return `${emp?.fullName || employeeId || ''} — ${(workDate || '').slice(0,10)}`.trim()
        }
      }
      if (entity === 'Employee' && entityId) {
        const e = await prisma.employee.findUnique({ where: { id: entityId } })
        return e?.fullName || entityId
      }
      if (entity === 'Account' && entityId) {
        const a = await prisma.account.findUnique({ where: { id: entityId } })
        return a?.name || entityId
      }
      if (entity === 'Category' && entityId) {
        const c = await prisma.category.findUnique({ where: { id: entityId } })
        return c?.name || entityId
      }
      if (entity === 'Counterparty' && entityId) {
        const c = await prisma.counterparty.findUnique({ where: { id: entityId } })
        return c?.name || entityId
      }
      if (entity === 'Transaction' && entityId) {
        const t = await prisma.transaction.findUnique({ where: { id: entityId }, include: { account: true, category: true } })
        if (t) {
          const kind = t.kind
          const amt = (t.amount / 100).toLocaleString('ru-RU', { minimumFractionDigits: 2 })
          const date = t.paymentDate.toISOString().slice(0,10)
          const acc = t.account?.name || ''
          const cat = t.category?.name || ''
          return `${kind} ${amt} • ${date} • ${acc || cat}`.trim()
        }
      }
    } catch {}
    return entityId || ''
  }

  async function resolveNameById(field: string, id: string | null | undefined): Promise<string | null> {
    if (!id) return null
    try {
      if (field === 'employeeId') {
        const e = await prisma.employee.findUnique({ where: { id } })
        return e?.fullName || id
      }
      if (field === 'accountId' || field === 'fromAccountId' || field === 'toAccountId') {
        const a = await prisma.account.findUnique({ where: { id } })
        return a?.name || id
      }
      if (field === 'categoryId') {
        const c = await prisma.category.findUnique({ where: { id } })
        return c?.name || id
      }
      if (field === 'counterpartyId') {
        const c = await prisma.counterparty.findUnique({ where: { id } })
        return c?.name || id
      }
    } catch {}
    return id
  }

  function fieldLabel(field: string): string {
    const map: Record<string, string> = {
      employeeId: 'Сотрудник',
      workDate: 'Дата',
      minutes: 'Минуты',
      status: 'Статус',
      accountId: 'Счёт',
      fromAccountId: 'Со счёта',
      toAccountId: 'На счёт',
      categoryId: 'Статья',
      counterpartyId: 'Контрагент',
      amount: 'Сумма',
      paymentDate: 'Дата оплаты',
      accrualYear: 'Год начисления',
      accrualMonth: 'Месяц начисления',
      name: 'Название',
      fullName: 'ФИО',
      date: 'Дата',
      kind: 'Тип',
      reason: 'Примечание',
      note: 'Примечание',
      method: 'Способ'
    }
    return map[field] || field
  }

  function formatDateRu(v: any): any {
    if (typeof v === 'string') {
      const d = new Date(v)
      if (!isNaN(d.valueOf())) return d.toLocaleDateString('ru-RU')
    }
    return v
  }

  function translateKind(v: any): any {
    if (typeof v !== 'string') return v
    const map: Record<string, string> = { bonus: 'Премия', fine: 'Штраф', deduction: 'Удержание' }
    return map[v] || v
  }

  function translateMethod(v: any): any {
    if (typeof v !== 'string') return v
    const map: Record<string, string> = { cash: 'Наличные', card: 'Карта', bank: 'Банк' }
    return map[v] || v
  }

  function allowedFieldsForEntity(entity: string | undefined): Set<string> | null {
    switch (entity) {
      case 'Adjustment':
        return new Set(['employeeId', 'date', 'kind', 'amount', 'reason'])
      case 'Payout':
        return new Set(['employeeId', 'date', 'paymentDate', 'amount', 'method', 'accountId', 'note', 'counterpartyId'])
      case 'Transaction':
        return new Set(['kind', 'paymentDate', 'amount', 'method', 'accountId', 'categoryId', 'counterpartyId', 'note'])
      case 'Timesheet':
        return new Set(['employeeId', 'workDate', 'minutes', 'status'])
      default:
        return null // по умолчанию показываем все, кроме системных
    }
  }

  function kindGender(kindRu: string | null | undefined): 'f'|'m'|'n' {
    const v = (kindRu || '').toLowerCase()
    if (v === 'премия') return 'f'
    if (v === 'штраф') return 'm'
    if (v === 'удержание') return 'n'
    return 'n'
  }

  function actionVerb(action: string, gender: 'f'|'m'|'n'): string {
    const verbs: any = {
      create: { f: 'Добавлена', m: 'Добавлен', n: 'Добавлено' },
      update: { f: 'Изменена', m: 'Изменён', n: 'Изменено' },
      delete: { f: 'Удалена',  m: 'Удалён',  n: 'Удалено'  }
    }
    const a = (action || '').toLowerCase()
    return (verbs[a] && verbs[a][gender]) || a
  }

  function formatRubShort(valueInCents: any): string | null {
    if (typeof valueInCents !== 'number') return null
    const rub = Math.round(valueInCents / 100)
    return `${rub.toLocaleString('ru-RU')}р`
  }

  function extractDiff(jsonStr: string | null | undefined): any | null {
    try { return jsonStr ? JSON.parse(jsonStr) : null } catch { return null }
  }

  function pickAfterOrBefore(diff: any, field: string): any {
    if (!diff) return null
    const after = diff.after || null
    const before = diff.before || null
    return (after && after[field] !== undefined) ? after[field] : (before ? before[field] : null)
  }

  function computeKeyValue(entity: string, diffStr: string | null | undefined, compact?: any): string | null {
    if (entity === 'Timesheet' && compact?.kind === 'timesheet') {
      const totalMinutes = Array.isArray(compact.days) ? compact.days.reduce((s: number, d: any) => s + (d.toMinutes || 0), 0) : 0
      const hours = totalMinutes / 60
      return Number.isInteger(hours) ? `${hours}ч` : `${hours.toLocaleString('ru-RU', { maximumFractionDigits: 2 })}ч`
    }
    const diff = extractDiff(diffStr)
    if (!diff) return null
    if (entity === 'Adjustment' || entity === 'Payout' || entity === 'Transaction') {
      const amount = pickAfterOrBefore(diff, 'amount')
      const short = typeof amount === 'number' ? formatRubShort(amount) : null
      return short
    }
    return null
  }

  router.get('/', requirePermission(prisma, 'users.manage'), asyncHandler(async (req: Request, res: Response) => {
    const tenant = await getTenant(prisma, req as any)
    const { entity, q, limit = '100', view, year, month, userId, employeeId } = req.query as any
    const where: any = { tenantId: tenant.id }
    if (entity) where.entity = String(entity)
    if (userId) where.userId = String(userId)
    const employeeFilter: string | null = employeeId ? String(employeeId) : null
    // Диапазон по дате создания: год/месяц
    if (year) {
      const y = Number(year)
      const m = month ? Math.max(1, Math.min(12, Number(month))) : null
      const from = new Date(Date.UTC(y, (m ? m - 1 : 0), 1))
      const to = new Date(Date.UTC(y + (m ? 0 : 1), (m ? m : 12), 1))
      where.createdAt = { gte: from, lt: to }
    }
    if (q) where.OR = [
      { action: { contains: String(q) } },
      { entity: { contains: String(q) } },
      { entityId: { contains: String(q) } },
    ]
    const raw = await prisma.auditLog.findMany({
      where,
      include: { user: { select: { id: true, fullName: true, phone: true } } },
      orderBy: [{ createdAt: 'desc' }],
      take: Math.min(500, Number(limit) || 100)
    })
    const mode = String(view || 'compact')
    if (mode === 'compact') {
      // Группируем табели по сотруднику, агрегируя изменения по датам с учётом before/after
      type GroupKey = string
      const groups = new Map<GroupKey, any>()
      const tsLogs = raw.filter(a => a.entity === 'Timesheet').sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      for (const a of tsLogs) {
        try {
          const diff = a.diff ? JSON.parse(a.diff) : null
          const before = diff?.before || null
          const after = diff?.after || null
          const _employeeId: string | undefined = (after?.employeeId ?? before?.employeeId)
          const workDate: string | undefined = (after?.workDate ?? before?.workDate)
          if (!_employeeId || !workDate) continue
          if (employeeFilter && _employeeId !== employeeFilter) continue
          const key = `${_employeeId}`
          const g = groups.get(key) || { type: 'compact', group: 'TimesheetBatch', employeeId: _employeeId, action: 'upsert', days: new Map<string, { from?: number; to?: number }>(), count: 0, lastAt: a.createdAt, user: a.user }
          const d = workDate.slice(0,10)
          const entry = g.days.get(d) || {}
          const beforeMin = typeof before?.minutes === 'number' ? before.minutes : undefined
          const afterMin = typeof after?.minutes === 'number' ? after.minutes : undefined
          if (entry.from === undefined) entry.from = beforeMin ?? 0
          if (afterMin !== undefined) entry.to = afterMin
          else if (entry.to === undefined && entry.from !== undefined) entry.to = entry.from
          g.days.set(d, entry)
          g.count += 1
          if (a.createdAt > g.lastAt) g.lastAt = a.createdAt
          if (a.user) g.user = a.user
          groups.set(key, g)
        } catch {}
      }
      // Разрешаем имена сотрудников
      const uniqEmployeeIds = Array.from(new Set(Array.from(groups.values()).map((g: any) => String(g.employeeId))))
      const employees = await prisma.employee.findMany({ where: { id: { in: uniqEmployeeIds } }, select: { id: true, fullName: true } })
      const empById = new Map(employees.map(e => [e.id, e.fullName]))
      const items: any[] = []
      for (const g of Array.from(groups.values())) {
        const dates = Array.from(g.days.keys()).sort()
        const days = dates.map((d) => {
          const v = g.days.get(d) || {}
          const from = typeof v.from === 'number' ? v.from : 0
          const to = typeof v.to === 'number' ? v.to : from
          return { date: d, fromMinutes: from, toMinutes: to }
        })
        const keyValue = computeKeyValue('Timesheet', null, { kind: 'timesheet', days })
        const userLabel = (g.user?.fullName || g.user?.phone || '') as string
        items.push({
          id: `${g.group}:${g.employeeId}:${g.action}`,
          createdAt: g.lastAt,
          user: g.user,
          userLabel,
          entity: 'Timesheet',
          entityLabel: 'Табель',
          entityDisplay: `${empById.get(g.employeeId) || g.employeeId}`,
          action: g.action,
          compact: {
            kind: 'timesheet',
            count: g.count,
            days
          },
          keyValue
        })
      }
      // Добавляем прочие сущности с фильтрацией полей
      for (const a of raw) {
        if (a.entity === 'Timesheet') continue
        if (employeeFilter) {
          try {
            const diff = a.diff ? JSON.parse(a.diff) : null
            const before = diff?.before || null
            const after = diff?.after || null
            const eid: string | undefined = (after?.employeeId ?? before?.employeeId)
            if (!eid || eid !== employeeFilter) continue
          } catch {}
        }
        const entityLabel = ENTITY_LABEL[a.entity] || a.entity
        const entityDisplay = await resolveEntityDisplay(a.entity, a.entityId, a.diff)
        let resolvedChanges: Array<{ field: string; label: string; from: string | number | null; to: string | number | null }> = []
        try {
          const diff = a.diff ? JSON.parse(a.diff) : null
          const changed = diff?.changed || null
          if (changed) {
            const allowed = allowedFieldsForEntity(a.entity)
            for (const [key, val] of Object.entries<any>(changed)) {
              if (key === 'id' || key === 'tenantId' || key === 'createdBy' || key === 'updatedBy' || key === 'createdAt' || key === 'updatedAt') continue
              if (allowed && !allowed.has(key)) continue
              let from = (val as any)?.from ?? null
              let to = (val as any)?.to ?? null
              if (key.endsWith('Id')) {
                const fromName = await resolveNameById(key, typeof from === 'string' ? from : null)
                const toName = await resolveNameById(key, typeof to === 'string' ? to : null)
                from = fromName
                to = toName
              }
              if (key === 'workDate' || key === 'paymentDate' || key === 'date') {
                from = formatDateRu(from)
                to = formatDateRu(to)
              }
              if (key === 'amount' && typeof to === 'number') {
                const fmt = (n: number | null) => typeof n === 'number' ? (n / 100).toLocaleString('ru-RU', { minimumFractionDigits: 2 }) : null
                from = fmt(typeof from === 'number' ? from : null)
                to = fmt(to)
              }
              if (key === 'kind') {
                from = translateKind(from)
                to = translateKind(to)
              }
              if (key === 'method') {
                from = translateMethod(from)
                to = translateMethod(to)
              }
              resolvedChanges.push({ field: key, label: fieldLabel(key), from, to })
            }
          }
        } catch {}
        let humanAction: string | undefined
        if (a.entity === 'Adjustment') {
          // Заголовок: Добавлена премия/Изменён штраф/… Имя
          let empName: string | null = null
          let kindRu: string | null = null
          try {
            const diff = a.diff ? JSON.parse(a.diff) : null
            const before = diff?.before || null
            const after = diff?.after || null
            const employeeId = (after?.employeeId ?? before?.employeeId) || null
            const kindRaw = (after?.kind ?? before?.kind) || null
            if (employeeId) empName = await resolveNameById('employeeId', employeeId)
            if (kindRaw) kindRu = translateKind(kindRaw)
          } catch {}
          const who = empName || ''
          const gender = kindGender(kindRu)
          const verb = actionVerb(a.action, gender)
          const noun = (kindRu || 'операция').toLowerCase()
          humanAction = `${verb} ${noun} ${who}`.trim()
        } else if (a.entity === 'Payout') {
          // Заголовок: Выплата Имя (без суммы — сумма идёт в «Значение»)
          let empName: string | null = null
          try {
            const diff = a.diff ? JSON.parse(a.diff) : null
            const before = diff?.before || null
            const after = diff?.after || null
            const employeeId = (after?.employeeId ?? before?.employeeId) || null
            if (employeeId) empName = await resolveNameById('employeeId', employeeId)
          } catch {}
          const who = empName || ''
          humanAction = `Выплата ${who}`.trim()
        }
        const keyValue = computeKeyValue(a.entity, a.diff)
        const userLabel = (a.user?.fullName || a.user?.phone || '') as string
        items.push({ ...a, entityLabel, entityDisplay, resolvedChanges, humanAction, keyValue, userLabel })
      }
      items.sort((a, b) => (new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()))
      return res.json({ items })
    }
    const items = [] as any[]
    for (const a of raw) {
      if (employeeFilter) {
        try {
          const diff = a.diff ? JSON.parse(a.diff) : null
          const before = diff?.before || null
          const after = diff?.after || null
          const eid: string | undefined = (after?.employeeId ?? before?.employeeId)
          if (!eid || eid !== employeeFilter) continue
        } catch {}
      }
      const entityLabel = ENTITY_LABEL[a.entity] || a.entity
      const entityDisplay = await resolveEntityDisplay(a.entity, a.entityId, a.diff)
      let resolvedChanges: Array<{ field: string; label: string; from: string | number | null; to: string | number | null }> = []
      try {
        const diff = a.diff ? JSON.parse(a.diff) : null
        const changed = diff?.changed || null
        if (changed) {
          const allowed = allowedFieldsForEntity(a.entity)
          for (const [key, val] of Object.entries<any>(changed)) {
            if (key === 'id' || key === 'tenantId' || key === 'createdBy' || key === 'updatedBy' || key === 'createdAt' || key === 'updatedAt') continue
            if (allowed && !allowed.has(key)) continue
            let from = val?.from ?? null
            let to = val?.to ?? null
            if (key.endsWith('Id')) {
              const fromName = await resolveNameById(key, typeof from === 'string' ? from : null)
              const toName = await resolveNameById(key, typeof to === 'string' ? to : null)
              from = fromName
              to = toName
            }
            if (key === 'workDate' || key === 'paymentDate' || key === 'date') {
              from = formatDateRu(from)
              to = formatDateRu(to)
            }
            if (key === 'amount' && typeof to === 'number') {
              const fmt = (n: number | null) => typeof n === 'number' ? (n / 100).toLocaleString('ru-RU', { minimumFractionDigits: 2 }) : null
              from = fmt(typeof from === 'number' ? from : null)
              to = fmt(to)
            }
            if (key === 'kind') {
              from = translateKind(from)
              to = translateKind(to)
            }
            if (key === 'method') {
              from = translateMethod(from)
              to = translateMethod(to)
            }
            resolvedChanges.push({ field: key, label: fieldLabel(key), from, to })
          }
        }
      } catch {}
      let humanAction: string | undefined
      if (a.entity === 'Adjustment') {
        // выясняем сотрудника для заголовка
        let empName: string | null = null
        try {
          const diff = a.diff ? JSON.parse(a.diff) : null
          const before = diff?.before || null
          const after = diff?.after || null
          const employeeId = (after?.employeeId ?? before?.employeeId) || null
          if (employeeId) empName = await resolveNameById('employeeId', employeeId)
        } catch {}
        const who = empName || ''
        const map: Record<string, string> = { create: 'Добавлена операция', update: 'Изменена операция', delete: 'Удалена операция' }
        humanAction = `${map[a.action] || a.action} ${who}`.trim()
      } else if (a.entity === 'Payout') {
        // Заголовок: Выплата Имя, 1 000р
        let empName: string | null = null
        let amountLabel: string | null = null
        try {
          const diff = a.diff ? JSON.parse(a.diff) : null
          const before = diff?.before || null
          const after = diff?.after || null
          const employeeId = (after?.employeeId ?? before?.employeeId) || null
          const amountCents = (after?.amount ?? before?.amount)
          if (employeeId) empName = await resolveNameById('employeeId', employeeId)
          if (typeof amountCents === 'number') amountLabel = formatRubShort(amountCents)
        } catch {}
        const who = empName || ''
        humanAction = `Выплата ${who}${amountLabel ? `, ${amountLabel}` : ''}`.trim()
      }
      const keyValue = computeKeyValue(a.entity, a.diff)
      items.push({ ...a, entityLabel, entityDisplay, resolvedChanges, humanAction, keyValue })
    }
    res.json({ items })
  }))

  return router
}


