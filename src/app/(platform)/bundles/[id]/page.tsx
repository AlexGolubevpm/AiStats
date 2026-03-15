'use client'

import { use, Suspense } from 'react'
import { Topbar } from '@/components/layout/topbar'
import { KPICard } from '@/components/shared/kpi-card'
import { ChartCard } from '@/components/shared/chart-card'
import { KPICardSkeleton, ChartSkeleton, TableSkeleton } from '@/components/shared/loading-skeleton'
import { FormatBreakdownChart } from '@/components/features/charts/format-breakdown-chart'
import { RevenueTrendChart } from '@/components/features/charts/revenue-trend-chart'
import { DataTable } from '@/components/features/data-table'
import { useBundle } from '@/hooks/use-api'
import { usePeriod } from '@/hooks/use-period'
import Link from 'next/link'
import type { ColumnDef } from '@tanstack/react-table'

interface SiteRow {
  id: string
  name: string
  slug: string
  users: number
  totalRevenue: number
  profit: number
  romi: number
}

const siteColumns: ColumnDef<SiteRow, unknown>[] = [
  { accessorKey: 'name', header: 'Site', cell: ({ row }) => (
    <Link href={`/sites/${row.original.slug}`} className="font-medium text-[var(--color-accent)] hover:underline">{row.original.name}</Link>
  )},
  { accessorKey: 'users', header: 'Traffic', cell: ({ row }) => `${((row.original.users || 0) / 1000).toFixed(0)}K` },
  { accessorKey: 'totalRevenue', header: 'Revenue', cell: ({ row }) => `$${(row.original.totalRevenue || 0).toLocaleString()}` },
  { accessorKey: 'profit', header: 'Profit', cell: ({ row }) => (
    <span className={(row.original.profit || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}>${(row.original.profit || 0).toLocaleString()}</span>
  )},
  { accessorKey: 'romi', header: 'ROMI', cell: ({ row }) => `${(row.original.romi || 0).toFixed(1)}%` },
]

function BundleDetailContent({ id }: { id: string }) {
  const { period } = usePeriod()
  const { data, isLoading } = useBundle(id, period)

  if (isLoading || !data) {
    return (
      <div className="space-y-6 p-8">
        <div className="grid grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => <KPICardSkeleton key={i} />)}
        </div>
        <TableSkeleton />
        <ChartSkeleton />
      </div>
    )
  }

  const hasKpis = data.kpis && data.kpis.length > 0
  const hasSites = data.sites && data.sites.length > 0

  return (
    <div className="space-y-6 p-8">
      {/* Bundle KPIs */}
      {hasKpis && (
        <div className="grid grid-cols-5 gap-4">
          {data.kpis.map((kpi: { label: string; value: number; delta?: number; format: 'currency' | 'number' | 'percent' | 'score' | 'compact' }) => (
            <KPICard key={kpi.label} {...kpi} />
          ))}
        </div>
      )}

      {/* Sites Table */}
      {hasSites ? (
        <ChartCard title="Sites in Bundle" description="Performance per site">
          <DataTable columns={siteColumns} data={data.sites} searchKey="name" searchPlaceholder="Search sites..." />
        </ChartCard>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] py-12">
          <p className="text-sm text-[var(--color-text-muted)]">No sites in this bundle yet</p>
        </div>
      )}

      {/* Format Breakdown */}
      {data.formatBreakdown && data.formatBreakdown.length > 0 && (
        <ChartCard title="Format Breakdown" description="Revenue by ad format">
          <FormatBreakdownChart data={data.formatBreakdown} />
        </ChartCard>
      )}

      {/* Revenue Trend */}
      {data.trend && data.trend.length > 0 && (
        <ChartCard title="Revenue Trend" description="Bundle revenue over time">
          <RevenueTrendChart data={data.trend} />
        </ChartCard>
      )}
    </div>
  )
}

export default function BundleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)

  return (
    <div>
      <Topbar title="Bundle Detail" description="Bundle performance and analytics" />
      <Suspense fallback={<div className="space-y-6 p-8"><div className="grid grid-cols-5 gap-4">{Array.from({ length: 5 }).map((_, i) => <KPICardSkeleton key={i} />)}</div></div>}>
        <BundleDetailContent id={id} />
      </Suspense>
    </div>
  )
}
