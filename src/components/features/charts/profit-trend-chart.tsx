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
    <div className="rounded-[12px] border border-[#E5E7EB] bg-white px-3 py-2.5 shadow-[0_8px_24px_rgba(16,24,40,0.12)]">
      <p className="mb-1.5 text-[11px] font-medium text-[#6B7280]">{label}</p>
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-[#10B981]" />
        <span className="text-[12px] text-[#6B7280]">Profit</span>
        <span className={`ml-auto text-[12px] font-semibold tabular-nums ${value >= 0 ? 'text-[#039855]' : 'text-[#D92D20]'}`}>
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
      <div className="flex items-center justify-center h-[280px] text-[13px] text-[#6B7280]">
        No profit data available.
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10B981" stopOpacity={0.12} />
            <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
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
        <Legend wrapperStyle={{ fontSize: 12, color: '#6B7280', paddingTop: 8 }} iconType="circle" iconSize={8} />
        <ReferenceLine y={0} stroke="#D7DCE5" strokeDasharray="3 3" />
        <Area type="monotone" dataKey="profit" name="Profit" stroke="#10B981" fill={`url(#${gradientId})`} strokeWidth={2.5} dot={false} isAnimationActive={true} animationDuration={800} animationEasing="ease-out" />
      </AreaChart>
    </ResponsiveContainer>
  )
}
