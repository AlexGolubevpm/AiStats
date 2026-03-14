'use client'

import { ResponsiveContainer, LineChart, Line } from 'recharts'

interface SparklineProps {
  data: number[]
  color?: string
  width?: number
  height?: number
}

export function Sparkline({
  data,
  color = '#6366F1',
  width = 80,
  height = 32,
}: SparklineProps) {
  const chartData = data.map((value, index) => ({ index, value }))

  return (
    <div style={{ width, height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={1.5}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
