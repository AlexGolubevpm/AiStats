'use client'

import { RiArrowUpSFill, RiArrowDownSFill, RiSubtractLine } from '@remixicon/react'
import { formatPercent, cn } from '@/lib/utils'

interface DeltaBadgeProps {
  value: number
  size?: 'sm' | 'md'
  className?: string
}

/**
 * Unified delta indicator used across all dashboard components.
 * Displays a pill-shaped badge with directional icon and percentage.
 */
export function DeltaBadge({ value, size = 'sm', className }: DeltaBadgeProps) {
  const isPositive = value > 0
  const isNegative = value < 0
  const isNeutral = !isPositive && !isNegative
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
        <RiSubtractLine className={size === 'sm' ? 'size-3' : 'size-3.5'} />
        &mdash;
      </span>
    )
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 rounded-full font-semibold tabular-nums',
        isPositive && 'bg-emerald-50 text-emerald-700',
        isNegative && 'bg-red-50 text-red-700',
        isNeutral && 'bg-gray-100 text-gray-600',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm',
        className,
      )}
    >
      {isPositive && <RiArrowUpSFill className={size === 'sm' ? 'size-3.5' : 'size-4'} />}
      {isNegative && <RiArrowDownSFill className={size === 'sm' ? 'size-3.5' : 'size-4'} />}
      {formatPercent(value)}
    </span>
  )
}

// Keep backward compat
export const MetricDelta = DeltaBadge
export const DeltaIndicator = DeltaBadge
