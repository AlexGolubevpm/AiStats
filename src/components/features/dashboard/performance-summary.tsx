'use client'

import { formatCurrency, cn } from '@/lib/utils'
import type { DashboardBundle } from '@/services/dashboard/types'

export function PerformanceSummary({ bundles }: { bundles: DashboardBundle[] }) {
  const totalRevenue = bundles.reduce((s, b) => s + (b.totalRevenue ?? 0), 0)
  const totalProfit = bundles.reduce((s, b) => s + (b.profit ?? 0), 0)
  const totalCosts = bundles.reduce((s, b) => s + (b.costs ?? 0), 0)
  const avgRomi = bundles.length > 0
    ? bundles.reduce((s, b) => s + (b.romi ?? 0), 0) / bundles.length
    : 0

  const metrics = [
    { label: 'Total Revenue', value: formatCurrency(totalRevenue), color: 'text-[var(--color-primary-600)]' },
    { label: 'Total Profit', value: formatCurrency(totalProfit), color: totalProfit >= 0 ? 'text-[var(--color-success-dark)]' : 'text-[var(--color-danger-dark)]' },
    { label: 'Total Costs', value: formatCurrency(totalCosts), color: 'text-[var(--color-text-primary)]' },
    { label: 'Avg ROMI', value: `${avgRomi.toFixed(1)}%`, color: avgRomi >= 100 ? 'text-[var(--color-success-dark)]' : 'text-[var(--color-warning-dark)]' },
  ]

  return (
    <div className="flex flex-col gap-3">
      {metrics.map(m => (
        <div
          key={m.label}
          className={cn(
            'rounded-[var(--radius-card)] bg-[var(--color-surface)]',
            'border border-[var(--color-border-subtle)]',
            'shadow-[var(--shadow-card)] p-4',
          )}
        >
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">{m.label}</p>
          <p className={cn('mt-1 text-executive-value', m.color)}>{m.value}</p>
        </div>
      ))}
    </div>
  )
}
