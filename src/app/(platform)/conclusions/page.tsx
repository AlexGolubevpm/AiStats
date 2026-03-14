import { Topbar } from '@/components/layout/topbar'
import { InsightCard } from '@/components/shared/insight-card'

export default function ConclusionsPage() {
  return (
    <div>
      <Topbar title="Conclusions" description="Daily executive summary" />

      <div className="space-y-8 p-8">
        {/* Winners */}
        <section>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--color-text-primary)]">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Winners
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <InsightCard entity="Gays Bundle" entityType="bundle" metric="Revenue" value="$7,200" delta={8.2} reason="Strongest revenue day this month" action="Scale winning traffic sources" severity="low" type="opportunity" />
            <InsightCard entity="site-jav-01" entityType="site" metric="ROMI" value="245%" delta={15.3} reason="Excellent cost efficiency with growing traffic" action="Analyze and replicate approach" severity="low" type="opportunity" />
          </div>
        </section>

        {/* Losers */}
        <section>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--color-text-primary)]">
            <span className="h-2 w-2 rounded-full bg-red-500" />
            Losers
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <InsightCard entity="site-trans-03" entityType="site" metric="Traffic" value="45K" delta={-25.3} reason="Major traffic drop, potential source issue" action="Investigate traffic sources immediately" severity="critical" type="risk" />
            <InsightCard entity="Hentai Bundle" entityType="bundle" metric="Profit" value="$2,870" delta={-12.5} reason="Rising costs eating into margins" action="Review cost allocation" severity="high" type="risk" />
          </div>
        </section>

        {/* Risks */}
        <section>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--color-text-primary)]">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            Risks
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <InsightCard entity="PUSH format" entityType="format" metric="Fill Rate" value="62%" delta={-8.4} reason="Fill rate declining across all bundles" action="Contact ad partners about fill issues" severity="high" type="risk" />
            <InsightCard entity="Tier 3" entityType="tier" metric="RPM" value="$1.20" delta={-15.2} reason="Tier 3 monetization collapsing" action="Consider reducing Tier 3 traffic spend" severity="medium" type="risk" />
          </div>
        </section>

        {/* Opportunities */}
        <section>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--color-text-primary)]">
            <span className="h-2 w-2 rounded-full bg-blue-500" />
            Opportunities
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <InsightCard entity="VAST format" entityType="format" metric="eCPM" value="$4.80" delta={22.1} reason="Video monetization performing exceptionally" action="Expand VAST implementation to more sites" severity="low" type="opportunity" />
            <InsightCard entity="Tier 1 traffic" entityType="tier" metric="Revenue share" value="45%" delta={3.8} reason="Growing Tier 1 composition improving network RPM" action="Invest more in Tier 1 acquisition" severity="low" type="opportunity" />
          </div>
        </section>
      </div>
    </div>
  )
}
