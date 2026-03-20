'use client'

import { SparkAreaChart } from '@/components/tremor/SparkAreaChart'
import { DeltaBadge } from '@/components/shared/delta-indicator'
import { formatCurrency, formatNumber, formatPercent, formatCompact, cn } from '@/lib/utils'
import type { AvailableChartColorsKeys } from '@/lib/chartUtils'
import { Tooltip } from '@mantine/core'

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

/* ── Metrics where growth is bad (inverted polarity) ── */
const INVERTED_POLARITY_METRICS = new Set(['Costs'])

interface KPICardProps {
  label: string
  value: number
  previousValue?: number
  delta?: number
  format?: 'currency' | 'number' | 'percent' | 'score' | 'compact'
  trend?: number[]
  className?: string
  /** pt 1: hero = large prominent card, compact = smaller secondary card */
  size?: 'hero' | 'default' | 'compact'
  /** pt 21: data completeness indicator */
  completeness?: 'complete' | 'partial' | 'incomplete'
  /** pt 9: click handler for drill-down */
  onClick?: () => void
}

export function KPICard({
  label, value, previousValue, delta, format = 'number', trend, className,
  size = 'default', completeness = 'complete', onClick,
}: KPICardProps) {
  const isInvalid = isNaN(value)
  const chartColor = METRIC_CHART_COLOR[label] || 'blue'
  const accentBorder = METRIC_ACCENT_BORDER[label] || 'border-l-[#6366F1]'
  const isPartial = completeness === 'partial' || completeness === 'incomplete'
  const invertedPolarity = INVERTED_POLARITY_METRICS.has(label)

  const formattedValue = (() => {
    if (isInvalid) return '\u2014'
    const prefix = isPartial ? '~' : ''
    switch (format) {
      case 'currency': return `${prefix}${formatCurrency(value)}`
      case 'percent':  return `${prefix}${value.toFixed(1)}%`
      case 'score':    return `${prefix}${value.toString()}`
      case 'compact':  return `${prefix}${formatCompact(value)}`
      default:         return `${prefix}${formatNumber(value)}`
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

  const isCompact = size === 'compact'
  const isHero = size === 'hero'
  const sparkMax = isCompact ? 7 : 14
  const sparkData = trend && trend.length > 1
    ? (trend.length > sparkMax ? trend.slice(-sparkMax) : trend).map((v, i) => ({ idx: i, value: v }))
    : null

  // pt 1: size-dependent typography
  const valueSizeClass = isHero
    ? 'text-[48px] leading-[52px]'
    : isCompact
      ? 'text-[24px] leading-[28px]'
      : 'text-[38px] leading-[42px]'

  const paddingClass = isCompact ? 'p-3' : 'p-5'
  const sparkHeight = isCompact ? 'h-6' : isHero ? 'h-14' : 'h-12'

  const interactive = !!onClick

  return (
    <div
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={onClick}
      onKeyDown={interactive ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick?.() } } : undefined}
      className={cn(
        'relative bg-[var(--color-surface)] rounded-[var(--radius-card)]',
        'border border-[var(--color-border-subtle)] border-l-[3px]',
        'shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-elevated)]',
        'transition-all duration-[var(--duration-normal)] ease-[var(--ease-out-expo)]',
        'hover:-translate-y-0.5',
        paddingClass,
        accentBorder,
        // pt 1: hero gets subtle gradient background
        isHero && 'bg-gradient-to-br from-[var(--color-surface)] to-[var(--color-surface-secondary)]',
        interactive && 'cursor-pointer focus-ring',
        className,
      )}
    >
      {/* Header: label + delta */}
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.04em] text-[var(--color-text-muted)]">
          {label}
        </p>
        {delta !== undefined && (
          <DeltaBadge value={delta} size="sm" invertPolarity={invertedPolarity} />
        )}
      </div>

      {/* Value — pt 21: partial data gets dashed underline */}
      {isPartial ? (
        <Tooltip label={`Based on incomplete data — some sources unavailable`} withArrow position="top-start">
          <p className={cn(
            'mt-2 font-bold tracking-tight tabular-nums',
            'text-[var(--color-warning-dark)] decoration-dashed underline underline-offset-4 decoration-1',
            valueSizeClass,
          )}>
            {formattedValue}
          </p>
        </Tooltip>
      ) : (
        <p className={cn(
          'mt-2 font-bold tracking-tight text-[var(--color-text-primary)] tabular-nums',
          valueSizeClass,
        )}>
          {formattedValue}
        </p>
      )}

      {/* Previous value */}
      {formattedPrevious && (
        <p className="mt-1 text-xs font-medium text-[var(--color-text-muted)]">was {formattedPrevious}</p>
      )}
      {!formattedPrevious && delta !== undefined && (
        <p className="mt-1 text-xs font-medium text-[var(--color-text-muted)]">vs prev period</p>
      )}

      {/* Sparkline */}
      {!isCompact && (
        <div className="mt-3">
          {sparkData ? (
            <SparkAreaChart
              data={sparkData}
              index="idx"
              categories={['value']}
              colors={[chartColor]}
              fill="gradient"
              className={cn(sparkHeight, 'w-full')}
            />
          ) : (
            <div className={sparkHeight} />
          )}
        </div>
      )}

      {/* pt 21: completeness badge */}
      {isPartial && (
        <div className="absolute top-2 right-2">
          <span className="inline-flex h-2 w-2 rounded-full bg-[var(--color-warning)]" title="Incomplete data" />
        </div>
      )}
    </div>
  )
}
