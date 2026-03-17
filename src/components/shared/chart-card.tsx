import { cn } from '@/lib/utils'

interface ChartCardProps {
  title: string
  description?: string
  children: React.ReactNode
  className?: string
  action?: React.ReactNode
  delta?: number
}

export function ChartCard({ title, description, children, className, action, delta }: ChartCardProps) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-[16px] border border-[#E5E7EB] bg-white shadow-[0_1px_3px_rgba(16,24,40,0.06),0_1px_2px_rgba(16,24,40,0.04)] transition-all duration-200 hover:shadow-[0_4px_10px_rgba(16,24,40,0.08),0_2px_4px_rgba(16,24,40,0.04)]',
        className
      )}
    >
      <div className="flex items-center justify-between px-5 py-4">
        <div>
          <div className="flex items-center gap-3">
            <h3 className="text-[14px] font-semibold text-[#111827]">{title}</h3>
            {delta !== undefined && (
              <span className={`text-[12px] font-semibold tabular-nums ${delta >= 0 ? 'text-[#039855]' : 'text-[#D92D20]'}`}>
                {delta >= 0 ? '+' : ''}{delta.toFixed(1)}%
              </span>
            )}
          </div>
          {description && (
            <p className="mt-0.5 text-[12px] font-medium text-[#6B7280]">{description}</p>
          )}
        </div>
        {action}
      </div>
      <div className="px-5 pb-5">{children}</div>
    </div>
  )
}

export function TrendChartCard({ title, description, children, className, action, delta }: ChartCardProps) {
  return <ChartCard title={title} description={description} className={className} action={action} delta={delta}>{children}</ChartCard>
}
