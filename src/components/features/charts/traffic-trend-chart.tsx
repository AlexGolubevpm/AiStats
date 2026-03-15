'use client'

import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'

interface TrafficTrendChartProps {
  data: { date: string; users: number }[]
}

export function TrafficTrendChart({ data }: TrafficTrendChartProps) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
        <defs>
          <linearGradient id="trafficGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-chart-cyan)" stopOpacity={0.12} />
            <stop offset="95%" stopColor="var(--color-chart-cyan)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-chart-grid)" />
        <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--color-chart-label)' }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 11, fill: 'var(--color-chart-label)' }} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 10, border: '1px solid var(--color-border-default)', boxShadow: 'var(--shadow-elevated)', background: 'white' }}
          formatter={(value) => [Number(value).toLocaleString(), 'Users']}
        />
        <Area type="monotone" dataKey="users" stroke="var(--color-chart-cyan)" fill="url(#trafficGrad)" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  )
}
