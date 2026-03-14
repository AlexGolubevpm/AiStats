import { Topbar } from '@/components/layout/topbar'
import { KPICard } from '@/components/shared/kpi-card'
import { ChartCard } from '@/components/shared/chart-card'
import { InsightCard } from '@/components/shared/insight-card'
import { HealthBadge } from '@/components/shared/health-badge'

// Mock data for initial rendering
const kpis = [
  { label: 'Total Traffic', value: 2450000, delta: 3.2, format: 'compact' as const, trend: [2100, 2200, 2300, 2150, 2400, 2350, 2450] },
  { label: 'Ad Revenue', value: 18750.50, delta: -1.8, format: 'currency' as const, trend: [19200, 19100, 18900, 18600, 18800, 18700, 18750] },
  { label: 'Affiliate Revenue', value: 4320.25, delta: 5.4, format: 'currency' as const, trend: [3800, 3900, 4000, 4100, 4200, 4280, 4320] },
  { label: 'Total Revenue', value: 23070.75, delta: 0.2, format: 'currency' as const, trend: [23000, 23100, 22900, 22700, 23000, 22980, 23070] },
  { label: 'Total Costs', value: 8500.00, delta: 2.1, format: 'currency' as const, trend: [8200, 8300, 8250, 8400, 8350, 8450, 8500] },
  { label: 'Net Profit', value: 14570.75, delta: -0.8, format: 'currency' as const, trend: [14800, 14700, 14650, 14300, 14650, 14530, 14570] },
  { label: 'ROMI', value: 171.4, delta: -2.8, format: 'percent' as const, trend: [180, 178, 175, 170, 174, 172, 171] },
  { label: 'Revenue / 1K Users', value: 9.42, delta: -4.8, format: 'currency' as const, trend: [9.8, 9.7, 9.6, 9.5, 9.45, 9.43, 9.42] },
  { label: 'Network Health', value: 74, delta: -3, format: 'score' as const, trend: [78, 77, 76, 75, 74, 74, 74] },
]

const bundles = [
  { name: 'Gays', sites: 10, traffic: 820000, revenue: 7200, profit: 4800, romi: 200, health: 82, color: 'var(--color-bundle-gays)' },
  { name: 'Trans', sites: 10, traffic: 650000, revenue: 5800, profit: 3500, romi: 152, health: 71, color: 'var(--color-bundle-trans)' },
  { name: 'JAV', sites: 10, traffic: 580000, revenue: 5500, profit: 3400, romi: 162, health: 76, color: 'var(--color-bundle-jav)' },
  { name: 'Hentai', sites: 10, traffic: 400000, revenue: 4570, profit: 2870, romi: 169, health: 68, color: 'var(--color-bundle-hentai)' },
]

export default function DashboardPage() {
  return (
    <div>
      <Topbar title="Dashboard" description="Network overview and key metrics" />

      <div className="space-y-6 p-8">
        {/* KPI Row */}
        <div className="grid grid-cols-3 gap-4 xl:grid-cols-5">
          {kpis.slice(0, 5).map((kpi) => (
            <KPICard key={kpi.label} {...kpi} />
          ))}
        </div>
        <div className="grid grid-cols-4 gap-4">
          {kpis.slice(5).map((kpi) => (
            <KPICard key={kpi.label} {...kpi} />
          ))}
        </div>

        {/* Bundles Overview */}
        <ChartCard title="Bundles Overview" description="Performance by bundle">
          <div className="grid grid-cols-4 gap-4">
            {bundles.map((bundle) => (
              <div
                key={bundle.name}
                className="rounded-[var(--radius-md)] border border-[var(--color-border)] p-4 transition-shadow hover:shadow-[var(--shadow-md)]"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: bundle.color }}
                    />
                    <span className="text-sm font-medium">{bundle.name}</span>
                  </div>
                  <HealthBadge score={bundle.health} showLabel={false} />
                </div>
                <div className="mt-3 space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-[var(--color-text-muted)]">Sites</span>
                    <span className="tabular-nums">{bundle.sites}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-[var(--color-text-muted)]">Traffic</span>
                    <span className="tabular-nums">{(bundle.traffic / 1000).toFixed(0)}K</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-[var(--color-text-muted)]">Revenue</span>
                    <span className="tabular-nums">${bundle.revenue.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-[var(--color-text-muted)]">Profit</span>
                    <span className="tabular-nums font-medium text-emerald-600">
                      ${bundle.profit.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-[var(--color-text-muted)]">ROMI</span>
                    <span className="tabular-nums">{bundle.romi}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ChartCard>

        {/* Operational Insights */}
        <div>
          <h3 className="mb-3 text-sm font-medium text-[var(--color-text-primary)]">
            Operational Insights
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <InsightCard
              entity="Gays Bundle"
              entityType="bundle"
              metric="Profit"
              value="$4,800"
              delta={8.2}
              reason="Strong ad revenue growth driven by Tier 1 traffic increase"
              action="Scale traffic acquisition for top-performing sites"
              severity="low"
              type="opportunity"
            />
            <InsightCard
              entity="Hentai Bundle"
              entityType="bundle"
              metric="ROMI"
              value="169%"
              delta={-12.5}
              reason="Rising costs with declining fill rates on push format"
              action="Review push format performance and consider reducing spend"
              severity="high"
              type="risk"
            />
            <InsightCard
              entity="site-trans-03"
              entityType="site"
              metric="Traffic"
              value="45K"
              delta={-25.3}
              reason="Significant traffic drop detected over last 3 days"
              action="Check traffic sources and investigate potential blocking"
              severity="critical"
              type="risk"
            />
            <InsightCard
              entity="JAV Bundle"
              entityType="bundle"
              metric="Revenue/1K"
              value="$9.82"
              delta={4.1}
              reason="Improved monetization from banner format optimization"
              action="Apply same optimization to Trans and Hentai bundles"
              severity="low"
              type="opportunity"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
