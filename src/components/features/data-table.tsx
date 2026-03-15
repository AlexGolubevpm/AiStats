'use client'

import { useState } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table'
import { ArrowUpDown, ArrowUp, ArrowDown, Search } from 'lucide-react'

interface DataTableProps<TData> {
  columns: ColumnDef<TData, unknown>[]
  data: TData[]
  searchKey?: string
  searchPlaceholder?: string
  isLoading?: boolean
}

export function DataTable<TData>({
  columns,
  data,
  searchKey,
  searchPlaceholder = 'Search...',
  isLoading,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    state: { sorting, globalFilter },
  })

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 animate-pulse rounded-[var(--radius-md)] bg-[var(--color-background)]" />
        ))}
      </div>
    )
  }

  return (
    <div>
      {searchKey && (
        <div className="mb-4 flex items-center gap-2">
          <Search className="h-4 w-4 text-[var(--color-text-muted)]" />
          <input
            placeholder={searchPlaceholder}
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="w-64 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-sm outline-none focus:border-[var(--color-accent)]"
          />
        </div>
      )}
      <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--color-border)]">
        <table className="w-full text-sm">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-[var(--color-border)]">
                {headerGroup.headers.map((header, idx) => (
                  <th
                    key={header.id}
                    className={`px-5 py-3 text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted)] ${
                      idx === 0 ? 'sticky left-0 z-10 bg-[var(--color-surface)] text-left' : ''
                    } ${header.column.getCanSort() ? 'cursor-pointer select-none' : ''} ${
                      idx > 1 ? 'text-right' : 'text-left'
                    }`}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <div className={`flex items-center gap-1 ${idx > 1 ? 'justify-end' : ''}`}>
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getCanSort() && (
                        <span className="ml-1">
                          {header.column.getIsSorted() === 'asc' ? (
                            <ArrowUp className="h-3 w-3" />
                          ) : header.column.getIsSorted() === 'desc' ? (
                            <ArrowDown className="h-3 w-3" />
                          ) : (
                            <ArrowUpDown className="h-3 w-3 opacity-30" />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-[var(--color-border-subtle)]">
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-8 text-center text-sm text-[var(--color-text-muted)]">
                  No data available
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="transition-colors hover:bg-[var(--color-background)]">
                  {row.getVisibleCells().map((cell, idx) => (
                    <td
                      key={cell.id}
                      className={`px-5 py-3.5 ${
                        idx === 0 ? 'sticky left-0 z-10 bg-[var(--color-surface)]' : ''
                      } ${idx > 1 ? 'text-right tabular-nums' : ''}`}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
