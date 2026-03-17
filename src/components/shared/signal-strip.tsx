'use client'

import { TrendingUp, TrendingDown, AlertTriangle, Trophy } from 'lucide-react'
import { formatCurrency, formatPercent } from '@/lib/utils'

interface SignalData {
  type: 'gain' | 'drop' | 'risk' | 'winner'
  entity: string
  metric: string
  value: number
  delta: number
  reason: string
}

const signalConfig = {
  gain: {
    icon: TrendingUp,
    label: 'Biggest Revenue Gain',
    iconBg: 'bg-[#ECFDF3]',
    iconColor: 'text-[#039855]',
    borderColor: 'border-l-[#10B981]',
  },
  drop: {
    icon: TrendingDown,
    label: 'Biggest Revenue Drop',
    iconBg: 'bg-[#FEF3F2]',
    iconColor: 'text-[#D92D20]',
    borderColor: 'border-l-[#F04438]',
  },
  risk: {
    icon: AlertTriangle,
    label: 'Highest Risk',
    iconBg: 'bg-[#FFFAEB]',
    iconColor: 'text-[#DC6803]',
    borderColor: 'border-l-[#F79009]',
  },
  winner: {
    icon: Trophy,
    label: 'Strongest Bundle',
    iconBg: 'bg-[#EEF2FF]',
    iconColor: 'text-[#4F46E5]',
    borderColor: 'border-l-[#4F46E5]',
  },
}

function SignalCard({ signal }: { signal: SignalData }) {
  const config = signalConfig[signal.type]
  const Icon = config.icon

  return (
    <div className={`flex items-start gap-3 rounded-[12px] border border-[#E5E7EB] border-l-[3px] ${config.borderColor} bg-white px-4 py-3 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-all duration-150 hover:-translate-y-px hover:shadow-[0_4px_10px_rgba(16,24,40,0.08)]`}>
      <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] ${config.iconBg}`}>
        <Icon className={`h-4 w-4 ${config.iconColor}`} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#6B7280]">{config.label}</p>
        <div className="mt-0.5 flex items-baseline gap-2">
          <span className="truncate text-[13px] font-semibold text-[#111827]">{signal.entity}</span>
          <span className="shrink-0 text-[12px] font-semibold tabular-nums text-[#4B5563]">
            {signal.type === 'winner' ? `${signal.delta.toFixed(1)}% ROMI` : formatCurrency(signal.value)}
          </span>
          {signal.type !== 'winner' && (
            <span className={`shrink-0 text-[12px] font-semibold tabular-nums ${signal.delta >= 0 ? 'text-[#039855]' : 'text-[#D92D20]'}`}>
              {formatPercent(signal.delta)}
            </span>
          )}
        </div>
        <p className="mt-1 truncate text-[11px] text-[#6B7280]">{signal.reason}</p>
      </div>
    </div>
  )
}

interface SignalStripProps {
  bundles: Array<{
    name: string
    totalRevenue: number
    profit: number
    romi: number
    delta?: number
    healthScore?: number
  }>
  insights: Array<{
    entity: string
    metric: string
    value: string
    delta?: number
    reason?: string
    severity: string
    type?: string
  }>
}

export function SignalStrip({ bundles, insights }: SignalStripProps) {
  const signals: SignalData[] = []

  if (bundles.length > 0) {
    const sortedByDelta = [...bundles].filter(b => b.delta !== undefined).sort((a, b) => (b.delta ?? 0) - (a.delta ?? 0))

    if (sortedByDelta.length > 0 && (sortedByDelta[0].delta ?? 0) > 0) {
      const b = sortedByDelta[0]
      signals.push({
        type: 'gain',
        entity: b.name,
        metric: 'Revenue',
        value: b.totalRevenue,
        delta: b.delta ?? 0,
        reason: `Revenue up ${formatPercent(b.delta ?? 0)} vs previous period`,
      })
    }

    const worstBundle = sortedByDelta[sortedByDelta.length - 1]
    if (worstBundle && (worstBundle.delta ?? 0) < 0) {
      signals.push({
        type: 'drop',
        entity: worstBundle.name,
        metric: 'Revenue',
        value: worstBundle.totalRevenue,
        delta: worstBundle.delta ?? 0,
        reason: `Revenue dropped ${formatPercent(worstBundle.delta ?? 0)} — needs attention`,
      })
    }

    // Strongest bundle by ROMI
    const bestByRomi = [...bundles].sort((a, b) => b.romi - a.romi)[0]
    if (bestByRomi) {
      signals.push({
        type: 'winner',
        entity: bestByRomi.name,
        metric: 'ROMI',
        value: bestByRomi.profit,
        delta: bestByRomi.romi,
        reason: `Best return on investment with ${formatCurrency(bestByRomi.profit)} profit`,
      })
    }
  }

  // Highest risk from insights
  const risks = insights.filter(i => i.type === 'risk' && (i.severity === 'high' || i.severity === 'critical'))
  if (risks.length > 0) {
    const r = risks[0]
    signals.push({
      type: 'risk',
      entity: r.entity,
      metric: r.metric,
      value: parseFloat(r.value) || 0,
      delta: r.delta ?? 0,
      reason: r.reason || `Anomaly detected on ${r.metric}`,
    })
  }

  if (signals.length === 0) return null

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {signals.slice(0, 4).map((signal, i) => (
        <SignalCard key={i} signal={signal} />
      ))}
    </div>
  )
}
