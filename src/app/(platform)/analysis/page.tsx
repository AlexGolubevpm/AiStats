import { Topbar } from '@/components/layout/topbar'
import { ChartCard } from '@/components/shared/chart-card'
import { Brain, RefreshCw } from 'lucide-react'

export default function AnalysisPage() {
  return (
    <div>
      <Topbar title="Analysis" description="AI-powered insights and recommendations" />

      <div className="space-y-6 p-8">
        {/* AI Summary */}
        <ChartCard
          title="Executive Summary"
          description="AI-generated analysis powered by Claude"
          action={
            <button className="flex items-center gap-1.5 rounded-[var(--radius-md)] bg-[var(--color-accent)] px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90">
              <RefreshCw className="h-3.5 w-3.5" />
              Run Analysis
            </button>
          }
        >
          <div className="flex items-start gap-4 rounded-[var(--radius-md)] bg-[var(--color-accent-light)] p-4">
            <Brain className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-accent)]" />
            <div className="space-y-3 text-sm text-[var(--color-text-secondary)]">
              <p>
                <strong>Network is profitable but showing early warning signs.</strong> Overall profit remains positive at $14,570 with 171% ROMI, but three key metrics are trending down: fill rate (-4.2%), Tier 3 RPM (-15.2%), and PUSH format CTR (-6.8%).
              </p>
              <p>
                The Gays bundle is the strongest performer, contributing 33% of total profit. Hentai bundle requires attention due to rising costs and declining ROMI.
              </p>
              <p>
                <strong>Priority actions:</strong> (1) Investigate PUSH format fill rate decline, (2) Review Hentai bundle cost structure, (3) Scale VAST format across all bundles.
              </p>
            </div>
          </div>
        </ChartCard>

        {/* Recommendations by Category */}
        <div className="grid grid-cols-2 gap-5">
          <ChartCard title="Top 3 Risks" description="Issues requiring immediate attention">
            <div className="space-y-3">
              <div className="rounded-[var(--radius-md)] border border-red-100 bg-red-50 p-3">
                <p className="text-sm font-medium text-red-800">1. PUSH format fill rate collapse</p>
                <p className="mt-1 text-xs text-red-600">Fill rate down 8.4% across network, affecting 60% of sites</p>
              </div>
              <div className="rounded-[var(--radius-md)] border border-orange-100 bg-orange-50 p-3">
                <p className="text-sm font-medium text-orange-800">2. Hentai bundle cost pressure</p>
                <p className="mt-1 text-xs text-orange-600">Costs up 12% while revenue flat — ROMI at risk</p>
              </div>
              <div className="rounded-[var(--radius-md)] border border-amber-100 bg-amber-50 p-3">
                <p className="text-sm font-medium text-amber-800">3. Tier 3 monetization decline</p>
                <p className="mt-1 text-xs text-amber-600">RPM dropped 15% — consider reducing Tier 3 traffic spend</p>
              </div>
            </div>
          </ChartCard>

          <ChartCard title="Top 3 Opportunities" description="Areas to scale and optimize">
            <div className="space-y-3">
              <div className="rounded-[var(--radius-md)] border border-emerald-100 bg-emerald-50 p-3">
                <p className="text-sm font-medium text-emerald-800">1. VAST format expansion</p>
                <p className="mt-1 text-xs text-emerald-600">eCPM up 22% — expand to 15 more sites for estimated +$2K/mo</p>
              </div>
              <div className="rounded-[var(--radius-md)] border border-emerald-100 bg-emerald-50 p-3">
                <p className="text-sm font-medium text-emerald-800">2. Tier 1 traffic growth</p>
                <p className="mt-1 text-xs text-emerald-600">RPM 3x higher than Tier 3 — shift budget toward T1 acquisition</p>
              </div>
              <div className="rounded-[var(--radius-md)] border border-emerald-100 bg-emerald-50 p-3">
                <p className="text-sm font-medium text-emerald-800">3. Gays bundle scaling</p>
                <p className="mt-1 text-xs text-emerald-600">Best ROMI at 200% with room to grow — increase traffic 20%</p>
              </div>
            </div>
          </ChartCard>
        </div>
      </div>
    </div>
  )
}
