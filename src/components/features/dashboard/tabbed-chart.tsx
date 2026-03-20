'use client'

import { useState, useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { DollarSign, Activity, TrendingUp, BarChart2 } from 'lucide-react'
import { ChartCard } from '@/components/shared/chart-card'
import { AreaChart } from '@/components/tremor/AreaChart'
import { cn } from '@/lib/utils'
import type { AvailableChartColorsKeys } from '@/lib/chartUtils'
import type { TrendPoint } from '@/services/dashboard/types'

const TREND_TABS = [
  { key: 'revenue', label: 'Revenue', icon: DollarSign },
  { key: 'traffic', label: 'Traffic', icon: Activity },
  { key: 'profit', label: 'Profit', icon: TrendingUp },
] as const

type TrendTab = (typeof TREND_TABS)[number]['key']

function hasRealData(points: TrendPoint[]): boolean {
  return points.some(pt => pt.value !== null && pt.value !== 0)
}

function buildRevenueChartData(
  adRevenue: TrendPoint[],
  affiliateRevenue: TrendPoint[],
  totalRevenue: TrendPoint[],
  compareTrend?: TrendPoint[],
) {
  if (!hasRealData(totalRevenue)) return []
  return totalRevenue.map((pt, i) => ({
    date: pt.date,
    adRevenue: adRevenue[i]?.value ?? 0,
    affiliateRevenue: affiliateRevenue[i]?.value ?? 0,
    totalRevenue: pt.value ?? 0,
    ...(compareTrend?.[i] != null ? { prevRevenue: compareTrend[i].value ?? 0 } : {}),
  }))
}

function buildTrafficChartData(traffic: TrendPoint[], compareTrend?: TrendPoint[]) {
  if (!hasRealData(traffic)) return []
  return traffic.map((pt, i) => ({
    date: pt.date,
    visits: pt.value ?? 0,
    ...(compareTrend?.[i] != null ? { prevVisits: compareTrend[i].value ?? 0 } : {}),
  }))
}

function buildProfitChartData(profit: TrendPoint[], compareTrend?: TrendPoint[]) {
  if (!hasRealData(profit)) return []
  return profit.map((pt, i) => ({
    date: pt.date,
    profit: pt.value ?? 0,
    ...(compareTrend?.[i] != null ? { prevProfit: compareTrend[i].value ?? 0 } : {}),
  }))
}

function ChartEmptyState({ metric }: { metric: string }) {
  return (
    <div className="flex h-48 sm:h-64 md:h-80 items-center justify-center">
      <div className="text-center">
        <BarChart2 size={32} strokeWidth={1.5} className="mx-auto text-[var(--color-text-disabled)]" />
        <p className="mt-2 text-sm font-medium text-[var(--color-text-muted)]">No {metric} data available</p>
        <p className="mt-0.5 text-xs text-[var(--color-text-disabled)]">Data will appear once sources are synced</p>
      </div>
    </div>
  )
}

const tabFade = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.2 },
}

interface TabbedChartProps {
  trends: {
    revenue: TrendPoint[]
    traffic: TrendPoint[]
    profit: TrendPoint[]
    adRevenue: TrendPoint[]
    affiliateRevenue: TrendPoint[]
  }
  compareTrends?: {
    revenue?: TrendPoint[]
    traffic?: TrendPoint[]
    profit?: TrendPoint[]
  }
  dayCount: number
  compareLabel: string
}

export function TabbedChart({ trends, compareTrends, dayCount, compareLabel }: TabbedChartProps) {
  const [activeTab, setActiveTab] = useState<TrendTab>('revenue')

  const revenueData = useMemo(() => buildRevenueChartData(trends.adRevenue, trends.affiliateRevenue, trends.revenue, compareTrends?.revenue), [trends, compareTrends])
  const trafficData = useMemo(() => buildTrafficChartData(trends.traffic, compareTrends?.traffic), [trends, compareTrends])
  const profitData = useMemo(() => buildProfitChartData(trends.profit, compareTrends?.profit), [trends, compareTrends])

  const hasCompare = compareTrends && (compareTrends.revenue?.length || compareTrends.traffic?.length || compareTrends.profit?.length)

  const tabHasData: Record<TrendTab, boolean> = {
    revenue: revenueData.length > 0,
    traffic: trafficData.length > 0,
    profit: profitData.length > 0,
  }

  const hasPrevRevenue = hasCompare && revenueData[0]?.prevRevenue != null
  const revenueCategories = hasPrevRevenue ? ['adRevenue', 'affiliateRevenue', 'prevRevenue'] : ['adRevenue', 'affiliateRevenue']
  const revenueColors: AvailableChartColorsKeys[] = hasPrevRevenue ? ['violet', 'fuchsia', 'gray'] : ['violet', 'fuchsia']

  const hasPrevTraffic = hasCompare && trafficData[0]?.prevVisits != null
  const trafficCategories = hasPrevTraffic ? ['visits', 'prevVisits'] : ['visits']
  const trafficColors: AvailableChartColorsKeys[] = hasPrevTraffic ? ['cyan', 'gray'] : ['cyan']

  const hasPrevProfit = hasCompare && profitData[0]?.prevProfit != null
  const profitCategories = hasPrevProfit ? ['profit', 'prevProfit'] : ['profit']
  const profitColors: AvailableChartColorsKeys[] = hasPrevProfit ? ['emerald', 'gray'] : ['emerald']

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
      {/* pt 12: AnimatePresence for smooth tab transitions */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          id={`chart-panel-${activeTab}`}
          role="tabpanel"
          aria-label={`${activeTab} chart`}
          {...tabFade}
        >
          {activeTab === 'revenue' && (revenueData.length > 0 ? (
            <AreaChart
              data={revenueData}
              index="date"
              categories={revenueCategories as string[]}
              colors={revenueColors}
              valueFormatter={(v: number) => `$${v >= 1000 ? `${(v / 1000).toFixed(1)}K` : v.toFixed(2)}`}
              showLegend={true}
              showGridLines={true}
              className="h-48 sm:h-64 md:h-80"
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
              categories={trafficCategories as string[]}
              colors={trafficColors}
              valueFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v.toString()}
              showLegend={true}
              showGridLines={true}
              className="h-48 sm:h-64 md:h-80"
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
              categories={profitCategories as string[]}
              colors={profitColors}
              valueFormatter={(v: number) => `$${v >= 1000 ? `${(v / 1000).toFixed(1)}K` : v.toFixed(2)}`}
              showLegend={true}
              showGridLines={true}
              className="h-48 sm:h-64 md:h-80"
              fill="gradient"
              autoMinValue={true}
              yAxisWidth={56}
            />
          ) : (
            <ChartEmptyState metric="profit" />
          ))}
        </motion.div>
      </AnimatePresence>
    </ChartCard>
  )
}
