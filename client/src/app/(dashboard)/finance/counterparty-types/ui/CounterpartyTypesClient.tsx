"use client"

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useCrud } from '@/hooks/use-crud'

type CounterpartyType = { id: string; label: string; active: boolean }

export default function CounterpartyTypesClient({ initialItems }: { initialItems: CounterpartyType[] }) {
  const types = useCrud<CounterpartyType>('/api/counterparty-types', { 
    initialItems,
    transformData: (d) => d.items || d.data || d
  })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<{ label: string }>({ label: '' })
  const [statusTab, setStatusTab] = useState<'ACTIVE'|'INACTIVE'>('ACTIVE')

  function startEdit(row: CounterpartyType) {
    setEditingId(row.id)
    setForm({ label: row.label || '' })
  }

  async function save() {
    if (!form.label.trim()) return
    if (!editingId) {
      await types.create({ label: form.label } as any)
    } else {
      await types.update(editingId, { label: form.label } as any)
    }
    setEditingId(null)
    setForm({ label: '' })
  }

  async function remove(id: string) {
    await types.remove(id)
  }

  async function setActive(id: string, active: boolean) {
    await types.update(id, { active } as any)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-2">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <Tabs value={statusTab} onValueChange={(v) => setStatusTab(v as any)}>
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
                  <TH className="h-8 px-2">Название</TH>
                  <TH className="h-8 px-2">Активен</TH>
                  <TH className="h-8 px-2 w-10"></TH>
                </TR>
              </THead>
              <TBody>
                {types.items.filter((it: any) => (statusTab === 'ACTIVE' ? it.active : !it.active)).map((it: any) => (
                  <TR key={it.id} onClick={() => startEdit(it)} className={editingId === it.id ? 'bg-accent' : 'cursor-pointer hover:bg-accent/20'}>
                    <TD className="py-1.5 px-2">{it.label}</TD>
                    <TD className="py-1.5 px-2">{it.active ? 'Да' : 'Нет'}</TD>
                    <TD className="py-1.5 px-2 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost" aria-label="Операции">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {it.active ? (
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setActive(it.id, false) }}>Деактивировать</DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setActive(it.id, true) }}>Активировать</DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); remove(it.id) }}>Удалить</DropdownMenuItem>
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
          <Input placeholder="Название" value={form.label} onChange={e => setForm(s => ({ ...s, label: e.target.value }))} />
          <div className="flex gap-2">
            <Button onClick={save}>{editingId ? 'Сохранить' : 'Создать'}</Button>
            {editingId && <Button variant="outline" onClick={() => { setEditingId(null); setForm({ label: '' }) }}>Новый</Button>}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

