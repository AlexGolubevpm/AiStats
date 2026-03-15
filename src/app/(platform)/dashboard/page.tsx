'use client'

import { Suspense } from 'react'
import { Topbar } from '@/components/layout/topbar'
import { KPICard } from '@/components/shared/kpi-card'
import { ChartCard } from '@/components/shared/chart-card'
import { InsightCard } from '@/components/shared/insight-card'
import { KPICardSkeleton, ChartSkeleton } from '@/components/shared/loading-skeleton'
import { RevenueTrendChart } from '@/components/features/charts/revenue-trend-chart'
import { TrafficTrendChart } from '@/components/features/charts/traffic-trend-chart'
import { useDashboard } from '@/hooks/use-api'
import { usePeriod } from '@/hooks/use-period'
import Link from 'next/link'

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] py-16">
      <p className="text-sm text-[var(--color-text-muted)]">{message}</p>
      <p className="mt-1 text-xs text-[var(--color-text-muted)]">Data will appear after syncing with AdSpyglass</p>
    </div>
  )
}

function DashboardContent() {
  const { period } = usePeriod()
  const { data, isLoading } = useDashboard(period)

  if (isLoading || !data) {
    return (
      <div className="space-y-6 p-8">
        <div className="grid grid-cols-3 gap-4 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => <KPICardSkeleton key={i} />)}
        </div>
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <KPICardSkeleton key={i} />)}
        </div>
        <ChartSkeleton />
        <ChartSkeleton />
      </div>
    )
  }

  const hasKpis = data.kpis && data.kpis.length > 0
  const hasBundles = data.bundles && data.bundles.length > 0
  const hasTrend = data.trend && data.trend.length > 0
  const hasInsights = data.insights && data.insights.length > 0

  if (!hasKpis && !hasBundles && !hasTrend) {
    return (
      <div className="p-8">
        <EmptyState message="No data available yet" />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-8">
      {/* KPI Row */}
      {hasKpis && (
        <>
          <div className="grid grid-cols-3 gap-4 xl:grid-cols-5">
            {data.kpis.slice(0, 5).map((kpi: { label: string; value: number; delta?: number; format: 'currency' | 'number' | 'percent' | 'score' | 'compact'; trend?: number[] }) => (
              <KPICard key={kpi.label} {...kpi} />
            ))}
          </div>
          {data.kpis.length > 5 && (
            <div className="grid grid-cols-4 gap-4">
              {data.kpis.slice(5).map((kpi: { label: string; value: number; delta?: number; format: 'currency' | 'number' | 'percent' | 'score' | 'compact'; trend?: number[] }) => (
                <KPICard key={kpi.label} {...kpi} />
              ))}
            </div>
          )}
        </>
      )}

      {/* Bundles Overview */}
      {hasBundles && (
        <ChartCard title="Bundles Overview" description="Performance by bundle">
          <div className="grid grid-cols-4 gap-4">
            {data.bundles.map((bundle: { id: string; name: string; slug: string; color: string; sitesCount: number; users: number; totalRevenue: number; profit: number; romi: number }) => (
              <Link
                key={bundle.id}
                href={`/bundles/${bundle.slug}`}
                className="rounded-[var(--radius-md)] border border-[var(--color-border)] p-4 transition-shadow hover:shadow-[var(--shadow-md)]"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: bundle.color }}
                  />
                  <span className="text-sm font-medium">{bundle.name}</span>
                </div>
                <div className="mt-3 space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-[var(--color-text-muted)]">Sites</span>
                    <span className="tabular-nums">{bundle.sitesCount || 0}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-[var(--color-text-muted)]">Traffic</span>
                    <span className="tabular-nums">{((bundle.users || 0) / 1000).toFixed(0)}K</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-[var(--color-text-muted)]">Revenue</span>
                    <span className="tabular-nums">${(bundle.totalRevenue || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-[var(--color-text-muted)]">Profit</span>
                    <span className="tabular-nums font-medium text-emerald-600">
                      ${(bundle.profit || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-[var(--color-text-muted)]">ROMI</span>
                    <span className="tabular-nums">{(bundle.romi || 0).toFixed(1)}%</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </ChartCard>
      )}

      {/* Charts */}
      {hasTrend && (
        <div className="grid grid-cols-2 gap-5">
          <ChartCard title="Revenue Trend" description={`Last ${period === '30d' ? '30' : '7'} days`}>
            <RevenueTrendChart data={data.trend} />
          </ChartCard>
          <ChartCard title="Traffic Trend" description={`Last ${period === '30d' ? '30' : '7'} days`}>
            <TrafficTrendChart data={data.trend} />
          </ChartCard>
        </div>
      )}

      {/* Operational Insights */}
      {hasInsights && (
        <div>
          <h3 className="mb-3 text-sm font-medium text-[var(--color-text-primary)]">
            Operational Insights
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {data.insights.map((insight: { entity: string; entityType: string; metric: string; value: string; delta?: number; reason: string; action?: string; severity: 'low' | 'medium' | 'high' | 'critical'; type?: 'risk' | 'opportunity' | 'info' }, i: number) => (
              <InsightCard key={i} {...insight} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function DashboardPage() {
  return (
    <div>
      <Topbar title="Dashboard" description="Network overview and key metrics" />
      <Suspense fallback={
        <div className="space-y-6 p-8">
          <div className="grid grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, i) => <KPICardSkeleton key={i} />)}
          </div>
        </div>
      }>
        <DashboardContent />
      </Suspense>
    </div>
  )
}
