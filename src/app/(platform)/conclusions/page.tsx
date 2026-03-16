'use client'

import { Suspense } from 'react'
import { motion } from 'framer-motion'
import { TopContextBar } from '@/components/layout/topbar'
import { WinnerCard, LoserCard, RiskCard, OpportunityCard } from '@/components/shared/insight-card'
import { KPICardSkeleton } from '@/components/shared/loading-skeleton'
import { useConclusions } from '@/hooks/use-api'
import { usePeriod } from '@/hooks/use-period'
import { Trophy, TrendingDown, AlertTriangle, Lightbulb } from 'lucide-react'

interface InsightItem {
  entity: string
  entityType: string
  metric: string
  value: string
  delta?: number
  reason: string
  action?: string
  severity: 'low' | 'medium' | 'high' | 'critical'
}

const fadeIn = {
  hidden: { opacity: 0, y: 8 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.18, delay: i * 0.03 },
  }),
}

function Section({
  title,
  icon: Icon,
  iconColor,
  bgColor,
  items,
  CardComponent,
}: {
  title: string
  icon: typeof Trophy
  iconColor: string
  bgColor: string
  items: InsightItem[]
  CardComponent: typeof WinnerCard
}) {
  if (!items || items.length === 0) return null

  // Sort by severity - critical first
  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
  const sorted = [...items].sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])

  return (
    <section>
      <div className="mb-4 flex items-center gap-3">
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${bgColor}`}>
          <Icon className={`h-4 w-4 ${iconColor}`} />
        </div>
        <div>
          <h3 className="text-[16px] font-semibold text-[var(--color-text-primary)]">{title}</h3>
          <span className="text-meta">{items.length} item{items.length > 1 ? 's' : ''}</span>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {sorted.map((item, i) => (
          <motion.div key={i} custom={i} variants={fadeIn}>
            <CardComponent {...item} />
          </motion.div>
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
      <div className="space-y-10 px-6 py-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
      <div className="px-6 py-8">
        <div className="flex flex-col items-center justify-center rounded-[var(--radius-card)] border border-dashed border-[var(--color-border-default)] py-20">
          <p className="text-[14px] text-[var(--color-text-muted)]">No conclusions available</p>
          <p className="mt-1.5 text-meta">Conclusions will be generated once metric data is synced</p>
        </div>
      </div>
    )
  }

  return (
    <motion.div className="space-y-10 px-6 py-8" initial="hidden" animate="visible">
      <Section
        title="Winners"
        icon={Trophy}
        iconColor="text-[var(--color-success-dark)]"
        bgColor="bg-[var(--color-success-bg)]"
        items={winners}
        CardComponent={WinnerCard}
      />
      <Section
        title="Losers"
        icon={TrendingDown}
        iconColor="text-[var(--color-danger-dark)]"
        bgColor="bg-[var(--color-danger-bg)]"
        items={losers}
        CardComponent={LoserCard}
      />
      <Section
        title="Risks"
        icon={AlertTriangle}
        iconColor="text-[var(--color-warning-dark)]"
        bgColor="bg-[var(--color-warning-bg)]"
        items={risks}
        CardComponent={RiskCard}
      />
      <Section
        title="Opportunities"
        icon={Lightbulb}
        iconColor="text-[var(--color-primary-700)]"
        bgColor="bg-[var(--color-primary-50)]"
        items={opportunities}
        CardComponent={OpportunityCard}
      />
    </motion.div>
  )
}

export default function ConclusionsPage() {
  return (
    <div>
      <TopContextBar title="Conclusions" subtitle="Daily executive summary" showExport />
      <Suspense fallback={
        <div className="space-y-10 px-6 py-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <KPICardSkeleton />
              <KPICardSkeleton />
            </div>
          ))}
        </div>
      }>
        <ConclusionsContent />
      </Suspense>
    </div>
  )
}
