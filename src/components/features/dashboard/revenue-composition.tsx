'use client'

import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/utils'
import type { DashboardBundle } from '@/services/dashboard/types'

interface RevenueCompositionProps {
  bundles: DashboardBundle[]
}

export function RevenueComposition({ bundles }: RevenueCompositionProps) {
  const totalAd = bundles.reduce((s, b) => s + (b.adRevenue ?? 0), 0)
  const totalAffiliate = bundles.reduce((s, b) => s + (b.affiliateRevenue ?? 0), 0)
  const total = totalAd + totalAffiliate
  const adPct = total > 0 ? (totalAd / total) * 100 : 0
  const affPct = total > 0 ? (totalAffiliate / total) * 100 : 0

  return (
    <div className={cn(
      'rounded-[var(--radius-card)] bg-[var(--color-surface)]',
      'border border-[var(--color-border-subtle)]',
      'shadow-[var(--shadow-card)] p-4 flex-1',
    )}>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Revenue Breakdown</p>

      {/* Stacked bar */}
      <div className="mt-3 h-3 w-full rounded-full overflow-hidden bg-[var(--color-surface-secondary)] flex">
        {adPct > 0 && (
          <div
            className="h-full bg-[var(--color-primary-500)] transition-all duration-500"
            style={{ width: `${adPct}%` }}
          />
        )}
        {affPct > 0 && (
          <div
            className="h-full bg-[#EC4899] transition-all duration-500"
            style={{ width: `${affPct}%` }}
          />
        )}
      </div>

      {/* Legend */}
      <div className="mt-3 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-[var(--color-primary-500)]" />
            <span className="text-xs font-medium text-[var(--color-text-muted)]">Ad Revenue</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold tabular-nums text-[var(--color-text-primary)]">{formatCurrency(totalAd)}</span>
            <span className="text-xs text-[var(--color-text-disabled)] tabular-nums">{adPct.toFixed(0)}%</span>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-[#EC4899]" />
            <span className="text-xs font-medium text-[var(--color-text-muted)]">Affiliate</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold tabular-nums text-[var(--color-text-primary)]">{formatCurrency(totalAffiliate)}</span>
            <span className="text-xs text-[var(--color-text-disabled)] tabular-nums">{affPct.toFixed(0)}%</span>
          </div>
        </div>
      </div>
    </div>
  )
}
