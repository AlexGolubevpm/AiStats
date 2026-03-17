import { cn, getHealthStatus } from '@/lib/utils'

interface HealthBadgeProps {
  score: number
  showLabel?: boolean
  size?: 'sm' | 'md'
  className?: string
}

const statusStyles = {
  healthy: {
    bg: 'bg-[var(--color-success-bg)]',
    text: 'text-[var(--color-success-dark)]',
    dot: 'bg-[var(--color-success)]',
    hoverGlow: 'hover:shadow-[var(--shadow-glow-success)]',
  },
  warning: {
    bg: 'bg-[var(--color-warning-bg)]',
    text: 'text-[var(--color-warning-dark)]',
    dot: 'bg-[var(--color-warning)]',
    hoverGlow: 'hover:shadow-[var(--shadow-glow-warning)]',
  },
  critical: {
    bg: 'bg-[var(--color-danger-bg)]',
    text: 'text-[var(--color-danger-dark)]',
    dot: 'bg-[var(--color-danger)]',
    hoverGlow: 'hover:shadow-[var(--shadow-glow-danger)]',
  },
}

export function HealthBadge({ score, showLabel = true, size = 'sm', className }: HealthBadgeProps) {
  const status = getHealthStatus(score)
  const styles = statusStyles[status]

  return (
    <span
      aria-label={`Health score ${score}: ${status}`}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] font-semibold tabular-nums transition-shadow duration-200',
        styles.bg,
        styles.text,
        styles.hoverGlow,
        size === 'sm' ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1.5 text-[12px]',
        className
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', styles.dot, status === 'critical' && 'animate-pulse')} />
      <span>{score}/100</span>
      {showLabel && <span className="capitalize font-medium">{status}</span>}
    </span>
  )
}

export function HealthPill({ score, className }: { score: number; className?: string }) {
  return <HealthBadge score={score} showLabel={false} size="sm" className={className} />
}
