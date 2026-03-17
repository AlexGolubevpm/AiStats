'use client'

import { useId } from 'react'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts'

interface RevenueTrendChartProps {
  data: { date: string; adRevenue: number; affiliateRevenue: number; totalRevenue: number }[]
}

const tooltipStyle = {
  background: 'var(--color-surface)',
  border: '1px solid var(--color-border-subtle)',
  borderRadius: 'var(--radius-control)',
  boxShadow: 'var(--shadow-modal)',
  backdropFilter: 'blur(8px)',
  fontSize: '12px',
  padding: '8px 12px',
}

export function RevenueTrendChart({ data }: RevenueTrendChartProps) {
  const id = useId()
  const adRevGradId = `adRevGrad-${id}`
  const affRevGradId = `affRevGrad-${id}`

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[260px] text-sm text-[var(--color-text-muted)]">
        No revenue data available.
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
        <defs>
          <linearGradient id={adRevGradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-chart-blue)" stopOpacity={0.12} />
            <stop offset="95%" stopColor="var(--color-chart-blue)" stopOpacity={0} />
          </linearGradient>
          <linearGradient id={affRevGradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-chart-violet)" stopOpacity={0.12} />
            <stop offset="95%" stopColor="var(--color-chart-violet)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 6" strokeOpacity={0.5} stroke="var(--color-chart-grid)" />
        <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--color-chart-label)' }} tickLine={false} axisLine={false} />
        <YAxis
          tick={{ fontSize: 11, fill: 'var(--color-chart-label)' }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) => v >= 1000 ? `$${(v / 1000).toFixed(0)}K` : `$${v}`}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(value, name) => [`$${Number(value).toFixed(2)}`, name]}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Area type="monotone" dataKey="adRevenue" name="Ad Revenue" stroke="var(--color-chart-blue)" fill={`url(#${adRevGradId})`} strokeWidth={2} isAnimationActive={true} animationDuration={800} animationEasing="ease-out" />
        <Area type="monotone" dataKey="affiliateRevenue" name="Affiliate" stroke="var(--color-chart-violet)" fill={`url(#${affRevGradId})`} strokeWidth={2} isAnimationActive={true} animationDuration={800} animationEasing="ease-out" />
      </AreaChart>
    </ResponsiveContainer>
  )
}
