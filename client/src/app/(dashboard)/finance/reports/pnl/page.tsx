import PnlClient from './ui/PnlClient'

export default function PnlReportPage() {
  const now = new Date()
  const y = now.getUTCFullYear()
  const m = now.getUTCMonth() + 1
  
  return <PnlClient initialY={y} initialM={m} />
}
