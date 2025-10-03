'use client'

import { useMemo, useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

export default function UsersClient({ initialItems }: { initialItems: any[] }) {
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000'
  const [items, setItems] = useState<any[]>(initialItems)
  const [roleTab, setRoleTab] = useState<string>('ALL')
  const [activeTab, setActiveTab] = useState<'ACTIVE'|'INACTIVE'>('ACTIVE')
  const [form, setForm] = useState<{ fullName: string; phone: string; role: string }>({ fullName: '', phone: '', role: 'EMPLOYEE' })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [inviteUrl, setInviteUrl] = useState<string>('')
  const [tgLink, setTgLink] = useState<string>('')

  async function reload() {
    const res = await fetch(`${API_BASE}/api/admin/users`, { credentials: 'include' })
    const json = await res.json()
    setItems(json.items || [])
  }

  useEffect(() => {
    reload()
  }, [])

  async function save() {
    if (!form.fullName.trim() || !form.phone.trim()) return
    if (!editingId) {
      const res = await fetch(`${API_BASE}/api/admin/users`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ fullName: form.fullName, phone: form.phone }) })
      const json = await res.json()
      if (json?.data?.id) {
        await fetch(`${API_BASE}/api/admin/users/${json.data.id}/roles`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ roles: [form.role] }) })
        // Issue magic link immediately for admin to copy and send
        try {
          const r = await fetch(`${API_BASE}/api/auth/magic/issue`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ userId: json.data.id, redirect: '/employees', ttlMinutes: 15 }) })
          const j = await r.json()
          if (r.ok && j?.url) setInviteUrl(j.url)
        } catch {}
      }
    } else {
      await fetch(`${API_BASE}/api/admin/users/${editingId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ fullName: form.fullName, phone: form.phone }) })
      await fetch(`${API_BASE}/api/admin/users/${editingId}/roles`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ roles: [form.role] }) })
    }
    setEditingId(null)
    setForm({ fullName: '', phone: '', role: 'EMPLOYEE' })
    await reload()
  }

  async function startEdit(u: any) {
    setEditingId(u.id)
    const firstRole = Array.isArray(u.roles) && u.roles.length > 0 ? String(u.roles[0]) : 'EMPLOYEE'
    setForm({ fullName: u.fullName || '', phone: u.phone || '', role: firstRole })
    
    // Generate Telegram binding link immediately
    try {
      const r = await fetch(`${API_BASE}/api/admin/users/${u.id}/telegram-binding-code`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include' })
      const j = await r.json()
      if (r.ok && j?.deepLink) setTgLink(j.deepLink)
    } catch {}
  }

  function resetForm() {
    setEditingId(null)
    setForm({ fullName: '', phone: '', role: 'EMPLOYEE' })
    setInviteUrl('')
    setTgLink('')
  }

  const filtered = useMemo(() => {
    return items.filter(u => {
      const hasRole = roleTab === 'ALL' || (Array.isArray(u.roles) && u.roles.includes(roleTab))
      const isActive = activeTab === 'ACTIVE' ? u.active : !u.active
      return hasRole && isActive
    })
  }, [items, roleTab, activeTab])

  async function setActive(id: string, active: boolean) {
    // примитивно: пробросим в PATCH users (реализация на сервере может быть добавлена позже)
    await fetch(`${API_BASE}/api/admin/users/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ active }) })
    await reload()
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-2">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <Tabs value={roleTab} onValueChange={v => setRoleTab(v)}>
              <TabsList>
                <TabsTrigger value="ALL">Все</TabsTrigger>
                <TabsTrigger value="ADMIN">ADMIN</TabsTrigger>
                <TabsTrigger value="ACCOUNTANT">ACCOUNTANT</TabsTrigger>
                <TabsTrigger value="MANAGER">MANAGER</TabsTrigger>
                <TabsTrigger value="CASHIER">CASHIER</TabsTrigger>
                <TabsTrigger value="EMPLOYEE">EMPLOYEE</TabsTrigger>
              </TabsList>
            </Tabs>
            <Tabs value={activeTab} onValueChange={v => setActiveTab(v as any)}>
              <TabsList>
                <TabsTrigger value="ACTIVE">Активные</TabsTrigger>
                <TabsTrigger value="INACTIVE">Не активные</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <div className="overflow-auto">
            <Table className="w-full">
              <THead className="sticky top-0 bg-card z-10">
                <TR>
                  <TH>Имя</TH>
                  <TH>Телефон</TH>
                  <TH>Тип</TH>
                  <TH>Активен</TH>
                  <TH className="w-10"></TH>
                </TR>
              </THead>
              <TBody>
                {filtered.map((u: any) => (
                  <TR key={u.id} onClick={() => startEdit(u)} className={editingId === u.id ? 'bg-accent' : 'cursor-pointer'}>
                    <TD>{u.fullName}</TD>
                    <TD>{u.phone}</TD>
                    <TD>{Array.isArray(u.roles) && u.roles.length > 0 ? u.roles.join(', ') : '—'}</TD>
                    <TD>{u.active ? 'Да' : 'Нет'}</TD>
                    <TD className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost" aria-label="Операции">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {u.active ? (
                            <DropdownMenuItem onClick={() => setActive(u.id, false)}>Деактивировать</DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => setActive(u.id, true)}>Активировать</DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card className="self-start">
        <CardContent className="p-4 space-y-3">
          {inviteUrl && (
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Ссылка для входа (15 мин):</div>
              <div className="flex gap-2">
                <Input readOnly value={inviteUrl} className="flex-1" />
                <Button onClick={async () => { try { await navigator.clipboard.writeText(inviteUrl) } catch {} }}>Копировать</Button>
              </div>
            </div>
          )}
          <Select value={form.role} onValueChange={v => setForm(s => ({ ...s, role: v }))}>
            <SelectTrigger><SelectValue placeholder="Тип пользователя" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ADMIN">ADMIN</SelectItem>
              <SelectItem value="ACCOUNTANT">ACCOUNTANT</SelectItem>
              <SelectItem value="MANAGER">MANAGER</SelectItem>
              <SelectItem value="CASHIER">CASHIER</SelectItem>
              <SelectItem value="EMPLOYEE">EMPLOYEE</SelectItem>
            </SelectContent>
          </Select>
          <Input placeholder="Имя" value={form.fullName} onChange={e => setForm(s => ({ ...s, fullName: e.target.value }))} />
          <Input placeholder="Телефон (+7...)" value={form.phone} onChange={e => setForm(s => ({ ...s, phone: e.target.value }))} />
          {tgLink && (
            <div className="flex gap-2">
              <Input readOnly value={tgLink} className="flex-1 text-xs" />
              <Button size="sm" variant="outline" onClick={async () => { try { await navigator.clipboard.writeText(tgLink) } catch {} }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
                  <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
                </svg>
              </Button>
            </div>
          )}
          <div className="flex gap-2">
            <Button onClick={save}>{editingId ? 'Сохранить' : 'Создать'}</Button>
            {editingId && <Button variant="outline" onClick={resetForm}>Новый</Button>}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


