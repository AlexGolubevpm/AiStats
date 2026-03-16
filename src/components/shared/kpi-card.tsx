'use client'

import { cn, formatCurrency, formatNumber, formatPercent, formatCompact } from '@/lib/utils'
import { MetricDelta } from './delta-indicator'
import { MiniSparkline } from './sparkline'

interface KPICardProps {
  label: string
  value: number
  previousValue?: number
  delta?: number
  format?: 'currency' | 'number' | 'percent' | 'score' | 'compact'
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
  const isInvalidValue = isNaN(value)

  const formattedValue = (() => {
    if (isInvalidValue) return '\u2014'
    switch (format) {
      case 'currency':
        return formatCurrency(value)
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
      aria-label={`${label}: ${formattedValue}`}
      className={cn(
        'group relative min-h-[144px] rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-card)] transition-all duration-150 hover:-translate-y-px hover:shadow-[var(--shadow-elevated)]',
        className
      )}
    >
      {/* Label */}
      <p className="text-card-title uppercase tracking-wider">
        {label}
      </p>

      {/* Main value */}
      <p className="mt-3 text-kpi-value">
        {formattedValue}
      </p>

      {/* Delta + Sparkline row */}
      <div className="mt-3 flex items-end justify-between">
        <div>
          {delta !== undefined && (
            <div className="flex items-center gap-1.5">
              <MetricDelta value={delta} />
              <span className="text-meta">vs prev</span>
            </div>
          )}
        </div>
        {trend && trend.length > 1 && (
          <MiniSparkline data={trend} color={sparkColor} width={100} height={28} />
        )}
      </div>
    </div>
  )
}
