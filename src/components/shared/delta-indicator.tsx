'use client'

import { cn, formatPercent } from '@/lib/utils'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { motion } from 'framer-motion'

interface MetricDeltaProps {
  value: number
  size?: 'sm' | 'md'
  className?: string
}

export function MetricDelta({ value, size = 'sm', className }: MetricDeltaProps) {
  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm'

  if (!isFinite(value) || isNaN(value)) {
    return (
      <motion.span
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        className={cn(
          'inline-flex items-center gap-1 font-medium tabular-nums',
          textSize,
          'text-[var(--color-text-muted)]',
          className
        )}
      >
        <Minus className={iconSize} />
        &mdash;
      </motion.span>
    )
  }

  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
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
    </motion.span>
  )
}

// Keep backward compat
export const DeltaIndicator = MetricDelta
