'use client'

import { use, Suspense } from 'react'
import { motion } from 'framer-motion'
import { TopContextBar } from '@/components/layout/topbar'
import { KPICard } from '@/components/shared/kpi-card'
import { ChartCard } from '@/components/shared/chart-card'
import { KPICardSkeleton, ChartSkeleton, TableSkeleton, PageSkeleton } from '@/components/shared/loading-skeleton'
import { ErrorState } from '@/components/shared/error-state'
import { FormatBreakdownChart } from '@/components/features/charts/format-breakdown-chart'
import { RevenueTrendChart } from '@/components/features/charts/revenue-trend-chart'
import { DataTable } from '@/components/features/data-table'
import { useBundle } from '@/hooks/use-api'
import { usePeriod } from '@/hooks/use-period'
import { formatCurrency, formatCompact } from '@/lib/utils'
import Link from 'next/link'
import type { ColumnDef } from '@tanstack/react-table'

interface SiteRow {
  id: string
  name: string
  domain?: string
  slug: string
  users: number
  hits: number
  impressions: number
  adRevenue: number
  rpm: number
}

const siteColumns: ColumnDef<SiteRow, unknown>[] = [
  {
    accessorKey: 'name',
    header: 'Site',
    cell: ({ row }) => (
      <Link href={`/sites/${row.original.slug}`} className="font-semibold text-[var(--color-primary-600)] hover:text-[var(--color-primary-700)] hover:underline">
        {row.original.domain || row.original.name}
      </Link>
    ),
  },
  { accessorKey: 'users', header: 'Hits', cell: ({ row }) => <span className="tabular-nums">{formatCompact(row.original.hits || row.original.users || 0)}</span> },
  { accessorKey: 'impressions', header: 'Impressions', cell: ({ row }) => <span className="tabular-nums">{formatCompact(row.original.impressions || 0)}</span> },
  {
    accessorKey: 'adRevenue',
    header: 'Ad Revenue',
    cell: ({ row }) => (
      <span className="font-semibold tabular-nums text-[var(--color-success-dark)]">
        {formatCurrency(row.original.adRevenue || 0)}
      </span>
    ),
  },
  { accessorKey: 'rpm', header: 'RPM', cell: ({ row }) => <span className="tabular-nums">{formatCurrency(row.original.rpm || 0)}</span> },
]

function BundleDetailContent({ id }: { id: string }) {
  const { period } = usePeriod()
  const { data, isLoading, error } = useBundle(id, period)

  if (isLoading) return <PageSkeleton />

  if (error || !data) {
    return <div className="px-6 py-8"><ErrorState /></div>
  }

  const hasKpis = data.kpis && data.kpis.length > 0
  const hasSites = data.sites && data.sites.length > 0

  return (
    <motion.div
      className="space-y-8 px-6 py-8"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
    >
      {hasKpis && (
        <div className={`grid gap-4 ${
          data.kpis.length <= 4
            ? 'grid-cols-2 md:grid-cols-4'
            : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-5'
        }`}>
          {data.kpis.map((kpi: { label: string; value: number; delta?: number; format: 'currency' | 'number' | 'percent' | 'score' | 'compact' }) => (
            <KPICard key={kpi.label} {...kpi} />
          ))}
        </div>
      )}

      {hasSites ? (
        <div>
          <h2 className="text-section-title mb-5">Sites in Bundle</h2>
          <DataTable columns={siteColumns} data={data.sites} searchKey="name" searchPlaceholder="Search sites..." />
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-[var(--radius-card)] border border-dashed border-[var(--color-border-default)] py-16">
          <p className="text-[14px] text-[var(--color-text-muted)]">No sites in this bundle yet</p>
        </div>
      )}

      {data.formatBreakdown && data.formatBreakdown.length > 0 && (
        <ChartCard title="Format Breakdown" description="Revenue by ad format">
          <FormatBreakdownChart data={data.formatBreakdown} />
        </ChartCard>
      )}

      {data.trend && data.trend.length > 0 && (
        <ChartCard title="Revenue Trend" description="Bundle revenue over time">
          <RevenueTrendChart data={data.trend} />
        </ChartCard>
      )}
    </motion.div>
  )
}

export default function BundleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)

  return (
    <div>
      <TopContextBar title="Bundle Detail" subtitle="Bundle performance and analytics" />
      <Suspense fallback={<PageSkeleton />}>
        <BundleDetailContent id={id} />
      </Suspense>
    </div>
  )
}
