'use client'

import { SparkAreaChart } from '@/components/tremor/SparkAreaChart'
import { formatCurrency, formatNumber, formatPercent, formatCompact, cn } from '@/lib/utils'
import { RiArrowUpSFill, RiArrowDownSFill } from '@remixicon/react'
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

/* ── Types ── */
interface KPICardProps {
  label: string
  value: number
  previousValue?: number
  delta?: number
  format?: 'currency' | 'number' | 'percent' | 'score' | 'compact'
  trend?: number[]
  className?: string
}

/* ── Component ── */
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

  const isPositive = delta !== undefined && delta > 0
  const isNegative = delta !== undefined && delta < 0

  return (
    <div
      className={cn(
        'relative rounded-xl border border-gray-200 bg-white p-5',
        'shadow-sm transition-all duration-200',
        'hover:shadow-md hover:-translate-y-0.5',
      )}
    >
      {/* Header: label + delta */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-500">{label}</p>
        {delta !== undefined && (
          <span
            className={cn(
              'inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold',
              isPositive && 'bg-emerald-50 text-emerald-700',
              isNegative && 'bg-red-50 text-red-700',
              !isPositive && !isNegative && 'bg-gray-50 text-gray-600',
            )}
          >
            {isPositive && <RiArrowUpSFill className="size-4" />}
            {isNegative && <RiArrowDownSFill className="size-4" />}
            {formatPercent(delta)}
          </span>
        )}
      </div>

      {/* Value */}
      <p className="mt-2 text-3xl font-semibold tracking-tight text-gray-900" style={{ fontVariantNumeric: 'tabular-nums' }}>
        {formattedValue}
      </p>

      {/* Comparison */}
      {delta !== undefined && (
        <p className="mt-1 text-xs text-gray-400">vs prev period</p>
      )}

      {/* Sparkline */}
      <div className="mt-4">
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
