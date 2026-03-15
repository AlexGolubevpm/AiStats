'use client'

import { use, Suspense } from 'react'
import { motion } from 'framer-motion'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { TopContextBar } from '@/components/layout/topbar'
import { KPICard } from '@/components/shared/kpi-card'
import { ChartCard } from '@/components/shared/chart-card'
import { HealthBadge } from '@/components/shared/health-badge'
import { InsightCard } from '@/components/shared/insight-card'
import { KPICardSkeleton, ChartSkeleton, PageSkeleton } from '@/components/shared/loading-skeleton'
import { RevenueTrendChart } from '@/components/features/charts/revenue-trend-chart'
import { TrafficTrendChart } from '@/components/features/charts/traffic-trend-chart'
import { ProfitTrendChart } from '@/components/features/charts/profit-trend-chart'
import { FormatBreakdownChart } from '@/components/features/charts/format-breakdown-chart'
import { TierBreakdownChart } from '@/components/features/charts/tier-breakdown-chart'
import { CostTrendChart } from '@/components/features/charts/cost-trend-chart'
import { DataTable } from '@/components/features/data-table'
import { useSite } from '@/hooks/use-api'
import { usePeriod } from '@/hooks/use-period'
import { formatCurrency, formatCompact, getHealthStatus } from '@/lib/utils'
import { ExternalLink, AlertTriangle, Shield } from 'lucide-react'
import type { ColumnDef } from '@tanstack/react-table'

interface FormatRow { format: string; impressions: number; clicks: number; ctr: number; revenue: number; fillRate: number; rpm: number }
interface TierRow { tier: string; users: number; impressions: number; revenue: number; ctr: number; rpm: number }

const formatColumns: ColumnDef<FormatRow, unknown>[] = [
  { accessorKey: 'format', header: 'Format', cell: ({ row }) => <span className="font-semibold">{row.original.format}</span> },
  { accessorKey: 'impressions', header: 'Impressions', cell: ({ row }) => <span className="tabular-nums">{(row.original.impressions || 0).toLocaleString()}</span> },
  { accessorKey: 'clicks', header: 'Clicks', cell: ({ row }) => <span className="tabular-nums">{(row.original.clicks || 0).toLocaleString()}</span> },
  { accessorKey: 'ctr', header: 'CTR', cell: ({ row }) => <span className="tabular-nums">{(row.original.ctr || 0).toFixed(2)}%</span> },
  { accessorKey: 'revenue', header: 'Revenue', cell: ({ row }) => <span className="font-semibold tabular-nums">{formatCurrency(row.original.revenue || 0)}</span> },
  { accessorKey: 'fillRate', header: 'Fill Rate', cell: ({ row }) => <span className="tabular-nums">{(row.original.fillRate || 0).toFixed(1)}%</span> },
  { accessorKey: 'rpm', header: 'RPM', cell: ({ row }) => <span className="tabular-nums">{formatCurrency(row.original.rpm || 0)}</span> },
]

const tierColumns: ColumnDef<TierRow, unknown>[] = [
  { accessorKey: 'tier', header: 'Tier', cell: ({ row }) => <span className="font-semibold">{row.original.tier.replace('TIER_', 'Tier ')}</span> },
  { accessorKey: 'users', header: 'Users', cell: ({ row }) => <span className="tabular-nums">{(row.original.users || 0).toLocaleString()}</span> },
  { accessorKey: 'impressions', header: 'Impressions', cell: ({ row }) => <span className="tabular-nums">{(row.original.impressions || 0).toLocaleString()}</span> },
  { accessorKey: 'revenue', header: 'Revenue', cell: ({ row }) => <span className="font-semibold tabular-nums">{formatCurrency(row.original.revenue || 0)}</span> },
  { accessorKey: 'ctr', header: 'CTR', cell: ({ row }) => <span className="tabular-nums">{(row.original.ctr || 0).toFixed(2)}%</span> },
  { accessorKey: 'rpm', header: 'RPM', cell: ({ row }) => <span className="tabular-nums">{formatCurrency(row.original.rpm || 0)}</span> },
]

const BUNDLE_COLORS: Record<string, string> = {
  Gays: '#3B82F6',
  Trans: '#EC4899',
  JAV: '#EF4444',
  Hentai: '#8B5CF6',
}

function SiteDetailContent({ id }: { id: string }) {
  const { period } = usePeriod()
  const { data, isLoading } = useSite(id, period)

  if (isLoading || !data) {
    return <PageSkeleton />
  }

  const siteName = data.site?.name || 'Unknown'
  const domain = data.site?.domain || siteName
  const bundleName = data.site?.bundle?.name || ''
  const bundleColor = BUNDLE_COLORS[bundleName] || '#94A3B8'
  const healthScore = data.health?.score ?? null
  const healthStatus = healthScore != null ? getHealthStatus(healthScore) : null
  const hasKpis = data.kpis && data.kpis.length > 0
  const hasTrend = data.trend && data.trend.length > 0
  const hasFormats = data.formatBreakdown && data.formatBreakdown.length > 0
  const hasTiers = data.tierBreakdown && data.tierBreakdown.length > 0
  const hasCosts = data.costs && data.costs.length > 0
  const hasAnomalies = data.anomalies && data.anomalies.length > 0

  const costTrend = hasCosts
    ? data.costs.map((c: { date: string; amount: number }) => ({ date: c.date, total: c.amount }))
    : []

  return (
    <motion.div
      className="space-y-8 px-6 py-8"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
    >
      {/* Site Header — Control Center */}
      <div className="rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)]">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-[24px] font-bold text-[var(--color-text-primary)]">{siteName}</h2>
              <a href={`https://${domain}`} target="_blank" rel="noopener noreferrer" className="text-[var(--color-text-disabled)] hover:text-[var(--color-primary-600)]">
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
            <div className="mt-2 flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] px-2.5 py-1 text-[12px] font-semibold" style={{ backgroundColor: bundleColor + '15', color: bundleColor }}>
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: bundleColor }} />
                {bundleName}
              </span>
              {healthScore != null && <HealthBadge score={healthScore} size="md" />}
            </div>
          </div>

          {/* Health Explanation */}
          {healthScore != null && (
            <div className="rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-secondary)] p-4 max-w-sm">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-4 w-4 text-[var(--color-text-muted)]" />
                <span className="text-[12px] font-semibold text-[var(--color-text-secondary)]">Health Breakdown</span>
              </div>
              {data.health && (
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
                  {[
                    { label: 'Profit Quality', value: data.health.profitQuality },
                    { label: 'ROMI Quality', value: data.health.romiQuality },
                    { label: 'Revenue Trend', value: data.health.revenueTrend },
                    { label: 'Cost Pressure', value: data.health.costPressure },
                    { label: 'Format Quality', value: data.health.formatQuality },
                    { label: 'Tier Quality', value: data.health.tierQuality },
                  ].map(({ label, value }) => value != null && (
                    <div key={label} className="flex justify-between py-0.5">
                      <span className="text-[var(--color-text-muted)]">{label}</span>
                      <span className="font-semibold tabular-nums">{typeof value === 'number' ? value.toFixed(0) : value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Quick KPI metrics in header */}
        {hasKpis && (
          <div className="mt-5 grid grid-cols-5 gap-4 border-t border-[var(--color-border-subtle)] pt-5">
            {data.kpis.slice(0, 5).map((kpi: { label: string; value: number; delta?: number; format: 'currency' | 'number' | 'percent' | 'score' | 'compact' }) => (
              <div key={kpi.label}>
                <span className="text-meta">{kpi.label}</span>
                <p className="mt-0.5 text-[18px] font-bold tabular-nums text-[var(--color-text-primary)]">
                  {kpi.format === 'currency' ? formatCurrency(kpi.value) : kpi.format === 'compact' ? formatCompact(kpi.value) : kpi.format === 'percent' ? `${kpi.value.toFixed(1)}%` : kpi.value.toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Anomaly Alert */}
        {hasAnomalies && (
          <div className="mt-4 rounded-[var(--radius-control)] border border-[var(--color-warning)] bg-[var(--color-warning-bg)] px-4 py-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-[var(--color-warning-dark)]" />
              <span className="text-[12px] font-semibold text-[var(--color-warning-dark)]">
                {data.anomalies.length} active anomal{data.anomalies.length > 1 ? 'ies' : 'y'} detected
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList className="h-11 gap-1 rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-secondary)] p-1">
          <TabsTrigger value="overview" className="rounded-[var(--radius-control)] px-4 py-2 text-[13px] font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-[var(--color-text-primary)]">Overview</TabsTrigger>
          <TabsTrigger value="formats" className="rounded-[var(--radius-control)] px-4 py-2 text-[13px] font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-[var(--color-text-primary)]">Formats</TabsTrigger>
          <TabsTrigger value="tiers" className="rounded-[var(--radius-control)] px-4 py-2 text-[13px] font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-[var(--color-text-primary)]">GEO/Tiers</TabsTrigger>
          <TabsTrigger value="costs" className="rounded-[var(--radius-control)] px-4 py-2 text-[13px] font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-[var(--color-text-primary)]">Costs</TabsTrigger>
          <TabsTrigger value="trends" className="rounded-[var(--radius-control)] px-4 py-2 text-[13px] font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-[var(--color-text-primary)]">Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
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
            <div className="flex items-center justify-center rounded-[var(--radius-card)] border border-dashed border-[var(--color-border-default)] py-16">
              <p className="text-[14px] text-[var(--color-text-muted)]">No trend data available yet</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="formats" className="mt-6 space-y-6">
          {hasFormats ? (
            <>
              <ChartCard title="Format Revenue" description="Revenue by ad format">
                <FormatBreakdownChart data={data.formatBreakdown} />
              </ChartCard>
              <DataTable columns={formatColumns} data={data.formatBreakdown} />
            </>
          ) : (
            <div className="flex items-center justify-center rounded-[var(--radius-card)] border border-dashed border-[var(--color-border-default)] py-16">
              <p className="text-[14px] text-[var(--color-text-muted)]">No format data available</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="tiers" className="mt-6 space-y-6">
          {hasTiers ? (
            <>
              <ChartCard title="Tier Distribution" description="Revenue and users by GEO tier">
                <TierBreakdownChart data={data.tierBreakdown} />
              </ChartCard>
              <DataTable columns={tierColumns} data={data.tierBreakdown} />
            </>
          ) : (
            <div className="flex items-center justify-center rounded-[var(--radius-card)] border border-dashed border-[var(--color-border-default)] py-16">
              <p className="text-[14px] text-[var(--color-text-muted)]">No tier data available</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="costs" className="mt-6">
          {costTrend.length > 0 ? (
            <ChartCard title="Cost Trend" description="Daily costs">
              <CostTrendChart data={costTrend} />
            </ChartCard>
          ) : (
            <div className="flex items-center justify-center rounded-[var(--radius-card)] border border-dashed border-[var(--color-border-default)] py-16">
              <p className="text-[14px] text-[var(--color-text-muted)]">No cost data available</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="trends" className="mt-6">
          {hasTrend ? (
            <div className="space-y-6">
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
            <div className="flex items-center justify-center rounded-[var(--radius-card)] border border-dashed border-[var(--color-border-default)] py-16">
              <p className="text-[14px] text-[var(--color-text-muted)]">No trend data available</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </motion.div>
  )
}

export default function SiteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)

  return (
    <div>
      <TopContextBar title="Site Detail" subtitle="Site-level analytics and control center" />
      <Suspense fallback={<PageSkeleton />}>
        <SiteDetailContent id={id} />
      </Suspense>
    </div>
  )
}
