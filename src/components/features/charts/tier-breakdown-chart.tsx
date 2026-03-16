'use client'

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts'

interface TierBreakdownChartProps {
  data: { tier: string; revenue: number; users: number; rpm: number }[]
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

export function TierBreakdownChart({ data }: TierBreakdownChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[260px] text-sm text-[var(--color-text-muted)]">
        No tier data available.
      </div>
    )
  }

  const formatted = data.map((d) => ({
    ...d,
    tier: d.tier.replace('TIER_', 'Tier '),
  }))

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={formatted} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
        <CartesianGrid strokeDasharray="3 6" strokeOpacity={0.5} stroke="var(--color-chart-grid)" />
        <XAxis dataKey="tier" tick={{ fontSize: 11, fill: 'var(--color-chart-label)' }} tickLine={false} axisLine={false} />
        <YAxis
          yAxisId="rev"
          tick={{ fontSize: 11, fill: 'var(--color-chart-label)' }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) => v >= 1000 ? `$${(v / 1000).toFixed(0)}K` : `$${v}`}
        />
        <YAxis
          yAxisId="requests"
          orientation="right"
          tick={{ fontSize: 11, fill: 'var(--color-chart-label)' }}
          tickLine={false}
          axisLine={false}
          label={{ value: 'Requests', angle: 90, position: 'insideRight', style: { fontSize: 11, fill: 'var(--color-chart-label)' } }}
          tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v.toString()}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(value: number, name: string) => {
            if (name === 'Revenue') return [`$${Number(value).toFixed(2)}`, name]
            return [Number(value).toLocaleString(), name]
          }}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Bar yAxisId="rev" dataKey="revenue" name="Revenue" fill="var(--color-chart-blue)" radius={[6, 6, 0, 0]} isAnimationActive={true} animationDuration={600} animationEasing="ease-out" />
        <Bar yAxisId="requests" dataKey="users" name="Requests" fill="var(--color-chart-green)" radius={[6, 6, 0, 0]} isAnimationActive={true} animationDuration={600} animationEasing="ease-out" />
      </BarChart>
    </ResponsiveContainer>
  )
}
