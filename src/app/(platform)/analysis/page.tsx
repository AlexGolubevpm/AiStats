'use client'

import { Suspense } from 'react'
import { motion } from 'framer-motion'
import { TopContextBar } from '@/components/layout/topbar'
import { ChartCard } from '@/components/shared/chart-card'
import { ChartSkeleton } from '@/components/shared/loading-skeleton'
import { ErrorState } from '@/components/shared/error-state'
import { Button } from '@/components/ui/button'
import { Brain, RefreshCw, Loader2 } from 'lucide-react'
import { useAnalysis, useRunAnalysis } from '@/hooks/use-api'

function AnalysisContent() {
  const { data, isLoading, error } = useAnalysis()
  const runAnalysis = useRunAnalysis()

  if (isLoading) {
    return (
      <div className="space-y-8 px-6 py-8">
        <ChartSkeleton />
        <div className="grid grid-cols-2 gap-5">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
      </div>
    )
  }

  if (error) {
    return <div className="px-6 py-8"><ErrorState /></div>
  }

  return (
    <motion.div
      className="space-y-8 px-6 py-8"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
    >
      <ChartCard
        title="Executive Summary"
        description="AI-generated analysis powered by Claude"
        action={
          <Button
            size="sm"
            onClick={() => runAnalysis.mutate()}
            disabled={runAnalysis.isPending}
            className="h-9 rounded-[var(--radius-control)] text-[13px]"
          >
            {runAnalysis.isPending ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            )}
            {runAnalysis.isPending ? 'Running...' : 'Run Analysis'}
          </Button>
        }
      >
        <div className="flex items-start gap-4 rounded-[var(--radius-card)] bg-[var(--color-primary-50)] p-5">
          <Brain className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-primary-600)]" />
          <div className="space-y-3 text-[13px] leading-relaxed text-[var(--color-text-secondary)]">
            {data?.summary ? (
              data.summary.split('\n').map((p: string, i: number) => <p key={i}>{p}</p>)
            ) : (
              <p>No analysis available. Click &quot;Run Analysis&quot; to generate one.</p>
            )}
          </div>
        </div>
      </ChartCard>

      <div className="grid grid-cols-2 gap-5">
        <ChartCard title="Top Risks" description="Issues requiring immediate attention">
          <div className="space-y-3">
            {data?.risks && Array.isArray(data.risks) ? (
              data.risks.map((risk: string | { title: string; description: string }, i: number) => {
                const title = typeof risk === 'string' ? risk : risk.title
                const desc = typeof risk === 'string' ? null : risk.description
                return (
                  <div key={i} className="rounded-[var(--radius-control)] border border-[var(--color-danger)]/20 bg-[var(--color-danger-bg)] p-3.5">
                    <p className="text-[13px] font-semibold text-[var(--color-danger-dark)]">{i + 1}. {title}</p>
                    {desc && <p className="mt-1 text-[12px] text-[var(--color-danger-dark)]/70">{desc}</p>}
                  </div>
                )
              })
            ) : (
              <p className="text-[13px] text-[var(--color-text-muted)]">No risks identified.</p>
            )}
          </div>
        </ChartCard>

        <ChartCard title="Top Opportunities" description="Areas to scale and optimize">
          <div className="space-y-3">
            {data?.opportunities && Array.isArray(data.opportunities) ? (
              data.opportunities.map((opp: string | { title: string; description: string }, i: number) => {
                const title = typeof opp === 'string' ? opp : opp.title
                const desc = typeof opp === 'string' ? null : opp.description
                return (
                  <div key={i} className="rounded-[var(--radius-control)] border border-[var(--color-success)]/20 bg-[var(--color-success-bg)] p-3.5">
                    <p className="text-[13px] font-semibold text-[var(--color-success-dark)]">{i + 1}. {title}</p>
                    {desc && <p className="mt-1 text-[12px] text-[var(--color-success-dark)]/70">{desc}</p>}
                  </div>
                )
              })
            ) : (
              <p className="text-[13px] text-[var(--color-text-muted)]">No opportunities identified.</p>
            )}
          </div>
        </ChartCard>
      </div>
    </motion.div>
  )
}

export default function AnalysisPage() {
  return (
    <div>
      <TopContextBar title="Analysis" subtitle="AI-powered insights and recommendations" showPeriod={false} />
      <Suspense fallback={<div className="space-y-8 px-6 py-8"><ChartSkeleton /></div>}>
        <AnalysisContent />
      </Suspense>
    </div>
  )
}
