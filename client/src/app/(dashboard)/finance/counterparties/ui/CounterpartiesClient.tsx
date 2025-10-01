"use client"

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function CounterpartiesClient({ initialItems }: { initialItems: any[] }) {
  const [items, setItems] = useState<any[]>(initialItems)
  const [form, setForm] = useState<{ name: string; kind?: string }>({ name: '', kind: 'company' })
  const [kindTab, setKindTab] = useState<'all'|'company'|'person'|'bank'|'other'>('all')
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000'
  const [types, setTypes] = useState<Array<{ id: string; name: string; label: string; active: boolean }>>([])

  async function refresh() {
    const res = await fetch(`${API_BASE}/api/counterparties`)
    const json = await res.json()
    setItems(json.items || [])
  }

  useEffect(() => {
    ;(async () => {
      try {
        const r = await fetch(`${API_BASE}/api/counterparty-types`, { credentials: 'include' })
        const j = await r.json()
        setTypes(Array.isArray(j.items) ? j.items : [])
      } catch {}
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function create() {
    if (!form.name.trim()) return
    await fetch(`${API_BASE}/api/counterparties`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    setForm({ name: '', kind: 'company' })
    await refresh()
  }

  function kindRu(k?: string) {
    if (k === 'company') return 'Компания'
    if (k === 'person') return 'Физлицо'
    if (k === 'bank') return 'Банк'
    if (k === 'other') return 'Другое'
    return ''
  }

  const nameToLabel = new Map(types.map(t => [t.name, t.label]))
  const activeTypes = types.filter(t => t.active)
  const filtered = items.filter(cp => kindTab === 'all' ? true : (cp.kind === kindTab))

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<{ name: string; kind: string }>({ name: '', kind: 'company' })
  function startEdit(cp: any) {
    setEditingId(cp.id)
    setEditForm({ name: cp.name || '', kind: cp.kind || 'company' })
  }
  async function save() {
    if (!editForm.name.trim()) return
    if (!editingId) {
      await fetch(`${API_BASE}/api/counterparties`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(editForm) })
    } else {
      await fetch(`${API_BASE}/api/counterparties/${editingId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(editForm) })
    }
    setEditingId(null)
    setEditForm({ name: '', kind: 'company' })
    await refresh()
  }
  async function remove(id: string) {
    await fetch(`${API_BASE}/api/counterparties/${id}`, { method: 'DELETE', credentials: 'include' })
    await refresh()
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-2">
        <CardContent className="p-4 flex flex-col h-[calc(100vh-4rem)] min-h-0">
          <div className="mb-2 flex items-center">
            <Tabs value={kindTab} onValueChange={(v) => setKindTab(v as any)}>
              <TabsList>
                <TabsTrigger value="all">Все</TabsTrigger>
                {activeTypes.map(t => (
                  <TabsTrigger key={t.name} value={t.name as any}>{t.label}</TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
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
                {filtered.map(cp => (
                  <TR key={cp.id} onClick={() => startEdit(cp)} className={editingId === cp.id ? 'bg-accent' : 'cursor-pointer hover:bg-accent/20'}>
                    <TD className="py-1.5 px-2">{cp.name}</TD>
                    <TD className="py-1.5 px-2">{nameToLabel.get(cp.kind) || kindRu(cp.kind)}</TD>
                    <TD className="py-1.5 px-2 w-10 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost" aria-label="Операции">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); remove(cp.id) }}>Удалить</DropdownMenuItem>
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
          <Input placeholder="Название" value={editingId ? editForm.name : (form.name)} onChange={e => (editingId ? setEditForm(s => ({ ...s, name: e.target.value })) : setForm(s => ({ ...s, name: e.target.value })))} />
          <Select value={editingId ? (editForm.kind || (activeTypes[0]?.name || 'company')) : (form.kind || (activeTypes[0]?.name || 'company'))} onValueChange={v => (editingId ? setEditForm(s => ({ ...s, kind: v })) : setForm(s => ({ ...s, kind: v })))}>
            <SelectTrigger><SelectValue placeholder="Тип" /></SelectTrigger>
            <SelectContent>
              {activeTypes.length > 0 ? (
                activeTypes.map(t => (
                  <SelectItem key={t.name} value={t.name}>{t.label}</SelectItem>
                ))
              ) : (
                <>
                  <SelectItem value="company">Компания</SelectItem>
                  <SelectItem value="person">Физлицо</SelectItem>
                  <SelectItem value="bank">Банк</SelectItem>
                  <SelectItem value="other">Другое</SelectItem>
                </>
              )}
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Button onClick={() => (editingId ? save() : (async () => { await fetch(`${API_BASE}/api/counterparties`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(form) }); setForm({ name: '', kind: activeTypes[0]?.name || 'company' }); await refresh() })())}>{editingId ? 'Сохранить' : 'Создать'}</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
