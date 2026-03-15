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

  return (
    <div className="space-y-8 p-8">
      <Section title="Winners" color="bg-emerald-500" items={data.winners} />
      <Section title="Losers" color="bg-red-500" items={data.losers} />
      <Section title="Risks" color="bg-amber-500" items={data.risks} />
      <Section title="Opportunities" color="bg-blue-500" items={data.opportunities} />
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
