'use client'

import { SparkAreaChart } from '@/components/tremor/SparkAreaChart'
import { DeltaBadge } from '@/components/shared/delta-indicator'
import { formatCurrency, formatNumber, formatPercent, formatCompact, cn } from '@/lib/utils'
import type { AvailableChartColorsKeys } from '@/lib/chartUtils'

/* ── Color map per metric ── */
const METRIC_CHART_COLOR: Record<string, AvailableChartColorsKeys> = {
  Visitors: 'cyan',
  Visits: 'cyan',
  'Ad Revenue': 'violet',
  'Total Revenue': 'blue',
  Profit: 'emerald',
  ROMI: 'amber',
  'Ad Requests': 'cyan',
  'Affiliate Revenue': 'pink',
  Costs: 'amber',
  RPM: 'cyan',
  'Revenue / 1K Visits': 'cyan',
}

/* ── Accent border colors per metric ── */
const METRIC_ACCENT_BORDER: Record<string, string> = {
  Visitors: 'border-l-[#06B6D4]',
  Visits: 'border-l-[#06B6D4]',
  'Total Revenue': 'border-l-[#6366F1]',
  Profit: 'border-l-[#10B981]',
  ROMI: 'border-l-[#F59E0B]',
  RPM: 'border-l-[#06B6D4]',
  'Ad Revenue': 'border-l-[#4F46E5]',
  'Affiliate Revenue': 'border-l-[#EC4899]',
  Costs: 'border-l-[#F59E0B]',
  'Revenue / 1K Visits': 'border-l-[#6366F1]',
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

export function KPICard({ label, value, previousValue, delta, format = 'number', trend, className }: KPICardProps) {
  const isInvalid = isNaN(value)
  const chartColor = METRIC_CHART_COLOR[label] || 'blue'
  const accentBorder = METRIC_ACCENT_BORDER[label] || 'border-l-[#6366F1]'

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

  const formattedPrevious = previousValue != null && !isNaN(previousValue)
    ? (() => {
        switch (format) {
          case 'currency': return formatCurrency(previousValue)
          case 'percent':  return `${previousValue.toFixed(1)}%`
          case 'compact':  return formatCompact(previousValue)
          default:         return formatNumber(previousValue)
        }
      })()
    : null

  const sparkData = trend && trend.length > 1
    ? (trend.length > 14 ? trend.slice(-14) : trend).map((v, i) => ({ idx: i, value: v }))
    : null

  return (
    <div
      className={cn(
        'relative bg-[var(--color-surface)] rounded-[var(--radius-card)]',
        'border border-[var(--color-border-subtle)] border-l-[3px]',
        'shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-elevated)]',
        'transition-all duration-[var(--duration-normal)] ease-[var(--ease-out-expo)]',
        'hover:-translate-y-0.5',
        'p-5',
        accentBorder,
        className,
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
      <p className="mt-2 text-[38px] leading-[42px] font-bold tracking-tight text-[var(--color-text-primary)] tabular-nums">
        {formattedValue}
      </p>

      {/* Previous value */}
      {formattedPrevious && (
        <p className="mt-1 text-xs font-medium text-[var(--color-text-muted)]">was {formattedPrevious}</p>
      )}
      {!formattedPrevious && delta !== undefined && (
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
            className="h-12 w-full"
          />
        ) : (
          <div className="h-12" />
        )}
      </div>
    </div>
  )
}
