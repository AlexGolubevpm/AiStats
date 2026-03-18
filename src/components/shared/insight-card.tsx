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
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    label: 'Winner',
  },
  loser: {
    icon: RiArrowDownLine,
    color: 'text-red-600',
    bg: 'bg-red-50',
    label: 'Declining',
  },
  risk: {
    icon: RiAlertLine,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    label: 'Risk',
  },
  opportunity: {
    icon: RiArrowUpLine,
    color: 'text-violet-600',
    bg: 'bg-violet-50',
    label: 'Opportunity',
  },
  info: {
    icon: RiLightbulbLine,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    label: 'Info',
  },
} as const

function InsightContent(props: InsightCardProps) {
  const type = props.type || 'info'
  const config = TYPE_CONFIG[type]
  const Icon = config.icon
  const href = props.actionHref || (props.entitySlug && props.entityType === 'site' ? `/sites/${props.entitySlug}` : undefined)

  return (
    <div className="flex gap-3.5 p-4">
      {/* Icon */}
      <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', config.bg)}>
        <Icon className={cn('size-[18px]', config.color)} />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <p className={cn('text-[10px] font-bold uppercase tracking-wider', config.color)}>
          {config.label}
        </p>

        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-sm font-semibold text-gray-900">{props.metric}</span>
          <span className="text-xs text-gray-500">{props.entity}</span>
          {props.delta !== undefined && (
            <span className={cn('text-xs font-semibold tabular-nums', props.delta >= 0 ? 'text-emerald-600' : 'text-red-600')}>
              {props.delta >= 0 ? '+' : ''}{props.delta.toFixed(1)}%
            </span>
          )}
        </div>

        <p className="mt-2 text-[13px] leading-relaxed text-gray-500">{props.reason}</p>

        {props.action && href && (
          <span className="mt-2.5 inline-flex items-center gap-1 text-xs font-semibold text-violet-600">
            {props.action}
            <RiArrowRightLine className="size-3" />
          </span>
        )}
      </div>

      {/* Chevron */}
      {href && (
        <RiArrowRightSLine className="size-4 shrink-0 text-gray-300 mt-0.5" />
      )}
    </div>
  )
}

export function InsightCard(props: InsightCardProps) {
  const href = props.actionHref || (props.entitySlug && props.entityType === 'site' ? `/sites/${props.entitySlug}` : undefined)

  const cardClasses = cn(
    'rounded-xl border border-gray-200 bg-white shadow-sm',
    'transition-all duration-200',
    href && 'hover:shadow-md hover:-translate-y-0.5 cursor-pointer',
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
