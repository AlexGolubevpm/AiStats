'use client'

import { use, Suspense } from 'react'
import * as Tabs from '@radix-ui/react-tabs'
import { Topbar } from '@/components/layout/topbar'
import { KPICard } from '@/components/shared/kpi-card'
import { ChartCard } from '@/components/shared/chart-card'
import { HealthBadge } from '@/components/shared/health-badge'
import { InsightCard } from '@/components/shared/insight-card'
import { KPICardSkeleton, ChartSkeleton } from '@/components/shared/loading-skeleton'
import { RevenueTrendChart } from '@/components/features/charts/revenue-trend-chart'
import { TrafficTrendChart } from '@/components/features/charts/traffic-trend-chart'
import { ProfitTrendChart } from '@/components/features/charts/profit-trend-chart'
import { FormatBreakdownChart } from '@/components/features/charts/format-breakdown-chart'
import { TierBreakdownChart } from '@/components/features/charts/tier-breakdown-chart'
import { CostTrendChart } from '@/components/features/charts/cost-trend-chart'
import { DataTable } from '@/components/features/data-table'
import { useSite } from '@/hooks/use-api'
import { usePeriod } from '@/hooks/use-period'
import type { ColumnDef } from '@tanstack/react-table'

const tabTriggerClass = 'px-4 py-2.5 text-sm font-medium transition-colors text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] data-[state=active]:border-b-2 data-[state=active]:border-[var(--color-accent)] data-[state=active]:text-[var(--color-accent)]'

interface FormatRow { format: string; impressions: number; clicks: number; ctr: number; revenue: number; fillRate: number; rpm: number }
interface TierRow { tier: string; users: number; impressions: number; revenue: number; ctr: number; rpm: number }
interface CostRow { date: string; amount: number }

const formatColumns: ColumnDef<FormatRow, unknown>[] = [
  { accessorKey: 'format', header: 'Format' },
  { accessorKey: 'impressions', header: 'Impressions', cell: ({ row }) => row.original.impressions.toLocaleString() },
  { accessorKey: 'clicks', header: 'Clicks', cell: ({ row }) => row.original.clicks.toLocaleString() },
  { accessorKey: 'ctr', header: 'CTR', cell: ({ row }) => `${(row.original.ctr * 100).toFixed(2)}%` },
  { accessorKey: 'revenue', header: 'Revenue', cell: ({ row }) => `$${row.original.revenue.toFixed(2)}` },
  { accessorKey: 'fillRate', header: 'Fill Rate', cell: ({ row }) => `${(row.original.fillRate * 100).toFixed(1)}%` },
  { accessorKey: 'rpm', header: 'RPM', cell: ({ row }) => `$${row.original.rpm.toFixed(2)}` },
]

const tierColumns: ColumnDef<TierRow, unknown>[] = [
  { accessorKey: 'tier', header: 'Tier', cell: ({ row }) => row.original.tier.replace('TIER_', 'Tier ') },
  { accessorKey: 'users', header: 'Users', cell: ({ row }) => row.original.users.toLocaleString() },
  { accessorKey: 'impressions', header: 'Impressions', cell: ({ row }) => row.original.impressions.toLocaleString() },
  { accessorKey: 'revenue', header: 'Revenue', cell: ({ row }) => `$${row.original.revenue.toFixed(2)}` },
  { accessorKey: 'ctr', header: 'CTR', cell: ({ row }) => `${(row.original.ctr * 100).toFixed(2)}%` },
  { accessorKey: 'rpm', header: 'RPM', cell: ({ row }) => `$${row.original.rpm.toFixed(2)}` },
]

function SiteDetailContent({ id }: { id: string }) {
  const { period } = usePeriod()
  const { data, isLoading } = useSite(id, period)

  if (isLoading || !data) {
    return (
      <div className="space-y-6 p-8">
        <div className="grid grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => <KPICardSkeleton key={i} />)}
        </div>
        <ChartSkeleton />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-8">
      {/* Site Header */}
      <div className="flex items-center gap-4">
        <h2 className="text-xl font-semibold">{data.name}</h2>
        <span className="rounded-full bg-[var(--color-accent-light)] px-2.5 py-0.5 text-xs font-medium text-[var(--color-accent)]">
          {data.bundleName}
        </span>
        <HealthBadge score={data.healthScore || 0} />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-5 gap-4">
        {data.kpis.map((kpi: { label: string; value: number; delta?: number; format: 'currency' | 'number' | 'percent' | 'score' | 'compact' }) => (
          <KPICard key={kpi.label} {...kpi} />
        ))}
      </div>

      {/* Tabs */}
      <Tabs.Root defaultValue="overview">
        <Tabs.List className="flex gap-1 border-b border-[var(--color-border)]">
          <Tabs.Trigger value="overview" className={tabTriggerClass}>Overview</Tabs.Trigger>
          <Tabs.Trigger value="formats" className={tabTriggerClass}>Formats</Tabs.Trigger>
          <Tabs.Trigger value="tiers" className={tabTriggerClass}>GEO/Tiers</Tabs.Trigger>
          <Tabs.Trigger value="costs" className={tabTriggerClass}>Costs</Tabs.Trigger>
          <Tabs.Trigger value="trends" className={tabTriggerClass}>Trends</Tabs.Trigger>
          <Tabs.Trigger value="recommendations" className={tabTriggerClass}>Recommendations</Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="overview" className="mt-5">
          <div className="grid grid-cols-2 gap-5">
            <ChartCard title="Revenue Trend" description="Daily revenue">
              {data.trend ? <RevenueTrendChart data={data.trend} /> : <div className="h-[250px]" />}
            </ChartCard>
            <ChartCard title="Traffic Trend" description="Daily users">
              {data.trend ? <TrafficTrendChart data={data.trend} /> : <div className="h-[250px]" />}
            </ChartCard>
          </div>
        </Tabs.Content>

        <Tabs.Content value="formats" className="mt-5 space-y-5">
          {data.formatBreakdown && (
            <>
              <ChartCard title="Format Revenue" description="Revenue by ad format">
                <FormatBreakdownChart data={data.formatBreakdown} />
              </ChartCard>
              <ChartCard title="Format Details" description="Detailed format metrics">
                <DataTable columns={formatColumns} data={data.formatBreakdown} />
              </ChartCard>
            </>
          )}
        </Tabs.Content>

        <Tabs.Content value="tiers" className="mt-5 space-y-5">
          {data.tierBreakdown && (
            <>
              <ChartCard title="Tier Distribution" description="Revenue and users by GEO tier">
                <TierBreakdownChart data={data.tierBreakdown} />
              </ChartCard>
              <ChartCard title="Tier Details" description="Detailed tier metrics">
                <DataTable columns={tierColumns} data={data.tierBreakdown} />
              </ChartCard>
            </>
          )}
        </Tabs.Content>

        <Tabs.Content value="costs" className="mt-5">
          {data.costTrend && (
            <ChartCard title="Cost Trend" description="Daily costs">
              <CostTrendChart data={data.costTrend} />
            </ChartCard>
          )}
        </Tabs.Content>

        <Tabs.Content value="trends" className="mt-5">
          <div className="space-y-5">
            {data.trend && (
              <>
                <ChartCard title="Revenue" description="Revenue over time">
                  <RevenueTrendChart data={data.trend} />
                </ChartCard>
                <ChartCard title="Traffic" description="Traffic over time">
                  <TrafficTrendChart data={data.trend} />
                </ChartCard>
                <ChartCard title="Profit" description="Profit over time">
                  <ProfitTrendChart data={data.trend} />
                </ChartCard>
              </>
            )}
          </div>
        </Tabs.Content>

        <Tabs.Content value="recommendations" className="mt-5">
          {data.insights && data.insights.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {data.insights.map((insight: { entity: string; entityType: string; metric: string; value: string; delta?: number; reason: string; action?: string; severity: 'low' | 'medium' | 'high' | 'critical'; type?: 'risk' | 'opportunity' | 'info' }, i: number) => (
                <InsightCard key={i} {...insight} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-[var(--color-text-muted)]">No recommendations at this time.</p>
          )}
        </Tabs.Content>
      </Tabs.Root>
    </div>
  )
}

export default function SiteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)

  return (
    <div>
      <Topbar title="Site Detail" description="Site-level analytics and control center" />
      <Suspense fallback={<div className="space-y-6 p-8"><div className="grid grid-cols-5 gap-4">{Array.from({ length: 5 }).map((_, i) => <KPICardSkeleton key={i} />)}</div></div>}>
        <SiteDetailContent id={id} />
      </Suspense>
    </div>
  )
}
