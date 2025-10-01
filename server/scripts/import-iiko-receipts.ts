import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { importReceiptsForDate } from '../src/modules/iiko/etl/receipts'
import { IikoClient } from '../src/modules/iiko/client'

async function main() {
  const prisma = new PrismaClient()
  const client = new IikoClient()
  const args = process.argv.slice(2)
  const dateArg = args.find(a => a.startsWith('--date='))
  const date = dateArg ? dateArg.split('=')[1] : ''
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    console.error('Usage: tsx scripts/import-iiko-receipts.ts --date=YYYY-MM-DD')
    process.exit(1)
  }
  try {
    const res = await importReceiptsForDate(prisma as any, client, date)
    console.log(JSON.stringify(res))
  } finally {
    await prisma.$disconnect()
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})



