'use client'

import { ArrowUp, ArrowDown, Minus } from 'lucide-react'
import { formatPercent, cn } from '@/lib/utils'

type Confidence = 'full' | 'partial' | 'not-comparable'

interface DeltaBadgeProps {
  value: number
  size?: 'sm' | 'md'
  confidence?: Confidence
  /** pt 16: invert colors for metrics where growth is bad (e.g. Costs) */
  invertPolarity?: boolean
  className?: string
}

export function DeltaBadge({ value, size = 'sm', confidence = 'full', invertPolarity = false, className }: DeltaBadgeProps) {
  const iconSize = size === 'sm' ? 14 : 16

  if (confidence === 'not-comparable') {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-0.5 rounded-full font-semibold tabular-nums',
          'bg-gray-100 text-gray-500',
          size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm',
          className,
        )}
      >
        n/a
      </span>
    )
  }

  const isPositive = value > 0
  const isNegative = value < 0
  const isInvalid = !isFinite(value) || isNaN(value)

  if (isInvalid) {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-0.5 rounded-full font-semibold tabular-nums',
          'bg-gray-100 text-gray-500',
          size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm',
          className,
        )}
      >
        <Minus size={iconSize} strokeWidth={2.5} />
        &mdash;
      </span>
    )
  }

  const isPartial = confidence === 'partial'

  // pt 16: inverted polarity — growth is bad, decline is good
  const isGood = invertPolarity ? isNegative : isPositive
  const isBad = invertPolarity ? isPositive : isNegative

  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 rounded-full font-semibold tabular-nums',
        isPartial
          ? 'border border-amber-300 bg-amber-50 text-amber-700'
          : isGood
            ? 'bg-emerald-50 text-emerald-700'
            : isBad
              ? 'bg-red-50 text-red-700'
              : 'bg-gray-100 text-gray-600',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm',
        className,
      )}
    >
      {isPositive && <ArrowUp size={iconSize} strokeWidth={2.5} />}
      {isNegative && <ArrowDown size={iconSize} strokeWidth={2.5} />}
      {isPartial ? '~' : ''}{formatPercent(value)}
    </span>
  )
}

// Keep backward compat
export const MetricDelta = DeltaBadge
export const DeltaIndicator = DeltaBadge
