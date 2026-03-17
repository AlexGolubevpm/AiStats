import { cn } from '@/lib/utils'

interface ChartCardProps {
  title: string
  description?: string
  children: React.ReactNode
  className?: string
  action?: React.ReactNode
}

export function ChartCard({ title, description, children, className, action }: ChartCardProps) {
  return (
    <div
      className={cn(
        'rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] shadow-[var(--shadow-card)] transition-all duration-200 hover:shadow-[var(--shadow-elevated)]',
        className
      )}
    >
      <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-secondary)]/50 px-5 py-4">
        <div>
          <h3 className="text-[14px] font-semibold text-[var(--color-text-primary)]">{title}</h3>
          {description && (
            <p className="mt-0.5 text-meta">{description}</p>
          )}
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

export function TrendChartCard({ title, description, children, className, action }: ChartCardProps) {
  return <ChartCard title={title} description={description} className={className} action={action}>{children}</ChartCard>
}
