'use client'
import { LineChart, Line, ResponsiveContainer } from 'recharts'
import { cn } from '@/lib/utils'

interface MiniSparklineProps {
  data: { value: number }[]
  color?: string
  className?: string
}

export function MiniSparkline({ data, color = 'var(--color-primary)', className }: MiniSparklineProps) {
  if (!data || data.length < 2) return null
  return (
    <div className={cn('h-[22px] w-full', className)}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={1.75}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
