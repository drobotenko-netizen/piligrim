"use client"

import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu'

type TreeProps = {
  nodes: any[]
  onSelect: (n: any) => void
  selectedId?: string | null
  expanded: Set<string>
  onToggle: (id: string) => void
  activity: 'OPERATING'|'FINANCING'|'INVESTING'
  sectionRootIds: Set<string>
  payrollId?: string
  onDeleteNode: (n: any) => void
}

export function CategoryTree({ nodes, onSelect, selectedId, expanded, onToggle, activity, sectionRootIds, payrollId, onDeleteNode }: TreeProps) {
  return (
    <ul className="pl-2 space-y-1">
      {nodes.map((n) => {
        const hasChildren = Array.isArray(n.children) && n.children.length > 0
        const isOpen = expanded.has(n.id)
        const isCategory = n.parentId == null
        const isSystem = payrollId ? (n.id === payrollId || n.parentId === payrollId) : false
        
        return (
          <li key={n.id}>
            <div className="flex items-center gap-1 group hover:bg-accent/20 rounded px-1 py-0.5">
              {isCategory ? (
                <button
                  type="button"
                  className="w-5 h-5 inline-flex items-center justify-center rounded hover:bg-accent/40 text-sm"
                  onClick={() => onToggle(n.id)}
                >
                  {isOpen ? '−' : '+'}
                </button>
              ) : (
                <span className="w-5" />
              )}
              
              <button
                className={`text-left flex-1 px-2 py-1 rounded ${selectedId === n.id ? 'bg-accent' : ''} flex items-center gap-2`}
                onClick={() => onSelect(n)}
              >
                <span>{n.name}</span>
                {n.kind && (
                  <span className={`text-xs px-1.5 py-0.5 rounded font-mono ${
                    n.kind === 'COGS' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                    n.kind === 'OPEX' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                    n.kind === 'CAPEX' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
                    n.kind === 'TAX' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                    n.kind === 'FEE' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                    'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
                  }`}>
                    {n.kind}
                  </span>
                )}
              </button>
              
              {!isSystem && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <circle cx="5" cy="12" r="2"/>
                        <circle cx="12" cy="12" r="2"/>
                        <circle cx="19" cy="12" r="2"/>
                      </svg>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onDeleteNode(n)}>Удалить</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
            
            {hasChildren && isOpen && (
              <div className="pl-6">
                <CategoryTree 
                  nodes={n.children} 
                  onSelect={onSelect} 
                  selectedId={selectedId} 
                  expanded={expanded} 
                  onToggle={onToggle} 
                  activity={activity} 
                  sectionRootIds={sectionRootIds} 
                  payrollId={payrollId} 
                  onDeleteNode={onDeleteNode} 
                />
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}

export function filterTreeByActivity(nodes: any[], activity: 'OPERATING'|'FINANCING'|'INVESTING'): any[] {
  function dfs(list: any[]): any[] {
    const res: any[] = []
    for (const n of list || []) {
      const kids = dfs(n.children || [])
      if (n.activity === activity) {
        res.push({ ...n, children: kids })
      } else if (kids.length) {
        res.push(...kids)
      }
    }
    return res
  }
  return dfs(nodes)
}

