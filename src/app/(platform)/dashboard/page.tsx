'use client'

import { Suspense } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { fadeInUp, staggerContainer } from '@/lib/motion'
import Link from 'next/link'
import { TopContextBar } from '@/components/layout/topbar'
import { KPICard } from '@/components/shared/kpi-card'
import { ChartCard } from '@/components/shared/chart-card'
import { InsightCard } from '@/components/shared/insight-card'
import { HealthBadge } from '@/components/shared/health-badge'
import { MetricDelta } from '@/components/shared/delta-indicator'
import { SignalStrip } from '@/components/shared/signal-strip'
import { KPICardSkeleton, ChartSkeleton } from '@/components/shared/loading-skeleton'
import { RevenueTrendChart } from '@/components/features/charts/revenue-trend-chart'
import { TrafficTrendChart } from '@/components/features/charts/traffic-trend-chart'
import { ProfitTrendChart } from '@/components/features/charts/profit-trend-chart'
import { useDashboard } from '@/hooks/use-api'
import { usePeriod } from '@/hooks/use-period'
import { formatCurrency, formatCompact } from '@/lib/utils'
import { ChevronRight } from 'lucide-react'
import type { AnomalySeverity } from '@/types'

// Primary KPI labels (first row) — order matters
const PRIMARY_KPIS = ['Visitors', 'Ad Revenue', 'Total Revenue', 'Profit', 'ROMI']
const SECONDARY_KPIS = ['Ad Requests', 'Affiliate Revenue', 'Costs', 'RPM']

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[16px] border border-dashed border-[#D7DCE5] py-20">
      <p className="text-[14px] text-[#6B7280]">{message}</p>
      <p className="mt-1.5 text-[12px] font-medium text-[#6B7280]">Data will appear after syncing with AdSpyglass</p>
    </div>
  )
}

// Bundle colors for identity accents
const BUNDLE_COLORS: Record<string, string> = {
  JAV: '#EF4444',
  Gays: '#3B82F6',
  Hentai: '#8B5CF6',
  Trans: '#EC4899',
}

type BundleData = {
  id: string; name: string; slug: string; color: string; sitesCount: number;
  hits: number; totalRevenue: number; profit: number; romi: number;
  healthScore?: number; delta?: number
}

type InsightData = {
  entity: string; entitySlug?: string; entityType: string; metric: string;
  value: string; delta?: number; reason: string; action?: string;
  severity: AnomalySeverity; type?: 'risk' | 'opportunity' | 'info' | 'winner' | 'loser'
}

function BundleSummaryCard({ bundle }: { bundle: BundleData }) {
  const accentColor = BUNDLE_COLORS[bundle.name] || bundle.color

  return (
    <Link
      href={`/bundles/${bundle.slug}`}
      className="group block overflow-hidden rounded-[16px] border border-[#E5E7EB] bg-white p-5 shadow-[0_1px_3px_rgba(16,24,40,0.06),0_1px_2px_rgba(16,24,40,0.04)] transition-all duration-150 hover:-translate-y-px hover:shadow-[0_4px_10px_rgba(16,24,40,0.08),0_2px_4px_rgba(16,24,40,0.04)] hover:border-[#D7DCE5]"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: accentColor }} />
          <span className="text-[15px] font-semibold text-[#111827]">{bundle.name}</span>
        </div>
        <div className="flex items-center gap-2">
          {bundle.healthScore != null && <HealthBadge score={bundle.healthScore} showLabel={true} size="sm" />}
          <ChevronRight className="h-4 w-4 text-[#9CA3AF] transition-transform duration-150 group-hover:translate-x-0.5" />
        </div>
      </div>

      {/* Metrics */}
      <div className="mt-4 grid grid-cols-2 gap-y-3 gap-x-4">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#6B7280]">Ad Requests</span>
          <p className="mt-0.5 text-[16px] font-bold tabular-nums text-[#111827]">{formatCompact(bundle.hits || 0)}</p>
        </div>
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#6B7280]">Revenue</span>
          <p className="mt-0.5 text-[16px] font-bold tabular-nums text-[#111827]">{formatCurrency(bundle.totalRevenue || 0)}</p>
        </div>
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#6B7280]">Profit</span>
          <p className="mt-0.5 text-[16px] font-bold tabular-nums text-[#039855]">
            {formatCurrency(bundle.profit || 0)}
          </p>
        </div>
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#6B7280]">ROMI</span>
          <div className="mt-0.5 flex items-baseline gap-1.5">
            <span className="text-[16px] font-bold tabular-nums text-[#111827]">{(bundle.romi || 0).toFixed(1)}%</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-4 flex items-center justify-between border-t border-[#E5E7EB] pt-3">
        <span className="text-[12px] font-medium text-[#6B7280]">{bundle.sitesCount || 0} sites</span>
        {bundle.delta !== undefined && <MetricDelta value={bundle.delta} />}
      </div>
    </Link>
  )
}

/**
 * Compute 4 typed operational insight cards from bundles + anomalies:
 * 1. Top Opportunity (best performing bundle or biggest gain)
 * 2. Main Risk (highest severity anomaly)
 * 3. Biggest Drop (biggest negative delta)
 * 4. Most Efficient Bundle (best ROMI)
 */
function computeTypedInsights(
  bundles: BundleData[],
  rawInsights: InsightData[]
): InsightData[] {
  const typed: InsightData[] = []

  // 1. Top Opportunity — bundle with biggest positive delta
  if (bundles.length > 0) {
    const bestGain = [...bundles]
      .filter(b => b.delta !== undefined && b.delta > 0)
      .sort((a, b) => (b.delta ?? 0) - (a.delta ?? 0))[0]

    if (bestGain) {
      typed.push({
        entity: bestGain.name,
        entityType: 'bundle',
        metric: 'Revenue Growth',
        value: formatCurrency(bestGain.totalRevenue),
        delta: bestGain.delta,
        reason: `${bestGain.name} is the fastest growing bundle. Consider allocating more traffic.`,
        action: `View ${bestGain.name} details`,
        actionHref: `/bundles/${bestGain.slug}`,
        severity: 'low' as AnomalySeverity,
        type: 'opportunity',
      } as InsightData)
    }
  }

  // 2. Main Risk — highest severity anomaly
  const sortedRisks = [...rawInsights]
    .filter(i => i.type === 'risk')
    .sort((a, b) => {
      const w: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 }
      return (w[b.severity] || 0) - (w[a.severity] || 0)
    })
  if (sortedRisks.length > 0) {
    typed.push({ ...sortedRisks[0], type: 'risk' })
  }

  // 3. Biggest Drop — bundle with most negative delta
  if (bundles.length > 0) {
    const worstDrop = [...bundles]
      .filter(b => b.delta !== undefined && b.delta < 0)
      .sort((a, b) => (a.delta ?? 0) - (b.delta ?? 0))[0]

    if (worstDrop) {
      typed.push({
        entity: worstDrop.name,
        entityType: 'bundle',
        metric: 'Revenue Decline',
        value: formatCurrency(worstDrop.totalRevenue),
        delta: worstDrop.delta,
        reason: `${worstDrop.name} revenue declined significantly. Check traffic sources and site health.`,
        action: `Investigate ${worstDrop.name}`,
        actionHref: `/bundles/${worstDrop.slug}`,
        severity: (worstDrop.delta ?? 0) < -20 ? 'high' : 'medium',
        type: 'loser',
      } as InsightData & { actionHref: string })
    }
  }

  // 4. Most Efficient Bundle — best ROMI
  if (bundles.length > 0) {
    const bestRomi = [...bundles].sort((a, b) => b.romi - a.romi)[0]
    if (bestRomi && bestRomi.romi > 0) {
      typed.push({
        entity: bestRomi.name,
        entityType: 'bundle',
        metric: 'ROMI',
        value: `${bestRomi.romi.toFixed(1)}%`,
        delta: bestRomi.delta,
        reason: `Best return on investment: ${formatCurrency(bestRomi.profit)} profit from ${formatCurrency(bestRomi.totalRevenue)} revenue.`,
        action: `View ${bestRomi.name} performance`,
        actionHref: `/bundles/${bestRomi.slug}`,
        severity: 'low' as AnomalySeverity,
        type: 'winner',
      } as InsightData & { actionHref: string })
    }
  }

  return typed
}

/** Fade-in wrapper for chart sections that animate from skeleton */
function ChartFadeIn({ children }: { children: React.ReactNode }) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}

function DashboardSkeleton() {
  return (
    <div className="mx-auto max-w-[1600px] space-y-8 px-6 py-6">
      <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => <KPICardSkeleton key={i} />)}
      </div>
      <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <KPICardSkeleton key={i} />)}
      </div>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        <ChartSkeleton />
        <ChartSkeleton />
        <ChartSkeleton />
      </div>
    </div>
  )
}

function DashboardContent() {
  const { period, compare } = usePeriod()
  const { data, isLoading } = useDashboard(period, compare)

  if (isLoading || !data) {
    return <DashboardSkeleton />
  }

  const hasKpis = data.kpis && data.kpis.length > 0
  const hasBundles = data.bundles && data.bundles.length > 0
  const hasTrend = data.trend && data.trend.length > 0
  const hasInsights = data.insights && data.insights.length > 0

  if (!hasKpis && !hasBundles && !hasTrend) {
    return (
      <div className="mx-auto max-w-[1600px] px-6 py-8">
        <EmptyState message="No data available yet" />
      </div>
    )
  }

  // Split KPIs into primary and secondary rows
  const allKpis = data.kpis as Array<{ label: string; value: number; delta?: number; format: 'currency' | 'number' | 'percent' | 'score' | 'compact'; trend?: number[] }>
  const primaryKpis = PRIMARY_KPIS.map(label => allKpis.find(k => k.label === label)).filter(Boolean)
  const secondaryKpis = SECONDARY_KPIS.map(label => allKpis.find(k => k.label === label)).filter(Boolean)

  // Compute 4 typed operational insights from bundles + anomalies
  const typedInsights = computeTypedInsights(
    data.bundles || [],
    data.insights || []
  )

  // Compare mode label for display
  const compareLabel = compare === 'prev_7d' ? 'vs 7d ago' : compare === 'prev_day' ? 'vs yesterday' : 'vs prev period'

  return (
    <motion.div
      className="mx-auto max-w-[1600px] space-y-8 overflow-hidden px-6 py-6 pb-8"
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
    >
      {/* === KPI Section === */}
      {hasKpis && (
        <div className="space-y-5">
          {/* Primary KPI Row */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {primaryKpis.map((kpi, i) => (
              <motion.div key={kpi!.label} custom={i} variants={fadeInUp}>
                <KPICard {...kpi!} />
              </motion.div>
            ))}
          </div>
          {/* Secondary KPI Row */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {secondaryKpis.map((kpi, i) => (
              <motion.div key={kpi!.label} custom={i + 5} variants={fadeInUp}>
                <KPICard {...kpi!} />
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* === Network Signals Strip === */}
      {(hasBundles || hasInsights) && (
        <motion.div custom={9} variants={fadeInUp}>
          <SignalStrip
            bundles={data.bundles || []}
            insights={data.insights || []}
          />
        </motion.div>
      )}

      {/* === Trends Section === */}
      {hasTrend && (
        <div>
          <h2 className="mb-5 text-[20px] font-semibold text-[#111827]">Trends</h2>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            <motion.div custom={10} variants={fadeInUp}>
              <ChartFadeIn>
                <ChartCard title="Revenue Trend" description={`${data.trend.length} days \u00B7 ${compareLabel}`}>
                  <RevenueTrendChart data={data.trend} />
                </ChartCard>
              </ChartFadeIn>
            </motion.div>
            <motion.div custom={11} variants={fadeInUp}>
              <ChartFadeIn>
                <ChartCard title="Traffic Trend" description={`${data.trend.length} days \u00B7 ${compareLabel}`}>
                  <TrafficTrendChart data={data.trend} />
                </ChartCard>
              </ChartFadeIn>
            </motion.div>
            <motion.div custom={12} variants={fadeInUp}>
              <ChartFadeIn>
                <ChartCard title="Profit Trend" description={`${data.trend.length} days \u00B7 ${compareLabel}`}>
                  <ProfitTrendChart data={data.trend} />
                </ChartCard>
              </ChartFadeIn>
            </motion.div>
          </div>
        </div>
      )}

      {/* === Bundles Section === */}
      {hasBundles && (
        <div>
          <h2 className="mb-5 text-[20px] font-semibold text-[#111827]">Bundles</h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {data.bundles.map((bundle: BundleData, i: number) => (
              <motion.div key={bundle.id} custom={i + 13} variants={fadeInUp} className="min-w-0">
                <BundleSummaryCard bundle={bundle} />
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* === Operational Insights (4 typed cards) === */}
      {typedInsights.length > 0 && (
        <div>
          <h2 className="mb-5 text-[20px] font-semibold text-[#111827]">Operational Insights</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {typedInsights.map((insight, i) => (
              <motion.div key={i} custom={i + 17} variants={fadeInUp}>
                <InsightCard {...insight} />
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* === Additional Anomalies (if any beyond typed insights) === */}
      {hasInsights && data.insights.length > 0 && (
        <div>
          <h2 className="mb-5 text-[20px] font-semibold text-[#111827]">Recent Anomalies</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {data.insights.slice(0, 6).map((insight: InsightData, i: number) => (
              <motion.div key={i} custom={i + 21} variants={fadeInUp}>
                <InsightCard {...insight} />
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  )
}

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-[#F6F8FB]">
      <TopContextBar title="Dashboard" subtitle="Network overview and key metrics" showExport showCompare />
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent />
      </Suspense>
    </div>
  )
}
