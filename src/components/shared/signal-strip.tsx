'use client'

import { TrendingUp, TrendingDown, AlertTriangle, Trophy } from 'lucide-react'
import { formatCurrency, formatPercent } from '@/lib/utils'

interface SignalData {
  type: 'gain' | 'drop' | 'risk' | 'winner'
  entity: string
  metric: string
  value: number
  delta: number
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
    <div className={`flex items-center gap-3 rounded-[12px] border border-[#E5E7EB] border-l-[3px] ${config.borderColor} bg-white px-4 py-3 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-all duration-150 hover:-translate-y-px hover:shadow-[0_4px_10px_rgba(16,24,40,0.08)]`}>
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] ${config.iconBg}`}>
        <Icon className={`h-4 w-4 ${config.iconColor}`} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#6B7280]">{config.label}</p>
        <div className="mt-0.5 flex items-baseline gap-2">
          <span className="truncate text-[13px] font-semibold text-[#111827]">{signal.entity}</span>
          <span className="shrink-0 text-[12px] font-semibold tabular-nums text-[#4B5563]">
            {formatCurrency(signal.value)}
          </span>
          <span className={`shrink-0 text-[12px] font-semibold tabular-nums ${signal.delta >= 0 ? 'text-[#039855]' : 'text-[#D92D20]'}`}>
            {formatPercent(signal.delta)}
          </span>
        </div>
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
    severity: string
    type?: string
  }>
}

export function SignalStrip({ bundles, insights }: SignalStripProps) {
  const signals: SignalData[] = []

  // Find biggest revenue gain/drop from bundles
  if (bundles.length > 0) {
    const sortedByDelta = [...bundles].filter(b => b.delta !== undefined).sort((a, b) => (b.delta ?? 0) - (a.delta ?? 0))

    if (sortedByDelta.length > 0 && (sortedByDelta[0].delta ?? 0) > 0) {
      signals.push({
        type: 'gain',
        entity: sortedByDelta[0].name,
        metric: 'Revenue',
        value: sortedByDelta[0].totalRevenue,
        delta: sortedByDelta[0].delta ?? 0,
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
      })
    }
  }

  // Highest risk from insights
  const risks = insights.filter(i => i.type === 'risk' && (i.severity === 'high' || i.severity === 'critical'))
  if (risks.length > 0) {
    signals.push({
      type: 'risk',
      entity: risks[0].entity,
      metric: risks[0].metric,
      value: parseFloat(risks[0].value) || 0,
      delta: risks[0].delta ?? 0,
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
