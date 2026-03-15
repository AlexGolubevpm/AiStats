'use client'

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts'

interface ForecastChartProps {
  currentValues: { revenue: number; affiliate: number; costs: number; profit: number }
  projectedValues: { revenue: number; affiliate: number; costs: number; profit: number }
}

export function ForecastChart({ currentValues, projectedValues }: ForecastChartProps) {
  const data = [
    { name: 'Ad Revenue', current: currentValues.revenue, projected: projectedValues.revenue },
    { name: 'Affiliate', current: currentValues.affiliate, projected: projectedValues.affiliate },
    { name: 'Costs', current: currentValues.costs, projected: projectedValues.costs },
    { name: 'Profit', current: currentValues.profit, projected: projectedValues.profit },
  ]

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 5 }} barGap={4}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-chart-grid)" />
        <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--color-chart-label)' }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 11, fill: 'var(--color-chart-label)' }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 10, border: '1px solid var(--color-border-default)', boxShadow: 'var(--shadow-elevated)', background: 'white' }}
          formatter={(value) => [`$${Number(value).toFixed(2)}`]}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="current" name="Current" fill="var(--color-chart-blue)" radius={[6, 6, 0, 0]} />
        <Bar dataKey="projected" name="Projected" fill="var(--color-chart-green)" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
