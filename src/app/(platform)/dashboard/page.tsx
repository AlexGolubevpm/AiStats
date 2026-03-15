'use client'

import { Suspense } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { TopContextBar } from '@/components/layout/topbar'
import { KPICard } from '@/components/shared/kpi-card'
import { ChartCard } from '@/components/shared/chart-card'
import { InsightCard } from '@/components/shared/insight-card'
import { HealthBadge } from '@/components/shared/health-badge'
import { MetricDelta } from '@/components/shared/delta-indicator'
import { KPICardSkeleton, ChartSkeleton, PageSkeleton } from '@/components/shared/loading-skeleton'
import { RevenueTrendChart } from '@/components/features/charts/revenue-trend-chart'
import { TrafficTrendChart } from '@/components/features/charts/traffic-trend-chart'
import { ProfitTrendChart } from '@/components/features/charts/profit-trend-chart'
import { useDashboard } from '@/hooks/use-api'
import { usePeriod } from '@/hooks/use-period'
import { formatCurrency, formatCompact } from '@/lib/utils'
import { ChevronRight } from 'lucide-react'

const fadeIn = {
  hidden: { opacity: 0, y: 8 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.18, delay: i * 0.04 },
  }),
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[var(--radius-card)] border border-dashed border-[var(--color-border-default)] py-20">
      <p className="text-[14px] text-[var(--color-text-muted)]">{message}</p>
      <p className="mt-1.5 text-meta">Data will appear after syncing with AdSpyglass</p>
    </div>
  )
}

function BundleSummaryCard({ bundle }: { bundle: { id: string; name: string; slug: string; color: string; sitesCount: number; users: number; totalRevenue: number; profit: number; romi: number; healthScore?: number; delta?: number } }) {
  return (
    <Link
      href={`/bundles/${bundle.slug}`}
      className="group rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-card)] transition-all duration-150 hover:-translate-y-px hover:shadow-[var(--shadow-elevated)]"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: bundle.color }} />
          <span className="text-[15px] font-semibold text-[var(--color-text-primary)]">{bundle.name}</span>
        </div>
        <div className="flex items-center gap-2">
          {bundle.healthScore != null && <HealthBadge score={bundle.healthScore} showLabel={false} />}
          <ChevronRight className="h-4 w-4 text-[var(--color-text-disabled)] transition-transform group-hover:translate-x-0.5" />
        </div>
      </div>

      {/* Metrics */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div>
          <span className="text-meta">Traffic</span>
          <p className="mt-0.5 text-[16px] font-semibold tabular-nums">{formatCompact(bundle.users || 0)}</p>
        </div>
        <div>
          <span className="text-meta">Revenue</span>
          <p className="mt-0.5 text-[16px] font-semibold tabular-nums">{formatCurrency(bundle.totalRevenue || 0)}</p>
        </div>
        <div>
          <span className="text-meta">Profit</span>
          <p className="mt-0.5 text-[16px] font-semibold tabular-nums text-[var(--color-success-dark)]">
            {formatCurrency(bundle.profit || 0)}
          </p>
        </div>
        <div>
          <span className="text-meta">ROMI</span>
          <div className="mt-0.5 flex items-baseline gap-1.5">
            <span className="text-[16px] font-semibold tabular-nums">{(bundle.romi || 0).toFixed(1)}%</span>
            {bundle.delta !== undefined && <MetricDelta value={bundle.delta} />}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-3 border-t border-[var(--color-border-subtle)] pt-3">
        <span className="text-meta">{bundle.sitesCount || 0} sites</span>
      </div>
    </Link>
  )
}

function DashboardContent() {
  const { period } = usePeriod()
  const { data, isLoading } = useDashboard(period)

  if (isLoading || !data) {
    return <PageSkeleton />
  }

  const hasKpis = data.kpis && data.kpis.length > 0
  const hasBundles = data.bundles && data.bundles.length > 0
  const hasTrend = data.trend && data.trend.length > 0
  const hasInsights = data.insights && data.insights.length > 0

  if (!hasKpis && !hasBundles && !hasTrend) {
    return (
      <div className="px-6 py-8">
        <EmptyState message="No data available yet" />
      </div>
    )
  }

  return (
    <motion.div
      className="space-y-8 px-8 py-8"
      initial="hidden"
      animate="visible"
    >
      {/* KPI Row */}
      {hasKpis && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {data.kpis.slice(0, 5).map((kpi: { label: string; value: number; delta?: number; format: 'currency' | 'number' | 'percent' | 'score' | 'compact'; trend?: number[] }, i: number) => (
            <motion.div key={kpi.label} custom={i} variants={fadeIn}>
              <KPICard {...kpi} />
            </motion.div>
          ))}
        </div>
      )}
      {hasKpis && data.kpis.length > 5 && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {data.kpis.slice(5).map((kpi: { label: string; value: number; delta?: number; format: 'currency' | 'number' | 'percent' | 'score' | 'compact'; trend?: number[] }, i: number) => (
            <motion.div key={kpi.label} custom={i + 5} variants={fadeIn}>
              <KPICard {...kpi} />
            </motion.div>
          ))}
        </div>
      )}

      {/* Trend Layer */}
      {hasTrend && (
        <div>
          <h2 className="text-section-title mb-5">Trends</h2>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <motion.div custom={0} variants={fadeIn}>
              <ChartCard title="Revenue Trend" description={`Last ${period === '30d' ? '30' : '7'} days`}>
                <RevenueTrendChart data={data.trend} />
              </ChartCard>
            </motion.div>
            <motion.div custom={1} variants={fadeIn}>
              <ChartCard title="Traffic Trend" description={`Last ${period === '30d' ? '30' : '7'} days`}>
                <TrafficTrendChart data={data.trend} />
              </ChartCard>
            </motion.div>
            <motion.div custom={2} variants={fadeIn}>
              <ChartCard title="Profit Trend" description={`Last ${period === '30d' ? '30' : '7'} days`}>
                <ProfitTrendChart data={data.trend} />
              </ChartCard>
            </motion.div>
          </div>
        </div>
      )}

      {/* Bundles Overview */}
      {hasBundles && (
        <div>
          <h2 className="text-section-title mb-5">Bundles</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {data.bundles.map((bundle: { id: string; name: string; slug: string; color: string; sitesCount: number; users: number; totalRevenue: number; profit: number; romi: number; healthScore?: number; delta?: number }, i: number) => (
              <motion.div key={bundle.id} custom={i} variants={fadeIn}>
                <BundleSummaryCard bundle={bundle} />
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Operational Insights */}
      {hasInsights && (
        <div>
          <h2 className="text-section-title mb-5">Operational Insights</h2>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {data.insights.map((insight: { entity: string; entityType: string; metric: string; value: string; delta?: number; reason: string; action?: string; severity: 'low' | 'medium' | 'high' | 'critical'; type?: 'risk' | 'opportunity' | 'info' }, i: number) => (
              <motion.div key={i} custom={i} variants={fadeIn}>
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
    <div>
      <TopContextBar title="Dashboard" subtitle="Network overview and key metrics" showExport />
      <Suspense fallback={<PageSkeleton />}>
        <DashboardContent />
      </Suspense>
    </div>
  )
}
