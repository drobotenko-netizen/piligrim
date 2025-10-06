"use client"

import { useState } from 'react'
import { getApiBase } from "@/lib/api"
import { Card, CardContent } from '@/components/ui/card'
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

export default function AccountsClient({ initialAccounts }: { initialAccounts: any[] }) {
  const [accounts, setAccounts] = useState<any[]>(initialAccounts)
  const [form, setForm] = useState<{ name: string; kind: 'cash'|'bank' }>({ name: '', kind: 'cash' })
  const [editingId, setEditingId] = useState<string | null>(null)
  const API_BASE = getApiBase()

  async function refresh() {
    const res = await fetch(`${API_BASE}/api/accounts`)
    const json = await res.json()
    setAccounts(json.items || [])
  }

  async function save() {
    if (!form.name.trim()) return
    if (!editingId) {
      await fetch(`${API_BASE}/api/accounts`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(form) })
    } else {
      await fetch(`${API_BASE}/api/accounts/${editingId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ name: form.name, kind: form.kind }) })
    }
    setEditingId(null)
    setForm({ name: '', kind: 'cash' })
    await refresh()
  }

  function startEdit(acc: any) {
    setEditingId(acc.id)
    const kind: 'cash'|'bank' = (acc.kind === 'bank' ? 'bank' : 'cash')
    setForm({ name: acc.name || '', kind })
  }

  async function remove(id: string) {
    await fetch(`${API_BASE}/api/accounts/${id}`, { method: 'DELETE', credentials: 'include' })
    await refresh()
  }

  function kindLabel(kind?: string) {
    if ((kind || '') === 'cash') return 'Наличные'
    if (kind === 'bank') return 'Безналичные'
    return kind || ''
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-2">
        <CardContent className="p-4 flex flex-col h-[calc(100vh-4rem)] min-h-0">
          <div className="flex-1 overflow-auto">
            <Table className="w-full">
              <THead className="sticky top-0 bg-card z-10">
                <TR>
                  <TH className="h-8 px-2">Название</TH>
                  <TH className="h-8 px-2">Тип</TH>
                  <TH className="h-8 px-2 w-10"></TH>
                </TR>
              </THead>
              <TBody>
                {accounts.map(acc => (
                  <TR key={acc.id} onClick={() => startEdit(acc)} className={editingId === acc.id ? 'bg-accent' : 'cursor-pointer hover:bg-accent/20'}>
                    <TD className="py-1.5 px-2">{acc.name}</TD>
                    <TD className="py-1.5 px-2">{kindLabel(acc.kind)}</TD>
                    <TD className="py-1.5 px-2 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost" aria-label="Операции">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); remove(acc.id) }}>Удалить</DropdownMenuItem>
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
          <Input placeholder="Название" value={form.name} onChange={e => setForm(s => ({ ...s, name: e.target.value }))} />
          <Select value={form.kind} onValueChange={v => setForm(s => ({ ...s, kind: v as any }))}>
            <SelectTrigger><SelectValue placeholder="Тип" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="cash">Наличные</SelectItem>
              <SelectItem value="bank">Безналичные</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Button onClick={save}>{editingId ? 'Сохранить' : 'Создать'}</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
