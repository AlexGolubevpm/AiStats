'use client'

import { Suspense, useMemo, useRef } from 'react'
import { Badge } from '@mantine/core'
import { motion, useInView } from 'framer-motion'
import { fadeInUp } from '@/lib/motion'
import Link from 'next/link'
import { TopContextBar } from '@/components/layout/topbar'
import { KPICard } from '@/components/shared/kpi-card'
import { InsightCard } from '@/components/shared/insight-card'
import { SignalStrip } from '@/components/shared/signal-strip'
import { DataFreshnessSummary } from '@/components/shared/data-freshness-summary'
import { NetworkHealthCard } from '@/components/shared/network-health-card'
import { BundleCard } from '@/components/features/dashboard/bundle-card'
import { TabbedChart } from '@/components/features/dashboard/tabbed-chart'
import { BundleComparisonChart } from '@/components/features/dashboard/bundle-comparison'
import { PerformanceSummary } from '@/components/features/dashboard/performance-summary'
import { DashboardSkeleton } from '@/components/features/dashboard/dashboard-skeleton'
import { CriticalAlertBanner } from '@/components/features/dashboard/critical-alert-banner'
import { RevenueComposition } from '@/components/features/dashboard/revenue-composition'
import { useDashboard } from '@/hooks/use-api'
import { usePeriod } from '@/hooks/use-period'
import { formatCurrency, cn } from '@/lib/utils'
import { RefreshCw, Database, AlertCircle } from 'lucide-react'
import type { AnomalySeverity } from '@/types'
import type { DashboardKpi, DashboardBundle, DashboardInsight, TrendPoint } from '@/services/dashboard/types'

/* ── pt 24: Section with intersection observer animation ── */
function AnimatedSection({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-40px' })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 10 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
      transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

/* ── pt 5: Section Header ── */
function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-3">
      <h2 className="text-card-title">{title}</h2>
      {subtitle && <p className="mt-0.5 text-xs text-[var(--color-text-disabled)]">{subtitle}</p>}
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

/* ── Hero KPI keys: these get size="hero" (#1) ── */
const HERO_KPI_KEYS = new Set(['total_revenue', 'profit'])

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

  // pt 10: per-bundle trend data from network trends (proportional estimate)
  const bundleTrends = useMemo(() => {
    if (!trends?.revenue || bundles.length === 0) return {}
    const totalRev = bundles.reduce((s, b) => s + (b.totalRevenue ?? 0), 0)
    const result: Record<string, number[]> = {}
    bundles.forEach(b => {
      const share = totalRev > 0 ? (b.totalRevenue ?? 0) / totalRev : 0
      result[b.id] = trends.revenue.map((pt: TrendPoint) => (pt.value ?? 0) * share)
    })
    return result
  }, [trends, bundles])

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-6 pb-16 overflow-hidden sm:px-6">
      <div className="flex flex-col gap-6">

        {/* ── 1. Data Freshness ── */}
        <AnimatedSection>
          <DataFreshnessSummary />
        </AnimatedSection>

        {/* ── Coverage indicator ── */}
        {data.coverage && !data.coverage.complete && data.coverage.syncTriggered && (
          <AnimatedSection>
            <Badge
              variant="light" color="indigo" size="lg" radius="lg"
              styles={{ root: { textTransform: 'none', fontWeight: 500, fontSize: 12 } }}
            >
              Loading historical data for {data.coverage.missingDates} missing days...
            </Badge>
          </AnimatedSection>
        )}

        {/* ── 2. Primary KPIs (#1: hero for key metrics) ── */}
        {primaryKpis.length > 0 && (
          <AnimatedSection>
            <div className="rounded-2xl bg-[var(--color-section-kpi-bg)] p-3 -m-3">
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
                    size={HERO_KPI_KEYS.has(kpi.key) ? 'hero' : 'default'}
                    completeness={kpi.completeness}
                  />
                ))}
              </div>
            </div>
          </AnimatedSection>
        )}

        {/* ── 3. Secondary KPIs (#2: compact size) ── */}
        {secondaryKpis.length > 0 && (
          <AnimatedSection>
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
                  size="compact"
                  completeness={kpi.completeness}
                />
              ))}
            </div>
          </AnimatedSection>
        )}

        {/* ── 3.5. Critical Alert Banner (#4) ── */}
        {insights.length > 0 && (
          <AnimatedSection>
            <CriticalAlertBanner insights={insights} />
          </AnimatedSection>
        )}

        {/* ── 4. Network Signals ── */}
        {(hasBundles || insights.length > 0) && (
          <AnimatedSection>
            <SignalStrip bundles={signalBundles} insights={signalInsights} />
          </AnimatedSection>
        )}

        {/* ── 5. Analytics Canvas: TabbedChart (8) + Sidebar (4) ── */}
        {hasTrends && (
          <AnimatedSection>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
              {/* Main chart (#6: comparison overlay, #12: tab animation, #23: responsive height) */}
              <div className="md:col-span-8">
                <TabbedChart trends={trends} compareTrends={data.compareTrends} dayCount={dayCount} compareLabel={compareLabel} />
              </div>

              {/* Sidebar analytics */}
              <div className="md:col-span-4 flex flex-col gap-3">
                <NetworkHealthCard
                  score={networkHealthScore}
                  unhealthyCount={unhealthyCount}
                  totalBundles={bundles.length}
                  confidence={summary?.networkHealthConfidence === 'high' ? 'full' : summary?.networkHealthConfidence === 'medium' ? 'partial' : 'low'}
                />

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

                {/* pt 3: Revenue Composition instead of Period Totals */}
                {hasBundles && <RevenueComposition bundles={bundles} />}
              </div>
            </div>
          </AnimatedSection>
        )}

        {/* ── 6. Bundle Cards (#5: section header, #10: mini sparklines, #19: hover preview) ── */}
        {hasBundles && (
          <AnimatedSection>
            <SectionHeader title="Bundles" subtitle="Performance by content vertical" />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              {bundles.map(bundle => (
                <BundleCard key={bundle.id} bundle={bundle} trendData={bundleTrends[bundle.id]} />
              ))}
            </div>
          </AnimatedSection>
        )}

        {/* ── 7. Bundle Comparison + Performance Summary ── */}
        {hasBundles && bundles.length > 1 && (
          <AnimatedSection>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
              <div className="md:col-span-8">
                <BundleComparisonChart bundles={bundles} />
              </div>
              <div className="md:col-span-4">
                <PerformanceSummary bundles={bundles} />
              </div>
            </div>
          </AnimatedSection>
        )}

        {/* ── 8. Operational Insights (#5: section header, #15: section tint) ── */}
        {typedInsights.length > 0 && (
          <AnimatedSection>
            <div className={cn(
              'rounded-2xl p-4 -mx-1',
              typedInsights.some(i => i.severity === 'critical' || i.severity === 'high')
                ? 'bg-[var(--color-section-insights-risk-bg)]'
                : 'bg-[var(--color-section-insights-bg)]',
            )}>
              <SectionHeader title="Insights" subtitle="Automated anomaly detection and recommendations" />
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {typedInsights.map((insight, i) => (
                  <InsightCard key={i} {...insight} />
                ))}
              </div>
            </div>
          </AnimatedSection>
        )}

      </div>
    </div>
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
