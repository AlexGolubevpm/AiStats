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
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" />
        <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid var(--color-border)' }} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey="current" name="Current" fill="var(--color-accent)" radius={[4, 4, 0, 0]} />
        <Bar dataKey="projected" name="Projected" fill="#10B981" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
