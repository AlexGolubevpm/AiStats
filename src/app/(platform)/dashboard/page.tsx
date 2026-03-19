'use client'

import { Suspense, useState, useMemo } from 'react'
import { Badge } from '@mantine/core'
import { motion } from 'framer-motion'
import { fadeInUp, staggerContainer } from '@/lib/motion'
import Link from 'next/link'
import { TopContextBar } from '@/components/layout/topbar'
import { KPICard } from '@/components/shared/kpi-card'
import { ChartCard } from '@/components/shared/chart-card'
import { InsightCard } from '@/components/shared/insight-card'
import { HealthBadge } from '@/components/shared/health-badge'
import { DeltaBadge } from '@/components/shared/delta-indicator'
import { SignalStrip } from '@/components/shared/signal-strip'
import { DataFreshnessSummary } from '@/components/shared/data-freshness-summary'
import { NetworkHealthCard } from '@/components/shared/network-health-card'
import {
  KPICardSkeleton,
  ChartSkeleton,
  SignalCardSkeleton,
  BundleCardSkeleton,
  InsightCardSkeleton,
} from '@/components/shared/loading-skeleton'
import { AreaChart } from '@/components/tremor/AreaChart'
import { useDashboard } from '@/hooks/use-api'
import { usePeriod } from '@/hooks/use-period'
import { formatCurrency, formatCompact, cn } from '@/lib/utils'
import {
  ChevronRight,
  RefreshCw,
  Database,
  AlertCircle,
  TrendingUp,
  DollarSign,
  Activity,
  BarChart2,
} from 'lucide-react'
import type { AnomalySeverity } from '@/types'
import type { DashboardKpi, DashboardBundle, DashboardInsight, DashboardSignal, TrendPoint } from '@/services/dashboard/types'

/* ── Constants ── */
const BUNDLE_ACCENTS: Record<string, string> = {
  JAV: 'bg-[var(--color-bundle-jav)]',
  Gays: 'bg-[var(--color-bundle-gays)]',
  Hentai: 'bg-[var(--color-bundle-hentai)]',
  Trans: 'bg-[var(--color-bundle-trans)]',
}

const TREND_TABS = [
  { key: 'revenue', label: 'Revenue', icon: DollarSign },
  { key: 'traffic', label: 'Traffic', icon: Activity },
  { key: 'profit', label: 'Profit', icon: TrendingUp },
] as const

type TrendTab = (typeof TREND_TABS)[number]['key']

/* ── Trend data transforms ── */
function hasRealData(points: TrendPoint[]): boolean {
  return points.some(pt => pt.value !== null && pt.value !== 0)
}

function buildRevenueChartData(
  adRevenue: TrendPoint[],
  affiliateRevenue: TrendPoint[],
  totalRevenue: TrendPoint[],
) {
  if (!hasRealData(totalRevenue)) return []
  return totalRevenue.map((pt, i) => ({
    date: pt.date,
    adRevenue: adRevenue[i]?.value ?? 0,
    affiliateRevenue: affiliateRevenue[i]?.value ?? 0,
    totalRevenue: pt.value ?? 0,
  }))
}

function buildTrafficChartData(traffic: TrendPoint[]) {
  if (!hasRealData(traffic)) return []
  return traffic.map(pt => ({ date: pt.date, visits: pt.value ?? 0 }))
}

function buildProfitChartData(profit: TrendPoint[]) {
  if (!hasRealData(profit)) return []
  return profit.map(pt => ({ date: pt.date, profit: pt.value ?? 0 }))
}

/* ── Empty chart placeholder ── */
function ChartEmptyState({ metric }: { metric: string }) {
  return (
    <div className="flex h-80 items-center justify-center">
      <div className="text-center">
        <BarChart2 size={32} strokeWidth={1.5} className="mx-auto text-[var(--color-text-disabled)]" />
        <p className="mt-2 text-sm font-medium text-[var(--color-text-muted)]">No {metric} data available</p>
        <p className="mt-0.5 text-xs text-[var(--color-text-disabled)]">Data will appear once sources are synced</p>
      </div>
    </div>
  )
}

/* ── Bundle Card ── */
function BundleCard({ bundle }: { bundle: DashboardBundle }) {
  const accentClass = BUNDLE_ACCENTS[bundle.name] || 'bg-gray-400'

  return (
    <Link
      href={`/bundles/${bundle.slug}`}
      className={cn(
        'block no-underline',
        'rounded-[var(--radius-card)] bg-[var(--color-surface)]',
        'border border-[var(--color-border-subtle)]',
        'shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-elevated)]',
        'transition-all duration-[var(--duration-normal)] ease-[var(--ease-out-expo)]',
        'hover:-translate-y-0.5 focus-ring',
      )}
      style={{ color: 'inherit', textDecoration: 'none' }}
    >
      {/* Top accent */}
      <div className={cn('h-[3px] rounded-t-[var(--radius-card)]', accentClass)} />

      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className={cn('h-2.5 w-2.5 rounded-full', accentClass)} />
            <span className="text-sm font-semibold text-[var(--color-text-primary)]">{bundle.name}</span>
          </div>
          <div className="flex items-center gap-2">
            {bundle.health != null && <HealthBadge score={bundle.health} showLabel={false} size="sm" />}
            {bundle.delta !== null && bundle.delta !== undefined && <DeltaBadge value={bundle.delta} size="sm" />}
            <ChevronRight size={16} strokeWidth={2} className="text-[var(--color-text-disabled)]" />
          </div>
        </div>

        {/* Metrics 2x2 */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          {[
            { label: 'Visits', value: formatCompact(bundle.visits || 0) },
            { label: 'Revenue', value: formatCurrency(bundle.totalRevenue || 0) },
            { label: 'Profit', value: formatCurrency(bundle.profit || 0), positive: (bundle.profit ?? 0) > 0 },
            { label: 'ROMI', value: `${(bundle.romi || 0).toFixed(1)}%` },
          ].map(m => (
            <div key={m.label}>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">{m.label}</p>
              <p
                className={cn(
                  'mt-0.5 text-lg font-bold tabular-nums',
                  m.positive === true
                    ? 'text-[var(--color-success-dark)]'
                    : m.positive === false
                      ? 'text-[var(--color-danger-dark)]'
                      : 'text-[var(--color-text-primary)]',
                )}
              >
                {m.value}
              </p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-3 flex items-center justify-between border-t border-[var(--color-border-subtle)] pt-3">
          <span className="text-xs font-medium text-[var(--color-text-muted)]">{bundle.sitesCount || 0} sites</span>
          {bundle.momentum && (
            <span className={cn(
              'text-[11px] font-semibold capitalize',
              bundle.momentum === 'accelerating' ? 'text-[var(--color-success)]' :
              bundle.momentum === 'decelerating' ? 'text-[var(--color-danger)]' :
              'text-[var(--color-text-muted)]',
            )}>
              {bundle.momentum}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}

/* ── Tabbed Chart ── */
function TabbedChart({ trends, dayCount, compareLabel }: {
  trends: { revenue: TrendPoint[]; traffic: TrendPoint[]; profit: TrendPoint[]; adRevenue: TrendPoint[]; affiliateRevenue: TrendPoint[] }
  dayCount: number
  compareLabel: string
}) {
  const [activeTab, setActiveTab] = useState<TrendTab>('revenue')

  const revenueData = useMemo(() => buildRevenueChartData(trends.adRevenue, trends.affiliateRevenue, trends.revenue), [trends])
  const trafficData = useMemo(() => buildTrafficChartData(trends.traffic), [trends])
  const profitData = useMemo(() => buildProfitChartData(trends.profit), [trends])

  const tabHasData: Record<TrendTab, boolean> = {
    revenue: revenueData.length > 0,
    traffic: trafficData.length > 0,
    profit: profitData.length > 0,
  }

  return (
    <ChartCard
      title="Performance Trends"
      description={`${dayCount} days · ${compareLabel}`}
      action={
        <div role="tablist" aria-label="Trend charts" className="flex gap-1 rounded-[var(--radius-control)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-secondary)] p-0.5">
          {TREND_TABS.map(tab => {
            const Icon = tab.icon
            const disabled = !tabHasData[tab.key]
            return (
              <button
                key={tab.key}
                role="tab"
                aria-selected={activeTab === tab.key}
                aria-controls={`chart-panel-${tab.key}`}
                disabled={disabled}
                onClick={() => !disabled && setActiveTab(tab.key)}
                className={cn(
                  'flex items-center gap-1.5 rounded-[var(--radius-sm)] px-3 py-1.5 text-xs font-semibold transition-all',
                  disabled
                    ? 'cursor-not-allowed text-[var(--color-text-disabled)] opacity-50'
                    : activeTab === tab.key
                      ? 'bg-[var(--color-surface)] text-[var(--color-primary-600)] shadow-[var(--shadow-xs)]'
                      : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]',
                )}
              >
                <Icon size={13} strokeWidth={2} />
                {tab.label}
              </button>
            )
          })}
        </div>
      }
    >
      <div id={`chart-panel-${activeTab}`} role="tabpanel" aria-label={`${activeTab} chart`}>
        {activeTab === 'revenue' && (revenueData.length > 0 ? (
          <AreaChart
            data={revenueData}
            index="date"
            categories={['adRevenue', 'affiliateRevenue']}
            colors={['violet', 'fuchsia']}
            valueFormatter={(v: number) => `$${v >= 1000 ? `${(v / 1000).toFixed(1)}K` : v.toFixed(2)}`}
            showLegend={true}
            showGridLines={true}
            className="h-80"
            fill="gradient"
            yAxisWidth={56}
          />
        ) : (
          <ChartEmptyState metric="revenue" />
        ))}
        {activeTab === 'traffic' && (trafficData.length > 0 ? (
          <AreaChart
            data={trafficData}
            index="date"
            categories={['visits']}
            colors={['cyan']}
            valueFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v.toString()}
            showLegend={true}
            showGridLines={true}
            className="h-80"
            fill="gradient"
            yAxisWidth={56}
          />
        ) : (
          <ChartEmptyState metric="traffic" />
        ))}
        {activeTab === 'profit' && (profitData.length > 0 ? (
          <AreaChart
            data={profitData}
            index="date"
            categories={['profit']}
            colors={['emerald']}
            valueFormatter={(v: number) => `$${v >= 1000 ? `${(v / 1000).toFixed(1)}K` : v.toFixed(2)}`}
            showLegend={true}
            showGridLines={true}
            className="h-80"
            fill="gradient"
            autoMinValue={true}
            yAxisWidth={56}
          />
        ) : (
          <ChartEmptyState metric="profit" />
        ))}
      </div>
    </ChartCard>
  )
}

/* ── Bundle Comparison Bar ── */
function BundleComparisonChart({ bundles }: { bundles: DashboardBundle[] }) {
  const maxRevenue = Math.max(...bundles.map(b => b.totalRevenue ?? 0), 1)

  return (
    <ChartCard title="Bundle Revenue Comparison" description="Revenue breakdown by bundle">
      <div className="flex flex-col gap-4">
        {bundles.map(b => {
          const rev = b.totalRevenue ?? 0
          const pct = (rev / maxRevenue) * 100
          const accentClass = BUNDLE_ACCENTS[b.name] || 'bg-gray-400'

          return (
            <div key={b.id}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <div className={cn('h-2.5 w-2.5 rounded-full', accentClass)} />
                  <span className="text-sm font-semibold text-[var(--color-text-primary)]">{b.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold tabular-nums text-[var(--color-text-primary)]">
                    {formatCurrency(rev)}
                  </span>
                  {b.delta !== null && b.delta !== undefined && <DeltaBadge value={b.delta} size="sm" />}
                </div>
              </div>
              <div className="h-3 w-full rounded-full bg-[var(--color-surface-secondary)]">
                <div
                  className={cn('h-3 rounded-full transition-all duration-500', accentClass)}
                  style={{ width: `${Math.max(pct, 2)}%` }}
                />
              </div>
              <div className="mt-1 flex items-center gap-3 text-[11px] font-medium text-[var(--color-text-muted)]">
                <span>Profit: {formatCurrency(b.profit ?? 0)}</span>
                <span>ROMI: {(b.romi ?? 0).toFixed(1)}%</span>
                <span>RPM: ${(b.rpm ?? 0).toFixed(2)}</span>
              </div>
            </div>
          )
        })}
      </div>
    </ChartCard>
  )
}

/* ── Performance Summary Sidebar ── */
function PerformanceSummary({ bundles }: { bundles: DashboardBundle[] }) {
  const totalRevenue = bundles.reduce((s, b) => s + (b.totalRevenue ?? 0), 0)
  const totalProfit = bundles.reduce((s, b) => s + (b.profit ?? 0), 0)
  const totalCosts = bundles.reduce((s, b) => s + (b.costs ?? 0), 0)
  const avgRomi = bundles.length > 0
    ? bundles.reduce((s, b) => s + (b.romi ?? 0), 0) / bundles.length
    : 0

  const metrics = [
    { label: 'Total Revenue', value: formatCurrency(totalRevenue), color: 'text-[var(--color-primary-600)]' },
    { label: 'Total Profit', value: formatCurrency(totalProfit), color: totalProfit >= 0 ? 'text-[var(--color-success-dark)]' : 'text-[var(--color-danger-dark)]' },
    { label: 'Total Costs', value: formatCurrency(totalCosts), color: 'text-[var(--color-text-primary)]' },
    { label: 'Avg ROMI', value: `${avgRomi.toFixed(1)}%`, color: avgRomi >= 100 ? 'text-[var(--color-success-dark)]' : 'text-[var(--color-warning-dark)]' },
  ]

  return (
    <div className="flex flex-col gap-3">
      {metrics.map(m => (
        <div
          key={m.label}
          className={cn(
            'rounded-[var(--radius-card)] bg-[var(--color-surface)]',
            'border border-[var(--color-border-subtle)]',
            'shadow-[var(--shadow-card)] p-4',
          )}
        >
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">{m.label}</p>
          <p className={cn('mt-1 text-executive-value', m.color)}>{m.value}</p>
        </div>
      ))}
    </div>
  )
}

/* ── Compute insights ── */
function computeInsights(bundles: DashboardBundle[], rawInsights: DashboardInsight[]): Array<{
  entity: string; entitySlug?: string; entityType: string; metric: string;
  value: string; delta?: number; reason: string; action?: string;
  actionHref?: string; severity: AnomalySeverity;
  type?: 'risk' | 'opportunity' | 'info' | 'winner' | 'loser'
}> {
  type InsightData = ReturnType<typeof computeInsights>[number]
  const typed: InsightData[] = []

  if (bundles.length > 0) {
    const bestGain = [...bundles]
      .filter(b => b.delta !== undefined && b.delta !== null && b.delta > 0)
      .sort((a, b) => (b.delta ?? 0) - (a.delta ?? 0))[0]

    if (bestGain) {
      typed.push({
        entity: bestGain.name, entitySlug: bestGain.slug, entityType: 'bundle', metric: 'Revenue Growth',
        value: formatCurrency(bestGain.totalRevenue ?? 0), delta: bestGain.delta ?? undefined,
        reason: `${bestGain.name} is the fastest growing bundle. Consider allocating more traffic.`,
        action: `View ${bestGain.name} details`, actionHref: `/bundles/${bestGain.slug}`,
        severity: 'low' as AnomalySeverity, type: 'opportunity',
      })
    }
  }

  const sortedRisks = [...rawInsights]
    .filter(i => i.type === 'risk')
    .sort((a, b) => {
      const w: Record<string, number> = { critical: 4, warning: 3, info: 1 }
      return (w[b.severity] || 0) - (w[a.severity] || 0)
    })
  if (sortedRisks.length > 0) {
    const r = sortedRisks[0]
    typed.push({
      entity: r.entityName, entityType: r.entityType, metric: r.metric,
      value: r.value != null ? String(r.value) : '—', delta: r.delta ?? undefined,
      reason: r.reason, severity: (r.severity === 'critical' ? 'critical' : r.severity === 'warning' ? 'high' : 'medium') as AnomalySeverity,
      type: 'risk',
    })
  }

  if (bundles.length > 0) {
    const worstDrop = [...bundles]
      .filter(b => b.delta !== undefined && b.delta !== null && b.delta < 0)
      .sort((a, b) => (a.delta ?? 0) - (b.delta ?? 0))[0]

    if (worstDrop) {
      typed.push({
        entity: worstDrop.name, entitySlug: worstDrop.slug, entityType: 'bundle', metric: 'Revenue Decline',
        value: formatCurrency(worstDrop.totalRevenue ?? 0), delta: worstDrop.delta ?? undefined,
        reason: `${worstDrop.name} revenue declined significantly. Check traffic sources and site health.`,
        action: `Investigate ${worstDrop.name}`, actionHref: `/bundles/${worstDrop.slug}`,
        severity: ((worstDrop.delta ?? 0) < -20 ? 'high' : 'medium') as AnomalySeverity, type: 'loser',
      })
    }

    const bestRomi = [...bundles].sort((a, b) => (b.romi ?? 0) - (a.romi ?? 0))[0]
    if (bestRomi && (bestRomi.romi ?? 0) > 0) {
      typed.push({
        entity: bestRomi.name, entitySlug: bestRomi.slug, entityType: 'bundle', metric: 'ROMI',
        value: `${(bestRomi.romi ?? 0).toFixed(1)}%`, delta: bestRomi.delta ?? undefined,
        reason: `Best return on investment: ${formatCurrency(bestRomi.profit ?? 0)} profit from ${formatCurrency(bestRomi.totalRevenue ?? 0)} revenue.`,
        action: `View ${bestRomi.name} performance`, actionHref: `/bundles/${bestRomi.slug}`,
        severity: 'low' as AnomalySeverity, type: 'winner',
      })
    }
  }

  return typed
}

/* ── Skeleton ── */
function DashboardSkeleton() {
  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6">
      <div className="flex flex-col gap-6">
        {/* Data Freshness */}
        <div className="flex gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="animate-shimmer h-7 w-28 rounded-full" />
          ))}
        </div>
        {/* Primary KPIs */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => <KPICardSkeleton key={i} />)}
        </div>
        {/* Secondary KPIs */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <KPICardSkeleton key={i} />)}
        </div>
        {/* Signals */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 3 }).map((_, i) => <SignalCardSkeleton key={i} />)}
        </div>
        {/* Chart + Sidebar */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
          <div className="md:col-span-8"><ChartSkeleton /></div>
          <div className="md:col-span-4 flex flex-col gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-card)]">
                <div className="animate-shimmer h-3 w-16 rounded-md" />
                <div className="animate-shimmer mt-2 h-7 w-24 rounded-md" />
              </div>
            ))}
          </div>
        </div>
        {/* Bundles */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <BundleCardSkeleton key={i} />)}
        </div>
        {/* Bundle Comparison + Summary */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
          <div className="md:col-span-8">
            <div className="rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] shadow-[var(--shadow-card)]">
              <div className="px-5 pt-5 pb-3">
                <div className="animate-shimmer h-4 w-40 rounded-md" />
                <div className="animate-shimmer mt-2 h-3 w-28 rounded-md" />
              </div>
              <div className="px-5 pb-5 flex flex-col gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="animate-shimmer h-4 w-16 rounded-md" />
                      <div className="animate-shimmer h-4 w-20 rounded-md" />
                    </div>
                    <div className="animate-shimmer h-3 w-full rounded-full" />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="md:col-span-4 flex flex-col gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-card)]">
                <div className="animate-shimmer h-3 w-20 rounded-md" />
                <div className="animate-shimmer mt-2 h-7 w-24 rounded-md" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Empty State ── */
function EmptyState() {
  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6">
      <div className="flex flex-col items-center justify-center rounded-[var(--radius-card)] border-2 border-dashed border-[var(--color-border-default)] bg-[var(--color-surface)] px-6 py-16 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-primary-50)]">
          <Database size={24} strokeWidth={2} className="text-[var(--color-primary-500)]" />
        </div>
        <h3 className="mt-4 text-base font-semibold text-[var(--color-text-primary)]">No data available yet</h3>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          Data will appear after syncing with AdSpyglass. Start a sync from Settings.
        </p>
        <Link
          href="/settings"
          className="mt-4 inline-flex items-center gap-2 rounded-[var(--radius-control)] bg-[var(--color-primary-500)] px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[var(--color-primary-600)] focus-ring"
        >
          <RefreshCw size={16} strokeWidth={2} />
          Go to Settings
        </Link>
      </div>
    </div>
  )
}

/* ── Error State ── */
function ErrorState({ error }: { error: Error | unknown }) {
  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6">
      <div className="flex flex-col items-center justify-center rounded-[var(--radius-card)] border-2 border-dashed border-[var(--color-danger)] bg-[var(--color-danger-bg)] px-6 py-16 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white">
          <AlertCircle size={24} strokeWidth={2} className="text-[var(--color-danger)]" />
        </div>
        <h3 className="mt-4 text-base font-semibold text-[var(--color-text-primary)]">Failed to load dashboard</h3>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          {error instanceof Error ? error.message : 'Unknown error — check server logs'}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 inline-flex items-center gap-2 rounded-[var(--radius-control)] bg-[var(--color-danger)] px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[var(--color-danger-dark)] focus-ring"
        >
          <RefreshCw size={16} strokeWidth={2} />
          Retry
        </button>
      </div>
    </div>
  )
}

/* ── Dashboard Content ── */
function DashboardContent() {
  const { period, compare } = usePeriod()
  const { data, isLoading, error } = useDashboard(period, compare)

  if (isLoading) return <DashboardSkeleton />
  if (error || !data) return <ErrorState error={error} />

  const kpis: DashboardKpi[] = data.kpis ?? []
  const bundles: DashboardBundle[] = data.bundles ?? []
  const trends = data.trends
  const insights: DashboardInsight[] = data.insights ?? []
  const signals: DashboardSignal[] = data.signals ?? []
  const summary = data.executiveSummary

  const hasKpis = kpis.length > 0
  const hasBundles = bundles.length > 0
  const hasTrends = trends && (trends.revenue?.length > 0 || trends.traffic?.length > 0 || trends.profit?.length > 0)

  if (!hasKpis && !hasBundles && !hasTrends) return <EmptyState />

  const primaryKpis = kpis.filter(k => k.tier === 'primary')
  const secondaryKpis = kpis.filter(k => k.tier === 'secondary')
  const compareLabel = compare === 'prev_7d' ? 'vs 7d ago' : compare === 'prev_day' ? 'vs yesterday' : 'vs prev period'
  const typedInsights = computeInsights(bundles, insights)

  // Signal strip data adapters
  const signalBundles = bundles.map(b => ({
    name: b.name,
    totalRevenue: b.totalRevenue ?? 0,
    profit: b.profit ?? 0,
    romi: b.romi ?? 0,
    delta: b.delta ?? undefined,
    healthScore: b.health ?? undefined,
  }))
  const signalInsights = insights.map(i => ({
    entity: i.entityName,
    metric: i.metric,
    value: String(i.value ?? ''),
    delta: i.delta ?? undefined,
    reason: i.reason,
    severity: i.severity,
    type: i.type,
  }))

  const networkHealthScore = summary?.networkHealth ?? (hasBundles
    ? bundles.reduce((sum, b) => sum + (b.health ?? 70), 0) / bundles.length
    : 0)
  const unhealthyCount = hasBundles
    ? bundles.filter(b => (b.health ?? 100) < 60).length
    : 0

  const dayCount = trends?.revenue?.length ?? 0

  return (
    <motion.div initial="hidden" animate="visible" variants={staggerContainer}>
      <div className="mx-auto w-full max-w-[1440px] px-4 py-6 pb-16 overflow-hidden sm:px-6">
        <div className="flex flex-col gap-6">

          {/* ── 1. Data Freshness ── */}
          <motion.div custom={0} variants={fadeInUp}>
            <DataFreshnessSummary />
          </motion.div>

          {/* ── Coverage indicator ── */}
          {data.coverage && !data.coverage.complete && data.coverage.syncTriggered && (
            <motion.div custom={0.5} variants={fadeInUp}>
              <Badge
                variant="light" color="indigo" size="lg" radius="lg"
                styles={{ root: { textTransform: 'none', fontWeight: 500, fontSize: 12 } }}
              >
                Loading historical data for {data.coverage.missingDates} missing days...
              </Badge>
            </motion.div>
          )}

          {/* ── 2. Primary KPIs ── */}
          {primaryKpis.length > 0 && (
            <motion.div custom={1} variants={fadeInUp}>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
                {primaryKpis.map(kpi => (
                  <KPICard
                    key={kpi.key}
                    label={kpi.label}
                    value={kpi.value ?? 0}
                    previousValue={kpi.previousValue ?? undefined}
                    delta={kpi.delta ?? undefined}
                    format={kpi.format}
                    trend={kpi.trend}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {/* ── 3. Secondary KPIs ── */}
          {secondaryKpis.length > 0 && (
            <motion.div custom={2} variants={fadeInUp}>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                {secondaryKpis.map(kpi => (
                  <KPICard
                    key={kpi.key}
                    label={kpi.label}
                    value={kpi.value ?? 0}
                    previousValue={kpi.previousValue ?? undefined}
                    delta={kpi.delta ?? undefined}
                    format={kpi.format}
                    trend={kpi.trend}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {/* ── 4. Network Signals ── */}
          {(hasBundles || insights.length > 0) && (
            <motion.div custom={3} variants={fadeInUp}>
              <SignalStrip bundles={signalBundles} insights={signalInsights} />
            </motion.div>
          )}

          {/* ── 5. Analytics Canvas: TabbedChart (8) + Sidebar (4) ── */}
          {hasTrends && (
            <motion.div custom={4} variants={fadeInUp}>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
                {/* Main chart */}
                <div className="md:col-span-8">
                  <TabbedChart trends={trends} dayCount={dayCount} compareLabel={compareLabel} />
                </div>

                {/* Sidebar analytics */}
                <div className="md:col-span-4 flex flex-col gap-3">
                  {/* Network Health */}
                  <NetworkHealthCard
                    score={networkHealthScore}
                    unhealthyCount={unhealthyCount}
                    totalBundles={bundles.length}
                    confidence={summary?.networkHealthConfidence === 'high' ? 'full' : summary?.networkHealthConfidence === 'medium' ? 'partial' : 'low'}
                  />

                  {/* Executive hints */}
                  {summary?.topRisk && (
                    <div className={cn(
                      'rounded-[var(--radius-card)] bg-[var(--color-surface)]',
                      'border border-[var(--color-border-subtle)] border-l-[3px] border-l-[var(--color-warning)]',
                      'shadow-[var(--shadow-card)] p-4 min-h-[72px]',
                    )}>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-warning)]">Top Risk</p>
                      <p className="mt-1 text-sm font-medium text-[var(--color-text-secondary)] line-clamp-2">{summary.topRisk}</p>
                    </div>
                  )}
                  {summary?.topOpportunity && (
                    <div className={cn(
                      'rounded-[var(--radius-card)] bg-[var(--color-surface)]',
                      'border border-[var(--color-border-subtle)] border-l-[3px] border-l-[var(--color-primary-500)]',
                      'shadow-[var(--shadow-card)] p-4 min-h-[72px]',
                    )}>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-primary-500)]">Opportunity</p>
                      <p className="mt-1 text-sm font-medium text-[var(--color-text-secondary)] line-clamp-2">{summary.topOpportunity}</p>
                    </div>
                  )}

                  {/* Quick totals */}
                  {hasBundles && (
                    <div className={cn(
                      'rounded-[var(--radius-card)] bg-[var(--color-surface)]',
                      'border border-[var(--color-border-subtle)]',
                      'shadow-[var(--shadow-card)] p-4 flex-1',
                    )}>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Period Totals</p>
                      <div className="mt-3 flex flex-col gap-2.5">
                        {[
                          { label: 'Revenue', value: formatCurrency(bundles.reduce((s, b) => s + (b.totalRevenue ?? 0), 0)) },
                          { label: 'Profit', value: formatCurrency(bundles.reduce((s, b) => s + (b.profit ?? 0), 0)) },
                          { label: 'Costs', value: formatCurrency(bundles.reduce((s, b) => s + (b.costs ?? 0), 0)) },
                        ].map(m => (
                          <div key={m.label} className="flex items-center justify-between">
                            <span className="text-xs font-medium text-[var(--color-text-muted)]">{m.label}</span>
                            <span className="text-sm font-bold tabular-nums text-[var(--color-text-primary)]">{m.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* ── 6. Bundle Cards ── */}
          {hasBundles && (
            <motion.div custom={5} variants={fadeInUp}>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-card-title">Bundles</h2>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                {bundles.map(bundle => (
                  <BundleCard key={bundle.id} bundle={bundle} />
                ))}
              </div>
            </motion.div>
          )}

          {/* ── 7. Bundle Comparison (8) + Performance Summary (4) ── */}
          {hasBundles && bundles.length > 1 && (
            <motion.div custom={6} variants={fadeInUp}>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
                <div className="md:col-span-8">
                  <BundleComparisonChart bundles={bundles} />
                </div>
                <div className="md:col-span-4">
                  <PerformanceSummary bundles={bundles} />
                </div>
              </div>
            </motion.div>
          )}

          {/* ── 8. Operational Insights ── */}
          {typedInsights.length > 0 && (
            <motion.div custom={7} variants={fadeInUp}>
              <h2 className="text-card-title mb-3">Insights</h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {typedInsights.map((insight, i) => (
                  <InsightCard key={i} {...insight} />
                ))}
              </div>
            </motion.div>
          )}

        </div>
      </div>
    </motion.div>
  )
}

/* ── Page ── */
export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-[var(--color-app-bg)]">
      <TopContextBar title="Dashboard" subtitle="Network overview and key metrics" showExport showCompare />
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent />
      </Suspense>
    </div>
  )
}
