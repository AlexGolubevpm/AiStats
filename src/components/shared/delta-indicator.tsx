import { cn, formatPercent } from '@/lib/utils'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface MetricDeltaProps {
  value: number
  size?: 'sm' | 'md'
  className?: string
}

export function MetricDelta({ value, size = 'sm', className }: MetricDeltaProps) {
  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm'

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-medium tabular-nums',
        textSize,
        value > 0
          ? 'text-[var(--color-success-dark)]'
          : value < 0
            ? 'text-[var(--color-danger-dark)]'
            : 'text-[var(--color-text-muted)]',
        className
      )}
    >
      {value > 0 ? (
        <TrendingUp className={iconSize} />
      ) : value < 0 ? (
        <TrendingDown className={iconSize} />
      ) : (
        <Minus className={iconSize} />
      )}
      {formatPercent(value)}
    </span>
  )
}

// Keep backward compat
export const DeltaIndicator = MetricDelta
