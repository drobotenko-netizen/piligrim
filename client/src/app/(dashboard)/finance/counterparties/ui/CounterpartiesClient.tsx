"use client"

import { useEffect, useState } from 'react'
import { useCrud } from '@/hooks/use-crud'
import { api } from '@/lib/api-client'
import { Card, CardContent } from '@/components/ui/card'
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MoreHorizontal } from 'lucide-react'

type Counterparty = {
  id: string
  name: string
  kind?: string
  active: boolean
}

type CounterpartyType = {
  id: string
  name: string
  label: string
  active: boolean
}

export default function CounterpartiesClient({ initialItems }: { initialItems: any[] }) {
  // CRUD операции
  const counterparties = useCrud<Counterparty>('/api/counterparties', initialItems)
  
  // Локальное состояние
  const [form, setForm] = useState<{ name: string; kind?: string }>({ 
    name: '', 
    kind: 'company' 
  })
  const [kindTab, setKindTab] = useState<string>('all')
  const [types, setTypes] = useState<CounterpartyType[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)

  /**
   * Загрузить типы контрагентов
   */
  useEffect(() => {
    (async () => {
      try {
        const data = await api.get<{ items: CounterpartyType[] }>('/api/counterparty-types')
        setTypes(Array.isArray(data.items) ? data.items : [])
      } catch {
        setTypes([])
      }
    })()
  }, [])

  /**
   * Название типа на русском
   */
  function kindRu(k?: string) {
    if (k === 'company') return 'Компания'
    if (k === 'person') return 'Физлицо'
    if (k === 'bank') return 'Банк'
    if (k === 'other') return 'Другое'
    return ''
  }

  /**
   * Сохранить контрагента
   */
  async function save() {
    if (!form.name.trim()) return
    
    try {
      if (editingId) {
        await counterparties.update(editingId, form)
        setEditingId(null)
      } else {
        await counterparties.create(form)
      }
      
      setForm({ name: '', kind: 'company' })
    } catch (error) {
      console.error('Failed to save counterparty:', error)
    }
  }

  /**
   * Редактировать контрагента
   */
  function startEdit(cp: Counterparty) {
    setEditingId(cp.id)
    setForm({ name: cp.name || '', kind: cp.kind || 'company' })
  }

  /**
   * Удалить контрагента
   */
  async function remove(id: string) {
    if (!confirm('Удалить контрагента?')) return
    
    try {
      await counterparties.remove(id)
    } catch (error) {
      console.error('Failed to remove counterparty:', error)
    }
  }

  const nameToLabel = new Map(types.map(t => [t.name, t.label]))
  const activeTypes = types.filter(t => t.active)
  const filtered = counterparties.items.filter(cp => 
    kindTab === 'all' ? true : (cp.kind === kindTab)
  )

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* Список контрагентов */}
      <Card className="lg:col-span-2">
        <CardContent className="p-4 flex flex-col h-[calc(100vh-4rem)] min-h-0">
          
          <div className="mb-2 flex items-center">
            <Tabs value={kindTab} onValueChange={setKindTab}>
              <TabsList>
                <TabsTrigger value="all">Все</TabsTrigger>
                {activeTypes.map(t => (
                  <TabsTrigger key={t.name} value={t.name}>
                    {t.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          <div className="flex-1 overflow-auto">
            {counterparties.loading ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">Загрузка...</p>
              </div>
            ) : (
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
                    <TR 
                      key={cp.id} 
                      onClick={() => startEdit(cp)} 
                      className={editingId === cp.id ? 'bg-accent' : 'cursor-pointer hover:bg-accent/20'}
                    >
                      <TD className="py-1.5 px-2">{cp.name}</TD>
                      <TD className="py-1.5 px-2">
                        {nameToLabel.get(cp.kind) || kindRu(cp.kind)}
                      </TD>
                      <TD className="py-1.5 px-2 w-10 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost" aria-label="Операции">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => { 
                              e.stopPropagation()
                              remove(cp.id) 
                            }}>
                              Удалить
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Форма */}
      <Card className="self-start">
        <CardContent className="p-4 space-y-3">
          <Input 
            placeholder="Название" 
            value={form.name} 
            onChange={e => setForm(s => ({ ...s, name: e.target.value }))} 
            onKeyDown={e => e.key === 'Enter' && save()}
          />
          
          <Select 
            value={form.kind || 'company'} 
            onValueChange={v => setForm(s => ({ ...s, kind: v }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Тип" />
            </SelectTrigger>
            <SelectContent>
              {activeTypes.map(t => (
                <SelectItem key={t.name} value={t.name}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <div className="flex gap-2">
            <Button 
              onClick={save}
              disabled={counterparties.loading || !form.name.trim()}
            >
              {editingId ? 'Сохранить' : 'Добавить'}
            </Button>
            {editingId && (
              <Button 
                variant="outline" 
                onClick={() => {
                  setEditingId(null)
                  setForm({ name: '', kind: 'company' })
                }}
              >
                Отмена
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
