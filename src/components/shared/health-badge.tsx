import { cn, getHealthStatus } from '@/lib/utils'

interface HealthBadgeProps {
  score: number
  showLabel?: boolean
  className?: string
}

export function HealthBadge({ score, showLabel = true, className }: HealthBadgeProps) {
  const status = getHealthStatus(score)

  const colors = {
    healthy: 'bg-[var(--color-healthy-bg)] text-[var(--color-healthy)]',
    warning: 'bg-[var(--color-warning-bg)] text-[var(--color-warning)]',
    critical: 'bg-[var(--color-critical-bg)] text-[var(--color-critical)]',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium tabular-nums',
        colors[status],
        className
      )}
    >
      <span className="font-semibold">{score}</span>
      {showLabel && <span className="capitalize">{status}</span>}
    </span>
  )
}
