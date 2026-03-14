import { cn } from '@/lib/utils'
import { AlertTriangle, TrendingUp, TrendingDown, Info } from 'lucide-react'
import type { AnomalySeverity } from '@/types'

interface InsightCardProps {
  entity: string
  entityType: string
  metric: string
  value: string
  delta?: number
  reason: string
  action?: string
  severity: AnomalySeverity
  type?: 'risk' | 'opportunity' | 'info'
  className?: string
}

const severityColors = {
  low: 'border-l-blue-400',
  medium: 'border-l-amber-400',
  high: 'border-l-orange-500',
  critical: 'border-l-red-500',
}

const typeIcons = {
  risk: AlertTriangle,
  opportunity: TrendingUp,
  info: Info,
}

export function InsightCard({
  entity,
  entityType,
  metric,
  value,
  delta,
  reason,
  action,
  severity,
  type = 'info',
  className,
}: InsightCardProps) {
  const Icon = typeIcons[type] || Info

  return (
    <div
      className={cn(
        'rounded-[var(--radius-md)] border border-[var(--color-border)] border-l-4 bg-[var(--color-surface)] p-4 shadow-[var(--shadow-sm)]',
        severityColors[severity],
        className
      )}
    >
      <div className="flex items-start gap-3">
        <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', type === 'risk' ? 'text-red-500' : type === 'opportunity' ? 'text-emerald-500' : 'text-blue-500')} />
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-[var(--color-text-primary)]">{entity}</span>
            <span className="text-xs text-[var(--color-text-muted)]">{entityType}</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-sm tabular-nums text-[var(--color-text-secondary)]">
              {metric}: {value}
            </span>
            {delta !== undefined && (
              <span
                className={cn(
                  'text-xs font-medium tabular-nums',
                  delta >= 0 ? 'text-emerald-600' : 'text-red-600'
                )}
              >
                {delta >= 0 ? '+' : ''}{delta.toFixed(1)}%
              </span>
            )}
          </div>
          <p className="text-xs text-[var(--color-text-muted)]">{reason}</p>
          {action && (
            <p className="text-xs font-medium text-[var(--color-accent)]">{action}</p>
          )}
        </div>
      </div>
    </div>
  )
}
