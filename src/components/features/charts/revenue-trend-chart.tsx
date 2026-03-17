'use client'

import { useId } from 'react'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts'

interface RevenueTrendChartProps {
  data: { date: string; adRevenue: number; affiliateRevenue: number; totalRevenue: number }[]
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string; color: string }>; label?: string }) {
  if (!active || !payload) return null
  return (
    <div style={{
      borderRadius: 12,
      border: '1px solid #E6EAF0',
      background: '#FFFFFF',
      padding: '10px 14px',
      boxShadow: '0 8px 24px rgba(15, 23, 42, 0.12)',
      minWidth: 160,
    }}>
      <p style={{ fontSize: 11, fontWeight: 500, color: '#64748B', marginBottom: 8 }}>{label}</p>
      {payload.map((entry, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: entry.color, flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: '#64748B' }}>{entry.name}</span>
          <span style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: '#0F172A' }}>
            ${Number(entry.value).toFixed(2)}
          </span>
        </div>
      ))}
    </div>
  )
}

export function RevenueTrendChart({ data }: RevenueTrendChartProps) {
  const id = useId()
  const adRevGradId = `adRevGrad-${id}`
  const affRevGradId = `affRevGrad-${id}`

  if (!data || data.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 280, fontSize: 13, color: '#64748B' }}>
        No revenue data available.
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 10, right: 5, bottom: 5, left: 5 }}>
        <defs>
          <linearGradient id={adRevGradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4F46E5" stopOpacity={0.08} />
            <stop offset="100%" stopColor="#4F46E5" stopOpacity={0} />
          </linearGradient>
          <linearGradient id={affRevGradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.06} />
            <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0} />
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
        <Area
          type="monotone"
          dataKey="adRevenue"
          name="Ad Revenue"
          stroke="#4F46E5"
          fill={`url(#${adRevGradId})`}
          strokeWidth={2.5}
          dot={false}
          activeDot={{ r: 4, fill: '#4F46E5', stroke: '#fff', strokeWidth: 2 }}
          isAnimationActive={true}
          animationDuration={800}
          animationEasing="ease-out"
        />
        <Area
          type="monotone"
          dataKey="affiliateRevenue"
          name="Affiliate"
          stroke="#8B5CF6"
          fill={`url(#${affRevGradId})`}
          strokeWidth={2}
          strokeOpacity={0.7}
          dot={false}
          activeDot={{ r: 3, fill: '#8B5CF6', stroke: '#fff', strokeWidth: 2 }}
          isAnimationActive={true}
          animationDuration={800}
          animationEasing="ease-out"
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
