'use client'

import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'

interface RevenueTrendChartProps {
  data: { date: string; adRevenue: number; affiliateRevenue: number; totalRevenue: number }[]
}

export function RevenueTrendChart({ data }: RevenueTrendChartProps) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
        <defs>
          <linearGradient id="adRevGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-chart-blue)" stopOpacity={0.12} />
            <stop offset="95%" stopColor="var(--color-chart-blue)" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="affRevGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-chart-violet)" stopOpacity={0.12} />
            <stop offset="95%" stopColor="var(--color-chart-violet)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-chart-grid)" />
        <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--color-chart-label)' }} tickLine={false} axisLine={false} tickFormatter={(v) => v.slice(5)} />
        <YAxis tick={{ fontSize: 11, fill: 'var(--color-chart-label)' }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
        <Tooltip
          contentStyle={{
            fontSize: 12,
            borderRadius: 10,
            border: '1px solid var(--color-border-default)',
            boxShadow: 'var(--shadow-elevated)',
            background: 'white',
          }}
          formatter={(value) => [`$${Number(value).toFixed(2)}`]}
        />
        <Area type="monotone" dataKey="adRevenue" name="Ad Revenue" stroke="var(--color-chart-blue)" fill="url(#adRevGrad)" strokeWidth={2} />
        <Area type="monotone" dataKey="affiliateRevenue" name="Affiliate" stroke="var(--color-chart-violet)" fill="url(#affRevGrad)" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  )
}
