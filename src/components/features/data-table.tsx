'use client'

import { useState } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table'
import { ArrowUpDown, ArrowUp, ArrowDown, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DataTableProps<TData> {
  columns: ColumnDef<TData, unknown>[]
  data: TData[]
  searchKey?: string
  searchPlaceholder?: string
  isLoading?: boolean
  pageSize?: number
}

export function DataTable<TData>({
  columns,
  data,
  searchKey,
  searchPlaceholder = 'Search...',
  isLoading,
  pageSize = 20,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    state: { sorting, globalFilter },
    initialState: { pagination: { pageSize } },
  })

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 animate-pulse rounded-[var(--radius-control)] bg-[var(--color-surface-secondary)]" />
        ))}
      </div>
    )
  }

  const totalPages = table.getPageCount()
  const currentPage = table.getState().pagination.pageIndex
  const filteredTotal = table.getFilteredRowModel().rows.length
  const pageStart = currentPage * pageSize + 1
  const pageEnd = Math.min((currentPage + 1) * pageSize, filteredTotal)
  const hasActiveFilter = globalFilter.length > 0
  const hasNoResults = table.getRowModel().rows.length === 0

  return (
    <div>
      {/* Toolbar */}
      {searchKey && (
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-disabled)]" />
            <input
              placeholder={searchPlaceholder}
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="h-9 w-full rounded-[var(--radius-control)] border border-[var(--color-border-default)] bg-[var(--color-surface)] pl-9 pr-3 text-[13px] outline-none transition-colors placeholder:text-[var(--color-text-disabled)] focus:border-[var(--color-primary-500)] focus-visible:shadow-[var(--shadow-glow-primary)] sm:w-72"
            />
          </div>
          <span className="hidden text-meta sm:inline">
            {filteredTotal} results
          </span>
        </div>
      )}

      {/* Table */}
      <div className="-mx-4 overflow-x-auto sm:mx-0 sm:rounded-[var(--radius-card)] sm:border sm:border-[var(--color-border-subtle)]">
        <table className="w-full min-w-[640px] text-[13px]">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-[var(--color-border-default)] bg-[var(--color-surface-secondary)]">
                {headerGroup.headers.map((header, idx) => (
                  <th
                    key={header.id}
                    className={cn(
                      'px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]',
                      idx === 0 ? 'sticky left-0 z-10 bg-[var(--color-surface-secondary)] text-left' : '',
                      header.column.getCanSort() ? 'cursor-pointer select-none' : '',
                      idx > 1 ? 'text-right' : 'text-left'
                    )}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <div className={cn('flex items-center gap-1', idx > 1 ? 'justify-end' : '')}>
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getCanSort() && (
                        <span className="ml-0.5">
                          {header.column.getIsSorted() === 'asc' ? (
                            <ArrowUp className="h-3 w-3 text-[var(--color-primary-600)]" />
                          ) : header.column.getIsSorted() === 'desc' ? (
                            <ArrowDown className="h-3 w-3 text-[var(--color-primary-600)]" />
                          ) : (
                            <ArrowUpDown className="h-3 w-3 opacity-25" />
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
            {hasNoResults ? (
              <tr>
                <td colSpan={columns.length} className="py-12 text-center text-[13px] text-[var(--color-text-muted)]">
                  {hasActiveFilter ? 'No results found' : 'No data available'}
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="group border-l-2 border-transparent hover:border-l-[var(--color-primary-500)] transition-colors duration-100 hover:bg-[var(--color-surface-hover)]">
                  {row.getVisibleCells().map((cell, idx) => (
                    <td
                      key={cell.id}
                      className={cn(
                        'px-4 py-3',
                        idx === 0 ? 'sticky left-0 z-10 bg-[var(--color-surface)] font-medium group-hover:bg-[var(--color-surface-hover)]' : '',
                        idx > 1 ? 'text-right tabular-nums' : ''
                      )}
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-3 flex flex-col items-center gap-2 sm:flex-row sm:justify-between">
          <span className="text-meta">
            Showing {pageStart}-{pageEnd} of {filteredTotal}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-control)] border border-[var(--color-border-default)] text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-hover)] hover:border-[var(--color-primary-500)] hover:text-[var(--color-primary-600)] active:scale-95 focus-visible:shadow-[var(--shadow-glow-primary)] disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-control)] border border-[var(--color-border-default)] text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-hover)] hover:border-[var(--color-primary-500)] hover:text-[var(--color-primary-600)] active:scale-95 focus-visible:shadow-[var(--shadow-glow-primary)] disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
