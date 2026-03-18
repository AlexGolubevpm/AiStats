'use client'

import Link from 'next/link'
import {
  RiTrophyLine,
  RiArrowDownLine,
  RiAlertLine,
  RiArrowUpLine,
  RiLightbulbLine,
  RiArrowRightLine,
  RiArrowRightSLine,
} from '@remixicon/react'
import { DeltaBadge } from '@/components/shared/delta-indicator'
import { cn } from '@/lib/utils'
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

const TYPE_CONFIG = {
  winner: {
    icon: RiTrophyLine,
    color: 'text-[var(--color-success-dark)]',
    bg: 'bg-[var(--color-success-bg)]',
    border: 'border-l-[var(--color-success)]',
    label: 'Winner',
  },
  loser: {
    icon: RiArrowDownLine,
    color: 'text-[var(--color-danger-dark)]',
    bg: 'bg-[var(--color-danger-bg)]',
    border: 'border-l-[var(--color-danger)]',
    label: 'Declining',
  },
  risk: {
    icon: RiAlertLine,
    color: 'text-[var(--color-warning-dark)]',
    bg: 'bg-[var(--color-warning-bg)]',
    border: 'border-l-[var(--color-warning)]',
    label: 'Risk',
  },
  opportunity: {
    icon: RiArrowUpLine,
    color: 'text-[var(--color-primary-600)]',
    bg: 'bg-[var(--color-primary-50)]',
    border: 'border-l-[var(--color-primary-500)]',
    label: 'Opportunity',
  },
  info: {
    icon: RiLightbulbLine,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-l-blue-500',
    label: 'Info',
  },
} as const

function InsightContent(props: InsightCardProps) {
  const type = props.type || 'info'
  const config = TYPE_CONFIG[type]
  const Icon = config.icon
  const href = props.actionHref || (props.entitySlug && props.entityType === 'site' ? `/sites/${props.entitySlug}` : undefined)

  return (
    <div className="flex gap-3 p-4">
      {/* Icon */}
      <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-control)]', config.bg)}>
        <Icon className={cn('size-[18px]', config.color)} />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <p className={cn('text-[11px] font-bold uppercase tracking-wider', config.color)}>
          {config.label}
        </p>

        <div className="mt-1.5 flex items-baseline gap-2 flex-wrap">
          <span className="text-sm font-semibold text-[var(--color-text-primary)]">{props.metric}</span>
          <span className="text-xs font-medium text-[var(--color-text-muted)]">{props.entity}</span>
          {props.delta !== undefined && <DeltaBadge value={props.delta} size="sm" />}
        </div>

        <p className="mt-2 text-[13px] leading-relaxed text-[var(--color-text-secondary)]">{props.reason}</p>

        {props.action && href && (
          <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-primary-600)] underline-offset-2 hover:underline">
            {props.action}
            <RiArrowRightLine className="size-3" />
          </span>
        )}
      </div>

      {/* Chevron */}
      {href && (
        <RiArrowRightSLine className="size-4 shrink-0 text-[var(--color-text-disabled)] mt-0.5" />
      )}
    </div>
  )
}

export function InsightCard(props: InsightCardProps) {
  const type = props.type || 'info'
  const config = TYPE_CONFIG[type]
  const href = props.actionHref || (props.entitySlug && props.entityType === 'site' ? `/sites/${props.entitySlug}` : undefined)

  const cardClasses = cn(
    'rounded-[var(--radius-card)] bg-[var(--color-surface)]',
    'border border-[var(--color-border-subtle)] border-l-[3px]',
    'shadow-[var(--shadow-card)]',
    'transition-all duration-[var(--duration-normal)] ease-[var(--ease-out-expo)]',
    config.border,
    href && 'hover:shadow-[var(--shadow-elevated)] hover:-translate-y-0.5 focus-ring',
  )

  if (href) {
    return (
      <Link href={href} className={cn(cardClasses, 'block no-underline')} style={{ color: 'inherit', textDecoration: 'none' }}>
        <InsightContent {...props} />
      </Link>
    )
  }

  return (
    <div className={cardClasses}>
      <InsightContent {...props} />
    </div>
  )
}

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
