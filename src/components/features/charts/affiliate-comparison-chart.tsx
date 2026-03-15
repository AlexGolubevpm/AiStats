'use client'

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts'

interface AffiliateComparisonChartProps {
  data: { date: string; adRevenue: number; affiliateRevenue: number }[]
}

export function AffiliateComparisonChart({ data }: AffiliateComparisonChartProps) {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid var(--color-border)' }} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey="adRevenue" name="Ad Revenue" fill="var(--color-accent)" radius={[4, 4, 0, 0]} />
        <Bar dataKey="affiliateRevenue" name="Affiliate" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
