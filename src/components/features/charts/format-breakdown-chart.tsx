'use client'

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'

interface FormatBreakdownChartProps {
  data: { format: string; revenue: number; impressions: number }[]
}

const FORMAT_COLORS: Record<string, string> = {
  POP: '#3B82F6',
  PUSH: '#EF4444',
  BANNER: '#10B981',
  SLIDER: '#F59E0B',
  OUTSTREAM: '#8B5CF6',
  VAST: '#EC4899',
  OTHER: '#6B7280',
}

export function FormatBreakdownChart({ data }: FormatBreakdownChartProps) {
  const colored = data.map((d) => ({ ...d, fill: FORMAT_COLORS[d.format] || '#6B7280' }))

  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={colored} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" />
        <XAxis dataKey="format" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid var(--color-border)' }}
          formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Revenue']}
        />
        <Bar dataKey="revenue" radius={[4, 4, 0, 0]} fill="#3B82F6" />
      </BarChart>
    </ResponsiveContainer>
  )
}
