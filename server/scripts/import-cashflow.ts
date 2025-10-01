import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { importCashflowRange } from '../src/modules/gsheets/importer'

function parseArgs(argv: string[]): Record<string, string> {
  const out: Record<string, string> = {}
  for (const a of argv) {
    const m = a.match(/^--([^=]+)=(.*)$/)
    if (m) out[m[1]] = m[2]
  }
  return out
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const spreadsheetId = args['spreadsheetId'] || args['id']
  const sheet = args['sheet']
  const gid = args['gid'] ? Number(args['gid']) : undefined
  const fromRow = Number(args['from'] || 4)
  const toRow = Number(args['to'] || 2000)
  if (!spreadsheetId) {
    console.error('Usage: tsx scripts/import-cashflow.ts --spreadsheetId=ID --sheet="ДДС месяц" --from=4 --to=2000')
    process.exit(1)
  }

  const prisma = new PrismaClient()
  try {
    const res = await importCashflowRange(prisma, { spreadsheetId, sheet, gid, fromRow, toRow })
    console.log(JSON.stringify({ ok: true, processed: res.processed }, null, 2))
  } finally {
    await prisma.$disconnect()
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})


