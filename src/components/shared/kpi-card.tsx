'use client'

import { SparkAreaChart } from '@/components/tremor/SparkAreaChart'
import { DeltaBadge } from '@/components/shared/delta-indicator'
import { formatCurrency, formatNumber, formatPercent, formatCompact, cn } from '@/lib/utils'
import type { AvailableChartColorsKeys } from '@/lib/chartUtils'

/* ── Color map per metric ── */
const METRIC_CHART_COLOR: Record<string, AvailableChartColorsKeys> = {
  Visitors: 'blue',
  'Ad Revenue': 'violet',
  'Total Revenue': 'blue',
  Profit: 'emerald',
  ROMI: 'amber',
  'Ad Requests': 'cyan',
  'Affiliate Revenue': 'pink',
  Costs: 'amber',
  RPM: 'cyan',
}

interface KPICardProps {
  label: string
  value: number
  previousValue?: number
  delta?: number
  format?: 'currency' | 'number' | 'percent' | 'score' | 'compact'
  trend?: number[]
  className?: string
}

export function KPICard({ label, value, delta, format = 'number', trend }: KPICardProps) {
  const isInvalid = isNaN(value)
  const chartColor = METRIC_CHART_COLOR[label] || 'blue'

  const formattedValue = (() => {
    if (isInvalid) return '\u2014'
    switch (format) {
      case 'currency': return formatCurrency(value)
      case 'percent':  return `${value.toFixed(1)}%`
      case 'score':    return value.toString()
      case 'compact':  return formatCompact(value)
      default:         return formatNumber(value)
    }
  })()

  const sparkData = trend && trend.length > 1
    ? (trend.length > 14 ? trend.slice(-14) : trend).map((v, i) => ({ idx: i, value: v }))
    : null

  return (
    <div
      className={cn(
        'relative bg-[var(--color-surface)] rounded-[var(--radius-card)]',
        'border border-[var(--color-border-subtle)]',
        'shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-elevated)]',
        'transition-all duration-[var(--duration-normal)] ease-[var(--ease-out-expo)]',
        'hover:-translate-y-0.5',
        'p-4',
      )}
    >
      {/* Header: label + delta */}
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.04em] text-[var(--color-text-muted)]">
          {label}
        </p>
        {delta !== undefined && <DeltaBadge value={delta} size="sm" />}
      </div>

      {/* Value */}
      <p className="mt-2 text-[28px] leading-tight font-bold tracking-tight text-[var(--color-text-primary)] tabular-nums sm:text-3xl">
        {formattedValue}
      </p>

      {/* Comparison */}
      {delta !== undefined && (
        <p className="mt-1 text-xs font-medium text-[var(--color-text-muted)]">vs prev period</p>
      )}

      {/* Sparkline */}
      <div className="mt-3">
        {sparkData ? (
          <SparkAreaChart
            data={sparkData}
            index="idx"
            categories={['value']}
            colors={[chartColor]}
            fill="gradient"
            className="h-10 w-full"
          />
        ) : (
          <div className="h-10" />
        )}
      </div>
    </div>
  )
}
