#!/usr/bin/env node
// Group docs/iiko-api.md into ~9 semantic buckets under docs/iiko-api-grouped/

const fs = require('fs')
const path = require('path')

const SRC = path.resolve(__dirname, '..', 'docs', 'iiko-api.md')
const OUT_DIR = path.resolve(__dirname, '..', 'docs', 'iiko-api-grouped')

const BUCKETS = [
  {
    key: '00_overview_auth_errors',
    title: 'Обзор, ограничения, авторизация, ошибки',
    patterns: [
      /принципы работы/i,
      /облачные системы с открытым api/i,
      /авторизац/i,
      /выход/i,
      /описание ошибок/i,
      /лиценз/i
    ]
  },
  {
    key: '01_entities',
    title: 'Сущности: номенклатура, группы, категории, изображения, шкалы',
    patterns: [
      /получение элементов номенклатуры/i,
      /номенклатурн/i,
      /product(dto|s)?/i,
      /групп[ае]/i,
      /пользовательск(ие|ая) категори/i,
      /images\/(load|save|delete)/i,
      /шкал[аы]/i,
      /productScales/i
    ]
  },
  {
    key: '02_documents_invoices',
    title: 'Документы: приходные/расходные накладные, возвраты, распроведение',
    patterns: [
      /приходн(ая|ые) накладн/i,
      /расходн(ая|ые) накладн/i,
      /returnedInvoice/i,
      /unprocess\/(incomingInvoice|outgoingInvoice)/i
    ]
  },
  {
    key: '03_documents_production_sales_inventory',
    title: 'Документы: акты приготовления/реализации, инвентаризации',
    patterns: [
      /акт(а)? приготов/i,
      /productionDocument/i,
      /акт(а)? реализац/i,
      /salesDocument/i,
      /инвентаризац/i,
      /incomingInventory/i
    ]
  },
  {
    key: '04_transfers_writeoff',
    title: 'Документы: внутренние перемещения, списания (writeoff)',
    patterns: [
      /внутренние перемещ/i,
      /internalTransfer/i,
      /акты списан/i,
      /writeoff/i
    ]
  },
  {
    key: '05_cash_shifts_payments_payroll',
    title: 'Смены, платежи/внесения/изъятия, платежные ведомости',
    patterns: [
      /работа со сменами/i,
      /cashshifts/i,
      /payments\/list/i,
      /pay(in|out)s?/i,
      /ведомост/i,
      /payrolls/i
    ]
  },
  {
    key: '06_reports_olap_balances_egais',
    title: 'Отчёты: OLAP, балансы, ЕГАИС',
    patterns: [
      /olap/i,
      /reports\/olap/i,
      /баланс[аы]?/i,
      /reports\/balance/i,
      /egais/i
    ]
  },
  {
    key: '07_xsd_schemas',
    title: 'Приложения: XSD схемы',
    patterns: [
      /^xsd\b/i,
      /<xs:schema/i
    ]
  },
  {
    key: '08_misc',
    title: 'Прочее',
    patterns: []
  }
]

function detectBucket(line) {
  for (const b of BUCKETS) {
    for (const re of b.patterns) {
      if (re.test(line)) return b.key
    }
  }
  return null
}

function main() {
  if (!fs.existsSync(SRC)) {
    console.error('Source not found:', SRC)
    process.exit(1)
  }
  const content = fs.readFileSync(SRC, 'utf8')
  const lines = content.split(/\r?\n/)

  // Initialize buffers
  const buffers = {}
  for (const b of BUCKETS) buffers[b.key] = []

  let current = '00_overview_auth_errors'
  buffers[current].push(`# ${BUCKETS.find(b => b.key === current).title}`, '')

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const key = detectBucket(line) || current
    if (key !== current && key !== null) {
      // start new bucket with a heading if empty
      if (buffers[key].length === 0) {
        buffers[key].push(`# ${BUCKETS.find(b => b.key === key).title}`, '')
      }
      current = key
    }
    buffers[current].push(line)
  }

  fs.mkdirSync(OUT_DIR, { recursive: true })
  for (const [idx, b] of BUCKETS.entries()) {
    const file = path.join(OUT_DIR, `${String(idx).padStart(2, '0')}_${b.key}.md`)
    const data = buffers[b.key].join('\n').replace(/\n{3,}/g, '\n\n')
    fs.writeFileSync(file, data, 'utf8')
  }
  console.log(`Grouped into ${BUCKETS.length} files at ${OUT_DIR}`)
}

main()



