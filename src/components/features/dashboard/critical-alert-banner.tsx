'use client'

import { AlertTriangle, TrendingDown, X } from 'lucide-react'
import { useState } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { DashboardInsight } from '@/services/dashboard/types'

interface CriticalAlertBannerProps {
  insights: DashboardInsight[]
}

export function CriticalAlertBanner({ insights }: CriticalAlertBannerProps) {
  const [dismissed, setDismissed] = useState<Set<number>>(new Set())

  const criticalInsights = insights
    .filter(i => i.severity === 'critical' || (i.severity === 'warning' && i.type === 'risk'))
    .slice(0, 2)

  const visible = criticalInsights.filter((_, i) => !dismissed.has(i))
  if (visible.length === 0) return null

  return (
    <div className="flex flex-col gap-2">
      {criticalInsights.map((insight, idx) => {
        if (dismissed.has(idx)) return null
        const isCritical = insight.severity === 'critical'

        return (
          <div
            key={idx}
            className={cn(
              'relative flex items-start gap-3 rounded-[var(--radius-card)] px-4 py-3',
              'border',
              isCritical
                ? 'bg-[var(--color-danger-bg)] border-[var(--color-danger)]/30'
                : 'bg-[var(--color-warning-bg)] border-[var(--color-warning)]/30',
            )}
          >
            <div className={cn(
              'mt-0.5 flex-shrink-0 rounded-full p-1',
              isCritical ? 'text-[var(--color-danger)]' : 'text-[var(--color-warning)]',
            )}>
              {insight.type === 'loser' || insight.type === 'risk'
                ? <AlertTriangle size={16} strokeWidth={2} />
                : <TrendingDown size={16} strokeWidth={2} />
              }
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={cn(
                  'text-xs font-bold uppercase tracking-wider',
                  isCritical ? 'text-[var(--color-danger-dark)]' : 'text-[var(--color-warning-dark)]',
                )}>
                  {insight.entityName}
                </span>
                <span className="text-xs text-[var(--color-text-muted)]">·</span>
                <span className="text-xs font-medium text-[var(--color-text-muted)]">{insight.metric}</span>
              </div>
              <p className="mt-0.5 text-sm text-[var(--color-text-secondary)] line-clamp-1">{insight.reason}</p>
            </div>

            {insight.action && (
              <Link
                href={`/sites`}
                className="flex-shrink-0 self-center text-xs font-semibold text-[var(--color-primary-600)] hover:underline"
              >
                Investigate
              </Link>
            )}

            <button
              onClick={() => setDismissed(prev => new Set(prev).add(idx))}
              className="flex-shrink-0 self-start p-0.5 rounded hover:bg-black/5 transition-colors"
              aria-label="Dismiss alert"
            >
              <X size={14} className="text-[var(--color-text-muted)]" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
