'use client'

import { cn, formatCurrency, formatNumber, formatPercent, formatCompact, formatRPM } from '@/lib/utils'
import { MetricDelta } from './delta-indicator'
import { MiniSparkline } from './sparkline'

interface KPICardProps {
  label: string
  value: number
  previousValue?: number
  delta?: number
  format?: 'currency' | 'number' | 'percent' | 'score' | 'compact' | 'rpm'
  trend?: number[]
  className?: string
}

export function KPICard({
  label,
  value,
  delta,
  format = 'number',
  trend,
  className,
}: KPICardProps) {
  const formattedValue = (() => {
    switch (format) {
      case 'currency':
        return formatCurrency(value)
      case 'rpm':
        return formatRPM(value)
      case 'percent':
        return `${value.toFixed(1)}%`
      case 'score':
        return value.toString()
      case 'compact':
        return formatCompact(value)
      default:
        return formatNumber(value)
    }
  })()

  const sparkColor =
    delta !== undefined
      ? delta >= 0
        ? 'var(--color-success)'
        : 'var(--color-danger)'
      : 'var(--color-primary-500)'

  return (
    <div
      className={cn(
        'group relative flex min-h-[130px] flex-col justify-between rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-card)] transition-all duration-150 hover:-translate-y-px hover:shadow-[var(--shadow-elevated)]',
        className
      )}
    >
      {/* Label */}
      <p className="text-card-title uppercase tracking-wider">
        {label}
      </p>

      {/* Main value */}
      <p className="mt-2 truncate text-kpi-value">
        {formattedValue}
      </p>

      {/* Delta + Sparkline row */}
      <div className="mt-2 flex items-end justify-between gap-2">
        <div className="shrink-0">
          {delta !== undefined && (
            <div className="flex items-center gap-1">
              <MetricDelta value={delta} />
              <span className="text-meta whitespace-nowrap">vs prev</span>
            </div>
          )}
        </div>
        {trend && trend.length > 1 && (
          <MiniSparkline data={trend} color={sparkColor} width={80} height={24} />
        )}
      </div>
    </div>
  )
}
