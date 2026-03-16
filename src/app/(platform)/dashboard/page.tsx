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
import { ErrorState } from '@/components/shared/error-state'
import { RevenueTrendChart } from '@/components/features/charts/revenue-trend-chart'
import { TrafficTrendChart } from '@/components/features/charts/traffic-trend-chart'
import { ProfitTrendChart } from '@/components/features/charts/profit-trend-chart'
import { useDashboard } from '@/hooks/use-api'
import { usePeriod } from '@/hooks/use-period'
import { formatCurrency, formatCompact, formatRPM, downloadCSV } from '@/lib/utils'
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
      <div className="mb-3 text-4xl opacity-30">📊</div>
      <p className="text-[14px] font-medium text-[var(--color-text-primary)]">{message}</p>
      <p className="mt-1.5 text-meta max-w-sm text-center">Click the &ldquo;Sync&rdquo; button in the top bar to pull data from AdSpyglass and Yandex Metrica</p>
    </div>
  )
}

function BundleSummaryCard({ bundle }: { bundle: { id: string; name: string; slug: string; color: string; sitesCount: number; users: number; totalRevenue: number; profit: number; romi: number; rpm: number; costs: number; healthScore?: number; delta?: number } }) {
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
          <span className="text-meta">{bundle.costs > 0 ? 'Profit' : 'RPM'}</span>
          <p className="mt-0.5 text-[16px] font-semibold tabular-nums text-[var(--color-success-dark)]">
            {bundle.costs > 0 ? formatCurrency(bundle.profit || 0) : formatRPM(bundle.rpm || 0)}
          </p>
        </div>
        <div>
          <span className="text-meta">ROMI</span>
          <div className="mt-0.5 flex items-baseline gap-1.5">
            {bundle.costs > 0 ? (
              <>
                <span className="text-[16px] font-semibold tabular-nums">{(bundle.romi || 0).toFixed(1)}%</span>
                {bundle.delta !== undefined && <MetricDelta value={bundle.delta} />}
              </>
            ) : (
              <span className="text-[14px] text-[var(--color-text-disabled)]">N/A</span>
            )}
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

function handleDashboardExport(data: { kpis?: { label: string; value: number }[]; bundles?: { name: string; users: number; totalRevenue: number; profit: number; romi: number }[]; trend?: { date: string; adRevenue: number; totalRevenue: number; costs: number; profit: number }[] }) {
  if (data?.trend?.length) {
    downloadCSV(data.trend, `dashboard-trend-${new Date().toISOString().slice(0, 10)}`)
  } else if (data?.bundles?.length) {
    downloadCSV(data.bundles, `dashboard-bundles-${new Date().toISOString().slice(0, 10)}`)
  }
}

function DashboardContent() {
  const { period } = usePeriod()
  const { data, isLoading, error } = useDashboard(period)

  if (isLoading) {
    return <PageSkeleton />
  }

  if (error || !data) {
    return <div className="px-6 py-8"><ErrorState /></div>
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

  const dataSources = data.dataSources as { adspyglass?: boolean; yandex?: boolean; googleSheets?: boolean } | undefined

  return (
    <motion.div
      className="space-y-8 px-8 py-8"
      initial="hidden"
      animate="visible"
    >
      {/* Data Sources Status */}
      {dataSources && (
        <div className="flex items-center gap-4 text-[12px]">
          <span className="font-medium text-[var(--color-text-muted)]">Data sources:</span>
          <span className={`flex items-center gap-1.5 ${dataSources.adspyglass ? 'text-[var(--color-success-dark)]' : 'text-[var(--color-text-disabled)]'}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${dataSources.adspyglass ? 'bg-[var(--color-success)]' : 'bg-[var(--color-text-disabled)]'}`} />
            AdSpyglass
          </span>
          <span className={`flex items-center gap-1.5 ${dataSources.yandex ? 'text-[var(--color-success-dark)]' : 'text-[var(--color-text-disabled)]'}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${dataSources.yandex ? 'bg-[var(--color-success)]' : 'bg-[var(--color-text-disabled)]'}`} />
            Yandex Metrica
          </span>
          <span className={`flex items-center gap-1.5 ${dataSources.googleSheets ? 'text-[var(--color-success-dark)]' : 'text-[var(--color-text-disabled)]'}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${dataSources.googleSheets ? 'bg-[var(--color-success)]' : 'bg-[var(--color-text-disabled)]'}`} />
            Google Sheets
          </span>
        </div>
      )}
      {/* KPI Row */}
      {hasKpis && (
        <div className={`grid gap-4 ${
          data.kpis.length <= 3
            ? 'grid-cols-1 md:grid-cols-3'
            : data.kpis.length <= 4
              ? 'grid-cols-2 md:grid-cols-4'
              : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
        }`}>
          {data.kpis.map((kpi: { label: string; value: number; delta?: number; format: 'currency' | 'number' | 'percent' | 'score' | 'compact'; trend?: number[] }, i: number) => (
            <motion.div key={kpi.label} custom={i} variants={fadeIn}>
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
            {data.bundles.map((bundle: { id: string; name: string; slug: string; color: string; sitesCount: number; users: number; totalRevenue: number; profit: number; romi: number; rpm: number; costs: number; healthScore?: number; delta?: number }, i: number) => (
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

function DashboardPageInner() {
  const { period } = usePeriod()
  const { data } = useDashboard(period)

  return (
    <div>
      <TopContextBar
        title="Dashboard"
        subtitle="Network overview and key metrics"
        showExport
        onExport={() => data && handleDashboardExport(data)}
      />
      <DashboardContent />
    </div>
  )
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <DashboardPageInner />
    </Suspense>
  )
}
