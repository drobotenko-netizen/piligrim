import PnlClient from './ui/PnlClient'

export default function PnlReportPage() {
  const now = new Date()
  const yTo = now.getUTCFullYear()
  const mTo = now.getUTCMonth() + 1
  
  // По умолчанию - последние 3 месяца
  const from = new Date(now)
  from.setMonth(from.getMonth() - 2)
  const yFrom = from.getUTCFullYear()
  const mFrom = from.getUTCMonth() + 1
  
  return <PnlClient initialYFrom={yFrom} initialMFrom={mFrom} initialYTo={yTo} initialMTo={mTo} />
}
