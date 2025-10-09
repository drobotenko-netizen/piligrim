"use client"

import { useEffect, useState } from 'react'
import { getApiBase } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Calendar, Wallet, TrendingUp, TrendingDown } from 'lucide-react'

interface Balance {
  accountId: string
  accountName: string
  accountKind: string
  startBalance: number
  periodChange: number
  endBalance: number
  lastTransactionDate: string | null
}

interface BalancesData {
  balances: Balance[]
  dateFrom: string
  dateTo: string
  totalStartBalance: number
  totalPeriodChange: number
  totalEndBalance: number
}

export default function BalancesClient() {
  const [balances, setBalances] = useState<Balance[]>([])
  const [totalStartBalance, setTotalStartBalance] = useState<number>(0)
  const [totalPeriodChange, setTotalPeriodChange] = useState<number>(0)
  const [totalEndBalance, setTotalEndBalance] = useState<number>(0)
  const [dateFrom, setDateFrom] = useState<string>('2025-01-01')
  const [dateTo, setDateTo] = useState<string>(new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const API_BASE = getApiBase()

  function rubFmt(cents: number) {
    return new Intl.NumberFormat('ru-RU').format(Math.round(cents/100)) + ' ₽'
  }

  function getKindLabel(kind: string) {
    const labels: { [key: string]: string } = {
      'cash': 'Наличные',
      'bank': 'Банк',
      'card': 'Карта',
      'safe': 'Сейф'
    }
    return labels[kind] || kind
  }

  function getKindIcon(kind: string) {
    switch (kind) {
      case 'cash': return <Wallet className="h-4 w-4" />
      case 'bank': return <TrendingUp className="h-4 w-4" />
      case 'card': return <TrendingDown className="h-4 w-4" />
      case 'safe': return <Wallet className="h-4 w-4" />
      default: return <Wallet className="h-4 w-4" />
    }
  }

  async function loadBalances() {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`${API_BASE}/api/balances?dateFrom=${dateFrom}&dateTo=${dateTo}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const data: BalancesData = await response.json()
      setBalances(data.balances)
      setTotalStartBalance(data.totalStartBalance)
      setTotalPeriodChange(data.totalPeriodChange)
      setTotalEndBalance(data.totalEndBalance)
    } catch (e: any) {
      setError(e.message)
      console.error('Failed to load balances:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadBalances()
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Остатки по счетам</h1>
          <p className="text-muted-foreground">Просмотр остатков за период</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Выбор периода
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="space-y-2">
              <Label htmlFor="dateFrom">Дата с</Label>
              <Input
                id="dateFrom"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-48"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateTo">Дата по</Label>
              <Input
                id="dateTo"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-48"
              />
            </div>
            <Button onClick={loadBalances} disabled={loading} className="mt-6">
              {loading ? 'Загрузка...' : 'Обновить'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">Ошибка: {error}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Остатки с {new Date(dateFrom).toLocaleDateString('ru-RU')} по {new Date(dateTo).toLocaleDateString('ru-RU')}</CardTitle>
        </CardHeader>
        <CardContent>
          {balances.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Нет данных для отображения</p>
          ) : (
            <>
              <Table>
                <THead>
                  <TR>
                    <TH>Тип</TH>
                    <TH>Счет</TH>
                    <TH className="text-right">Начальный остаток</TH>
                    <TH className="text-right">Изменение</TH>
                    <TH className="text-right">Конечный остаток</TH>
                  </TR>
                </THead>
                <TBody>
                  {balances.map((balance) => (
                    <TR key={balance.accountId}>
                      <TD>
                        <div className="flex items-center gap-2">
                          {getKindIcon(balance.accountKind)}
                          <span className="text-sm text-muted-foreground">
                            {getKindLabel(balance.accountKind)}
                          </span>
                        </div>
                      </TD>
                      <TD className="font-medium">{balance.accountName}</TD>
                      <TD className="text-right">
                        <span className={balance.startBalance >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {rubFmt(balance.startBalance)}
                        </span>
                      </TD>
                      <TD className="text-right">
                        <span className={balance.periodChange >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {balance.periodChange >= 0 ? '+' : ''}{rubFmt(balance.periodChange)}
                        </span>
                      </TD>
                      <TD className="text-right">
                        <span className={balance.endBalance >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {rubFmt(balance.endBalance)}
                        </span>
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
              
              <div className="mt-6 pt-4 border-t space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-muted-foreground">Начальный остаток:</span>
                  <span className={`font-semibold ${totalStartBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {rubFmt(totalStartBalance)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-muted-foreground">Изменение за период:</span>
                  <span className={`font-semibold ${totalPeriodChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {totalPeriodChange >= 0 ? '+' : ''}{rubFmt(totalPeriodChange)}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="text-lg font-semibold">Конечный остаток:</span>
                  <span className={`text-xl font-bold ${totalEndBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {rubFmt(totalEndBalance)}
                  </span>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

