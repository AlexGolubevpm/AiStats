'use client'

import { DeltaBadge } from '@/components/shared/delta-indicator'
import { cn } from '@/lib/utils'

interface ChartCardProps {
  title: string
  description?: string
  children: React.ReactNode
  className?: string
  action?: React.ReactNode
  delta?: number
}

export function ChartCard({ title, description, children, action, delta, className }: ChartCardProps) {
  return (
    <div
      className={cn(
        'bg-[var(--color-surface)] rounded-[var(--radius-card)]',
        'border border-[var(--color-border-subtle)]',
        'shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-elevated)]',
        'transition-shadow duration-[var(--duration-normal)]',
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between px-5 pt-5 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">{title}</h3>
            {delta !== undefined && <DeltaBadge value={delta} size="sm" />}
          </div>
          {description && (
            <p className="mt-1 text-xs font-medium text-[var(--color-text-muted)]">{description}</p>
          )}
        </div>
        {action}
      </div>

      {/* Chart body */}
      <div className="px-5 pb-5">
        {children}
      </div>
    </div>
  )
}

export function TrendChartCard(props: ChartCardProps) {
  return <ChartCard {...props} />
}
