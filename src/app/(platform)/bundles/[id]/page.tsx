import { Topbar } from '@/components/layout/topbar'
import { KPICard } from '@/components/shared/kpi-card'
import { ChartCard } from '@/components/shared/chart-card'
import { HealthBadge } from '@/components/shared/health-badge'

export default function BundleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <div>
      <Topbar title="Bundle Detail" description="Bundle performance and analytics" />

      <div className="space-y-6 p-8">
        {/* Bundle KPIs */}
        <div className="grid grid-cols-5 gap-4">
          <KPICard label="Traffic" value={820000} delta={3.2} format="compact" />
          <KPICard label="Ad Revenue" value={5800} delta={1.5} format="currency" />
          <KPICard label="Affiliate Revenue" value={1400} delta={5.4} format="currency" />
          <KPICard label="Profit" value={4800} delta={2.1} format="currency" />
          <KPICard label="ROMI" value={200} delta={-1.2} format="percent" />
        </div>

        {/* Sites Table */}
        <ChartCard title="Sites in Bundle" description="Performance per site">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border-subtle)]">
                  <th className="pb-3 text-left text-xs font-medium text-[var(--color-text-muted)]">Site</th>
                  <th className="pb-3 text-right text-xs font-medium text-[var(--color-text-muted)]">Health</th>
                  <th className="pb-3 text-right text-xs font-medium text-[var(--color-text-muted)]">Traffic</th>
                  <th className="pb-3 text-right text-xs font-medium text-[var(--color-text-muted)]">Revenue</th>
                  <th className="pb-3 text-right text-xs font-medium text-[var(--color-text-muted)]">Profit</th>
                  <th className="pb-3 text-right text-xs font-medium text-[var(--color-text-muted)]">ROMI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border-subtle)]">
                {[1, 2, 3, 4, 5].map((i) => (
                  <tr key={i} className="hover:bg-[var(--color-background)]">
                    <td className="py-3 font-medium">site-{i.toString().padStart(2, '0')}</td>
                    <td className="py-3 text-right"><HealthBadge score={70 + Math.floor(Math.random() * 25)} showLabel={false} /></td>
                    <td className="py-3 text-right tabular-nums">{(50 + Math.floor(Math.random() * 100)).toLocaleString()}K</td>
                    <td className="py-3 text-right tabular-nums">${(500 + Math.floor(Math.random() * 1000)).toLocaleString()}</td>
                    <td className="py-3 text-right tabular-nums text-emerald-600">${(300 + Math.floor(Math.random() * 700)).toLocaleString()}</td>
                    <td className="py-3 text-right tabular-nums">{(120 + Math.floor(Math.random() * 100))}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartCard>

        {/* Format Breakdown */}
        <ChartCard title="Format Breakdown" description="Revenue by ad format">
          <div className="text-sm text-[var(--color-text-muted)]">
            Format breakdown charts will be rendered here with real data.
          </div>
        </ChartCard>
      </div>
    </div>
  )
}
