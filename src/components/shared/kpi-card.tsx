'use client'

import { cn, formatCurrency, formatNumber, formatPercent, formatCompact } from '@/lib/utils'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Sparkline } from './sparkline'

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
  const formattedValue = (() => {
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

  return (
    <div
      className={cn(
        'rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-sm)] transition-shadow hover:shadow-[var(--shadow-md)]',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted)]">
            {label}
          </p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-[var(--color-text-primary)]">
            {formattedValue}
          </p>
          {delta !== undefined && (
            <div className="mt-2 flex items-center gap-1">
              {delta > 0 ? (
                <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
              ) : delta < 0 ? (
                <TrendingDown className="h-3.5 w-3.5 text-red-600" />
              ) : (
                <Minus className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />
              )}
              <span
                className={cn(
                  'text-xs font-medium tabular-nums',
                  delta > 0
                    ? 'text-emerald-600'
                    : delta < 0
                      ? 'text-red-600'
                      : 'text-[var(--color-text-muted)]'
                )}
              >
                {formatPercent(delta)}
              </span>
              <span className="text-xs text-[var(--color-text-muted)]">vs prev</span>
            </div>
          )}
        </div>
        {trend && trend.length > 0 && (
          <div className="ml-4 mt-1">
            <Sparkline data={trend} color={delta && delta >= 0 ? '#059669' : '#DC2626'} />
          </div>
        )}
      </div>
    </div>
  )
}
