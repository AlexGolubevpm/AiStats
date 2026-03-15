'use client'

import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'

interface CostTrendChartProps {
  data: { date: string; amount?: number; total?: number }[]
}

export function CostTrendChart({ data }: CostTrendChartProps) {
  const dataKey = data[0] && 'total' in data[0] ? 'total' : 'amount'

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
        <defs>
          <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-chart-red)" stopOpacity={0.1} />
            <stop offset="95%" stopColor="var(--color-chart-red)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-chart-grid)" />
        <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--color-chart-label)' }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 11, fill: 'var(--color-chart-label)' }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 10, border: '1px solid var(--color-border-default)', boxShadow: 'var(--shadow-elevated)', background: 'white' }}
          formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Cost']}
        />
        <Area type="monotone" dataKey={dataKey} stroke="var(--color-chart-red)" fill="url(#costGrad)" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  )
}
