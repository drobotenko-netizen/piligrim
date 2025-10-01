import { PrismaClient } from '@prisma/client'

function normalizeSpaces(input: string): string {
  return input.replace(/[\u00A0\s]+/g, ' ').trim()
}

function parseAmountToCents(input: string | undefined): number | null {
  if (!input) return null
  let s = String(input)
  s = s.replace(/[\u00A0\s]/g, '') // remove spaces incl NBSP
  s = s.replace(',', '.')
  if (!s) return null
  const n = Number(s)
  if (!Number.isFinite(n)) return null
  return Math.round(n * 100)
}

function parseCsv(csv: string): string[][] {
  const rows: string[][] = []
  let i = 0
  let cur: string[] = []
  let field = ''
  let inQuotes = false
  const pushField = () => { cur.push(field); field = '' }
  const pushRow = () => { rows.push(cur); cur = [] }
  while (i < csv.length) {
    const ch = csv[i]
    if (inQuotes) {
      if (ch === '"') {
        if (csv[i + 1] === '"') { field += '"'; i += 2; continue }
        inQuotes = false; i++; continue
      }
      field += ch; i++; continue
    } else {
      if (ch === '"') { inQuotes = true; i++; continue }
      if (ch === ',') { pushField(); i++; continue }
      if (ch === '\n') { pushField(); pushRow(); i++; continue }
      if (ch === '\r') { i++; continue }
      field += ch; i++; continue
    }
  }
  pushField(); if (cur.length) pushRow()
  return rows.filter(r => r.length && r.some(x => x && x.trim() !== ''))
}

function parseRuDate(input: string | undefined): Date | null {
  if (!input) return null
  const m = String(input).match(/^(\d{2})\.(\d{2})\.(\d{4})$/)
  if (!m) return null
  const dd = Number(m[1])
  const mm = Number(m[2])
  const yyyy = Number(m[3])
  // create as UTC date at midnight
  const dt = new Date(Date.UTC(yyyy, mm - 1, dd, 0, 0, 0))
  return dt
}

export async function importCashflowRange(
  prisma: PrismaClient,
  params: { spreadsheetId: string; sheet?: string; gid?: number | string; fromRow: number; toRow: number }
): Promise<{ processed: number }> {
  const { spreadsheetId, sheet = 'ДДС месяц', gid, fromRow, toRow } = params
  let rows: any[][] = []
  if (gid !== undefined && gid !== null && String(gid) !== '') {
    // Prefer export by gid (most reliable, ignores filters)
    const exportByGid = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(spreadsheetId)}/export?format=csv&gid=${encodeURIComponent(String(gid))}`
    const r = await fetch(exportByGid)
    if (!r.ok) throw new Error(`gsheets export by gid failed ${r.status}`)
    const csv = await r.text()
    const all = parseCsv(csv)
    rows = all.slice(fromRow - 1, toRow)
  } else {
    try {
      const mod = await import('./client')
      const GSheetsClient = mod.GSheetsClient as any
      const gs = new GSheetsClient()
      rows = await gs.getValuesByTitleRows(spreadsheetId, sheet, fromRow, toRow, 'L')
    } catch {
      // Fallback 1: official export endpoint (entire sheet), then slice rows
      const exportUrl = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(spreadsheetId)}/export?format=csv&sheet=${encodeURIComponent(sheet)}`
      let ok = false
      try {
        const r1 = await fetch(exportUrl)
        if (r1.ok) {
          const csv1 = await r1.text()
          const all = parseCsv(csv1)
          rows = all.slice(fromRow - 1, toRow)
          ok = rows.length > 0
        }
      } catch {}
      if (!ok) {
        // Fallback 2: gviz CSV with explicit range
        const range = `A${fromRow}:L${toRow}`
        const url = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(spreadsheetId)}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheet)}&range=${encodeURIComponent(range)}`
        const r = await fetch(url)
        if (!r.ok) throw new Error(`gsheets CSV fetch failed ${r.status}`)
        const csv = await r.text()
        rows = parseCsv(csv)
      }
    }
  }
  let processed = 0

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i] || []
    const rowNum = fromRow + i
    // columns mapping based on header example
    const monthName = r[0] ? normalizeSpaces(String(r[0])) : null
    const monthNum = r[1] ? Number(String(r[1]).replace(/[^0-9-]/g, '')) : null
    const dateText = r[2] ? String(r[2]) : null
    const amountCents = parseAmountToCents(r[3])
    const wallet = r[4] ? normalizeSpaces(String(r[4])) : null
    const supplier = r[6] ? normalizeSpaces(String(r[6])) : null
    const comment = r[7] ? normalizeSpaces(String(r[7])) : null
    const fund = r[8] ? normalizeSpaces(String(r[8])) : null
    const flowType = r[9] ? normalizeSpaces(String(r[9])) : null
    const activity = r[10] ? normalizeSpaces(String(r[10])) : null

    const dt = parseRuDate(dateText || undefined)

    // Skip completely empty lines
    const isEmpty = !monthName && !monthNum && !dateText && amountCents === null && !wallet && !supplier && !comment && !fund && !flowType && !activity
    if (isEmpty) continue

    await prisma.gsCashflowRow.upsert({
      where: { spreadsheet_sheet_rowNum: { spreadsheet: spreadsheetId, sheet, rowNum } },
      create: {
        spreadsheet: spreadsheetId,
        sheet,
        rowNum,
        monthName: monthName || undefined,
        monthNum: monthNum ?? undefined,
        date: dt || undefined,
        dateText: dateText || undefined,
        amount: amountCents ?? undefined,
        wallet: wallet || undefined,
        supplier: supplier || undefined,
        comment: comment || undefined,
        fund: fund || undefined,
        flowType: flowType || undefined,
        activity: activity || undefined,
        raw: JSON.stringify(r),
      },
      update: {
        monthName: monthName || undefined,
        monthNum: monthNum ?? undefined,
        date: dt || undefined,
        dateText: dateText || undefined,
        amount: amountCents ?? undefined,
        wallet: wallet || undefined,
        supplier: supplier || undefined,
        comment: comment || undefined,
        fund: fund || undefined,
        flowType: flowType || undefined,
        activity: activity || undefined,
        raw: JSON.stringify(r),
      },
    })
    processed++
  }
  return { processed }
}


