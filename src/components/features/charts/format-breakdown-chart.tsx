'use client'

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from 'recharts'

interface FormatBreakdownChartProps {
  data: { format: string; revenue: number; impressions: number }[]
}

const FORMAT_COLORS: Record<string, string> = {
  POP: 'var(--color-format-pop)',
  PUSH: 'var(--color-format-push)',
  BANNER: 'var(--color-format-banner)',
  SLIDER: 'var(--color-format-slider)',
  OUTSTREAM: 'var(--color-format-outstream)',
  VAST: 'var(--color-format-vast)',
  IN_VIDEO: 'var(--color-format-in-video)',
  IN_PAGE_PUSH: 'var(--color-format-in-page-push)',
  OTHER: 'var(--color-format-other)',
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

export function FormatBreakdownChart({ data }: FormatBreakdownChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[260px] text-sm text-[var(--color-text-muted)]">
        No format data available.
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
        <CartesianGrid strokeDasharray="3 6" strokeOpacity={0.5} stroke="var(--color-chart-grid)" />
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
        <Bar dataKey="revenue" name="Revenue" radius={[6, 6, 0, 0]} isAnimationActive={true} animationDuration={600} animationEasing="ease-out">
          {data.map((entry) => (
            <Cell key={entry.format} fill={FORMAT_COLORS[entry.format] || 'var(--color-format-other)'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
