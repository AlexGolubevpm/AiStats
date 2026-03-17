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
import { Card, TextInput, Group, Text, ActionIcon, Box, Skeleton, Stack } from '@mantine/core'
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
      <Stack gap="xs">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} height={48} radius="md" />
        ))}
      </Stack>
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
    <Box>
      {/* Toolbar */}
      {searchKey && (
        <Group justify="space-between" mb="md" wrap="wrap" gap="sm">
          <TextInput
            placeholder={searchPlaceholder}
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.currentTarget.value)}
            leftSection={<Search size={16} />}
            radius="md"
            size="sm"
            w={{ base: '100%', sm: 288 }}
            styles={{
              input: {
                borderColor: '#D7DCE5',
                fontSize: 13,
                '&:focus': {
                  borderColor: '#6366F1',
                },
              },
            }}
          />
          <Text size="xs" c="#6B7280" fw={500} visibleFrom="sm">
            {filteredTotal} results
          </Text>
        </Group>
      )}

      {/* Table */}
      <Card
        padding={0}
        radius="xl"
        shadow="sm"
        withBorder
        styles={{ root: { borderColor: '#E5E7EB', overflow: 'hidden' } }}
      >
        <Box style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: 640, fontSize: 13, borderCollapse: 'collapse' }}>
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} style={{ borderBottom: '1px solid #D7DCE5', background: '#F9FAFB' }}>
                  {headerGroup.headers.map((header, idx) => (
                    <th
                      key={header.id}
                      style={{
                        padding: '12px 16px',
                        fontSize: 11,
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        color: '#6B7280',
                        textAlign: idx > 1 ? 'right' : 'left',
                        cursor: header.column.getCanSort() ? 'pointer' : 'default',
                        userSelect: header.column.getCanSort() ? 'none' : undefined,
                        position: idx === 0 ? 'sticky' : undefined,
                        left: idx === 0 ? 0 : undefined,
                        zIndex: idx === 0 ? 10 : undefined,
                        background: idx === 0 ? '#F9FAFB' : undefined,
                      }}
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: idx > 1 ? 'flex-end' : 'flex-start' }}>
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getCanSort() && (
                          <span>
                            {header.column.getIsSorted() === 'asc' ? (
                              <ArrowUp size={12} color="#4F46E5" />
                            ) : header.column.getIsSorted() === 'desc' ? (
                              <ArrowDown size={12} color="#4F46E5" />
                            ) : (
                              <ArrowUpDown size={12} style={{ opacity: 0.25 }} />
                            )}
                          </span>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {hasNoResults ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    style={{ padding: '48px 0', textAlign: 'center', color: '#6B7280', fontSize: 13 }}
                  >
                    {hasActiveFilter ? 'No results found' : 'No data available'}
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    style={{
                      borderBottom: '1px solid #E5E7EB',
                      transition: 'background 0.12s ease',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#F1F5F9' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                  >
                    {row.getVisibleCells().map((cell, idx) => (
                      <td
                        key={cell.id}
                        style={{
                          padding: '12px 16px',
                          textAlign: idx > 1 ? 'right' : 'left',
                          fontVariantNumeric: idx > 1 ? 'tabular-nums' : undefined,
                          fontWeight: idx === 0 ? 500 : undefined,
                          position: idx === 0 ? 'sticky' : undefined,
                          left: idx === 0 ? 0 : undefined,
                          zIndex: idx === 0 ? 10 : undefined,
                          background: idx === 0 ? 'white' : undefined,
                        }}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Box>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <Group justify="space-between" mt="sm" wrap="wrap" gap="sm">
          <Text size="xs" c="#6B7280" fw={500}>
            Showing {pageStart}-{pageEnd} of {filteredTotal}
          </Text>
          <Group gap={4}>
            <ActionIcon
              variant="default"
              size="sm"
              radius="md"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              styles={{ root: { border: '1px solid #D7DCE5' } }}
            >
              <ChevronLeft size={16} />
            </ActionIcon>
            <ActionIcon
              variant="default"
              size="sm"
              radius="md"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              styles={{ root: { border: '1px solid #D7DCE5' } }}
            >
              <ChevronRight size={16} />
            </ActionIcon>
          </Group>
        </Group>
      )}
    </Box>
  )
}
