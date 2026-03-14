import { cn, formatPercent } from '@/lib/utils'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface DeltaIndicatorProps {
  value: number
  className?: string
}

export function DeltaIndicator({ value, className }: DeltaIndicatorProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-xs font-medium tabular-nums',
        value > 0 ? 'text-emerald-600' : value < 0 ? 'text-red-600' : 'text-[var(--color-text-muted)]',
        className
      )}
    >
      {value > 0 ? (
        <TrendingUp className="h-3 w-3" />
      ) : value < 0 ? (
        <TrendingDown className="h-3 w-3" />
      ) : (
        <Minus className="h-3 w-3" />
      )}
      {formatPercent(value)}
    </span>
  )
}
