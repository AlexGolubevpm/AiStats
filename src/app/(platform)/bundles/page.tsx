'use client'

import { Suspense } from 'react'
import { motion } from 'framer-motion'
import { TopContextBar } from '@/components/layout/topbar'
import { HealthBadge } from '@/components/shared/health-badge'
import { MetricDelta } from '@/components/shared/delta-indicator'
import { KPICardSkeleton } from '@/components/shared/loading-skeleton'
import { useBundles } from '@/hooks/use-api'
import { usePeriod } from '@/hooks/use-period'
import { formatCurrency, formatCompact } from '@/lib/utils'
import { ChevronRight } from 'lucide-react'
import Link from 'next/link'

const fadeIn = {
  hidden: { opacity: 0, y: 8 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.18, delay: i * 0.05 },
  }),
}

function BundlesContent() {
  const { period } = usePeriod()
  const { data: bundles, isLoading } = useBundles(period)

  if (isLoading || !bundles) {
    return (
      <div className="px-6 py-8">
        <div className="grid grid-cols-2 gap-5">
          {Array.from({ length: 4 }).map((_, i) => <KPICardSkeleton key={i} />)}
        </div>
      </div>
    )
  }

  if (bundles.length === 0) {
    return (
      <div className="px-6 py-8">
        <div className="flex flex-col items-center justify-center rounded-[var(--radius-card)] border border-dashed border-[var(--color-border-default)] py-20">
          <p className="text-[14px] text-[var(--color-text-muted)]">No bundles configured</p>
          <p className="mt-1.5 text-meta">Add bundles in Settings to get started</p>
        </div>
      </div>
    )
  }

  return (
    <motion.div className="px-6 py-8" initial="hidden" animate="visible">
      <div className="grid grid-cols-2 gap-5">
        {bundles.map((bundle: { id: string; name: string; slug: string; color: string; sitesCount: number; traffic: number; adRevenue: number; affiliateRevenue: number; totalRevenue: number; costs: number; profit: number; romi: number; rpm: number; health: number | null; delta: number }, i: number) => (
          <motion.div key={bundle.id} custom={i} variants={fadeIn}>
            <Link
              href={`/bundles/${bundle.slug}`}
              className="group block rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)] transition-all duration-150 hover:-translate-y-px hover:shadow-[var(--shadow-elevated)]"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-4 w-4 rounded-full" style={{ backgroundColor: bundle.color }} />
                  <h3 className="text-[18px] font-bold">{bundle.name}</h3>
                  <span className="text-meta">{bundle.sitesCount || 0} sites</span>
                </div>
                <div className="flex items-center gap-2">
                  {bundle.health != null && <HealthBadge score={bundle.health} />}
                  <ChevronRight className="h-4 w-4 text-[var(--color-text-disabled)] transition-transform group-hover:translate-x-0.5" />
                </div>
              </div>

              <div className="mt-5 grid grid-cols-4 gap-4">
                {[
                  { label: 'Requests', value: formatCompact(bundle.requests || 0) },
                  { label: 'Ad Revenue', value: formatCurrency(bundle.adRevenue || 0) },
                  { label: 'Affiliate', value: formatCurrency(bundle.affiliateRevenue || 0) },
                  { label: 'Total Revenue', value: formatCurrency(bundle.totalRevenue || 0) },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-meta">{label}</p>
                    <p className="mt-1 text-[14px] font-semibold tabular-nums">{value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-3 grid grid-cols-4 gap-4">
                <div>
                  <p className="text-meta">Costs</p>
                  <p className="mt-1 text-[14px] font-semibold tabular-nums">{formatCurrency(bundle.costs || 0)}</p>
                </div>
                <div>
                  <p className="text-meta">Profit</p>
                  <p className="mt-1 text-[14px] font-semibold tabular-nums text-[var(--color-success-dark)]">{formatCurrency(bundle.profit || 0)}</p>
                </div>
                <div>
                  <p className="text-meta">ROMI</p>
                  <p className="mt-1 text-[14px] font-semibold tabular-nums">{(bundle.romi || 0).toFixed(1)}%</p>
                </div>
                <div>
                  <p className="text-meta">RPM</p>
                  <p className="mt-1 text-[14px] font-semibold tabular-nums">{formatCurrency(bundle.rpm || 0)}</p>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-end border-t border-[var(--color-border-subtle)] pt-4">
                <MetricDelta value={bundle.delta || 0} />
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}

export default function BundlesPage() {
  return (
    <div>
      <TopContextBar title="Bundles" subtitle="Performance by bundle group" />
      <Suspense fallback={<div className="px-6 py-8"><div className="grid grid-cols-2 gap-5">{Array.from({ length: 4 }).map((_, i) => <KPICardSkeleton key={i} />)}</div></div>}>
        <BundlesContent />
      </Suspense>
    </div>
  )
}
