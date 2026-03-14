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
        'rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]',
        className
      )}
    >
      <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] px-5 py-4">
        <div>
          <h3 className="text-sm font-medium text-[var(--color-text-primary)]">{title}</h3>
          {description && (
            <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">{description}</p>
          )}
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}
