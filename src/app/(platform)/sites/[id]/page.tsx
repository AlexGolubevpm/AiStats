'use client'

import { use, Suspense } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Topbar } from '@/components/layout/topbar'
import { KPICard } from '@/components/shared/kpi-card'
import { ChartCard } from '@/components/shared/chart-card'
import { HealthBadge } from '@/components/shared/health-badge'
import { KPICardSkeleton, ChartSkeleton } from '@/components/shared/loading-skeleton'
import { RevenueTrendChart } from '@/components/features/charts/revenue-trend-chart'
import { TrafficTrendChart } from '@/components/features/charts/traffic-trend-chart'
import { ProfitTrendChart } from '@/components/features/charts/profit-trend-chart'
import { FormatBreakdownChart } from '@/components/features/charts/format-breakdown-chart'
import { TierBreakdownChart } from '@/components/features/charts/tier-breakdown-chart'
import { CostTrendChart } from '@/components/features/charts/cost-trend-chart'
import { DataTable } from '@/components/features/data-table'
import { useSite } from '@/hooks/use-api'
import { usePeriod } from '@/hooks/use-period'
import type { ColumnDef } from '@tanstack/react-table'

interface FormatRow { format: string; impressions: number; clicks: number; ctr: number; revenue: number; fillRate: number; rpm: number }
interface TierRow { tier: string; users: number; impressions: number; revenue: number; ctr: number; rpm: number }

const formatColumns: ColumnDef<FormatRow, unknown>[] = [
  { accessorKey: 'format', header: 'Format' },
  { accessorKey: 'impressions', header: 'Impressions', cell: ({ row }) => (row.original.impressions || 0).toLocaleString() },
  { accessorKey: 'clicks', header: 'Clicks', cell: ({ row }) => (row.original.clicks || 0).toLocaleString() },
  { accessorKey: 'ctr', header: 'CTR', cell: ({ row }) => `${(row.original.ctr || 0).toFixed(2)}%` },
  { accessorKey: 'revenue', header: 'Revenue', cell: ({ row }) => `$${(row.original.revenue || 0).toFixed(2)}` },
  { accessorKey: 'fillRate', header: 'Fill Rate', cell: ({ row }) => `${(row.original.fillRate || 0).toFixed(1)}%` },
  { accessorKey: 'rpm', header: 'RPM', cell: ({ row }) => `$${(row.original.rpm || 0).toFixed(2)}` },
]

const tierColumns: ColumnDef<TierRow, unknown>[] = [
  { accessorKey: 'tier', header: 'Tier', cell: ({ row }) => row.original.tier.replace('TIER_', 'Tier ') },
  { accessorKey: 'users', header: 'Users', cell: ({ row }) => (row.original.users || 0).toLocaleString() },
  { accessorKey: 'impressions', header: 'Impressions', cell: ({ row }) => (row.original.impressions || 0).toLocaleString() },
  { accessorKey: 'revenue', header: 'Revenue', cell: ({ row }) => `$${(row.original.revenue || 0).toFixed(2)}` },
  { accessorKey: 'ctr', header: 'CTR', cell: ({ row }) => `${(row.original.ctr || 0).toFixed(2)}%` },
  { accessorKey: 'rpm', header: 'RPM', cell: ({ row }) => `$${(row.original.rpm || 0).toFixed(2)}` },
]

function SiteDetailContent({ id }: { id: string }) {
  const { period } = usePeriod()
  const { data, isLoading } = useSite(id, period)

  if (isLoading || !data) {
    return (
      <div className="space-y-6 p-8">
        <div className="grid grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => <KPICardSkeleton key={i} />)}
        </div>
        <ChartSkeleton />
      </div>
    )
  }

  const siteName = data.site?.name || 'Unknown'
  const bundleName = data.site?.bundle?.name || ''
  const healthScore = data.health?.score ?? null
  const hasKpis = data.kpis && data.kpis.length > 0
  const hasTrend = data.trend && data.trend.length > 0
  const hasFormats = data.formatBreakdown && data.formatBreakdown.length > 0
  const hasTiers = data.tierBreakdown && data.tierBreakdown.length > 0
  const hasCosts = data.costs && data.costs.length > 0

  // Build cost trend from cost entries
  const costTrend = hasCosts
    ? data.costs.map((c: { date: string; amount: number }) => ({ date: c.date, total: c.amount }))
    : []

  return (
    <div className="space-y-6 p-8">
      {/* Site Header */}
      <div className="flex items-center gap-4">
        <h2 className="text-xl font-semibold">{siteName}</h2>
        {bundleName && (
          <span className="rounded-full bg-[var(--color-accent-light)] px-2.5 py-0.5 text-xs font-medium text-[var(--color-accent)]">
            {bundleName}
          </span>
        )}
        {healthScore != null && <HealthBadge score={healthScore} />}
      </div>

      {/* KPIs */}
      {hasKpis && (
        <div className="grid grid-cols-5 gap-4">
          {data.kpis.map((kpi: { label: string; value: number; delta?: number; format: 'currency' | 'number' | 'percent' | 'score' | 'compact' }) => (
            <KPICard key={kpi.label} {...kpi} />
          ))}
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="formats">Formats</TabsTrigger>
          <TabsTrigger value="tiers">GEO/Tiers</TabsTrigger>
          <TabsTrigger value="costs">Costs</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-5">
          {hasTrend ? (
            <div className="grid grid-cols-2 gap-5">
              <ChartCard title="Revenue Trend" description="Daily revenue">
                <RevenueTrendChart data={data.trend} />
              </ChartCard>
              <ChartCard title="Traffic Trend" description="Daily users">
                <TrafficTrendChart data={data.trend} />
              </ChartCard>
            </div>
          ) : (
            <div className="flex items-center justify-center rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] py-12">
              <p className="text-sm text-[var(--color-text-muted)]">No trend data available yet</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="formats" className="mt-5 space-y-5">
          {hasFormats ? (
            <>
              <ChartCard title="Format Revenue" description="Revenue by ad format">
                <FormatBreakdownChart data={data.formatBreakdown} />
              </ChartCard>
              <ChartCard title="Format Details" description="Detailed format metrics">
                <DataTable columns={formatColumns} data={data.formatBreakdown} />
              </ChartCard>
            </>
          ) : (
            <div className="flex items-center justify-center rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] py-12">
              <p className="text-sm text-[var(--color-text-muted)]">No format data available</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="tiers" className="mt-5 space-y-5">
          {hasTiers ? (
            <>
              <ChartCard title="Tier Distribution" description="Revenue and users by GEO tier">
                <TierBreakdownChart data={data.tierBreakdown} />
              </ChartCard>
              <ChartCard title="Tier Details" description="Detailed tier metrics">
                <DataTable columns={tierColumns} data={data.tierBreakdown} />
              </ChartCard>
            </>
          ) : (
            <div className="flex items-center justify-center rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] py-12">
              <p className="text-sm text-[var(--color-text-muted)]">No tier data available</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="costs" className="mt-5">
          {costTrend.length > 0 ? (
            <ChartCard title="Cost Trend" description="Daily costs">
              <CostTrendChart data={costTrend} />
            </ChartCard>
          ) : (
            <div className="flex items-center justify-center rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] py-12">
              <p className="text-sm text-[var(--color-text-muted)]">No cost data available</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="trends" className="mt-5">
          {hasTrend ? (
            <div className="space-y-5">
              <ChartCard title="Revenue" description="Revenue over time">
                <RevenueTrendChart data={data.trend} />
              </ChartCard>
              <ChartCard title="Traffic" description="Traffic over time">
                <TrafficTrendChart data={data.trend} />
              </ChartCard>
              <ChartCard title="Profit" description="Profit over time">
                <ProfitTrendChart data={data.trend} />
              </ChartCard>
            </div>
          ) : (
            <div className="flex items-center justify-center rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] py-12">
              <p className="text-sm text-[var(--color-text-muted)]">No trend data available</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default function SiteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)

  return (
    <div>
      <Topbar title="Site Detail" description="Site-level analytics and control center" />
      <Suspense fallback={<div className="space-y-6 p-8"><div className="grid grid-cols-5 gap-4">{Array.from({ length: 5 }).map((_, i) => <KPICardSkeleton key={i} />)}</div></div>}>
        <SiteDetailContent id={id} />
      </Suspense>
    </div>
  )
}
