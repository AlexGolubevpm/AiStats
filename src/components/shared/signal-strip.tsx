'use client'

import { RiArrowDownLine, RiAlertLine, RiTrophyLine } from '@remixicon/react'
import { formatCurrency, formatPercent, cn } from '@/lib/utils'

/* ── Types ── */
interface SignalData {
  type: 'drop' | 'risk' | 'winner'
  entity: string
  value: number
  delta: number
  reason: string
}

const SIGNAL_CONFIG = {
  drop: {
    icon: RiArrowDownLine,
    label: 'Biggest Drop',
    color: 'text-red-600',
    bg: 'bg-red-50',
    border: 'border-l-red-500',
  },
  risk: {
    icon: RiAlertLine,
    label: 'Main Risk',
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-l-amber-500',
  },
  winner: {
    icon: RiTrophyLine,
    label: 'Top Performer',
    color: 'text-violet-600',
    bg: 'bg-violet-50',
    border: 'border-l-violet-500',
  },
} as const

/* ── Signal Card ── */
function SignalCard({ signal }: { signal: SignalData }) {
  const config = SIGNAL_CONFIG[signal.type]
  const Icon = config.icon

  return (
    <div
      className={cn(
        'rounded-xl border border-gray-200 border-l-[3px] bg-white p-4',
        'shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5',
        config.border,
      )}
    >
      <div className="flex gap-3">
        <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', config.bg)}>
          <Icon className={cn('size-[18px]', config.color)} />
        </div>
        <div className="min-w-0 flex-1">
          <p className={cn('text-[10px] font-bold uppercase tracking-wider', config.color)}>
            {config.label}
          </p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-sm font-semibold text-gray-900 truncate">{signal.entity}</span>
            {signal.type !== 'winner' && (
              <span className={cn('text-xs font-semibold tabular-nums', signal.delta >= 0 ? 'text-emerald-600' : 'text-red-600')}>
                {formatPercent(signal.delta)}
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-gray-500 truncate">{signal.reason}</p>
        </div>
      </div>
    </div>
  )
}

/* ── Props ── */
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
        type: 'winner', entity: best.name, value: best.profit,
        delta: best.romi, reason: `Best ROI with ${formatCurrency(best.profit)} profit`,
      })
    }
  }

  if (signals.length === 0) return null

  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold text-gray-500">Network Signals</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {signals.slice(0, 3).map((signal, i) => (
          <SignalCard key={i} signal={signal} />
        ))}
      </div>
    </div>
  )
}
