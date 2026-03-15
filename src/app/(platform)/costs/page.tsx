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
  { accessorKey: 'yesterday', header: 'Yesterday', cell: ({ row }) => `$${row.original.yesterday.toFixed(2)}` },
  { accessorKey: 'avg7d', header: '7d Avg', cell: ({ row }) => `$${row.original.avg7d.toFixed(2)}` },
  { accessorKey: 'total30d', header: '30d Total', cell: ({ row }) => `$${row.original.total30d.toLocaleString()}` },
  { accessorKey: 'change', header: 'Change', cell: ({ row }) => <DeltaIndicator value={row.original.change} /> },
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
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <KPICardSkeleton key={i} />)}
        </div>
        <TableSkeleton />
        <ChartSkeleton />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-8">
      <div className="grid grid-cols-4 gap-4">
        {data.kpis.map((kpi: { label: string; value: number; delta?: number; format: 'currency' | 'number' | 'percent' | 'score' | 'compact' }) => (
          <KPICard key={kpi.label} {...kpi} />
        ))}
      </div>

      <ChartCard title="Cost Breakdown" description="Costs by site and period">
        <DataTable columns={columns} data={data.sites} searchKey="site" searchPlaceholder="Search sites..." />
      </ChartCard>

      {data.trend && (
        <ChartCard title="Cost Trend" description="Last 30 days">
          <CostTrendChart data={data.trend} />
        </ChartCard>
      )}
    </div>
  )
}

export default function CostsPage() {
  return (
    <div>
      <Topbar title="Costs" description="Cost tracking and analysis" />
      <Suspense fallback={<div className="space-y-6 p-8"><div className="grid grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => <KPICardSkeleton key={i} />)}</div></div>}>
        <CostsContent />
      </Suspense>
    </div>
  )
}
