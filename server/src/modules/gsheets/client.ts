import { google, sheets_v4 } from 'googleapis'

type SheetsAuthMode =
  | { kind: 'service_account'; client: sheets_v4.Sheets }
  | { kind: 'api_key'; apiKey: string }

export class GSheetsClient {
  private mode: SheetsAuthMode

  constructor() {
    const b64 = process.env.GOOGLE_SERVICE_ACCOUNT_BASE64 || ''
    const jsonPath = process.env.GOOGLE_SERVICE_ACCOUNT_JSON || ''
    const apiKey = process.env.GOOGLE_API_KEY || ''

    if (b64 || jsonPath) {
      const credentials = b64
        ? JSON.parse(Buffer.from(b64, 'base64').toString('utf8'))
        : require(jsonPath)
      const scopes = ['https://www.googleapis.com/auth/spreadsheets.readonly']
      const auth = new google.auth.JWT(
        credentials.client_email,
        undefined,
        credentials.private_key,
        scopes
      )
      const sheets = google.sheets({ version: 'v4', auth })
      this.mode = { kind: 'service_account', client: sheets }
    } else if (apiKey) {
      this.mode = { kind: 'api_key', apiKey }
    } else {
      throw new Error('Configure GOOGLE_SERVICE_ACCOUNT_BASE64/JSON or GOOGLE_API_KEY')
    }
  }

  async listSheets(spreadsheetId: string): Promise<Array<{ title: string; sheetId: number }>> {
    if (this.mode.kind === 'service_account') {
      const res = await this.mode.client.spreadsheets.get({ spreadsheetId })
      const sheets = res.data.sheets || []
      return sheets.map(s => ({ title: s.properties?.title || '', sheetId: Number(s.properties?.sheetId || 0) }))
    }
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}?key=${this.mode.apiKey}`
    const r = await fetch(url)
    if (!r.ok) throw new Error(`gsheets listSheets failed ${r.status}`)
    const j: any = await r.json()
    const sheets = Array.isArray(j?.sheets) ? j.sheets : []
    return sheets.map((s: any) => ({ title: s?.properties?.title || '', sheetId: Number(s?.properties?.sheetId || 0) }))
  }

  async getValuesByRange(spreadsheetId: string, rangeA1: string): Promise<any[][]> {
    if (this.mode.kind === 'service_account') {
      const res = await this.mode.client.spreadsheets.values.get({ spreadsheetId, range: rangeA1 })
      return (res.data.values as any[][]) || []
    }
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(rangeA1)}?key=${this.mode.apiKey}`
    const r = await fetch(url)
    if (!r.ok) throw new Error(`gsheets values failed ${r.status}`)
    const j: any = await r.json()
    return (j?.values as any[][]) || []
  }

  async getValuesByTitleRows(
    spreadsheetId: string,
    title: string,
    fromRow: number,
    toRow: number,
    endCol = 'Z'
  ): Promise<any[][]> {
    const range = `'${title.replace(/'/g, "''")}'!A${fromRow}:${endCol}${toRow}`
    return await this.getValuesByRange(spreadsheetId, range)
  }
}


