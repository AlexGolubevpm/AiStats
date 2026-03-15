'use client'

import { Suspense } from 'react'
import { Topbar } from '@/components/layout/topbar'
import { InsightCard } from '@/components/shared/insight-card'
import { KPICardSkeleton } from '@/components/shared/loading-skeleton'
import { useConclusions } from '@/hooks/use-api'
import { usePeriod } from '@/hooks/use-period'

interface InsightItem {
  entity: string
  entityType: string
  metric: string
  value: string
  delta?: number
  reason: string
  action?: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  type?: 'risk' | 'opportunity' | 'info'
}

function Section({ title, color, items }: { title: string; color: string; items: InsightItem[] }) {
  if (!items || items.length === 0) return null
  return (
    <section>
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--color-text-primary)]">
        <span className={`h-2 w-2 rounded-full ${color}`} />
        {title}
      </h3>
      <div className="grid grid-cols-2 gap-3">
        {items.map((item, i) => (
          <InsightCard key={i} {...item} />
        ))}
      </div>
    </section>
  )
}

function ConclusionsContent() {
  const { period } = usePeriod()
  const { data, isLoading } = useConclusions(period)

  if (isLoading || !data) {
    return (
      <div className="space-y-8 p-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="grid grid-cols-2 gap-3">
            <KPICardSkeleton />
            <KPICardSkeleton />
          </div>
        ))}
      </div>
    )
  }

  const winners = data.winners || []
  const losers = data.losers || []
  const risks = data.risks || []
  const opportunities = data.opportunities || []

  const hasAny = winners.length > 0 || losers.length > 0 || risks.length > 0 || opportunities.length > 0

  if (!hasAny) {
    return (
      <div className="p-8">
        <div className="flex flex-col items-center justify-center rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] py-16">
          <p className="text-sm text-[var(--color-text-muted)]">No conclusions available</p>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">Conclusions will be generated once metric data is synced</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 p-8">
      <Section title="Winners" color="bg-emerald-500" items={winners} />
      <Section title="Losers" color="bg-red-500" items={losers} />
      <Section title="Risks" color="bg-amber-500" items={risks} />
      <Section title="Opportunities" color="bg-blue-500" items={opportunities} />
    </div>
  )
}

export default function ConclusionsPage() {
  return (
    <div>
      <Topbar title="Conclusions" description="Daily executive summary" />
      <Suspense fallback={<div className="space-y-8 p-8">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="grid grid-cols-2 gap-3"><KPICardSkeleton /><KPICardSkeleton /></div>)}</div>}>
        <ConclusionsContent />
      </Suspense>
    </div>
  )
}
