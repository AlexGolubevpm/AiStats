'use client'

import { ChartCard } from '@/components/shared/chart-card'
import { DeltaBadge } from '@/components/shared/delta-indicator'
import { formatCurrency, cn } from '@/lib/utils'
import { BUNDLE_ACCENTS } from './bundle-card'
import type { DashboardBundle } from '@/services/dashboard/types'

export function BundleComparisonChart({ bundles }: { bundles: DashboardBundle[] }) {
  const maxRevenue = Math.max(...bundles.map(b => b.totalRevenue ?? 0), 1)

  return (
    <ChartCard title="Bundle Revenue Comparison" description="Revenue breakdown by bundle">
      <div className="flex flex-col gap-4">
        {bundles.map(b => {
          const rev = b.totalRevenue ?? 0
          const pct = (rev / maxRevenue) * 100
          const accentClass = BUNDLE_ACCENTS[b.name] || 'bg-gray-400'

          return (
            <div key={b.id}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <div className={cn('h-2.5 w-2.5 rounded-full', accentClass)} />
                  <span className="text-sm font-semibold text-[var(--color-text-primary)]">{b.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold tabular-nums text-[var(--color-text-primary)]">
                    {formatCurrency(rev)}
                  </span>
                  {b.delta !== null && b.delta !== undefined && <DeltaBadge value={b.delta} size="sm" />}
                </div>
              </div>
              <div className="h-3 w-full rounded-full bg-[var(--color-surface-secondary)]">
                <div
                  className={cn('h-3 rounded-full transition-all duration-500', accentClass)}
                  style={{ width: `${Math.max(pct, 2)}%` }}
                />
              </div>
              <div className="mt-1 flex items-center gap-3 text-[11px] font-medium text-[var(--color-text-muted)]">
                <span>Profit: {formatCurrency(b.profit ?? 0)}</span>
                <span>ROMI: {(b.romi ?? 0).toFixed(1)}%</span>
                <span>RPM: ${(b.rpm ?? 0).toFixed(2)}</span>
              </div>
            </div>
          )
        })}
      </div>
    </ChartCard>
  )
}
