import { Topbar } from '@/components/layout/topbar'
import { KPICard } from '@/components/shared/kpi-card'
import { ChartCard } from '@/components/shared/chart-card'

export default function AffiliatePage() {
  return (
    <div>
      <Topbar title="Affiliate" description="Affiliate and SPA revenue tracking" />

      <div className="space-y-6 p-8">
        <div className="grid grid-cols-4 gap-4">
          <KPICard label="Total Affiliate Revenue" value={4320.25} delta={5.4} format="currency" />
          <KPICard label="Share in Total Revenue" value={18.7} delta={1.2} format="percent" />
          <KPICard label="Best Affiliate Site" value={680} format="currency" />
          <KPICard label="Active Programs" value={8} format="number" />
        </div>

        <ChartCard title="Affiliate Revenue by Site" description="Revenue contribution">
          <div className="flex h-[250px] items-center justify-center text-sm text-[var(--color-text-muted)]">
            Affiliate revenue chart will render here
          </div>
        </ChartCard>

        <ChartCard title="Revenue Trend" description="Affiliate vs Ad revenue over time">
          <div className="flex h-[200px] items-center justify-center text-sm text-[var(--color-text-muted)]">
            Comparison chart will render here
          </div>
        </ChartCard>
      </div>
    </div>
  )
}
