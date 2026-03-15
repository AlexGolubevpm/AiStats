'use client'

import { Suspense } from 'react'
import { motion } from 'framer-motion'
import { TopContextBar } from '@/components/layout/topbar'
import { KPICard } from '@/components/shared/kpi-card'
import { ChartCard } from '@/components/shared/chart-card'
import { KPICardSkeleton, ChartSkeleton, TableSkeleton } from '@/components/shared/loading-skeleton'
import { AffiliateComparisonChart } from '@/components/features/charts/affiliate-comparison-chart'
import { DataTable } from '@/components/features/data-table'
import { useAffiliate } from '@/hooks/use-api'
import { usePeriod } from '@/hooks/use-period'
import { formatCurrency } from '@/lib/utils'
import type { ColumnDef } from '@tanstack/react-table'

interface AffiliateRow {
  site: string
  bundle: string
  revenue: number
  share: number
}

const columns: ColumnDef<AffiliateRow, unknown>[] = [
  { accessorKey: 'site', header: 'Site', cell: ({ row }) => <span className="font-semibold">{row.original.site}</span> },
  { accessorKey: 'bundle', header: 'Bundle' },
  { accessorKey: 'revenue', header: 'Affiliate Revenue', cell: ({ row }) => <span className="font-semibold tabular-nums">{formatCurrency(row.original.revenue || 0)}</span> },
  { accessorKey: 'share', header: 'Share of Total', cell: ({ row }) => <span className="tabular-nums">{(row.original.share || 0).toFixed(1)}%</span> },
]

function AffiliateContent() {
  const { period } = usePeriod()
  const { data, isLoading } = useAffiliate(period)

  if (isLoading || !data) {
    return (
      <div className="space-y-8 px-6 py-8">
        <div className="grid grid-cols-3 gap-5">
          {Array.from({ length: 3 }).map((_, i) => <KPICardSkeleton key={i} />)}
        </div>
        <ChartSkeleton />
        <TableSkeleton />
      </div>
    )
  }

  const summary = data.summary || {}
  const sites = data.sites || []
  const trend = data.trend || []

  const tableRows: AffiliateRow[] = sites.map((s: { name: string; bundle: { name: string }; affiliateRevenue: number; shareOfTotal: number }) => ({
    site: s.name,
    bundle: s.bundle?.name || '',
    revenue: s.affiliateRevenue || 0,
    share: s.shareOfTotal || 0,
  }))

  return (
    <motion.div
      className="space-y-8 px-6 py-8"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
    >
      <div className="grid grid-cols-3 gap-5">
        <KPICard label="Affiliate Revenue" value={summary.totalAffiliateRevenue || 0} format="currency" />
        <KPICard label="Ad Revenue" value={summary.totalAdRevenue || 0} format="currency" />
        <KPICard label="Total Revenue" value={summary.totalRevenue || 0} format="currency" />
      </div>

      {tableRows.length > 0 ? (
        <div>
          <h2 className="text-section-title mb-5">Revenue by Site</h2>
          <DataTable columns={columns} data={tableRows} searchKey="site" searchPlaceholder="Search sites..." />
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-[var(--radius-card)] border border-dashed border-[var(--color-border-default)] py-16">
          <p className="text-[14px] text-[var(--color-text-muted)]">No affiliate data available</p>
          <p className="mt-1.5 text-meta">Affiliate data will appear after syncing</p>
        </div>
      )}

      {trend.length > 0 && (
        <ChartCard title="Revenue Comparison" description="Affiliate vs Ad revenue over time">
          <AffiliateComparisonChart data={trend} />
        </ChartCard>
      )}
    </motion.div>
  )
}

export default function AffiliatePage() {
  return (
    <div>
      <TopContextBar title="Affiliate" subtitle="Affiliate and SPA revenue tracking" showExport />
      <Suspense fallback={<div className="space-y-8 px-6 py-8"><div className="grid grid-cols-3 gap-5">{Array.from({ length: 3 }).map((_, i) => <KPICardSkeleton key={i} />)}</div></div>}>
        <AffiliateContent />
      </Suspense>
    </div>
  )
}
