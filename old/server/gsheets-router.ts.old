import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { importCashflowRange } from './importer'

export function createGSheetsRouter() {
  const router = Router()

  // GET /gsheets/sheet-range?spreadsheetId=...&sheet=...&from=4&to=24
  router.get('/sheet-range', async (req, res) => {
    try {
      const spreadsheetId = String(req.query.spreadsheetId || '').trim()
      const sheet = String(req.query.sheet || '').trim()
      const from = Number(String(req.query.from || '').trim() || 1)
      const to = Number(String(req.query.to || '').trim() || from + 20)
      if (!spreadsheetId || !sheet) return res.status(400).json({ error: 'spreadsheetId and sheet required' })
      if (!Number.isFinite(from) || !Number.isFinite(to) || from < 1 || to < from) return res.status(400).json({ error: 'bad range' })
      const range = `A${from}:Z${to}`
      const url = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(spreadsheetId)}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheet)}&range=${encodeURIComponent(range)}`
      const r = await fetch(url)
      if (!r.ok) return res.status(r.status).json({ error: `fetch failed ${r.status}` })
      const csv = await r.text()
      const rows = csv.split(/\r?\n/).filter(Boolean).map(line => line.split(','))
      res.json({ sheet, from, to, rows })
    } catch (e: any) {
      res.status(500).json({ error: String(e?.message || e) })
    }
  })

  return router
}

export function createGSheetsImportRouter(prisma: PrismaClient) {
  const router = Router()
  // POST /gsheets/cashflow/import
  router.post('/cashflow/import', async (req, res) => {
    try {
      const { spreadsheetId, sheet, gid, from, to } = req.body || {}
      if (!spreadsheetId) return res.status(400).json({ error: 'spreadsheetId required' })
      if (!sheet && !gid) return res.status(400).json({ error: 'sheet or gid required' })
      const fromRow = Number(from || 1)
      const toRow = Number(to || fromRow + 2000)
      if (!Number.isFinite(fromRow) || !Number.isFinite(toRow) || fromRow < 1 || toRow < fromRow) return res.status(400).json({ error: 'bad range' })
      // Перед импортом очищаем диапазон по spreadsheetId (+опционально sheet)
      await prisma.gsCashflowRow.deleteMany({ where: { spreadsheet: spreadsheetId, ...(sheet ? { sheet } : {}) } })
      const r = await importCashflowRange(prisma, { spreadsheetId, sheet, gid, fromRow, toRow })
      res.json(r)
    } catch (e: any) {
      res.status(500).json({ error: String(e?.message || e) })
    }
  })

  // POST /gsheets/cashflow/clear
  router.post('/cashflow/clear', async (req, res) => {
    try {
      const { spreadsheetId, sheet, gid } = req.body || {}
      if (!spreadsheetId) return res.status(400).json({ error: 'spreadsheetId required' })
      
      const where: any = { spreadsheet: spreadsheetId }
      if (sheet) where.sheet = sheet
      if (gid) where.sheet = 'ДДС месяц' // Для gid используем стандартное название листа
      
      const deleted = await prisma.gsCashflowRow.deleteMany({ where })
      
      res.json({ deleted: deleted.count })
    } catch (e: any) {
      res.status(500).json({ error: String(e?.message || e) })
    }
  })

  // GET /gsheets/cashflow
  router.get('/cashflow', async (req, res) => {
    try {
      const spreadsheetId = String(req.query.spreadsheetId || '').trim()
      const sheet = String(req.query.sheet || '').trim()
      const gid = String(req.query.gid || '').trim()
      const dateFrom = String(req.query.dateFrom || '').trim()
      const dateTo = String(req.query.dateTo || '').trim()
      const wallet = String(req.query.wallet || '').trim()
      const fund = String(req.query.fund || '').trim()
      const flowType = String(req.query.flowType || '').trim()
      const search = String(req.query.search || '').trim()
      const incompleteTransfer = String(req.query.incompleteTransfer || '').trim()
      const notImported = String(req.query.notImported || '').trim()
      const page = Math.max(1, Number(String(req.query.page || '1')) || 1)
      const limit = Math.min(200, Math.max(1, Number(String(req.query.limit || '50')) || 50))

      const where: any = {}
      if (spreadsheetId) where.spreadsheet = spreadsheetId
      if (sheet) where.sheet = sheet
      if (gid) where.sheet = undefined // prefer gid filter via export stage, keep sheet free
      if (dateFrom) {
        const d = new Date(dateFrom)
        if (!isNaN(d.getTime())) where.date = Object.assign(where.date || {}, { gte: d })
      }
      if (dateTo) {
        const d = new Date(dateTo)
        if (!isNaN(d.getTime())) where.date = Object.assign(where.date || {}, { lte: d })
      }
      if (wallet) where.wallet = { contains: wallet }
      if (fund) where.fund = { contains: fund }
      if (flowType) where.flowType = { contains: flowType }
      if (search) {
        where.OR = [
          { supplier: { contains: search } },
          { comment: { contains: search } },
          { activity: { contains: search } },
        ]
      }
      if (incompleteTransfer === 'true') {
        where.raw = { contains: '"incompleteTransfer":true' }
      }
      if (notImported === 'true') {
        where.raw = { contains: '"notImported":true' }
      }

      const [total, rows] = await Promise.all([
        prisma.gsCashflowRow.count({ where }),
        prisma.gsCashflowRow.findMany({
          where,
          orderBy: [
            { date: 'asc' },
            { rowNum: 'asc' },
          ],
          skip: (page - 1) * limit,
          take: limit,
        }),
      ])
      res.json({ total, page, limit, rows })
    } catch (e: any) {
      res.status(500).json({ error: String(e?.message || e) })
    }
  })

  // GET /gsheets/cashflow/meta
  router.get('/cashflow/meta', async (req, res) => {
    try {
      const spreadsheetId = String(req.query.spreadsheetId || '').trim()
      const sheet = String(req.query.sheet || '').trim()
      const where: any = {}
      if (spreadsheetId) where.spreadsheet = spreadsheetId
      if (sheet) where.sheet = sheet

      const [minDate, maxDate] = await Promise.all([
        prisma.gsCashflowRow.findFirst({ where: Object.assign({}, where, { date: { not: null } }), orderBy: { date: 'asc' }, select: { date: true } }),
        prisma.gsCashflowRow.findFirst({ where: Object.assign({}, where, { date: { not: null } }), orderBy: { date: 'desc' }, select: { date: true } }),
      ])

      const wallets = await prisma.$queryRawUnsafe<any[]>(
        `select distinct wallet as v from GsCashflowRow where wallet is not null ${spreadsheetId ? 'and spreadsheet = ?' : ''} ${sheet ? 'and sheet = ?' : ''} order by 1`,
        ...(spreadsheetId ? [spreadsheetId] : []),
        ...(sheet ? [sheet] : []),
      )
      const funds = await prisma.$queryRawUnsafe<any[]>(
        `select distinct fund as v from GsCashflowRow where fund is not null ${spreadsheetId ? 'and spreadsheet = ?' : ''} ${sheet ? 'and sheet = ?' : ''} order by 1`,
        ...(spreadsheetId ? [spreadsheetId] : []),
        ...(sheet ? [sheet] : []),
      )
      const flowTypes = await prisma.$queryRawUnsafe<any[]>(
        `select distinct flowType as v from GsCashflowRow where flowType is not null ${spreadsheetId ? 'and spreadsheet = ?' : ''} ${sheet ? 'and sheet = ?' : ''} order by 1`,
        ...(spreadsheetId ? [spreadsheetId] : []),
        ...(sheet ? [sheet] : []),
      )

      res.json({
        minDate: minDate?.date || null,
        maxDate: maxDate?.date || null,
        wallets: wallets.map(r => r.v).filter(Boolean),
        funds: funds.map(r => r.v).filter(Boolean),
        flowTypes: flowTypes.map(r => r.v).filter(Boolean),
      })
    } catch (e: any) {
      res.status(500).json({ error: String(e?.message || e) })
    }
  })
  return router
}


