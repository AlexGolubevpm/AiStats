'use client'

import { Suspense } from 'react'
import { Topbar } from '@/components/layout/topbar'
import { KPICard } from '@/components/shared/kpi-card'
import { ChartCard } from '@/components/shared/chart-card'
import { DeltaIndicator } from '@/components/shared/delta-indicator'
import { KPICardSkeleton, ChartSkeleton, TableSkeleton } from '@/components/shared/loading-skeleton'
import { CostTrendChart } from '@/components/features/charts/cost-trend-chart'
import { DataTable } from '@/components/features/data-table'
import { useCosts } from '@/hooks/use-api'
import { usePeriod } from '@/hooks/use-period'
import type { ColumnDef } from '@tanstack/react-table'

interface CostRow {
  site: string
  bundle: string
  yesterday: number
  avg7d: number
  total30d: number
  change: number
  status: string
}

const columns: ColumnDef<CostRow, unknown>[] = [
  { accessorKey: 'site', header: 'Site' },
  { accessorKey: 'bundle', header: 'Bundle' },
  { accessorKey: 'yesterday', header: 'Yesterday', cell: ({ row }) => `$${(row.original.yesterday || 0).toFixed(2)}` },
  { accessorKey: 'avg7d', header: '7d Avg', cell: ({ row }) => `$${(row.original.avg7d || 0).toFixed(2)}` },
  { accessorKey: 'total30d', header: '30d Total', cell: ({ row }) => `$${(row.original.total30d || 0).toLocaleString()}` },
  { accessorKey: 'change', header: 'Change', cell: ({ row }) => <DeltaIndicator value={row.original.change || 0} /> },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => (
      <span className={`rounded-full px-2 py-0.5 text-xs ${
        row.original.status === 'matched'
          ? 'bg-[var(--color-healthy-bg)] text-[var(--color-healthy)]'
          : 'bg-[var(--color-warning-bg)] text-[var(--color-warning)]'
      }`}>
        {row.original.status === 'matched' ? 'Matched' : 'Unmatched'}
      </span>
    ),
  },
]

function CostsContent() {
  const { period } = usePeriod()
  const { data, isLoading } = useCosts(period)

  if (isLoading || !data) {
    return (
      <div className="space-y-6 p-8">
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <KPICardSkeleton key={i} />)}
        </div>
        <TableSkeleton />
        <ChartSkeleton />
      </div>
    )
  }

  const summary = data.summary || {}
  const sites = data.sites || []
  const trend = data.trend || []

  // Build table rows from API site data
  const tableRows: CostRow[] = sites.map((s: { name: string; bundle: { name: string }; yesterdayCost: number; sevenDayAvg: number; thirtyDayTotal: number; changePercent: number; mappingStatus: string | null }) => ({
    site: s.name,
    bundle: s.bundle?.name || '',
    yesterday: s.yesterdayCost || 0,
    avg7d: s.sevenDayAvg || 0,
    total30d: s.thirtyDayTotal || 0,
    change: s.changePercent || 0,
    status: s.mappingStatus || 'unmatched',
  }))

  return (
    <div className="space-y-6 p-8">
      <div className="grid grid-cols-3 gap-4">
        <KPICard label="Yesterday Total" value={summary.yesterdayTotal || 0} format="currency" />
        <KPICard label="7-Day Avg" value={summary.sevenDayAvg || 0} format="currency" />
        <KPICard label="30-Day Total" value={summary.thirtyDayTotal || 0} format="currency" />
      </div>

      {tableRows.length > 0 ? (
        <ChartCard title="Cost Breakdown" description="Costs by site and period">
          <DataTable columns={columns} data={tableRows} searchKey="site" searchPlaceholder="Search sites..." />
        </ChartCard>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] py-12">
          <p className="text-sm text-[var(--color-text-muted)]">No cost data available</p>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">Cost data will appear after syncing</p>
        </div>
      )}

      {trend.length > 0 && (
        <ChartCard title="Cost Trend" description="Last 30 days">
          <CostTrendChart data={trend} />
        </ChartCard>
      )}
    </div>
  )
}

export default function CostsPage() {
  return (
    <div>
      <Topbar title="Costs" description="Cost tracking and analysis" />
      <Suspense fallback={<div className="space-y-6 p-8"><div className="grid grid-cols-3 gap-4">{Array.from({ length: 3 }).map((_, i) => <KPICardSkeleton key={i} />)}</div></div>}>
        <CostsContent />
      </Suspense>
    </div>
  )
}
