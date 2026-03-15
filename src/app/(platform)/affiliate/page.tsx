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
  { accessorKey: 'revenue', header: 'Affiliate Revenue', cell: ({ row }) => `$${row.original.revenue.toFixed(2)}` },
  { accessorKey: 'share', header: 'Share of Total', cell: ({ row }) => `${row.original.share.toFixed(1)}%` },
]

function AffiliateContent() {
  const { period } = usePeriod()
  const { data, isLoading } = useAffiliate(period)

  if (isLoading || !data) {
    return (
      <div className="space-y-6 p-8">
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <KPICardSkeleton key={i} />)}
        </div>
        <ChartSkeleton />
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

      {data.sites && (
        <ChartCard title="Affiliate Revenue by Site" description="Revenue contribution">
          <DataTable columns={columns} data={data.sites} searchKey="site" searchPlaceholder="Search sites..." />
        </ChartCard>
      )}

      {data.trend && (
        <ChartCard title="Revenue Trend" description="Affiliate vs Ad revenue over time">
          <AffiliateComparisonChart data={data.trend} />
        </ChartCard>
      )}
    </div>
  )
}

export default function AffiliatePage() {
  return (
    <div>
      <Topbar title="Affiliate" description="Affiliate and SPA revenue tracking" />
      <Suspense fallback={<div className="space-y-6 p-8"><div className="grid grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => <KPICardSkeleton key={i} />)}</div></div>}>
        <AffiliateContent />
      </Suspense>
    </div>
  )
}
