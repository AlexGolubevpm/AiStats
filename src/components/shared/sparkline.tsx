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
  color = 'var(--color-primary-500)',
  width = 100,
  height = 28,
}: MiniSparklineProps) {
  if (!data || data.length < 2) return null

  const chartData = data.map((value, index) => ({ index, value }))

  return (
    <div style={{ width, height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
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
