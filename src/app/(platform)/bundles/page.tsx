'use client'

import { Suspense } from 'react'
import { Topbar } from '@/components/layout/topbar'
import { HealthBadge } from '@/components/shared/health-badge'
import { DeltaIndicator } from '@/components/shared/delta-indicator'
import { KPICardSkeleton } from '@/components/shared/loading-skeleton'
import { useBundles } from '@/hooks/use-api'
import { usePeriod } from '@/hooks/use-period'
import Link from 'next/link'

function BundlesContent() {
  const { period } = usePeriod()
  const { data: bundles, isLoading } = useBundles(period)

  if (isLoading || !bundles) {
    return (
      <div className="p-8">
        <div className="grid grid-cols-2 gap-5">
          {Array.from({ length: 4 }).map((_, i) => <KPICardSkeleton key={i} />)}
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="grid grid-cols-2 gap-5">
        {bundles.map((bundle: { id: string; name: string; slug: string; color: string; sites: number; traffic: number; adRevenue: number; affiliateRevenue: number; totalRevenue: number; costs: number; profit: number; romi: number; rpm: number; health: number; delta: number; bestFormat?: string; worstFormat?: string }) => (
          <Link
            key={bundle.id}
            href={`/bundles/${bundle.slug}`}
            className="group rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-sm)] transition-all hover:shadow-[var(--shadow-lg)]"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-4 w-4 rounded-full" style={{ backgroundColor: bundle.color }} />
                <h3 className="text-lg font-semibold">{bundle.name}</h3>
                <span className="text-sm text-[var(--color-text-muted)]">{bundle.sites} sites</span>
              </div>
              <HealthBadge score={bundle.health} />
            </div>

            <div className="mt-5 grid grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-[var(--color-text-muted)]">Traffic</p>
                <p className="mt-1 text-sm font-medium tabular-nums">{(bundle.traffic / 1000).toFixed(0)}K</p>
              </div>
              <div>
                <p className="text-xs text-[var(--color-text-muted)]">Ad Revenue</p>
                <p className="mt-1 text-sm font-medium tabular-nums">${bundle.adRevenue.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--color-text-muted)]">Affiliate</p>
                <p className="mt-1 text-sm font-medium tabular-nums">${bundle.affiliateRevenue.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--color-text-muted)]">Total Revenue</p>
                <p className="mt-1 text-sm font-medium tabular-nums">${bundle.totalRevenue.toLocaleString()}</p>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-[var(--color-text-muted)]">Costs</p>
                <p className="mt-1 text-sm font-medium tabular-nums">${bundle.costs.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--color-text-muted)]">Profit</p>
                <p className="mt-1 text-sm font-medium tabular-nums text-emerald-600">${bundle.profit.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--color-text-muted)]">ROMI</p>
                <p className="mt-1 text-sm font-medium tabular-nums">{bundle.romi}%</p>
              </div>
              <div>
                <p className="text-xs text-[var(--color-text-muted)]">RPM</p>
                <p className="mt-1 text-sm font-medium tabular-nums">${bundle.rpm}</p>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-[var(--color-border-subtle)] pt-4">
              <div className="flex gap-4 text-xs text-[var(--color-text-muted)]">
                {bundle.bestFormat && <span>Best: <span className="text-[var(--color-text-secondary)]">{bundle.bestFormat}</span></span>}
                {bundle.worstFormat && <span>Worst: <span className="text-[var(--color-text-secondary)]">{bundle.worstFormat}</span></span>}
              </div>
              <DeltaIndicator value={bundle.delta} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

export default function BundlesPage() {
  return (
    <div>
      <Topbar title="Bundles" description="Performance by bundle group" />
      <Suspense fallback={<div className="p-8"><div className="grid grid-cols-2 gap-5">{Array.from({ length: 4 }).map((_, i) => <KPICardSkeleton key={i} />)}</div></div>}>
        <BundlesContent />
      </Suspense>
    </div>
  )
}
