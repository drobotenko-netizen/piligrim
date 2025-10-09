'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table'
import { useCrud } from '@/hooks/use-crud'
import { api } from '@/lib/api-client'

type Role = { id: string; name: string; permissions?: string[] }

export default function RolesClient({ initialRoles, allPermissions }: { initialRoles: Role[]; allPermissions: any[] }) {
  const roles = useCrud<Role>('/api/admin/roles', { 
    initialItems: initialRoles,
    transformData: (data) => data.items || data.data || data
  })
  const [newRole, setNewRole] = useState('')

  async function create() {
    if (!newRole.trim()) return
    await roles.create({ name: newRole } as any)
    setNewRole('')
  }

  async function setPerms(roleId: string, permNames: string[]) {
    await api.post(`/api/admin/roles/${roleId}/permissions`, { permissions: permNames })
    await roles.refetch()
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
              {roles.items.map(r => {
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

