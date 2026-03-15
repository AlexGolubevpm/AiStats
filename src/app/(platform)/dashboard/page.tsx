'use client'

import { Suspense } from 'react'
import { Topbar } from '@/components/layout/topbar'
import { KPICard } from '@/components/shared/kpi-card'
import { ChartCard } from '@/components/shared/chart-card'
import { InsightCard } from '@/components/shared/insight-card'
import { HealthBadge } from '@/components/shared/health-badge'
import { KPICardSkeleton, ChartSkeleton } from '@/components/shared/loading-skeleton'
import { RevenueTrendChart } from '@/components/features/charts/revenue-trend-chart'
import { TrafficTrendChart } from '@/components/features/charts/traffic-trend-chart'
import { useDashboard } from '@/hooks/use-api'
import { usePeriod } from '@/hooks/use-period'
import Link from 'next/link'

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

  return (
    <div className="space-y-6 p-8">
      {/* KPI Row */}
      <div className="grid grid-cols-3 gap-4 xl:grid-cols-5">
        {data.kpis.slice(0, 5).map((kpi: { label: string; value: number; delta?: number; format: 'currency' | 'number' | 'percent' | 'score' | 'compact'; trend?: number[] }) => (
          <KPICard key={kpi.label} {...kpi} />
        ))}
      </div>
      <div className="grid grid-cols-4 gap-4">
        {data.kpis.slice(5).map((kpi: { label: string; value: number; delta?: number; format: 'currency' | 'number' | 'percent' | 'score' | 'compact'; trend?: number[] }) => (
          <KPICard key={kpi.label} {...kpi} />
        ))}
      </div>

      {/* Bundles Overview */}
      <ChartCard title="Bundles Overview" description="Performance by bundle">
        <div className="grid grid-cols-4 gap-4">
          {data.bundles.map((bundle: { id: string; name: string; slug: string; color: string; sites: number; traffic: number; revenue: number; profit: number; romi: number; health: number }) => (
            <Link
              key={bundle.name}
              href={`/bundles/${bundle.slug}`}
              className="rounded-[var(--radius-md)] border border-[var(--color-border)] p-4 transition-shadow hover:shadow-[var(--shadow-md)]"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: bundle.color }}
                  />
                  <span className="text-sm font-medium">{bundle.name}</span>
                </div>
                <HealthBadge score={bundle.health} showLabel={false} />
              </div>
              <div className="mt-3 space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-[var(--color-text-muted)]">Sites</span>
                  <span className="tabular-nums">{bundle.sites}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-[var(--color-text-muted)]">Traffic</span>
                  <span className="tabular-nums">{(bundle.traffic / 1000).toFixed(0)}K</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-[var(--color-text-muted)]">Revenue</span>
                  <span className="tabular-nums">${bundle.revenue.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-[var(--color-text-muted)]">Profit</span>
                  <span className="tabular-nums font-medium text-emerald-600">
                    ${bundle.profit.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-[var(--color-text-muted)]">ROMI</span>
                  <span className="tabular-nums">{bundle.romi}%</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </ChartCard>

      {/* Charts */}
      {data.trend && (
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
      {data.insights && data.insights.length > 0 && (
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
