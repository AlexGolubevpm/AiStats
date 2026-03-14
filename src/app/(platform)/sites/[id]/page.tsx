import { Topbar } from '@/components/layout/topbar'
import { KPICard } from '@/components/shared/kpi-card'
import { ChartCard } from '@/components/shared/chart-card'
import { HealthBadge } from '@/components/shared/health-badge'
import { InsightCard } from '@/components/shared/insight-card'

export default function SiteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <div>
      <Topbar title="Site Detail" description="Site-level analytics and control center" />

      <div className="space-y-6 p-8">
        {/* Site Header */}
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold">site-01</h2>
          <span className="rounded-full bg-[var(--color-accent-light)] px-2.5 py-0.5 text-xs font-medium text-[var(--color-accent)]">Gays</span>
          <HealthBadge score={82} />
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-5 gap-4">
          <KPICard label="Traffic" value={82000} delta={3.2} format="compact" />
          <KPICard label="Ad Revenue" value={580} delta={-1.8} format="currency" />
          <KPICard label="Affiliate Revenue" value={140} delta={5.4} format="currency" />
          <KPICard label="Costs" value={240} delta={2.1} format="currency" />
          <KPICard label="ROMI" value={200} delta={-2.8} format="percent" />
        </div>

        {/* Tabs placeholder */}
        <div className="flex gap-1 border-b border-[var(--color-border)]">
          {['Overview', 'Formats', 'GEO/Tiers', 'Costs', 'Affiliate', 'Trends', 'Recommendations'].map((tab, i) => (
            <button
              key={tab}
              className={`px-4 py-2.5 text-sm font-medium transition-colors ${i === 0 ? 'border-b-2 border-[var(--color-accent)] text-[var(--color-accent)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'}`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Overview Content */}
        <div className="grid grid-cols-2 gap-5">
          <ChartCard title="Revenue Trend" description="Last 30 days">
            <div className="flex h-[200px] items-center justify-center text-sm text-[var(--color-text-muted)]">
              Revenue chart will render here
            </div>
          </ChartCard>
          <ChartCard title="Traffic Trend" description="Last 30 days">
            <div className="flex h-[200px] items-center justify-center text-sm text-[var(--color-text-muted)]">
              Traffic chart will render here
            </div>
          </ChartCard>
        </div>

        {/* Recommendations */}
        <div>
          <h3 className="mb-3 text-sm font-medium">Recommendations</h3>
          <div className="grid grid-cols-2 gap-3">
            <InsightCard
              entity="POP format"
              entityType="format"
              metric="Revenue share"
              value="45%"
              delta={-3.2}
              reason="POP revenue declining, consider adjusting placement"
              action="Test new POP positions"
              severity="medium"
              type="risk"
            />
            <InsightCard
              entity="Tier 1 traffic"
              entityType="tier"
              metric="RPM"
              value="$12.50"
              delta={8.1}
              reason="Tier 1 RPM growing strongly"
              action="Increase Tier 1 traffic acquisition"
              severity="low"
              type="opportunity"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
