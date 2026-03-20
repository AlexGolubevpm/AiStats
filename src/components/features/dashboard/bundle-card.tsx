'use client'

import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { HealthBadge } from '@/components/shared/health-badge'
import { DeltaBadge } from '@/components/shared/delta-indicator'
import { SparkAreaChart } from '@/components/tremor/SparkAreaChart'
import { formatCurrency, formatCompact, cn } from '@/lib/utils'
import type { DashboardBundle } from '@/services/dashboard/types'

export const BUNDLE_ACCENTS: Record<string, string> = {
  JAV: 'bg-[var(--color-bundle-jav)]',
  Gays: 'bg-[var(--color-bundle-gays)]',
  Hentai: 'bg-[var(--color-bundle-hentai)]',
  Trans: 'bg-[var(--color-bundle-trans)]',
}

interface BundleCardProps {
  bundle: DashboardBundle
  /** pt 10: mini revenue sparkline data */
  trendData?: number[]
}

export function BundleCard({ bundle, trendData }: BundleCardProps) {
  const accentClass = BUNDLE_ACCENTS[bundle.name] || 'bg-gray-400'

  const sparkData = trendData && trendData.length > 1
    ? trendData.slice(-7).map((v, i) => ({ idx: i, value: v }))
    : null

  return (
    <Link
      href={`/bundles/${bundle.slug}`}
      className={cn(
        'group block no-underline',
        'rounded-[var(--radius-card)] bg-[var(--color-surface)]',
        'border border-[var(--color-border-subtle)]',
        'shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-elevated)]',
        'transition-all duration-[var(--duration-normal)] ease-[var(--ease-out-expo)]',
        'hover:-translate-y-0.5 focus-ring relative overflow-hidden',
      )}
      style={{ color: 'inherit', textDecoration: 'none' }}
    >
      {/* Top accent */}
      <div className={cn('h-[3px] rounded-t-[var(--radius-card)]', accentClass)} />

      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className={cn('h-2.5 w-2.5 rounded-full', accentClass)} />
            <span className="text-sm font-semibold text-[var(--color-text-primary)]">{bundle.name}</span>
          </div>
          <div className="flex items-center gap-2">
            {bundle.health != null && <HealthBadge score={bundle.health} showLabel={false} size="sm" />}
            {bundle.delta !== null && bundle.delta !== undefined && <DeltaBadge value={bundle.delta} size="sm" />}
            <ChevronRight
              size={16}
              strokeWidth={2}
              className="text-[var(--color-text-disabled)] transition-transform duration-200 group-hover:translate-x-1"
            />
          </div>
        </div>

        {/* Metrics 2x2 */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          {[
            { label: 'Visits', value: formatCompact(bundle.visits || 0) },
            { label: 'Revenue', value: formatCurrency(bundle.totalRevenue || 0) },
            { label: 'Profit', value: formatCurrency(bundle.profit || 0), positive: (bundle.profit ?? 0) > 0 },
            { label: 'ROMI', value: `${(bundle.romi || 0).toFixed(1)}%` },
          ].map(m => (
            <div key={m.label}>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">{m.label}</p>
              <p
                className={cn(
                  'mt-0.5 text-lg font-bold tabular-nums text-right',
                  m.positive === true
                    ? 'text-[var(--color-success-dark)]'
                    : m.positive === false
                      ? 'text-[var(--color-danger-dark)]'
                      : 'text-[var(--color-text-primary)]',
                )}
              >
                {m.value}
              </p>
            </div>
          ))}
        </div>

        {/* pt 10: Mini sparkline */}
        {sparkData && (
          <div className="mt-3 border-t border-[var(--color-border-subtle)] pt-2">
            <SparkAreaChart
              data={sparkData}
              index="idx"
              categories={['value']}
              colors={['blue']}
              fill="gradient"
              className="h-6 w-full"
            />
          </div>
        )}

        {/* Footer */}
        <div className={cn(
          'flex items-center justify-between pt-3',
          !sparkData && 'mt-3 border-t border-[var(--color-border-subtle)]',
        )}>
          <span className="text-xs font-medium text-[var(--color-text-muted)]">{bundle.sitesCount || 0} sites</span>
          {bundle.momentum && (
            <span className={cn(
              'text-[11px] font-semibold capitalize',
              bundle.momentum === 'accelerating' ? 'text-[var(--color-success)]' :
              bundle.momentum === 'decelerating' ? 'text-[var(--color-danger)]' :
              'text-[var(--color-text-muted)]',
            )}>
              {bundle.momentum}
            </span>
          )}
        </div>
      </div>

      {/* pt 19: Hover preview overlay */}
      <div className="absolute inset-0 flex items-end justify-center bg-gradient-to-t from-black/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
        <span className="mb-3 text-xs font-semibold text-[var(--color-text-muted)] bg-[var(--color-surface)]/90 backdrop-blur-sm px-3 py-1 rounded-full border border-[var(--color-border-subtle)]">
          View details →
        </span>
      </div>
    </Link>
  )
}
