'use client'

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from 'recharts'

interface FormatBreakdownChartProps {
  data: { format: string; revenue: number; impressions: number }[]
}

const FORMAT_COLORS: Record<string, string> = {
  POP: '#4F46E5',
  PUSH: '#EF4444',
  BANNER: '#10B981',
  SLIDER: '#F59E0B',
  OUTSTREAM: '#8B5CF6',
  VAST: '#EC4899',
  IN_VIDEO: '#06B6D4',
  IN_PAGE_PUSH: '#3B82F6',
  OTHER: '#94A3B8',
}

const tooltipStyle = {
  fontSize: 12,
  borderRadius: 10,
  border: '1px solid var(--color-border-default)',
  boxShadow: 'var(--shadow-elevated)',
  background: 'white',
}

export function FormatBreakdownChart({ data }: FormatBreakdownChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[260px] text-sm text-muted-foreground">
        No format data available.
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-chart-grid)" />
        <XAxis dataKey="format" tick={{ fontSize: 11, fill: 'var(--color-chart-label)' }} tickLine={false} axisLine={false} />
        <YAxis
          tick={{ fontSize: 11, fill: 'var(--color-chart-label)' }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) => v >= 1000 ? `$${(v / 1000).toFixed(0)}K` : `$${v}`}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(value: number) => [`$${Number(value).toFixed(2)}`, 'Revenue']}
        />
        <Bar dataKey="revenue" name="Revenue" radius={[6, 6, 0, 0]}>
          {data.map((entry) => (
            <Cell key={entry.format} fill={FORMAT_COLORS[entry.format] || '#94A3B8'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
