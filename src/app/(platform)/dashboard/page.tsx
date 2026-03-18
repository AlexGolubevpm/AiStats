'use client'

import { Suspense } from 'react'
import { Badge } from '@mantine/core'
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
import { formatCurrency, formatCompact, cn } from '@/lib/utils'
import {
  RiArrowRightSLine,
  RiArrowUpSFill,
  RiArrowDownSFill,
} from '@remixicon/react'
import type { AnomalySeverity } from '@/types'

/* ── Constants ── */
const PRIMARY_KPIS = ['Visitors', 'Ad Revenue', 'Total Revenue', 'Profit', 'ROMI']
const SECONDARY_KPIS = ['Ad Requests', 'Affiliate Revenue', 'Costs', 'RPM']

const BUNDLE_ACCENTS: Record<string, string> = {
  JAV: 'bg-red-500',
  Gays: 'bg-blue-500',
  Hentai: 'bg-violet-500',
  Trans: 'bg-pink-500',
}

/* ── Types ── */
type BundleData = {
  id: string; name: string; slug: string; color: string; sitesCount: number;
  hits: number; totalRevenue: number; profit: number; romi: number;
  healthScore?: number; delta?: number
}

type InsightData = {
  entity: string; entitySlug?: string; entityType: string; metric: string;
  value: string; delta?: number; reason: string; action?: string;
  actionHref?: string; severity: AnomalySeverity;
  type?: 'risk' | 'opportunity' | 'info' | 'winner' | 'loser'
}

/* ── Bundle Card ── */
function BundleCard({ bundle }: { bundle: BundleData }) {
  const accentClass = BUNDLE_ACCENTS[bundle.name] || 'bg-gray-500'
  const isPositive = (bundle.delta ?? 0) >= 0
  const isNegative = (bundle.delta ?? 0) < 0

  return (
    <Link
      href={`/bundles/${bundle.slug}`}
      className={cn(
        'block min-w-[280px] flex-none no-underline',
        'rounded-xl border border-gray-200 bg-white shadow-sm',
        'transition-all duration-200 hover:shadow-md hover:-translate-y-0.5',
      )}
      style={{ color: 'inherit', textDecoration: 'none' }}
    >
      {/* Top accent */}
      <div className={cn('h-[3px] rounded-t-xl', accentClass)} />

      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className={cn('h-2.5 w-2.5 rounded-full', accentClass)} />
            <span className="text-sm font-semibold text-gray-900">{bundle.name}</span>
          </div>
          <div className="flex items-center gap-2">
            {bundle.healthScore != null && <HealthBadge score={bundle.healthScore} showLabel={false} size="sm" />}
            {bundle.delta !== undefined && (
              <span
                className={cn(
                  'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums',
                  isPositive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700',
                )}
              >
                {isPositive ? <RiArrowUpSFill className="size-3" /> : <RiArrowDownSFill className="size-3" />}
                {isPositive ? '+' : ''}{bundle.delta.toFixed(1)}%
              </span>
            )}
            <RiArrowRightSLine className="size-4 text-gray-300" />
          </div>
        </div>

        {/* Metrics 2x2 */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          {[
            { label: 'Ad Requests', value: formatCompact(bundle.hits || 0) },
            { label: 'Revenue', value: formatCurrency(bundle.totalRevenue || 0) },
            { label: 'Profit', value: formatCurrency(bundle.profit || 0), positive: bundle.profit > 0 },
            { label: 'ROMI', value: `${(bundle.romi || 0).toFixed(1)}%` },
          ].map(m => (
            <div key={m.label}>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{m.label}</p>
              <p
                className={cn(
                  'mt-0.5 text-lg font-bold tabular-nums',
                  m.positive === true ? 'text-emerald-600' : m.positive === false ? 'text-red-600' : 'text-gray-900',
                )}
              >
                {m.value}
              </p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
          <span className="text-xs text-gray-400">{bundle.sitesCount || 0} sites</span>
          {bundle.delta !== undefined && <MetricDelta value={bundle.delta} />}
        </div>
      </div>
    </Link>
  )
}

/* ── Compute insights ── */
function computeInsights(bundles: BundleData[], rawInsights: InsightData[]): InsightData[] {
  const typed: InsightData[] = []

  if (bundles.length > 0) {
    const bestGain = [...bundles]
      .filter(b => b.delta !== undefined && b.delta > 0)
      .sort((a, b) => (b.delta ?? 0) - (a.delta ?? 0))[0]

    if (bestGain) {
      typed.push({
        entity: bestGain.name, entityType: 'bundle', metric: 'Revenue Growth',
        value: formatCurrency(bestGain.totalRevenue), delta: bestGain.delta,
        reason: `${bestGain.name} is the fastest growing bundle. Consider allocating more traffic.`,
        action: `View ${bestGain.name} details`, actionHref: `/bundles/${bestGain.slug}`,
        severity: 'low' as AnomalySeverity, type: 'opportunity',
      })
    }
  }

  const sortedRisks = [...rawInsights]
    .filter(i => i.type === 'risk')
    .sort((a, b) => {
      const w: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 }
      return (w[b.severity] || 0) - (w[a.severity] || 0)
    })
  if (sortedRisks.length > 0) typed.push({ ...sortedRisks[0], type: 'risk' })

  if (bundles.length > 0) {
    const worstDrop = [...bundles]
      .filter(b => b.delta !== undefined && b.delta < 0)
      .sort((a, b) => (a.delta ?? 0) - (b.delta ?? 0))[0]

    if (worstDrop) {
      typed.push({
        entity: worstDrop.name, entityType: 'bundle', metric: 'Revenue Decline',
        value: formatCurrency(worstDrop.totalRevenue), delta: worstDrop.delta,
        reason: `${worstDrop.name} revenue declined significantly. Check traffic sources and site health.`,
        action: `Investigate ${worstDrop.name}`, actionHref: `/bundles/${worstDrop.slug}`,
        severity: ((worstDrop.delta ?? 0) < -20 ? 'high' : 'medium') as AnomalySeverity, type: 'loser',
      })
    }

    const bestRomi = [...bundles].sort((a, b) => b.romi - a.romi)[0]
    if (bestRomi && bestRomi.romi > 0) {
      typed.push({
        entity: bestRomi.name, entityType: 'bundle', metric: 'ROMI',
        value: `${bestRomi.romi.toFixed(1)}%`, delta: bestRomi.delta,
        reason: `Best return on investment: ${formatCurrency(bestRomi.profit)} profit from ${formatCurrency(bestRomi.totalRevenue)} revenue.`,
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
    <div className="mx-auto w-full max-w-[1440px] px-6 py-6">
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-1 gap-4 xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => <KPICardSkeleton key={i} />)}
        </div>
        <div className="grid grid-cols-1 gap-4 xs:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <KPICardSkeleton key={i} />)}
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <ChartSkeleton />
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
      </div>
    </div>
  )
}

/* ── Dashboard Content ── */
function DashboardContent() {
  const { period, compare } = usePeriod()
  const { data, isLoading, error } = useDashboard(period, compare)

  if (isLoading) return <DashboardSkeleton />

  if (error || !data) {
    return (
      <div className="mx-auto w-full max-w-[1440px] px-6 py-6">
        <div className="rounded-xl border border-dashed border-red-300 bg-white p-10 text-center">
          <p className="text-sm font-semibold text-red-600">Failed to load dashboard data</p>
          <p className="mt-2 text-xs text-gray-400">
            {error instanceof Error ? error.message : 'Unknown error — check server logs'}
          </p>
        </div>
      </div>
    )
  }

  const hasKpis = data.kpis?.length > 0
  const hasBundles = data.bundles?.length > 0
  const hasTrend = data.trend?.length > 0
  const hasInsights = data.insights?.length > 0

  if (!hasKpis && !hasBundles && !hasTrend) {
    return (
      <div className="mx-auto w-full max-w-[1440px] px-6 py-6">
        <div className="rounded-xl border border-dashed border-gray-200 bg-white p-10 text-center">
          <p className="text-sm text-gray-500">No data available yet</p>
          <p className="mt-2 text-xs text-gray-400">Data will appear after syncing with AdSpyglass</p>
        </div>
      </div>
    )
  }

  const allKpis = data.kpis as Array<{ label: string; value: number; delta?: number; format: 'currency' | 'number' | 'percent' | 'score' | 'compact'; trend?: number[] }>
  const primaryKpis = PRIMARY_KPIS.map(label => allKpis.find(k => k.label === label)).filter(Boolean)
  const secondaryKpis = SECONDARY_KPIS.map(label => allKpis.find(k => k.label === label)).filter(Boolean)
  const typedInsights = computeInsights(data.bundles || [], data.insights || [])
  const compareLabel = compare === 'prev_7d' ? 'vs 7d ago' : compare === 'prev_day' ? 'vs yesterday' : 'vs prev period'

  return (
    <motion.div initial="hidden" animate="visible" variants={staggerContainer}>
      <div className="mx-auto w-full max-w-[1440px] px-6 py-6 pb-12 overflow-hidden">
        <div className="flex flex-col gap-7">

          {/* Coverage indicator */}
          {data.coverage && !data.coverage.complete && data.coverage.syncTriggered && (
            <motion.div custom={0} variants={fadeInUp}>
              <Badge
                variant="light" color="indigo" size="lg" radius="lg"
                styles={{ root: { textTransform: 'none', fontWeight: 500, fontSize: 12 } }}
              >
                Loading historical data for {data.coverage.missingDates} missing days...
              </Badge>
            </motion.div>
          )}

          {/* ── Primary KPIs ── */}
          {hasKpis && (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 gap-4 xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
                {primaryKpis.map((kpi, i) => (
                  <motion.div key={kpi!.label} custom={i} variants={fadeInUp}>
                    <KPICard {...kpi!} />
                  </motion.div>
                ))}
              </div>

              {/* ── Secondary KPIs ── */}
              <div className="grid grid-cols-1 gap-4 xs:grid-cols-2 lg:grid-cols-4">
                {secondaryKpis.map((kpi, i) => (
                  <motion.div key={kpi!.label} custom={i + 5} variants={fadeInUp}>
                    <KPICard {...kpi!} />
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* ── Network Signals ── */}
          {(hasBundles || hasInsights) && (
            <motion.div custom={9} variants={fadeInUp}>
              <SignalStrip bundles={data.bundles || []} insights={data.insights || []} />
            </motion.div>
          )}

          {/* ── Bundle Cards ── */}
          {hasBundles && (
            <div>
              <h2 className="mb-3 text-sm font-semibold text-gray-500">Bundles</h2>
              <div className="flex gap-4 overflow-x-auto pb-1 hide-scrollbar" style={{ scrollbarWidth: 'none' }}>
                {data.bundles.map((bundle: BundleData, i: number) => (
                  <motion.div key={bundle.id} custom={i + 10} variants={fadeInUp}>
                    <BundleCard bundle={bundle} />
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* ── Charts ── */}
          {hasTrend && (
            <div>
              <h2 className="mb-3 text-sm font-semibold text-gray-500">Trends</h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                <motion.div custom={14} variants={fadeInUp}>
                  <AnimatePresence mode="wait">
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
                      <ChartCard title="Revenue" description={`${data.trend.length} days · ${compareLabel}`}>
                        <RevenueTrendChart data={data.trend} />
                      </ChartCard>
                    </motion.div>
                  </AnimatePresence>
                </motion.div>

                <motion.div custom={15} variants={fadeInUp}>
                  <AnimatePresence mode="wait">
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
                      <ChartCard title="Traffic" description={`${data.trend.length} days · ${compareLabel}`}>
                        <TrafficTrendChart data={data.trend} />
                      </ChartCard>
                    </motion.div>
                  </AnimatePresence>
                </motion.div>

                <motion.div custom={16} variants={fadeInUp}>
                  <AnimatePresence mode="wait">
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
                      <ChartCard title="Profit" description={`${data.trend.length} days · ${compareLabel}`}>
                        <ProfitTrendChart data={data.trend} />
                      </ChartCard>
                    </motion.div>
                  </AnimatePresence>
                </motion.div>
              </div>
            </div>
          )}

          {/* ── Operational Insights ── */}
          {typedInsights.length > 0 && (
            <div>
              <h2 className="mb-3 text-sm font-semibold text-gray-500">Insights</h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {typedInsights.map((insight, i) => (
                  <motion.div key={i} custom={i + 17} variants={fadeInUp}>
                    <InsightCard {...insight} />
                  </motion.div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </motion.div>
  )
}

/* ── Page ── */
export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <TopContextBar title="Dashboard" subtitle="Network overview and key metrics" showExport showCompare />
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent />
      </Suspense>
    </div>
  )
}
