'use client'

import { ResponsiveContainer, LineChart, Line } from 'recharts'

interface MiniSparklineProps {
  data: number[]
  color?: string
  width?: number
  height?: number
}

export function MiniSparkline({
  data,
  color = '#6366F1',
  width = 120,
  height = 28,
}: MiniSparklineProps) {
  if (!data || data.length < 2) return null

  // Normalize data to ensure clean rendering: remove leading zeros, ensure smooth curve
  const filtered = data.length > 14 ? data.slice(-14) : data
  const chartData = filtered.map((value, index) => ({ index, value }))

  return (
    <div style={{ width, height }} className="overflow-hidden">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            dot={false}
            isAnimationActive={true}
            animationDuration={800}
            animationEasing="ease-out"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

// Keep backward compat
export const Sparkline = MiniSparkline
