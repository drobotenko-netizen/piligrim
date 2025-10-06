import { getApiBase } from '../../lib/api'
'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table'

export default function RolesClient({ initialRoles, allPermissions }: { initialRoles: any[]; allPermissions: any[] }) {
  const API_BASE = getApiBase()
  const [roles, setRoles] = useState<any[]>(initialRoles)
  const [newRole, setNewRole] = useState('')

  async function reload() {
    const r = await fetch(`${API_BASE}/api/admin/roles`, { credentials: 'include' })
    const j = await r.json()
    setRoles(j.items || [])
  }

  async function create() {
    if (!newRole.trim()) return
    await fetch(`${API_BASE}/api/admin/roles`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ name: newRole }) })
    setNewRole('')
    await reload()
  }

  async function setPerms(roleId: string, permNames: string[]) {
    await fetch(`${API_BASE}/api/admin/roles/${roleId}/permissions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ permissions: permNames }) })
    await reload()
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-2">
        <CardContent className="p-4 space-y-3">
          <Table className="w-full">
            <THead className="sticky top-0 bg-card z-10">
              <TR>
                <TH>Роль</TH>
                <TH>Права</TH>
              </TR>
            </THead>
            <TBody>
              {roles.map(r => {
                const selected = new Set<string>((r.permissions || []) as string[])
                return (
                  <TR key={r.id}>
                    <TD className="whitespace-nowrap font-medium">{r.name}</TD>
                    <TD>
                      <div className="flex flex-wrap gap-2">
                        {allPermissions.map((p: any) => {
                          const on = selected.has(p.name)
                          return (
                            <button
                              key={p.id}
                              className={`text-xs px-2 py-1 rounded border ${on ? 'bg-primary text-primary-foreground' : 'bg-background'}`}
                              onClick={async () => {
                                const next = on ? Array.from(selected).filter(x => x !== p.name) : Array.from(new Set([...selected, p.name]))
                                await setPerms(r.id, next)
                              }}
                            >
                              {p.name}
                            </button>
                          )
                        })}
                      </div>
                    </TD>
                  </TR>
                )
              })}
            </TBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="self-start">
        <CardContent className="p-4 space-y-3">
          <div className="text-sm text-muted-foreground">Создать роль</div>
          <Input placeholder="Название роли" value={newRole} onChange={e => setNewRole(e.target.value)} />
          <Button onClick={create}>Создать</Button>
        </CardContent>
      </Card>
    </div>
  )
}


