import PnlClient from './ui/PnlClient'

export default function PnlReportPage() {
  const now = new Date()
  const yTo = now.getUTCFullYear()
  const mTo = now.getUTCMonth() + 1
  
  // По умолчанию с 01.01.2025 до текущего месяца
  const yFrom = 2025
  const mFrom = 1
  
  return <PnlClient initialYFrom={yFrom} initialMFrom={mFrom} initialYTo={yTo} initialMTo={mTo} />
}
