'use client'

import { useState, Suspense } from 'react'
import { motion } from 'framer-motion'
import { TopContextBar } from '@/components/layout/topbar'
import { ChartCard } from '@/components/shared/chart-card'
import { KPICardSkeleton, ChartSkeleton } from '@/components/shared/loading-skeleton'
import { ErrorState } from '@/components/shared/error-state'
import { ForecastChart } from '@/components/features/charts/forecast-chart'
import { useForecastBase } from '@/hooks/use-api'
import { formatCurrency, formatPercent } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { SlidersHorizontal, Info } from 'lucide-react'

interface ScenarioParam {
  label: string
  key: string
  value: number
  setter: (v: number) => void
  min: number
  max: number
}

function ScenarioSlider({ label, value, onChange, min, max }: { label: string; value: number; onChange: (v: number) => void; min: number; max: number }) {
  const pct = ((value - min) / (max - min)) * 100

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-medium text-[var(--color-text-secondary)]">{label}</span>
        <span className={cn(
          'rounded-[var(--radius-control)] px-2.5 py-1 text-[13px] font-semibold tabular-nums',
          value > 0 ? 'bg-[var(--color-success-bg)] text-[var(--color-success-dark)]'
            : value < 0 ? 'bg-[var(--color-danger-bg)] text-[var(--color-danger-dark)]'
            : 'bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)]'
        )}>
          {value >= 0 ? '+' : ''}{value}%
        </span>
      </div>
      <div className="relative">
        <div className="h-1.5 w-full rounded-full bg-[var(--color-border-subtle)]">
          <div
            className="absolute h-1.5 rounded-full bg-[var(--color-primary-500)]"
            style={{ width: `${pct}%` }}
          />
        </div>
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 h-1.5 w-full cursor-pointer opacity-0"
        />
      </div>
    </div>
  )
}

function ScenarioMetricCard({ label, current, projected }: { label: string; current: number; projected: number }) {
  const delta = current > 0 ? ((projected - current) / current) * 100 : 0
  const isPositive = projected >= current
  const isProfit = label.includes('Profit') || label.includes('ROMI')
  const isRomi = label.includes('ROMI')

  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-card)]">
      <p className="text-card-title uppercase tracking-wider">{label}</p>
      <div className="mt-3 grid grid-cols-2 gap-4">
        <div>
          <span className="text-meta">Current</span>
          <p className="mt-1 text-[20px] font-bold tabular-nums text-[var(--color-text-primary)]">
            {isRomi ? `${current.toFixed(1)}%` : formatCurrency(current)}
          </p>
        </div>
        <div>
          <span className="text-meta">Projected</span>
          <p className={cn(
            'mt-1 text-[20px] font-bold tabular-nums',
            isPositive ? 'text-[var(--color-success-dark)]' : 'text-[var(--color-danger-dark)]'
          )}>
            {isRomi ? `${projected.toFixed(1)}%` : formatCurrency(projected)}
          </p>
        </div>
      </div>
      {current > 0 && (
        <div className={cn(
          'mt-3 flex items-center gap-1 rounded-[var(--radius-control)] px-2.5 py-1.5 text-[12px] font-semibold tabular-nums',
          isPositive ? 'bg-[var(--color-success-bg)] text-[var(--color-success-dark)]' : 'bg-[var(--color-danger-bg)] text-[var(--color-danger-dark)]'
        )}>
          {delta >= 0 ? '+' : ''}{delta.toFixed(1)}% change
        </div>
      )}
    </div>
  )
}

function ForecastContent() {
  const { data: baseData, isLoading, error } = useForecastBase()

  const [trafficChange, setTrafficChange] = useState(0)
  const [costChange, setCostChange] = useState(0)
  const [rpmChange, setRpmChange] = useState(0)
  const [affiliateChange, setAffiliateChange] = useState(0)
  const [tierChange, setTierChange] = useState(0)
  const [formatChange, setFormatChange] = useState(0)

  if (isLoading) {
    return (
      <div className="space-y-8 px-6 py-8">
        <ChartSkeleton />
        <div className="grid grid-cols-4 gap-5">
          {Array.from({ length: 4 }).map((_, i) => <KPICardSkeleton key={i} />)}
        </div>
      </div>
    )
  }

  if (error || !baseData) {
    return <div className="px-6 py-8"><ErrorState /></div>
  }

  const baseRevenue = baseData.revenue || 0
  const baseAffiliate = baseData.affiliate || 0
  const baseCosts = baseData.costs || 0
  const baseTraffic = baseData.traffic || 0

  const hasData = baseRevenue > 0 || baseAffiliate > 0 || baseCosts > 0 || baseTraffic > 0

  if (!hasData) {
    return (
      <div className="px-6 py-8">
        <div className="flex flex-col items-center justify-center rounded-[var(--radius-card)] border border-dashed border-[var(--color-border-default)] py-20">
          <p className="text-[14px] text-[var(--color-text-muted)]">No baseline data available for forecasting</p>
          <p className="mt-1.5 text-meta">Forecast will be available after syncing metric data from AdSpyglass</p>
        </div>
      </div>
    )
  }

  // Calculations
  const revenueMultiplier = (1 + rpmChange / 100) * (1 + trafficChange / 100) * (1 + formatChange / 100)
  const projAdRevenue = baseRevenue * revenueMultiplier
  const projAffiliate = baseAffiliate * (1 + affiliateChange / 100)
  const projCosts = baseCosts * (1 + costChange / 100)
  const projTotalRevenue = projAdRevenue + projAffiliate
  const projProfit = projTotalRevenue - projCosts
  const projRomi = projCosts > 0 ? ((projTotalRevenue - projCosts) / projCosts) * 100 : 0
  const baseTotalRevenue = baseRevenue + baseAffiliate
  const baseProfit = baseTotalRevenue - baseCosts
  const baseRomi = baseCosts > 0 ? ((baseTotalRevenue - baseCosts) / baseCosts) * 100 : 0

  const params: ScenarioParam[] = [
    { label: 'Traffic Change', key: 'traffic', value: trafficChange, setter: setTrafficChange, min: -50, max: 50 },
    { label: 'Cost Change', key: 'cost', value: costChange, setter: setCostChange, min: -50, max: 50 },
    { label: 'RPM Change', key: 'rpm', value: rpmChange, setter: setRpmChange, min: -50, max: 50 },
    { label: 'Affiliate Revenue Change', key: 'affiliate', value: affiliateChange, setter: setAffiliateChange, min: -50, max: 50 },
    { label: 'Tier Performance Change', key: 'tier', value: tierChange, setter: setTierChange, min: -30, max: 30 },
    { label: 'Format Contribution Change', key: 'format', value: formatChange, setter: setFormatChange, min: -30, max: 30 },
  ]

  return (
    <motion.div
      className="space-y-8 px-6 py-8"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
    >
      {/* Section 1: Scenario Controls */}
      <div className="rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)]">
        <div className="mb-5 flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-[var(--color-primary-600)]" />
          <h2 className="text-[15px] font-semibold text-[var(--color-text-primary)]">Scenario Controls</h2>
        </div>
        <div className="grid grid-cols-2 gap-x-8 gap-y-5 xl:grid-cols-3">
          {params.map(({ label, value, setter, min, max }) => (
            <ScenarioSlider key={label} label={label} value={value} onChange={setter} min={min} max={max} />
          ))}
        </div>
        <div className="mt-5 flex justify-end">
          <button
            onClick={() => {
              setTrafficChange(0); setCostChange(0); setRpmChange(0)
              setAffiliateChange(0); setTierChange(0); setFormatChange(0)
            }}
            className="text-[12px] font-medium text-[var(--color-primary-600)] hover:text-[var(--color-primary-700)]"
          >
            Reset all to baseline
          </button>
        </div>
      </div>

      {/* Section 2: Baseline vs Projected Metrics */}
      <div>
        <h2 className="text-section-title mb-5">Baseline vs Projected</h2>
        <div className="grid grid-cols-2 gap-5 xl:grid-cols-4">
          <ScenarioMetricCard label="Revenue" current={baseTotalRevenue} projected={projTotalRevenue} />
          <ScenarioMetricCard label="Costs" current={baseCosts} projected={projCosts} />
          <ScenarioMetricCard label="Profit" current={baseProfit} projected={projProfit} />
          <ScenarioMetricCard label="ROMI" current={baseRomi} projected={projRomi} />
        </div>
      </div>

      {/* Section 3: Forecast Chart */}
      <ChartCard title="Forecast Comparison" description="Current vs projected values">
        <ForecastChart
          currentValues={{ revenue: baseRevenue, affiliate: baseAffiliate, costs: baseCosts, profit: baseProfit }}
          projectedValues={{ revenue: projAdRevenue, affiliate: projAffiliate, costs: projCosts, profit: projProfit }}
        />
      </ChartCard>

      {/* Section 4: Assumptions */}
      <div className="rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-secondary)] p-5">
        <div className="flex items-center gap-2 mb-3">
          <Info className="h-4 w-4 text-[var(--color-text-muted)]" />
          <h3 className="text-[13px] font-semibold text-[var(--color-text-secondary)]">Assumptions & Notes</h3>
        </div>
        <ul className="space-y-1.5 text-[12px] leading-relaxed text-[var(--color-text-muted)]">
          <li>Projections are based on the most recent 30-day baseline data from AdSpyglass.</li>
          <li>Traffic change impacts ad revenue proportionally through RPM calculations.</li>
          <li>Format contribution change applies as a multiplier on ad revenue from format distribution shifts.</li>
          <li>Tier performance change models geographic traffic quality shifts.</li>
          <li>ROMI is calculated as (Total Revenue - Costs) / Costs x 100.</li>
          <li>These projections assume linear scaling and do not account for market saturation or seasonality.</li>
        </ul>
      </div>
    </motion.div>
  )
}

export default function ForecastPage() {
  return (
    <div>
      <TopContextBar title="Forecast" subtitle="Scenario modeling and projections" showPeriod={false} showSync={false} />
      <Suspense fallback={<div className="space-y-8 px-6 py-8"><ChartSkeleton /></div>}>
        <ForecastContent />
      </Suspense>
    </div>
  )
}
