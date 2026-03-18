'use client'

import { TrendingDown, AlertTriangle, Trophy, TrendingUp } from 'lucide-react'
import { DeltaBadge } from '@/components/shared/delta-indicator'
import { formatCurrency, cn } from '@/lib/utils'

interface SignalData {
  type: 'strongest' | 'drop' | 'risk' | 'recovery'
  entity: string
  value: number
  delta: number
  reason: string
}

const SIGNAL_CONFIG = {
  strongest: {
    icon: Trophy,
    label: 'Top Performer',
    color: 'text-[var(--color-primary-500)]',
    bg: 'bg-[var(--color-primary-50)]',
    border: 'border-l-[var(--color-primary-500)]',
  },
  drop: {
    icon: TrendingDown,
    label: 'Biggest Drop',
    color: 'text-[var(--color-danger)]',
    bg: 'bg-[var(--color-danger-bg)]',
    border: 'border-l-[var(--color-danger)]',
  },
  risk: {
    icon: AlertTriangle,
    label: 'Main Risk',
    color: 'text-[var(--color-warning)]',
    bg: 'bg-[var(--color-warning-bg)]',
    border: 'border-l-[var(--color-warning)]',
  },
  recovery: {
    icon: TrendingUp,
    label: 'Recovery',
    color: 'text-[var(--color-success)]',
    bg: 'bg-[var(--color-success-bg)]',
    border: 'border-l-[var(--color-success)]',
  },
} as const

function SignalCard({ signal }: { signal: SignalData }) {
  const config = SIGNAL_CONFIG[signal.type]
  const Icon = config.icon

  return (
    <div
      className={cn(
        'rounded-[var(--radius-card)] bg-[var(--color-surface)]',
        'border border-[var(--color-border-subtle)] border-l-[3px]',
        'shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-elevated)]',
        'transition-all duration-[var(--duration-normal)] ease-[var(--ease-out-expo)]',
        'hover:-translate-y-0.5 px-3 py-3',
        config.border,
      )}
    >
      <div className="flex gap-2.5">
        <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-control)]', config.bg)}>
          <Icon size={16} strokeWidth={2} className={config.color} />
        </div>
        <div className="min-w-0 flex-1">
          <p className={cn('text-[11px] font-bold uppercase tracking-wider', config.color)}>
            {config.label}
          </p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-sm font-semibold text-[var(--color-text-primary)] truncate">{signal.entity}</span>
            {signal.type !== 'strongest' && <DeltaBadge value={signal.delta} size="sm" />}
          </div>
          <p className="mt-1 text-xs font-medium text-[var(--color-text-muted)] line-clamp-2">{signal.reason}</p>
        </div>
      </div>
    </div>
  )
}

interface SignalStripProps {
  bundles: Array<{
    name: string; totalRevenue: number; profit: number;
    romi: number; delta?: number; healthScore?: number
  }>
  insights: Array<{
    entity: string; metric: string; value: string;
    delta?: number; reason?: string; severity: string; type?: string
  }>
}

export function SignalStrip({ bundles, insights }: SignalStripProps) {
  const signals: SignalData[] = []

  if (bundles.length > 0) {
    const sorted = [...bundles].filter(b => b.delta !== undefined).sort((a, b) => (a.delta ?? 0) - (b.delta ?? 0))
    if (sorted.length > 0 && (sorted[0].delta ?? 0) < 0) {
      const b = sorted[0]
      signals.push({
        type: 'drop', entity: b.name, value: b.totalRevenue, delta: b.delta ?? 0,
        reason: `Revenue dropped ${formatCurrency(Math.abs(b.totalRevenue * (Math.abs(b.delta ?? 0) / 100)))} vs previous period`,
      })
    }
  }

  const risks = insights.filter(i => i.type === 'risk' && (i.severity === 'high' || i.severity === 'critical'))
  if (risks.length > 0) {
    const r = risks[0]
    signals.push({
      type: 'risk', entity: r.entity, value: parseFloat(r.value) || 0,
      delta: r.delta ?? 0, reason: r.reason || `Anomaly detected on ${r.metric}`,
    })
  } else if (bundles.length > 0) {
    const worst = [...bundles].sort((a, b) => (a.healthScore ?? 100) - (b.healthScore ?? 100))[0]
    if (worst) {
      signals.push({
        type: 'risk', entity: worst.name, value: worst.totalRevenue,
        delta: worst.delta ?? 0, reason: `${worst.name} needs attention — check traffic and ad performance`,
      })
    }
  }

  if (bundles.length > 0) {
    const best = [...bundles].sort((a, b) => b.romi - a.romi)[0]
    if (best) {
      signals.push({
        type: 'strongest', entity: best.name, value: best.profit,
        delta: best.romi, reason: `Best ROI with ${formatCurrency(best.profit)} profit`,
      })
    }
  }

  if (signals.length === 0) return null

  return (
    <div>
      <h2 className="text-card-title mb-3">Network Signals</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {signals.slice(0, 3).map((signal, i) => (
          <SignalCard key={i} signal={signal} />
        ))}
      </div>
    </div>
  )
}
