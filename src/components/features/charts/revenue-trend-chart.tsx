'use client'

import { useId } from 'react'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'

interface RevenueTrendChartProps {
  data: { date: string; adRevenue: number; affiliateRevenue: number; totalRevenue: number }[]
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string; color: string }>; label?: string }) {
  if (!active || !payload) return null
  return (
    <div className="rounded-[12px] border border-[#E5E7EB] bg-white px-3 py-2.5 shadow-[0_8px_24px_rgba(16,24,40,0.12)]">
      <p className="mb-1.5 text-[11px] font-medium text-[#6B7280]">{label}</p>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2 py-0.5">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-[12px] text-[#6B7280]">{entry.name}</span>
          <span className="ml-auto text-[12px] font-semibold tabular-nums text-[#111827]">
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
      <div className="flex items-center justify-center h-[280px] text-[13px] text-[#6B7280]">
        No revenue data available.
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
        <defs>
          <linearGradient id={adRevGradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.12} />
            <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
          </linearGradient>
          <linearGradient id={affRevGradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.08} />
            <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 6" strokeOpacity={0.4} stroke="#E5E7EB" vertical={false} />
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
        <Area type="monotone" dataKey="adRevenue" name="Ad Revenue" stroke="#4F46E5" fill={`url(#${adRevGradId})`} strokeWidth={2.5} dot={false} isAnimationActive={true} animationDuration={800} animationEasing="ease-out" />
        <Area type="monotone" dataKey="affiliateRevenue" name="Affiliate" stroke="#8B5CF6" fill={`url(#${affRevGradId})`} strokeWidth={2} strokeOpacity={0.7} dot={false} isAnimationActive={true} animationDuration={800} animationEasing="ease-out" />
      </AreaChart>
    </ResponsiveContainer>
  )
}
