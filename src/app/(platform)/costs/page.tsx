import { Topbar } from '@/components/layout/topbar'
import { KPICard } from '@/components/shared/kpi-card'
import { ChartCard } from '@/components/shared/chart-card'

export default function CostsPage() {
  return (
    <div>
      <Topbar title="Costs" description="Cost tracking and analysis" />

      <div className="space-y-6 p-8">
        <div className="grid grid-cols-4 gap-4">
          <KPICard label="Total Costs" value={8500} delta={2.1} format="currency" />
          <KPICard label="Avg Cost / Site" value={212.5} delta={1.8} format="currency" />
          <KPICard label="Highest Cost Site" value={450} format="currency" />
          <KPICard label="Unmatched Rows" value={3} format="number" />
        </div>

        <ChartCard title="Cost Breakdown" description="Costs by site and period">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border-subtle)]">
                  <th className="pb-3 text-left text-xs font-medium text-[var(--color-text-muted)]">Site</th>
                  <th className="pb-3 text-left text-xs font-medium text-[var(--color-text-muted)]">Bundle</th>
                  <th className="pb-3 text-right text-xs font-medium text-[var(--color-text-muted)]">Yesterday</th>
                  <th className="pb-3 text-right text-xs font-medium text-[var(--color-text-muted)]">7d Avg</th>
                  <th className="pb-3 text-right text-xs font-medium text-[var(--color-text-muted)]">30d Total</th>
                  <th className="pb-3 text-right text-xs font-medium text-[var(--color-text-muted)]">Change</th>
                  <th className="pb-3 text-center text-xs font-medium text-[var(--color-text-muted)]">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border-subtle)]">
                <tr className="hover:bg-[var(--color-background)]">
                  <td className="py-3 font-medium">site-01</td>
                  <td className="py-3 text-[var(--color-text-muted)]">Gays</td>
                  <td className="py-3 text-right tabular-nums">$85.00</td>
                  <td className="py-3 text-right tabular-nums">$82.50</td>
                  <td className="py-3 text-right tabular-nums">$2,475</td>
                  <td className="py-3 text-right tabular-nums text-red-600">+3.0%</td>
                  <td className="py-3 text-center"><span className="rounded-full bg-[var(--color-healthy-bg)] px-2 py-0.5 text-xs text-[var(--color-healthy)]">Matched</span></td>
                </tr>
                <tr className="hover:bg-[var(--color-background)]">
                  <td className="py-3 font-medium">site-02</td>
                  <td className="py-3 text-[var(--color-text-muted)]">Trans</td>
                  <td className="py-3 text-right tabular-nums">$72.00</td>
                  <td className="py-3 text-right tabular-nums">$68.50</td>
                  <td className="py-3 text-right tabular-nums">$2,055</td>
                  <td className="py-3 text-right tabular-nums text-red-600">+5.1%</td>
                  <td className="py-3 text-center"><span className="rounded-full bg-[var(--color-healthy-bg)] px-2 py-0.5 text-xs text-[var(--color-healthy)]">Matched</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </ChartCard>

        <ChartCard title="Cost Trend" description="Last 30 days">
          <div className="flex h-[200px] items-center justify-center text-sm text-[var(--color-text-muted)]">
            Cost trend chart will render here
          </div>
        </ChartCard>
      </div>
    </div>
  )
}
