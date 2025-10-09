'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useCrud } from '@/hooks/use-crud'
import { api } from '@/lib/api-client'

type User = { id: string; fullName: string; phone: string; active: boolean; roles?: string[] }

export default function UsersClient({ initialItems }: { initialItems: User[] }) {
  const users = useCrud<User>('/api/admin/users', { initialItems, transformData: (d) => d.items || d.data || d })
  const [roleTab, setRoleTab] = useState<string>('ALL')
  const [activeTab, setActiveTab] = useState<'ACTIVE'|'INACTIVE'>('ACTIVE')
  const [form, setForm] = useState<{ fullName: string; phone: string; role: string }>({ fullName: '', phone: '', role: 'EMPLOYEE' })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [inviteUrl, setInviteUrl] = useState<string>('')
  const [tgLink, setTgLink] = useState<string>('')

  async function save() {
    if (!form.fullName.trim() || !form.phone.trim()) return
    if (!editingId) {
      const newUser = await users.create({ fullName: form.fullName, phone: form.phone } as any)
      if ((newUser as any)?.id) {
        await api.post(`/api/admin/users/${(newUser as any).id}/roles`, { roles: [form.role] })
        try {
          const res: any = await api.post('/api/auth/magic/issue', { userId: (newUser as any).id, redirect: '/sales/revenue', ttlMinutes: 15 })
          if (res?.url) setInviteUrl(res.url)
        } catch {}
      }
    } else {
      await users.update(editingId, { fullName: form.fullName, phone: form.phone } as any)
      await api.post(`/api/admin/users/${editingId}/roles`, { roles: [form.role] })
    }
    resetForm()
    await users.refetch()
  }

  async function startEdit(u: User) {
    setEditingId(u.id)
    const firstRole = Array.isArray(u.roles) && u.roles.length > 0 ? String(u.roles[0]) : 'EMPLOYEE'
    setForm({ fullName: u.fullName || '', phone: u.phone || '', role: firstRole })
    try {
      const res: any = await api.post(`/api/admin/users/${u.id}/telegram-binding-code`, {})
      if (res?.deepLink) setTgLink(res.deepLink)
    } catch {}
  }

  function resetForm() {
    setEditingId(null)
    setForm({ fullName: '', phone: '', role: 'EMPLOYEE' })
    setInviteUrl('')
    setTgLink('')
  }

  const filtered = useMemo(() => {
    return users.items.filter(u => {
      const hasRole = roleTab === 'ALL' || (Array.isArray(u.roles) && u.roles.includes(roleTab))
      const isActive = activeTab === 'ACTIVE' ? u.active : !u.active
      return hasRole && isActive
    })
  }, [users.items, roleTab, activeTab])

  async function setActive(id: string, active: boolean) {
    await users.update(id, { active } as any)
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
                <TabsTrigger value="EMPLOYEE">EMPLOYEE</TabsTrigger>
              </TabsList>
            </Tabs>
            <Tabs value={activeTab} onValueChange={v => setActiveTab(v as any)}>
              <TabsList>
                <TabsTrigger value="ACTIVE">Активные</TabsTrigger>
                <TabsTrigger value="INACTIVE">Неактивные</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <Table className="w-full">
            <THead className="sticky top-0 bg-card z-10">
              <TR>
                <TH className="h-8">ФИО</TH>
                <TH className="h-8">Телефон</TH>
                <TH className="h-8">Роли</TH>
                <TH className="h-8"></TH>
              </TR>
            </THead>
            <TBody>
              {filtered.map(u => (
                <TR key={u.id} onClick={() => startEdit(u)} className={`cursor-pointer ${editingId === u.id ? 'bg-accent' : ''}`}>
                  <TD className="py-1.5">{u.fullName}</TD>
                  <TD className="py-1.5">{u.phone}</TD>
                  <TD className="py-1.5 text-xs">{Array.isArray(u.roles) ? u.roles.join(', ') : '—'}</TD>
                  <TD className="py-1.5 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">•••</Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {u.active ? (
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setActive(u.id, false) }}>Деактивировать</DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setActive(u.id, true) }}>Активировать</DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="self-start">
        <CardContent className="p-4 space-y-3">
          <div className="text-sm text-muted-foreground">{editingId ? 'Редактировать пользователя' : 'Новый пользователь'}</div>
          <Input placeholder="ФИО" value={form.fullName} onChange={e => setForm(v => ({ ...v, fullName: e.target.value }))} />
          <Input placeholder="Телефон" value={form.phone} onChange={e => setForm(v => ({ ...v, phone: e.target.value }))} />
          <Select value={form.role} onValueChange={v => setForm(s => ({ ...s, role: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ADMIN">ADMIN</SelectItem>
              <SelectItem value="ACCOUNTANT">ACCOUNTANT</SelectItem>
              <SelectItem value="MANAGER">MANAGER</SelectItem>
              <SelectItem value="EMPLOYEE">EMPLOYEE</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Button onClick={save}>{editingId ? 'Сохранить' : 'Создать'}</Button>
            {editingId && <Button variant="outline" onClick={resetForm}>Отмена</Button>}
          </div>
          {inviteUrl && (
            <div className="p-2 border rounded text-xs break-all bg-muted">
              <div className="font-medium mb-1">Ссылка для входа:</div>
              {inviteUrl}
            </div>
          )}
          {tgLink && (
            <div className="p-2 border rounded text-xs break-all bg-muted">
              <div className="font-medium mb-1">Привязка Telegram:</div>
              {tgLink}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

