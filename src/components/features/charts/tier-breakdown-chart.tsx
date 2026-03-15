'use client'

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts'

interface TierBreakdownChartProps {
  data: { tier: string; revenue: number; users: number; rpm: number }[]
}

export function TierBreakdownChart({ data }: TierBreakdownChartProps) {
  const formatted = data.map((d) => ({
    ...d,
    tier: d.tier.replace('TIER_', 'Tier '),
  }))

  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={formatted} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" />
        <XAxis dataKey="tier" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
        <YAxis yAxisId="rev" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
        <YAxis yAxisId="users" orientation="right" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid var(--color-border)' }} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Bar yAxisId="rev" dataKey="revenue" name="Revenue" fill="#3B82F6" radius={[4, 4, 0, 0]} />
        <Bar yAxisId="users" dataKey="users" name="Users" fill="#10B981" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
