import { Topbar } from '@/components/layout/topbar'
import { HealthBadge } from '@/components/shared/health-badge'
import { DeltaIndicator } from '@/components/shared/delta-indicator'
import Link from 'next/link'

const bundles = [
  { id: 'gays', name: 'Gays', sites: 10, traffic: 820000, adRevenue: 5800, affiliateRevenue: 1400, totalRevenue: 7200, costs: 2400, profit: 4800, romi: 200, rpm: 8.78, health: 82, delta: 3.2, bestSite: 'gays-tube-01', worstSite: 'gays-tube-08', bestFormat: 'POP', worstFormat: 'SLIDER', color: 'var(--color-bundle-gays)' },
  { id: 'trans', name: 'Trans', sites: 10, traffic: 650000, adRevenue: 4200, affiliateRevenue: 1600, totalRevenue: 5800, costs: 2300, profit: 3500, romi: 152, rpm: 8.92, health: 71, delta: -2.1, bestSite: 'trans-tube-02', worstSite: 'trans-tube-07', bestFormat: 'BANNER', worstFormat: 'PUSH', color: 'var(--color-bundle-trans)' },
  { id: 'jav', name: 'JAV', sites: 10, traffic: 580000, adRevenue: 4000, affiliateRevenue: 1500, totalRevenue: 5500, costs: 2100, profit: 3400, romi: 162, rpm: 9.48, health: 76, delta: 1.5, bestSite: 'jav-tube-01', worstSite: 'jav-tube-09', bestFormat: 'VAST', worstFormat: 'OUTSTREAM', color: 'var(--color-bundle-jav)' },
  { id: 'hentai', name: 'Hentai', sites: 10, traffic: 400000, adRevenue: 3200, affiliateRevenue: 1370, totalRevenue: 4570, costs: 1700, profit: 2870, romi: 169, rpm: 11.43, health: 68, delta: -5.3, bestSite: 'hentai-tube-03', worstSite: 'hentai-tube-06', bestFormat: 'POP', worstFormat: 'PUSH', color: 'var(--color-bundle-hentai)' },
]

export default function BundlesPage() {
  return (
    <div>
      <Topbar title="Bundles" description="Performance by bundle group" />

      <div className="p-8">
        <div className="grid grid-cols-2 gap-5">
          {bundles.map((bundle) => (
            <Link
              key={bundle.id}
              href={`/bundles/${bundle.id}`}
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
                  <span>Best: <span className="text-[var(--color-text-secondary)]">{bundle.bestFormat}</span></span>
                  <span>Worst: <span className="text-[var(--color-text-secondary)]">{bundle.worstFormat}</span></span>
                </div>
                <DeltaIndicator value={bundle.delta} />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
