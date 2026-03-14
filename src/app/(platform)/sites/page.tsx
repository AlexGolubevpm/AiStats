import { Topbar } from '@/components/layout/topbar'
import { HealthBadge } from '@/components/shared/health-badge'
import { DeltaIndicator } from '@/components/shared/delta-indicator'
import Link from 'next/link'

const sites = Array.from({ length: 12 }, (_, i) => ({
  id: `site-${i + 1}`,
  name: `site-${String(i + 1).padStart(2, '0')}`,
  bundle: ['Gays', 'Trans', 'JAV', 'Hentai'][i % 4],
  health: 55 + Math.floor(Math.random() * 40),
  traffic: 30000 + Math.floor(Math.random() * 120000),
  adRevenue: 300 + Math.floor(Math.random() * 1200),
  affiliateRevenue: 50 + Math.floor(Math.random() * 400),
  costs: 150 + Math.floor(Math.random() * 500),
  romi: 100 + Math.floor(Math.random() * 150),
  delta: -15 + Math.random() * 30,
}))

export default function SitesPage() {
  return (
    <div>
      <Topbar title="Sites" description="All sites across bundles" />

      <div className="p-8">
        <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)]">
                  <th className="sticky left-0 bg-[var(--color-surface)] px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted)]">Site</th>
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted)]">Bundle</th>
                  <th className="px-5 py-3 text-center text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted)]">Health</th>
                  <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted)]">Traffic</th>
                  <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted)]">Ad Revenue</th>
                  <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted)]">Affiliate</th>
                  <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted)]">Costs</th>
                  <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted)]">Profit</th>
                  <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted)]">ROMI</th>
                  <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted)]">Trend</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border-subtle)]">
                {sites.map((site) => {
                  const profit = site.adRevenue + site.affiliateRevenue - site.costs
                  return (
                    <tr key={site.id} className="transition-colors hover:bg-[var(--color-background)]">
                      <td className="sticky left-0 bg-[var(--color-surface)] px-5 py-3.5">
                        <Link href={`/sites/${site.id}`} className="font-medium text-[var(--color-accent)] hover:underline">
                          {site.name}
                        </Link>
                      </td>
                      <td className="px-5 py-3.5 text-[var(--color-text-secondary)]">{site.bundle}</td>
                      <td className="px-5 py-3.5 text-center"><HealthBadge score={site.health} showLabel={false} /></td>
                      <td className="px-5 py-3.5 text-right tabular-nums">{(site.traffic / 1000).toFixed(0)}K</td>
                      <td className="px-5 py-3.5 text-right tabular-nums">${site.adRevenue.toLocaleString()}</td>
                      <td className="px-5 py-3.5 text-right tabular-nums">${site.affiliateRevenue.toLocaleString()}</td>
                      <td className="px-5 py-3.5 text-right tabular-nums">${site.costs.toLocaleString()}</td>
                      <td className={`px-5 py-3.5 text-right tabular-nums font-medium ${profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        ${profit.toLocaleString()}
                      </td>
                      <td className="px-5 py-3.5 text-right tabular-nums">{site.romi}%</td>
                      <td className="px-5 py-3.5 text-right"><DeltaIndicator value={site.delta} /></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
