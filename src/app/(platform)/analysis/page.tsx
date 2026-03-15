'use client'

import { Suspense } from 'react'
import { Topbar } from '@/components/layout/topbar'
import { ChartCard } from '@/components/shared/chart-card'
import { ChartSkeleton } from '@/components/shared/loading-skeleton'
import { Button } from '@/components/ui/button'
import { Brain, RefreshCw, Loader2 } from 'lucide-react'
import { useAnalysis, useRunAnalysis } from '@/hooks/use-api'

function AnalysisContent() {
  const { data, isLoading } = useAnalysis()
  const runAnalysis = useRunAnalysis()

  if (isLoading) {
    return (
      <div className="space-y-6 p-8">
        <ChartSkeleton />
        <div className="grid grid-cols-2 gap-5">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-8">
      {/* AI Summary */}
      <ChartCard
        title="Executive Summary"
        description="AI-generated analysis powered by Claude"
        action={
          <Button
            size="sm"
            onClick={() => runAnalysis.mutate()}
            disabled={runAnalysis.isPending}
          >
            {runAnalysis.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            {runAnalysis.isPending ? 'Running...' : 'Run Analysis'}
          </Button>
        }
      >
        <div className="flex items-start gap-4 rounded-[var(--radius-md)] bg-[var(--color-accent-light)] p-4">
          <Brain className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-accent)]" />
          <div className="space-y-3 text-sm text-[var(--color-text-secondary)]">
            {data?.summary ? (
              data.summary.split('\n').map((p: string, i: number) => <p key={i}>{p}</p>)
            ) : (
              <p>No analysis available. Click &quot;Run Analysis&quot; to generate one.</p>
            )}
          </div>
        </div>
      </ChartCard>

      {/* Risks & Opportunities */}
      <div className="grid grid-cols-2 gap-5">
        <ChartCard title="Top Risks" description="Issues requiring immediate attention">
          <div className="space-y-3">
            {data?.risks && Array.isArray(data.risks) ? (
              data.risks.map((risk: string | { title: string; description: string }, i: number) => {
                const title = typeof risk === 'string' ? risk : risk.title
                const desc = typeof risk === 'string' ? null : risk.description
                return (
                <div key={i} className="rounded-[var(--radius-md)] border border-red-100 bg-red-50 p-3">
                  <p className="text-sm font-medium text-red-800">{i + 1}. {title}</p>
                  {desc && <p className="mt-1 text-xs text-red-600">{desc}</p>}
                </div>)
              })
            ) : (
              <p className="text-sm text-[var(--color-text-muted)]">No risks identified.</p>
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
                <div key={i} className="rounded-[var(--radius-md)] border border-emerald-100 bg-emerald-50 p-3">
                  <p className="text-sm font-medium text-emerald-800">{i + 1}. {title}</p>
                  {desc && <p className="mt-1 text-xs text-emerald-600">{desc}</p>}
                </div>)
              })
            ) : (
              <p className="text-sm text-[var(--color-text-muted)]">No opportunities identified.</p>
            )}
          </div>
        </ChartCard>
      </div>
    </div>
  )
}

export default function AnalysisPage() {
  return (
    <div>
      <Topbar title="Analysis" description="AI-powered insights and recommendations" />
      <Suspense fallback={<div className="space-y-6 p-8"><ChartSkeleton /></div>}>
        <AnalysisContent />
      </Suspense>
    </div>
  )
}
