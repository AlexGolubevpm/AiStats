import { cn } from '@/lib/utils'
import { Trophy, TrendingDown, AlertTriangle, Lightbulb, ArrowRight } from 'lucide-react'
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
  type?: 'risk' | 'opportunity' | 'info' | 'winner' | 'loser'
  className?: string
}

const typeConfig = {
  winner: {
    icon: Trophy,
    border: 'border-l-[var(--color-success)]',
    iconColor: 'text-[var(--color-success)]',
    bgHover: 'hover:bg-[var(--color-success-bg)]/30',
    badge: 'bg-[var(--color-success-bg)] text-[var(--color-success-dark)]',
  },
  loser: {
    icon: TrendingDown,
    border: 'border-l-[var(--color-danger)]',
    iconColor: 'text-[var(--color-danger)]',
    bgHover: 'hover:bg-[var(--color-danger-bg)]/30',
    badge: 'bg-[var(--color-danger-bg)] text-[var(--color-danger-dark)]',
  },
  risk: {
    icon: AlertTriangle,
    border: 'border-l-[var(--color-warning)]',
    iconColor: 'text-[var(--color-warning)]',
    bgHover: 'hover:bg-[var(--color-warning-bg)]/30',
    badge: 'bg-[var(--color-warning-bg)] text-[var(--color-warning-dark)]',
  },
  opportunity: {
    icon: Lightbulb,
    border: 'border-l-[var(--color-primary-500)]',
    iconColor: 'text-[var(--color-primary-500)]',
    bgHover: 'hover:bg-[var(--color-primary-50)]/30',
    badge: 'bg-[var(--color-primary-50)] text-[var(--color-primary-700)]',
  },
  info: {
    icon: Lightbulb,
    border: 'border-l-[var(--color-chart-cyan)]',
    iconColor: 'text-[var(--color-chart-cyan)]',
    bgHover: 'hover:bg-[var(--color-surface-secondary)]',
    badge: 'bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)]',
  },
}

const severityWeight: Record<AnomalySeverity, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
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
  const config = typeConfig[type]
  const Icon = config.icon
  const isCritical = severityWeight[severity] >= 3

  return (
    <div
      className={cn(
        'group rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] border-l-[3px] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-card)] transition-all duration-150 hover:-translate-y-px hover:shadow-[var(--shadow-elevated)]',
        config.border,
        config.bgHover,
        isCritical && 'shadow-[var(--shadow-glow-danger)]',
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn('mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg group-hover:scale-110 transition-transform duration-200', config.badge)}>
          <Icon className={cn('h-3.5 w-3.5', config.iconColor)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-semibold text-[var(--color-text-primary)] truncate">{entity}</span>
            <span className="shrink-0 rounded-[var(--radius-pill)] bg-[var(--color-surface-secondary)] px-2 py-0.5 text-[10px] font-medium text-[var(--color-text-muted)]">
              {entityType}
            </span>
            {isCritical && (
              <span className="shrink-0 rounded-[var(--radius-pill)] bg-[var(--color-danger-bg)] px-2 py-0.5 text-[10px] font-semibold uppercase text-[var(--color-danger-dark)]">
                {severity}
              </span>
            )}
          </div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-[12px] text-[var(--color-text-muted)]">{metric}:</span>
            <span className="text-[13px] font-semibold tabular-nums text-[var(--color-text-primary)]">{value}</span>
            {delta !== undefined && (
              <span
                className={cn(
                  'text-[12px] font-semibold tabular-nums',
                  delta >= 0 ? 'text-[var(--color-success-dark)]' : 'text-[var(--color-danger-dark)]'
                )}
              >
                {delta >= 0 ? '+' : ''}{delta.toFixed(1)}%
              </span>
            )}
          </div>
          <p className="mt-1.5 text-[12px] leading-relaxed text-[var(--color-text-muted)]">{reason}</p>
          {action && (
            <div className="mt-2 flex items-center gap-1 text-[12px] font-semibold text-[var(--color-primary-600)]">
              <span>{action}</span>
              <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Specialized card variants
export function WinnerCard(props: Omit<InsightCardProps, 'type'>) {
  return <InsightCard {...props} type="winner" />
}

export function LoserCard(props: Omit<InsightCardProps, 'type'>) {
  return <InsightCard {...props} type="loser" />
}

export function RiskCard(props: Omit<InsightCardProps, 'type'>) {
  return <InsightCard {...props} type="risk" />
}

export function OpportunityCard(props: Omit<InsightCardProps, 'type'>) {
  return <InsightCard {...props} type="opportunity" />
}
