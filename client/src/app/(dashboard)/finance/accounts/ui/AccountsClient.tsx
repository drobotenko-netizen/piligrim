"use client"

import { useState } from 'react'
import { useCrud } from '@/hooks/use-crud'
import { Card, CardContent } from '@/components/ui/card'
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { MoreHorizontal } from 'lucide-react'

type Account = {
  id: string
  name: string
  kind: 'cash' | 'bank'
  active: boolean
}

export default function AccountsClient({ initialAccounts }: { initialAccounts: any[] }) {
  // CRUD операции через хук
  const accounts = useCrud<Account>('/api/accounts', initialAccounts)
  
  // Локальное состояние
  const [form, setForm] = useState<{ 
    name: string
    kind: 'cash' | 'bank' 
  }>({ 
    name: '', 
    kind: 'cash' 
  })
  
  const [editingId, setEditingId] = useState<string | null>(null)

  /**
   * Сохранить счёт (создать или обновить)
   */
  async function save() {
    if (!form.name.trim()) return
    
    try {
      if (editingId) {
        await accounts.update(editingId, form)
        setEditingId(null)
      } else {
        await accounts.create(form)
      }
      
      setForm({ name: '', kind: 'cash' })
    } catch (error) {
      console.error('Failed to save account:', error)
    }
  }

  /**
   * Начать редактирование
   */
  function startEdit(acc: Account) {
    setEditingId(acc.id)
    setForm({ 
      name: acc.name || '', 
      kind: acc.kind === 'bank' ? 'bank' : 'cash'
    })
  }

  /**
   * Удалить счёт
   */
  async function remove(id: string) {
    if (!confirm('Архивировать счёт?')) return
    
    try {
      await accounts.remove(id)
    } catch (error) {
      console.error('Failed to remove account:', error)
    }
  }

  /**
   * Название типа счёта
   */
  function kindLabel(kind?: string) {
    if ((kind || '') === 'cash') return 'Наличные'
    if (kind === 'bank') return 'Безналичные'
    return kind || ''
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* Список счетов */}
      <Card className="lg:col-span-2">
        <CardContent className="p-4 flex flex-col h-[calc(100vh-4rem)] min-h-0">
          <div className="flex-1 overflow-auto">
            {accounts.loading ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">Загрузка...</p>
              </div>
            ) : accounts.error ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-red-500">Ошибка: {accounts.error}</p>
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
                  {accounts.items.map(acc => (
                    <TR 
                      key={acc.id} 
                      onClick={() => startEdit(acc)} 
                      className={editingId === acc.id ? 'bg-accent' : 'cursor-pointer hover:bg-accent/20'}
                    >
                      <TD className="py-1.5 px-2">{acc.name}</TD>
                      <TD className="py-1.5 px-2">{kindLabel(acc.kind)}</TD>
                      <TD className="py-1.5 px-2 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost" aria-label="Операции">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => { 
                              e.stopPropagation()
                              remove(acc.id) 
                            }}>
                              Архивировать
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

      {/* Форма создания/редактирования */}
      <Card className="self-start">
        <CardContent className="p-4 space-y-3">
          <Input 
            placeholder="Название" 
            value={form.name} 
            onChange={e => setForm(s => ({ ...s, name: e.target.value }))} 
            onKeyDown={e => e.key === 'Enter' && save()}
          />
          
          <Select 
            value={form.kind} 
            onValueChange={v => setForm(s => ({ ...s, kind: v as any }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Тип" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cash">Наличные</SelectItem>
              <SelectItem value="bank">Безналичные</SelectItem>
            </SelectContent>
          </Select>
          
          <div className="flex gap-2">
            <Button 
              onClick={save}
              disabled={accounts.loading || !form.name.trim()}
            >
              {editingId ? 'Сохранить' : 'Добавить'}
            </Button>
            {editingId && (
              <Button 
                variant="outline" 
                onClick={() => {
                  setEditingId(null)
                  setForm({ name: '', kind: 'cash' })
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
