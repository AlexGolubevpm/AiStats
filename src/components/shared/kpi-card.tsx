'use client'

import { cn, formatCurrency, formatNumber, formatPercent, formatCompact } from '@/lib/utils'
import { MetricDelta } from './delta-indicator'
import { MiniSparkline } from './sparkline'

// Metric-specific sparkline colors per spec
const METRIC_COLORS: Record<string, string> = {
  'Visitors': '#06B6D4',
  'Ad Requests': '#0EA5E9',
  'Ad Revenue': '#4F46E5',
  'Affiliate Revenue': '#EC4899',
  'Total Revenue': '#6366F1',
  'Costs': '#F59E0B',
  'Profit': '#10B981',
  'ROMI': '#8B5CF6',
  'RPM': '#14B8A6',
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

  const sparkColor = METRIC_COLORS[label] || '#6366F1'

  return (
    <div
      aria-label={`${label}: ${formattedValue}`}
      className={cn(
        'group relative min-h-[144px] overflow-hidden rounded-[16px] border border-[#E5E7EB] bg-white p-5 shadow-[0_1px_3px_rgba(16,24,40,0.06),0_1px_2px_rgba(16,24,40,0.04)] transition-all duration-150 hover:-translate-y-px hover:shadow-[0_4px_10px_rgba(16,24,40,0.08),0_2px_4px_rgba(16,24,40,0.04)] hover:border-[#D7DCE5]',
        className
      )}
    >
      {/* Label */}
      <p className="text-[12px] font-semibold uppercase tracking-[0.04em] text-[#6B7280]">
        {label}
      </p>

      {/* Main value */}
      <p className="mt-2.5 text-[38px] font-bold leading-[44px] tabular-nums text-[#111827]">
        {formattedValue}
      </p>

      {/* Delta + Sparkline row */}
      <div className="mt-3 flex items-end justify-between">
        <div>
          {delta !== undefined && (
            <div className="flex items-center gap-1.5">
              <MetricDelta value={delta} size="sm" />
              <span className="text-[12px] font-medium text-[#6B7280]">vs prev</span>
            </div>
          )}
        </div>
        {trend && trend.length > 1 && (
          <MiniSparkline data={trend} color={sparkColor} width={120} height={28} />
        )}
      </div>
    </div>
  )
}
