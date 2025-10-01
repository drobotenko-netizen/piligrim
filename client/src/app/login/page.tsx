"use client"

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default function LoginOtpPage() {
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000'
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function devLogin() {
    setLoading(true); setError(null)
    try {
      const r = await fetch(`${API_BASE}/api/auth/otp/dev-login`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone }) })
      const j = await r.json()
      if (!r.ok) throw new Error(j?.error || 'login_failed')
      try { if (j.user) localStorage.setItem('me', JSON.stringify(j.user)) } catch {}
      window.location.href = '/employees'
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
            <Button className="w-full" onClick={devLogin} disabled={loading || !phone.trim()}>
              {loading ? 'Вход…' : 'Войти'}
            </Button>
            {error && <div className="text-sm text-red-600">{error}</div>}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}


