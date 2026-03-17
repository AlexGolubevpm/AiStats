'use client'

import { Suspense } from 'react'
import { motion } from 'framer-motion'
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

function BundleSummaryCard({ bundle }: { bundle: { id: string; name: string; slug: string; color: string; sitesCount: number; hits: number; totalRevenue: number; profit: number; romi: number; healthScore?: number; delta?: number } }) {
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
          {bundle.healthScore != null && <HealthBadge score={bundle.healthScore} showLabel={false} />}
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

function DashboardSkeleton() {
  return (
    <div className="mx-auto max-w-[1600px] space-y-8 px-6 py-6">
      {/* Primary KPIs */}
      <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => <KPICardSkeleton key={i} />)}
      </div>
      {/* Secondary KPIs */}
      <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <KPICardSkeleton key={i} />)}
      </div>
      {/* Charts */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        <ChartSkeleton />
        <ChartSkeleton />
        <ChartSkeleton />
      </div>
    </div>
  )
}

function DashboardContent() {
  const { period } = usePeriod()
  const { data, isLoading } = useDashboard(period)

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
              <ChartCard title="Revenue Trend" description={`${data.trend.length} days`}>
                <RevenueTrendChart data={data.trend} />
              </ChartCard>
            </motion.div>
            <motion.div custom={11} variants={fadeInUp}>
              <ChartCard title="Traffic Trend" description={`${data.trend.length} days`}>
                <TrafficTrendChart data={data.trend} />
              </ChartCard>
            </motion.div>
            <motion.div custom={12} variants={fadeInUp}>
              <ChartCard title="Profit Trend" description={`${data.trend.length} days`}>
                <ProfitTrendChart data={data.trend} />
              </ChartCard>
            </motion.div>
          </div>
        </div>
      )}

      {/* === Bundles Section === */}
      {hasBundles && (
        <div>
          <h2 className="mb-5 text-[20px] font-semibold text-[#111827]">Bundles</h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {data.bundles.map((bundle: { id: string; name: string; slug: string; color: string; sitesCount: number; hits: number; totalRevenue: number; profit: number; romi: number; healthScore?: number; delta?: number }, i: number) => (
              <motion.div key={bundle.id} custom={i + 13} variants={fadeInUp} className="min-w-0">
                <BundleSummaryCard bundle={bundle} />
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* === Operational Insights === */}
      {hasInsights && (
        <div>
          <h2 className="mb-5 text-[20px] font-semibold text-[#111827]">Operational Insights</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {data.insights.map((insight: { entity: string; entityType: string; metric: string; value: string; delta?: number; reason: string; action?: string; severity: 'low' | 'medium' | 'high' | 'critical'; type?: 'risk' | 'opportunity' | 'info' }, i: number) => (
              <motion.div key={i} custom={i + 17} variants={fadeInUp}>
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
