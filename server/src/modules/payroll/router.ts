import { Router, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { asyncHandler, validateYearMonth } from '../../utils/common-middleware'

export function createPayrollRouter(prisma: PrismaClient) {
  const router = Router()

  // GET / - расчёт зарплаты по месяцу
  router.get('/', validateYearMonth(), asyncHandler(async (req: any, res: Response) => {
    const { year: y, month: m } = req
    
    const start = new Date(Date.UTC(y, m - 1, 1))
    const end = new Date(Date.UTC(y, m, 1))

    // Все сотрудники (включая уволенных)
    const employees = await prisma.employee.findMany({
      include: { position: true }
    })

    // Табели и операции/выплаты за месяц (модели могут отсутствовать в сгенерированном клиенте)
    const [timesheets, adjustments, payouts, rates] = await Promise.all([
      prisma.timesheet.findMany({ 
        where: { workDate: { gte: start, lt: end } } 
      }),
      (prisma as any).adjustment 
        ? prisma.adjustment.findMany({ where: { date: { gte: start, lt: end } } }) 
        : Promise.resolve([]),
      (prisma as any).payout 
        ? (prisma as any).payout.findMany({ where: { date: { gte: start, lt: end } } }) 
        : Promise.resolve([]),
      (prisma as any).positionRate 
        ? (prisma as any).positionRate.findMany({ where: { year: y, month: m } }) 
        : Promise.resolve([])
    ])

    const rateByPosition: Record<string, any> = {}
    ;(rates as any[]).forEach(r => { rateByPosition[r.positionId] = r })

    const computed = employees.map(emp => {
      const empSheets = timesheets.filter(t => t.employeeId === emp.id)
      const totalMinutes = empSheets.reduce((acc, t) => acc + (t.minutes || 0), 0)
      const hours = totalMinutes / 60

      const positionKind = emp.position?.kind || ''
      
      // Приоритет: персональная ставка -> ставка периода -> ставка из позиции
      const periodRate = emp.positionId ? rateByPosition[emp.positionId] : undefined
      const hourRate = emp.personalHourRate ?? periodRate?.baseHourRate ?? emp.position?.baseHourRate ?? 0
      const salaryMonthly = periodRate?.salaryAmount ?? emp.position?.salaryAmount ?? 0
      const isSalary = positionKind === 'SALARY' || positionKind === 'SALARY_PLUS_TASKS'

      const hoursAmount = Math.round(hours * hourRate)
      const salaryAmount = isSalary ? salaryMonthly : 0
      const revenueAmount = 0 // пока без выручки

      const empAdj = (adjustments as any[]).filter(a => a.employeeId === emp.id)
      const bonusAmount = empAdj.filter(a => a.kind === 'bonus').reduce((acc, a) => acc + a.amount, 0)
      const fineAmount = empAdj.filter(a => a.kind === 'fine').reduce((acc, a) => acc + a.amount, 0)
      const deductionAmount = empAdj.filter(a => a.kind === 'deduction').reduce((acc, a) => acc + a.amount, 0)
      const adjustmentsNet = bonusAmount - fineAmount - deductionAmount

      const payoutsList = (payouts as any[]).filter(p => p.employeeId === emp.id)
      const payoutsTotal = payoutsList.reduce((acc, p) => acc + (p.amount || 0), 0)

      const accruedTotal = salaryAmount + hoursAmount + revenueAmount + adjustmentsNet
      const balance = accruedTotal - payoutsTotal

      return {
        employeeId: emp.id,
        fullName: emp.fullName,
        department: emp.position?.department ?? null,
        position: emp.position?.name ?? null,
        hours,
        baseAmount: hoursAmount,
        adjustments: adjustmentsNet,
        totalAmount: accruedTotal,
        salaryAmount,
        hoursAmount,
        revenueAmount,
        bonusAmount,
        fineAmount,
        deductionAmount,
        payoutsTotal,
        balance,
        payouts: payoutsList.map(p => ({ 
          id: p.id, 
          date: p.date, 
          amount: p.amount, 
          method: p.method, 
          note: p.note 
        }))
      }
    })

    // Фильтруем только тех, у кого есть начисления
    const items = computed.filter(r => (r.totalAmount || 0) !== 0)

    res.json({ y, m, items })
  }))

  return router
}
