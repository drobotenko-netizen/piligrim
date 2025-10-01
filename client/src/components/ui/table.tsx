"use client"

import * as React from 'react'
import { cn } from '@/lib/utils'

const Table = ({ className, ...props }: React.HTMLAttributes<HTMLTableElement>) => (
  <table className={cn('w-full caption-bottom text-sm', className)} {...props} />
)
Table.displayName = 'Table'

const THead = ({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) => (
  <thead className={cn('[&_tr]:border-b', className)} {...props} />
)
THead.displayName = 'THead'

const TBody = ({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) => (
  <tbody className={cn('[&_tr:last-child]:border-0', className)} {...props} />
)
TBody.displayName = 'TBody'

const TR = ({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) => (
  <tr className={cn('border-b transition-colors hover:bg-muted/50', className)} {...props} />
)
TR.displayName = 'TR'

const TH = ({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) => (
  <th className={cn('h-10 px-4 text-left align-middle font-semibold', className)} {...props} />
)
TH.displayName = 'TH'

const TD = ({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) => (
  <td className={cn('p-4 align-middle', className)} {...props} />
)
TD.displayName = 'TD'

export { Table, THead, TBody, TR, TH, TD }

