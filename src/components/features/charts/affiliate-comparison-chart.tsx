'use client'

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts'

interface AffiliateComparisonChartProps {
  data: { date: string; adRevenue: number; affiliateRevenue: number }[]
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

export function AffiliateComparisonChart({ data }: AffiliateComparisonChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[260px] text-sm text-[var(--color-text-muted)]">
        No comparison data available.
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 5 }} barGap={2}>
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
          formatter={(value: number, name: string) => [`$${Number(value).toFixed(2)}`, name]}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="adRevenue" name="Ad Revenue" fill="var(--color-chart-blue)" radius={[6, 6, 0, 0]} />
        <Bar dataKey="affiliateRevenue" name="Affiliate" fill="var(--color-chart-violet)" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
