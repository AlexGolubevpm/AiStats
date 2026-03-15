'use client'

import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'

interface RevenueTrendChartProps {
  data: { date: string; adRevenue: number; affiliateRevenue: number; totalRevenue: number }[]
}

export function RevenueTrendChart({ data }: RevenueTrendChartProps) {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <AreaChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
        <defs>
          <linearGradient id="adRevGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-accent)" stopOpacity={0.15} />
            <stop offset="95%" stopColor="var(--color-accent)" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="affRevGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid var(--color-border)' }}
          formatter={(value) => [`$${Number(value).toFixed(2)}`]}
        />
        <Area type="monotone" dataKey="adRevenue" name="Ad Revenue" stroke="var(--color-accent)" fill="url(#adRevGrad)" strokeWidth={2} />
        <Area type="monotone" dataKey="affiliateRevenue" name="Affiliate" stroke="#8B5CF6" fill="url(#affRevGrad)" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  )
}
