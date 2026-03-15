'use client'

import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine } from 'recharts'

interface ProfitTrendChartProps {
  data: { date: string; profit: number }[]
}

export function ProfitTrendChart({ data }: ProfitTrendChartProps) {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <AreaChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
        <defs>
          <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10B981" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid var(--color-border)' }}
          formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Profit']}
        />
        <ReferenceLine y={0} stroke="var(--color-border)" strokeDasharray="3 3" />
        <Area type="monotone" dataKey="profit" stroke="#10B981" fill="url(#profitGrad)" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  )
}
