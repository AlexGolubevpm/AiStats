'use client'

import { useId } from 'react'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine, Legend } from 'recharts'

interface ProfitTrendChartProps {
  data: { date: string; profit: number }[]
}

const tooltipStyle = {
  fontSize: 12,
  borderRadius: 10,
  border: '1px solid var(--color-border-default)',
  boxShadow: 'var(--shadow-elevated)',
  background: 'white',
}

export function ProfitTrendChart({ data }: ProfitTrendChartProps) {
  const id = useId()
  const gradientId = `profitGrad-${id}`

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[260px] text-sm text-muted-foreground">
        No profit data available.
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-chart-green)" stopOpacity={0.12} />
            <stop offset="95%" stopColor="var(--color-chart-green)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-chart-grid)" />
        <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--color-chart-label)' }} tickLine={false} axisLine={false} />
        <YAxis
          tick={{ fontSize: 11, fill: 'var(--color-chart-label)' }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) => v >= 1000 ? `$${(v / 1000).toFixed(0)}K` : `$${v}`}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(value: number) => [`$${Number(value).toFixed(2)}`, 'Profit']}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <ReferenceLine y={0} stroke="var(--color-border-default)" strokeDasharray="3 3" />
        <Area type="monotone" dataKey="profit" name="Profit" stroke="var(--color-chart-green)" fill={`url(#${gradientId})`} strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  )
}
