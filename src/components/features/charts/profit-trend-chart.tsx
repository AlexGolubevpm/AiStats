'use client'

import { useId } from 'react'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine, Legend } from 'recharts'

interface ProfitTrendChartProps {
  data: { date: string; profit: number }[]
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload) return null
  const value = Number(payload[0]?.value || 0)
  return (
    <div style={{
      borderRadius: 12,
      border: '1px solid #E6EAF0',
      background: '#FFFFFF',
      padding: '10px 14px',
      boxShadow: '0 8px 24px rgba(15, 23, 42, 0.12)',
      minWidth: 140,
    }}>
      <p style={{ fontSize: 11, fontWeight: 500, color: '#64748B', marginBottom: 8 }}>{label}</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#10B981', flexShrink: 0 }} />
        <span style={{ fontSize: 12, color: '#64748B' }}>Profit</span>
        <span style={{
          marginLeft: 'auto',
          fontSize: 12,
          fontWeight: 600,
          fontVariantNumeric: 'tabular-nums',
          color: value >= 0 ? '#16A34A' : '#DC2626',
        }}>
          ${value.toFixed(2)}
        </span>
      </div>
    </div>
  )
}

export function ProfitTrendChart({ data }: ProfitTrendChartProps) {
  const id = useId()
  const gradientId = `profitGrad-${id}`

  if (!data || data.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 280, fontSize: 13, color: '#64748B' }}>
        No profit data available.
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 10, right: 5, bottom: 5, left: 5 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10B981" stopOpacity={0.08} />
            <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 6" strokeOpacity={0.3} stroke="#CBD5E1" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: '#94A3B8', fontWeight: 500 }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#94A3B8', fontWeight: 500 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) => v >= 1000 ? `$${(v / 1000).toFixed(0)}K` : `$${v}`}
          width={48}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: 12, color: '#64748B', paddingTop: 12 }}
          iconType="circle"
          iconSize={8}
        />
        <ReferenceLine y={0} stroke="#CBD5E1" strokeDasharray="3 3" />
        <Area
          type="monotone"
          dataKey="profit"
          name="Profit"
          stroke="#10B981"
          fill={`url(#${gradientId})`}
          strokeWidth={2.5}
          dot={false}
          activeDot={{ r: 4, fill: '#10B981', stroke: '#fff', strokeWidth: 2 }}
          isAnimationActive={true}
          animationDuration={800}
          animationEasing="ease-out"
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
