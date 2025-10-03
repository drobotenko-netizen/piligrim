// Minimal wrapper around Google Sheets REST API
// If googleapis package isn't installed, we fall back to simple fetch calls

let google: any
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  google = require('googleapis').google
} catch {
  google = null
}

export type SheetsGetResponse = any

export class GSheetsClient {
  constructor(private mode: { apiKey: string } | { credentialJson: any }) {}

  async getSpreadsheetMeta(spreadsheetId: string): Promise<SheetsGetResponse> {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}?key=${(this as any).mode.apiKey || ''}`
    const res = await fetch(url)
    return await res.json()
  }

  async getRange(spreadsheetId: string, rangeA1: string): Promise<SheetsGetResponse> {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(rangeA1)}?key=${(this as any).mode.apiKey || ''}`
    const res = await fetch(url)
    return await res.json()
  }
}


