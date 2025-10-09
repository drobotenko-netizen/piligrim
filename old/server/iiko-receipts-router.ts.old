import { Router } from 'express'
import { IikoClient, buildDayRangeIso } from './client' // Assuming client is needed for OLAP calls
import { PrismaClient } from '@prisma/client'

function safeParseArray(s?: string | null): string[] {
  if (!s) return []
  try {
    const j = JSON.parse(s)
    return Array.isArray(j) ? j.map(x => String(x)) : []
  } catch { return [] }
}

// Функция для конвертации времени из UTC в правильный часовой пояс (UTC+7)
function toCorrectTime(dateTime: any): string | null {
  if (!dateTime) return null
  if (typeof dateTime === 'string') {
    // Если это строка с Z (UTC), добавляем 7 часов
    if (dateTime.endsWith('Z')) {
      const d = new Date(dateTime)
      const correctTime = new Date(d.getTime() + 7 * 60 * 60 * 1000)
      return correctTime.toISOString().replace('Z', '')
    }
    return dateTime
  }
  if (dateTime instanceof Date) {
    // Добавляем 7 часов
    const correctTime = new Date(dateTime.getTime() + 7 * 60 * 60 * 1000)
    return correctTime.toISOString().replace('Z', '')
  }
  return null
}

export function createIikoReceiptsRouter(deps: { buildDayRangeIso: (d: string) => { from: string; to: string }, client: IikoClient }) {
  const router = Router()
  const { buildDayRangeIso, client } = deps

  router.get('/sales/receipts', async (req, res) => {
    const prisma = (req as any).prisma || req.app.get('prisma')
    if (!prisma) return res.status(503).json({ error: 'prisma not available' })
    const date = String(req.query.date || '').trim()
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: 'date=YYYY-MM-DD required' })
    const includeItems = String(req.query.includeItems || '') === '1'
    try {
      const day = new Date(date + 'T00:00:00.000Z')
      const next = new Date(day.getTime() + 24 * 60 * 60 * 1000)
      const receipts = await prisma.iikoReceipt.findMany({
        where: { date: { gte: day, lt: next } },
        orderBy: { net: 'desc' },
        include: includeItems ? { items: true } : { items: false as any }
      })
      // Enrich with times/source and returns mapping from OLAP for the day
      let timeMap = new Map<string, { openTime?: string | null; closeTime?: string | null; sourceOrderNum?: string | null; storned?: string | null }>()
      let returnsBySource = new Map<string, { returnOrderNum: string; returnOpenTime?: string | null; returnCloseTime?: string | null }>()
      try {
        const { from, to } = buildDayRangeIso(date)
        const body = {
          reportType: 'SALES',
          buildSummary: true,
          groupByRowFields: ['OrderNum','OpenTime','CloseTime','SourceOrderNum','Storned'],
          groupByColFields: [],
          aggregateFields: ['DishDiscountSumInt'],
          filters: {
            'OpenDate.Typed': { filterType: 'DateRange', periodType: 'CUSTOM', from, to }
            // Убираем фильтры по удаленным чекам - получаем все
          }
        } as any
        const j: any = await client.postOlap(body)
        for (const r of (Array.isArray(j?.data) ? j.data : [])) {
          const num = String(r?.OrderNum || '')
          if (!num) continue
          timeMap.set(num, {
            openTime: r?.OpenTime || null,
            closeTime: r?.CloseTime || null,
            sourceOrderNum: r?.SourceOrderNum ? String(r.SourceOrderNum) : null,
            storned: r?.Storned || null
          })
        }
        // Returns mapping: Storned TRUE rows to their SourceOrderNum
        const bodyRet = {
          reportType: 'SALES',
          buildSummary: true,
          groupByRowFields: ['OrderNum','OpenTime','CloseTime','SourceOrderNum','Storned'],
          groupByColFields: [],
          aggregateFields: ['DishReturnSum'],
          filters: {
            'OpenDate.Typed': { filterType: 'DateRange', periodType: 'CUSTOM', from, to },
            DeletedWithWriteoff: { filterType: 'IncludeValues', values: ['NOT_DELETED'] },
            OrderDeleted: { filterType: 'IncludeValues', values: ['NOT_DELETED'] },
            Storned: { filterType: 'IncludeValues', values: ['TRUE'] }
          }
        } as any
        const jr: any = await client.postOlap(bodyRet)
        for (const r of (Array.isArray(jr?.data) ? jr.data : [])) {
          const src = String(r?.SourceOrderNum || '')
          const ret = String(r?.OrderNum || '')
          if (!src || !ret) continue
          if (!returnsBySource.has(src)) returnsBySource.set(src, { returnOrderNum: ret, returnOpenTime: r?.OpenTime || null, returnCloseTime: r?.CloseTime || null })
        }
      } catch {}
      const rows = receipts.map((r: any) => {
        // Для возвратов используем returnSum вместо net
        const netAmount = r.isReturn ? (r.returnSum || 0) : (r.net || 0)
        return {
        orderNum: r.orderNum,
        net: netAmount,
        cost: r.cost || 0,
        foodCostPct: netAmount ? Math.round(((r.cost || 0) / netAmount) * 10000) / 100 : 0,
        dishes: r.items ? r.items.reduce((a: number, it: any) => a + (it.qty || 0), 0) : undefined,
        guests: r.guests || 0,
        payTypes: safeParseArray(r.payTypesJson),
        waiter: r.waiter,
        register: r.register,
        sessionNumber: r.sessionNumber,
        cashRegNumber: r.cashRegNumber,
        customerName: r.customerName,
        customerPhone: r.customerPhone,
        orderType: r.orderType || null,
        deliveryServiceType: r.deliveryServiceType || null,
        isReturn: !!r.isReturn || false,
        returnSum: r.returnSum || 0,
        isDeleted: !!r.isDeleted || false,
        deletedWithWriteoff: !!r.deletedWithWriteoff || false,
        openTime: toCorrectTime(r.openTime || timeMap.get(r.orderNum)?.openTime || null),
        closeTime: toCorrectTime(r.closeTime || timeMap.get(r.orderNum)?.closeTime || null),
        sourceOrderNum: timeMap.get(r.orderNum)?.sourceOrderNum || null,
        returnOrderNum: returnsBySource.get(r.orderNum)?.returnOrderNum || null,
        returnTime: toCorrectTime(returnsBySource.get(r.orderNum)?.returnOpenTime || returnsBySource.get(r.orderNum)?.returnCloseTime || null),
        items: includeItems ? (r.items || []).map((it: any) => {
          // Для позиций в возвратах используем returnSum вместо net
          const itemNet = r.isReturn ? (it.returnSum || 0) : (it.net || 0)
          return {
          dishId: it.dishId,
          dishName: it.dishName,
          size: it.size,
          qty: it.qty || 0,
          net: itemNet,
          cost: it.cost || 0,
          measureUnit: it.measureUnit || null
        }}) : undefined
      }}).sort((a: any, b: any) => {
        const ta = String(a.openTime || a.closeTime || '')
        const tb = String(b.openTime || b.closeTime || '')
        return ta.localeCompare(tb)
      })
      res.json({ date, rows })
    } catch (e: any) {
      res.status(500).json({ error: String(e?.message || e) })
    }
  })

  return router
}
