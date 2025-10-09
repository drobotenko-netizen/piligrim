"use client"

import { useState } from 'react'
import { useCrud } from '@/hooks/use-crud'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CategoryTree, filterTreeByActivity } from '../components/CategoryTree'

export default function CategoriesClient() {
  const { items, loading, refetch } = useCrud<any>('/api/categories')
  const [selectedNode, setSelectedNode] = useState<any>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [activity, setActivity] = useState<'OPERATING'|'FINANCING'|'INVESTING'>('OPERATING')

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expanded)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpanded(newExpanded)
  }

  const handleDelete = async (node: any) => {
    if (!confirm(`Удалить "${node.name}"?`)) return
    // TODO: implement delete
    await refetch()
  }

  const filtered = filterTreeByActivity(items, activity)

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Категории и статьи</h1>
        <p className="text-muted-foreground">Управление категориями расходов и доходов</p>
      </div>

      <Tabs value={activity} onValueChange={(v: any) => setActivity(v)}>
        <TabsList>
          <TabsTrigger value="OPERATING">Операционная</TabsTrigger>
          <TabsTrigger value="INVESTING">Инвестиционная</TabsTrigger>
          <TabsTrigger value="FINANCING">Финансовая</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card>
        <CardContent className="p-6">
          {loading ? (
            <div>Загрузка...</div>
          ) : (
            <CategoryTree
              nodes={filtered}
              onSelect={setSelectedNode}
              selectedId={selectedNode?.id}
              expanded={expanded}
              onToggle={toggleExpanded}
              activity={activity}
              sectionRootIds={new Set()}
              onDeleteNode={handleDelete}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}

