'use client'

import { Suspense } from 'react'
import { motion } from 'framer-motion'
import { fadeInUp } from '@/lib/motion'
import { TopContextBar } from '@/components/layout/topbar'
import { KPICard } from '@/components/shared/kpi-card'
import { ChartCard } from '@/components/shared/chart-card'
import { MetricDelta } from '@/components/shared/delta-indicator'
import { KPICardSkeleton, ChartSkeleton, TableSkeleton } from '@/components/shared/loading-skeleton'
import { CostTrendChart } from '@/components/features/charts/cost-trend-chart'
import { DataTable } from '@/components/features/data-table'
import { useCosts } from '@/hooks/use-api'
import { usePeriod } from '@/hooks/use-period'
import { formatCurrency } from '@/lib/utils'
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
  {
    accessorKey: 'site',
    header: 'Site',
    cell: ({ row }) => <span className="font-semibold text-[var(--color-text-primary)]">{row.original.site}</span>,
  },
  { accessorKey: 'bundle', header: 'Bundle' },
  {
    accessorKey: 'yesterday',
    header: 'Yesterday',
    cell: ({ row }) => <span className="tabular-nums">{formatCurrency(row.original.yesterday || 0)}</span>,
  },
  {
    accessorKey: 'avg7d',
    header: '7d Avg',
    cell: ({ row }) => <span className="tabular-nums">{formatCurrency(row.original.avg7d || 0)}</span>,
  },
  {
    accessorKey: 'total30d',
    header: '30d Total',
    cell: ({ row }) => <span className="font-semibold tabular-nums">{formatCurrency(row.original.total30d || 0)}</span>,
  },
  {
    accessorKey: 'change',
    header: 'Change',
    cell: ({ row }) => <MetricDelta value={row.original.change || 0} />,
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.original.status
      const config = status === 'matched'
        ? { bg: 'bg-[var(--color-success-bg)]', text: 'text-[var(--color-success-dark)]', dot: 'bg-[var(--color-success)]', label: 'Matched' }
        : status === 'no_data'
        ? { bg: 'bg-[var(--color-bg-subtle)]', text: 'text-[var(--color-text-muted)]', dot: 'bg-[var(--color-text-muted)]', label: 'No Data' }
        : { bg: 'bg-[var(--color-warning-bg)]', text: 'text-[var(--color-warning-dark)]', dot: 'bg-[var(--color-warning)]', label: 'Unmatched' }
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] px-2.5 py-1 text-[11px] font-semibold ${config.bg} ${config.text}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
          {config.label}
        </span>
      )
    },
  },
]


function CostsContent() {
  const { period } = usePeriod()
  const { data, isLoading } = useCosts(period)

  if (isLoading || !data) {
    return (
      <div className="space-y-8 px-6 py-8">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <KPICardSkeleton key={i} />)}
        </div>
        <ChartSkeleton />
        <TableSkeleton />
      </div>
    )
  }

  const summary = data.summary || {}
  const sites = data.sites || []
  const trend = data.trend || []

  const tableRows: CostRow[] = sites.map((s: { name: string; bundle: { name: string }; yesterdayCost: number; sevenDayAvg: number; thirtyDayTotal: number; changePercent: number; mappingStatus: string | null; hasCostData: boolean }) => ({
    site: s.name,
    bundle: s.bundle?.name || '',
    yesterday: s.yesterdayCost || 0,
    avg7d: s.sevenDayAvg || 0,
    total30d: s.thirtyDayTotal || 0,
    change: s.changePercent || 0,
    status: s.hasCostData ? (s.mappingStatus || 'unmatched') : 'no_data',
  }))

  const unmatchedCount = tableRows.filter(r => r.status === 'unmatched').length
  const noDataCount = tableRows.filter(r => r.status === 'no_data').length

  return (
    <motion.div className="space-y-8 px-6 py-8" initial="hidden" animate="visible" variants={fadeInUp}>
      {/* KPI Row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard label="Yesterday Total" value={summary.yesterdayTotal || 0} format="currency" />
        <KPICard label="7-Day Average" value={summary.sevenDayAvg || 0} format="currency" />
        <KPICard label="30-Day Total" value={summary.thirtyDayTotal || 0} format="currency" />
        <KPICard label="No Cost Data" value={noDataCount} format="number" />
      </div>

      {/* Cost Trend */}
      {trend.length > 0 && (
        <ChartCard title="Cost Trend" description="Daily cost breakdown">
          <CostTrendChart data={trend} />
        </ChartCard>
      )}

      {/* Table */}
      {tableRows.length > 0 ? (
        <div>
          <h2 className="text-section-title mb-5">Cost Breakdown</h2>
          <DataTable columns={columns} data={tableRows} searchKey="site" searchPlaceholder="Search sites..." />
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-[var(--radius-card)] border border-dashed border-[var(--color-border-default)] py-16">
          <p className="text-[14px] text-[var(--color-text-muted)]">No cost data available</p>
          <p className="mt-1.5 text-meta">Cost data will appear after syncing</p>
        </div>
      )}

      {/* Mapping Issues Banner */}
      {unmatchedCount > 0 && (
        <div className="rounded-[var(--radius-card)] border border-[var(--color-warning)] bg-[var(--color-warning-bg)] p-4">
          <div className="flex items-center gap-3">
            <span className="text-[14px] font-semibold text-[var(--color-warning-dark)]">
              {unmatchedCount} site{unmatchedCount > 1 ? 's' : ''} with unmatched cost mapping
            </span>
          </div>
          <p className="mt-1 text-[12px] text-[var(--color-warning-dark)]/70">
            Check site mappings in Settings to ensure cost data is correctly attributed.
          </p>
        </div>
      )}

      {/* No Data Info Banner */}
      {noDataCount > 0 && unmatchedCount === 0 && (
        <div className="rounded-[var(--radius-card)] border border-[var(--color-border-default)] bg-[var(--color-bg-subtle)] p-4">
          <div className="flex items-center gap-3">
            <span className="text-[14px] font-semibold text-[var(--color-text-secondary)]">
              {noDataCount} site{noDataCount > 1 ? 's' : ''} awaiting cost data
            </span>
          </div>
          <p className="mt-1 text-[12px] text-[var(--color-text-muted)]">
            Cost data will appear after syncing from Google Sheets. Configure the sheet in Settings → Google Sheets.
          </p>
        </div>
      )}
    </motion.div>
  )
}

export default function CostsPage() {
  return (
    <div>
      <TopContextBar title="Costs" subtitle="Cost tracking and analysis" showExport />
      <Suspense fallback={<div className="space-y-8 px-6 py-8"><div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <KPICardSkeleton key={i} />)}</div></div>}>
        <CostsContent />
      </Suspense>
    </div>
  )
}
