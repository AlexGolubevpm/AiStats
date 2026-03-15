'use client'

import { Suspense } from 'react'
import { Topbar } from '@/components/layout/topbar'
import { KPICard } from '@/components/shared/kpi-card'
import { ChartCard } from '@/components/shared/chart-card'
import { KPICardSkeleton, ChartSkeleton, TableSkeleton } from '@/components/shared/loading-skeleton'
import { AffiliateComparisonChart } from '@/components/features/charts/affiliate-comparison-chart'
import { DataTable } from '@/components/features/data-table'
import { useAffiliate } from '@/hooks/use-api'
import { usePeriod } from '@/hooks/use-period'
import type { ColumnDef } from '@tanstack/react-table'

interface AffiliateRow {
  site: string
  bundle: string
  revenue: number
  share: number
}

const columns: ColumnDef<AffiliateRow, unknown>[] = [
  { accessorKey: 'site', header: 'Site' },
  { accessorKey: 'bundle', header: 'Bundle' },
  { accessorKey: 'revenue', header: 'Affiliate Revenue', cell: ({ row }) => `$${(row.original.revenue || 0).toFixed(2)}` },
  { accessorKey: 'share', header: 'Share of Total', cell: ({ row }) => `${(row.original.share || 0).toFixed(1)}%` },
]

function AffiliateContent() {
  const { period } = usePeriod()
  const { data, isLoading } = useAffiliate(period)

  if (isLoading || !data) {
    return (
      <div className="space-y-6 p-8">
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <KPICardSkeleton key={i} />)}
        </div>
        <ChartSkeleton />
        <ChartSkeleton />
      </div>
    )
  }

  const summary = data.summary || {}
  const sites = data.sites || []
  const trend = data.trend || []

  // Build table rows from API site data
  const tableRows: AffiliateRow[] = sites.map((s: { name: string; bundle: { name: string }; affiliateRevenue: number; shareOfTotal: number }) => ({
    site: s.name,
    bundle: s.bundle?.name || '',
    revenue: s.affiliateRevenue || 0,
    share: s.shareOfTotal || 0,
  }))

  return (
    <div className="space-y-6 p-8">
      <div className="grid grid-cols-3 gap-4">
        <KPICard label="Affiliate Revenue" value={summary.totalAffiliateRevenue || 0} format="currency" />
        <KPICard label="Ad Revenue" value={summary.totalAdRevenue || 0} format="currency" />
        <KPICard label="Total Revenue" value={summary.totalRevenue || 0} format="currency" />
      </div>

      {tableRows.length > 0 ? (
        <ChartCard title="Affiliate Revenue by Site" description="Revenue contribution">
          <DataTable columns={columns} data={tableRows} searchKey="site" searchPlaceholder="Search sites..." />
        </ChartCard>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] py-12">
          <p className="text-sm text-[var(--color-text-muted)]">No affiliate data available</p>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">Affiliate data will appear after syncing</p>
        </div>
      )}

      {trend.length > 0 && (
        <ChartCard title="Revenue Trend" description="Affiliate vs Ad revenue over time">
          <AffiliateComparisonChart data={trend} />
        </ChartCard>
      )}
    </div>
  )
}

export default function AffiliatePage() {
  return (
    <div>
      <Topbar title="Affiliate" description="Affiliate and SPA revenue tracking" />
      <Suspense fallback={<div className="space-y-6 p-8"><div className="grid grid-cols-3 gap-4">{Array.from({ length: 3 }).map((_, i) => <KPICardSkeleton key={i} />)}</div></div>}>
        <AffiliateContent />
      </Suspense>
    </div>
  )
}
