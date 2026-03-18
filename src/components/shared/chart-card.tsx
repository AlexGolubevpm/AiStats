'use client'

import { cn } from '@/lib/utils'

interface ChartCardProps {
  title: string
  description?: string
  children: React.ReactNode
  className?: string
  action?: React.ReactNode
  delta?: number
}

export function ChartCard({ title, description, children, action, delta, className }: ChartCardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-gray-200 bg-white shadow-sm',
        'transition-all duration-200 hover:shadow-md',
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between px-5 pt-5 pb-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
            {delta !== undefined && (
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums',
                  delta >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700',
                )}
              >
                {delta >= 0 ? '+' : ''}{delta.toFixed(1)}%
              </span>
            )}
          </div>
          {description && (
            <p className="mt-1 text-xs text-gray-400">{description}</p>
          )}
        </div>
        {action}
      </div>

      {/* Chart body */}
      <div className="px-5 pb-5">
        {children}
      </div>
    </div>
  )
}

export function TrendChartCard(props: ChartCardProps) {
  return <ChartCard {...props} />
}
