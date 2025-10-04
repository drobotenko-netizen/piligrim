"use client"
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table'
import { formatNumber } from './utils'

type Row = {
  day: number
  date1?: string
  date2?: string
  net1?: number | null
  net2?: number | null
  cumulative1?: number | null
  cumulative2?: number | null
}

type Props = {
  rows: Row[]
  byWeekday: boolean
  month1Name: string
  month2Name: string
}

export default function DataTable({ rows, byWeekday, month1Name, month2Name }: Props) {
  return (
    <div className="rounded-lg border p-4">
      <div className="overflow-auto">
        <Table className="w-full">
          <THead>
            <TR>
              <TH className="w-24">Число</TH>
              {byWeekday ? (
                <>
                  <TH className="w-24">Дата 2</TH>
                  <TH className="text-right w-32">Выручка 1</TH>
                  <TH className="text-right w-32">Выручка 2</TH>
                  <TH className="text-right w-32">Разница (₽)</TH>
                  <TH className="text-right w-32">Разница (%)</TH>
                </>
              ) : (
                <>
                  <TH className="text-right w-32">Выручка ({month1Name})</TH>
                  <TH className="text-right w-32">Выручка ({month2Name})</TH>
                  <TH className="text-right w-32">Разница (₽)</TH>
                  <TH className="text-right w-32">Накоп. ({month1Name})</TH>
                  <TH className="text-right w-32">Накоп. ({month2Name})</TH>
                  <TH className="text-right w-32">Разница (₽)</TH>
                  <TH className="text-right w-32">Разница (%)</TH>
                </>
              )}
            </TR>
          </THead>
          <TBody>
            {rows.map((row, idx) => {
              const net1 = row.net1 || 0
              const net2 = row.net2 || 0
              const diff = net1 - net2
              const diffPercent = net2 !== 0 ? Math.round((diff / net2) * 100) : 0
              const cum1 = row.cumulative1 || 0
              const cum2 = row.cumulative2 || 0
              const cumDiff = cum1 - cum2
              const cumDiffPercent = cum2 !== 0 ? Math.round((cumDiff / cum2) * 100) : 0
              return (
                <TR key={idx}>
                  <TD>{row.day}</TD>
                  {byWeekday ? (
                    <>
                      <TD>{row.date2}</TD>
                      <TD className="text-right">{row.net1 !== null ? formatNumber(row.net1 || 0) : ''}</TD>
                      <TD className="text-right">{row.net2 !== null ? formatNumber(row.net2 || 0) : ''}</TD>
                      <TD className={`text-right font-medium ${diff > 0 ? 'text-green-600' : diff < 0 ? 'text-red-600' : ''}`}>
                        {row.net1 !== null && row.net2 !== null ? `${diff > 0 ? '+' : ''}${formatNumber(diff)}` : ''}
                      </TD>
                      <TD className={`text-right font-medium ${diffPercent > 0 ? 'text-green-600' : diffPercent < 0 ? 'text-red-600' : ''}`}>
                        {row.net1 !== null && row.net2 !== null ? `${diffPercent > 0 ? '+' : ''}${diffPercent}%` : ''}
                      </TD>
                    </>
                  ) : (
                    <>
                      <TD className="text-right">{row.net1 !== null ? formatNumber(row.net1 || 0) : ''}</TD>
                      <TD className="text-right">{row.net2 !== null ? formatNumber(row.net2 || 0) : ''}</TD>
                      <TD className={`text-right font-medium ${diff > 0 ? 'text-green-600' : diff < 0 ? 'text-red-600' : ''}`}>
                        {row.net1 !== null && row.net2 !== null ? `${diff > 0 ? '+' : ''}${formatNumber(diff)}` : ''}
                      </TD>
                      <TD className="text-right">{row.cumulative1 !== null ? formatNumber(row.cumulative1 || 0) : ''}</TD>
                      <TD className="text-right">{row.cumulative2 !== null ? formatNumber(row.cumulative2 || 0) : ''}</TD>
                      <TD className={`text-right font-medium ${cumDiff > 0 ? 'text-green-600' : cumDiff < 0 ? 'text-red-600' : ''}`}>
                        {row.cumulative1 !== null && row.cumulative2 !== null ? `${cumDiff > 0 ? '+' : ''}${formatNumber(cumDiff)}` : ''}
                      </TD>
                      <TD className={`text-right font-medium ${cumDiffPercent > 0 ? 'text-green-600' : cumDiffPercent < 0 ? 'text-red-600' : ''}`}>
                        {row.cumulative1 !== null && row.cumulative2 !== null ? `${cumDiffPercent > 0 ? '+' : ''}${cumDiffPercent}%` : ''}
                      </TD>
                    </>
                  )}
                </TR>
              )
            })}
            {!rows.length && (
              <TR>
                <TD colSpan={byWeekday ? 6 : 8} className="text-center text-muted-foreground">
                  Нет данных для отображения
                </TD>
              </TR>
            )}
          </TBody>
        </Table>
      </div>
    </div>
  )
}


