'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Trophy, TrendingDown, AlertTriangle, Lightbulb, ArrowRight } from 'lucide-react'
import type { AnomalySeverity } from '@/types'

interface InsightCardProps {
  entity: string
  entitySlug?: string
  entityType: string
  metric: string
  value: string
  delta?: number
  reason: string
  action?: string
  actionHref?: string
  severity: AnomalySeverity
  type?: 'risk' | 'opportunity' | 'info' | 'winner' | 'loser'
  className?: string
}

const typeConfig = {
  winner: {
    icon: Trophy,
    border: 'border-l-[#12B76A]',
    iconColor: 'text-[#039855]',
    bgHover: 'hover:bg-[#ECFDF3]/30',
    badge: 'bg-[#ECFDF3] text-[#039855]',
  },
  loser: {
    icon: TrendingDown,
    border: 'border-l-[#F04438]',
    iconColor: 'text-[#D92D20]',
    bgHover: 'hover:bg-[#FEF3F2]/30',
    badge: 'bg-[#FEF3F2] text-[#D92D20]',
  },
  risk: {
    icon: AlertTriangle,
    border: 'border-l-[#F79009]',
    iconColor: 'text-[#DC6803]',
    bgHover: 'hover:bg-[#FFFAEB]/30',
    badge: 'bg-[#FFFAEB] text-[#DC6803]',
  },
  opportunity: {
    icon: Lightbulb,
    border: 'border-l-[#6366F1]',
    iconColor: 'text-[#4F46E5]',
    bgHover: 'hover:bg-[#EEF2FF]/30',
    badge: 'bg-[#EEF2FF] text-[#4338CA]',
  },
  info: {
    icon: Lightbulb,
    border: 'border-l-[#06B6D4]',
    iconColor: 'text-[#06B6D4]',
    bgHover: 'hover:bg-[#F9FAFB]',
    badge: 'bg-[#F9FAFB] text-[#4B5563]',
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
  entitySlug,
  entityType,
  metric,
  value,
  delta,
  reason,
  action,
  actionHref,
  severity,
  type = 'info',
  className,
}: InsightCardProps) {
  const config = typeConfig[type]
  const Icon = config.icon
  const isCritical = severityWeight[severity] >= 3

  // Auto-generate href for sites if entitySlug is available
  const href = actionHref || (entitySlug && entityType === 'site' ? `/sites/${entitySlug}` : undefined)

  return (
    <div
      className={cn(
        'group rounded-[16px] border border-[#E5E7EB] border-l-[3px] bg-white p-4 shadow-[0_1px_3px_rgba(16,24,40,0.06),0_1px_2px_rgba(16,24,40,0.04)] transition-all duration-150 hover:-translate-y-px hover:shadow-[0_4px_10px_rgba(16,24,40,0.08),0_2px_4px_rgba(16,24,40,0.04)]',
        config.border,
        config.bgHover,
        isCritical && 'shadow-[0_0_0_3px_rgba(240,68,56,0.15)]',
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn('mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-110', config.badge)}>
          <Icon className={cn('h-3.5 w-3.5', config.iconColor)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-semibold text-[#111827] truncate">{entity}</span>
            <span className="shrink-0 rounded-[999px] bg-[#F9FAFB] px-2 py-0.5 text-[10px] font-medium text-[#6B7280]">
              {entityType}
            </span>
            {isCritical && (
              <span className="shrink-0 rounded-[999px] bg-[#FEF3F2] px-2 py-0.5 text-[10px] font-semibold uppercase text-[#D92D20]">
                {severity}
              </span>
            )}
          </div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-[12px] text-[#6B7280]">{metric}:</span>
            <span className="text-[13px] font-semibold tabular-nums text-[#111827]">{value}</span>
            {delta !== undefined && (
              <span
                className={cn(
                  'text-[12px] font-semibold tabular-nums',
                  delta >= 0 ? 'text-[#039855]' : 'text-[#D92D20]'
                )}
              >
                {delta >= 0 ? '+' : ''}{delta.toFixed(1)}%
              </span>
            )}
          </div>
          <p className="mt-1.5 text-[12px] leading-relaxed text-[#6B7280]">{reason}</p>
          {action && (
            href ? (
              <Link
                href={href}
                className="mt-2 inline-flex items-center gap-1 text-[12px] font-semibold text-[#4F46E5] hover:text-[#4338CA] transition-colors"
              >
                <span>{action}</span>
                <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
              </Link>
            ) : (
              <div className="mt-2 flex items-center gap-1 text-[12px] font-semibold text-[#4F46E5]">
                <span>{action}</span>
                <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
              </div>
            )
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
