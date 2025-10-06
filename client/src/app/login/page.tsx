"use client"

import { useState } from 'react'
import { getApiBase } from "@/lib/api"
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export default function LoginOtpPage() {
  const API_BASE = getApiBase()
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [authId, setAuthId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [channel, setChannel] = useState<'sms'|'telegram'>('sms')

  async function sendCode() {
    setLoading(true); setError(null)
    try {
      const r = await fetch(`${API_BASE}/api/auth/otp/send`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, channel: channel === 'telegram' ? 'telegram' : undefined })
      })
      const j = await r.json()
      if (!r.ok) throw new Error(j?.error || 'send_failed')
      const id = j?.auth_id || j?.requestId || j?.request_id || j?.id || null
      if (!id) throw new Error('no_auth_id')
      setAuthId(String(id))
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function verifyCode() {
    if (!authId) return
    setLoading(true); setError(null)
    try {
      const r = await fetch(`${API_BASE}/api/auth/otp/verify`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auth_id: authId, code, phone })
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok || !j?.ok) throw new Error(j?.error || 'verify_failed')
      window.location.href = '/'
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function devLogin() {
    setLoading(true); setError(null)
    try {
      const r = await fetch(`${API_BASE}/api/auth/otp/dev-login`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone }) })
      const j = await r.json()
      if (!r.ok) throw new Error(j?.error || 'login_failed')
      try { if (j.user) localStorage.setItem('me', JSON.stringify(j.user)) } catch {}
      window.location.href = '/'
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
      <div className="hidden lg:block bg-gray-100" />
      <div className="flex items-center justify-center p-6">
        <Card className="w-full max-w-sm shadow-lg">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <img src="/logo.png" alt="logo" className="h-16 w-auto" />
            </div>
            <div className="text-sm text-muted-foreground">Введите номер телефона для входа</div>
            <Input inputMode="tel" placeholder="+7 9XX XXX XX XX" value={phone} onChange={e => setPhone(e.target.value)} />
            <div>
              <Select value={channel} onValueChange={(v) => setChannel(v as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Канал доставки" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="telegram">Telegram</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {!authId ? (
              <Button className="w-full" onClick={sendCode} disabled={loading || !phone.trim()}>
                {loading ? 'Отправка…' : 'Получить код'}
              </Button>
            ) : (
              <div className="space-y-3">
                <Input inputMode="numeric" placeholder="Код из SMS" value={code} onChange={e => setCode(e.target.value)} />
                <Button className="w-full" onClick={verifyCode} disabled={loading || !code.trim()}>
                  {loading ? 'Проверка…' : 'Войти'}
                </Button>
                <Button variant="outline" className="w-full" onClick={() => { setAuthId(null); setCode('') }} disabled={loading}>Изменить номер</Button>
              </div>
            )}

            {process.env.NODE_ENV === 'development' && (
              <Button className="w-full" variant="ghost" onClick={devLogin} disabled={loading || !phone.trim()}>
                Dev‑вход без SMS
              </Button>
            )}
            {error && (
              <div className="space-y-2">
                <div className="text-sm text-red-600">{error}</div>
                {error.includes('Telegram') && (
                  <div className="text-xs text-muted-foreground bg-blue-50 p-2 rounded border">
                    💡 <strong>Как получить новую ссылку:</strong><br />
                    1. Откройте Telegram<br />
                    2. Найдите бота @your_bot_name<br />
                    3. Отправьте команду /login<br />
                    4. Перейдите по новой ссылке
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}



