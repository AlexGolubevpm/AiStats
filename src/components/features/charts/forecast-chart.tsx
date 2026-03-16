'use client'

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts'

interface ForecastChartProps {
  currentValues: { revenue: number; affiliate: number; costs: number; profit: number }
  projectedValues: { revenue: number; affiliate: number; costs: number; profit: number }
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

function ForecastTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string; color: string }>; label?: string }) {
  if (!active || !payload || payload.length < 2) return null

  const current = payload.find((p) => p.name === 'Current')
  const projected = payload.find((p) => p.name === 'Projected')

  if (!current || !projected) return null

  const delta = projected.value - current.value
  const deltaPercent = current.value !== 0 ? ((delta / current.value) * 100).toFixed(1) : 'N/A'
  const sign = delta >= 0 ? '+' : ''

  return (
    <div style={tooltipStyle}>
      <p style={{ fontWeight: 600, marginBottom: 4 }}>{label}</p>
      <p style={{ color: current.color }}>Current: ${Number(current.value).toFixed(2)}</p>
      <p style={{ color: projected.color }}>Projected: ${Number(projected.value).toFixed(2)}</p>
      <p style={{ color: delta >= 0 ? '#10B981' : '#EF4444', fontWeight: 500, marginTop: 4 }}>
        Delta: {sign}${delta.toFixed(2)} ({sign}{deltaPercent}%)
      </p>
    </div>
  )
}

export function ForecastChart({ currentValues, projectedValues }: ForecastChartProps) {
  if (!currentValues || !projectedValues) {
    return (
      <div className="flex items-center justify-center h-[300px] text-sm text-[var(--color-text-muted)]">
        No forecast data available.
      </div>
    )
  }

  const data = [
    { name: 'Ad Revenue', current: currentValues.revenue, projected: projectedValues.revenue },
    { name: 'Affiliate', current: currentValues.affiliate, projected: projectedValues.affiliate },
    { name: 'Costs', current: currentValues.costs, projected: projectedValues.costs },
    { name: 'Profit', current: currentValues.profit, projected: projectedValues.profit },
  ]

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 5 }} barGap={4}>
        <CartesianGrid strokeDasharray="3 6" strokeOpacity={0.5} stroke="var(--color-chart-grid)" />
        <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--color-chart-label)' }} tickLine={false} axisLine={false} />
        <YAxis
          tick={{ fontSize: 11, fill: 'var(--color-chart-label)' }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) => v >= 1000 ? `$${(v / 1000).toFixed(0)}K` : `$${v}`}
        />
        <Tooltip content={<ForecastTooltip />} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="current" name="Current" fill="var(--color-chart-blue)" radius={[6, 6, 0, 0]} isAnimationActive={true} animationDuration={600} animationEasing="ease-out" />
        <Bar dataKey="projected" name="Projected" fill="var(--color-chart-green)" radius={[6, 6, 0, 0]} isAnimationActive={true} animationDuration={600} animationEasing="ease-out" />
      </BarChart>
    </ResponsiveContainer>
  )
}
