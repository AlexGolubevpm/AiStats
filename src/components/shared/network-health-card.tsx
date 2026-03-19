'use client'
import { cn } from '@/lib/utils'

interface NetworkHealthCardProps {
  score: number
  unhealthyCount?: number
  totalBundles?: number
  confidence?: 'full' | 'partial' | 'low'
}

function getHealthConfig(score: number) {
  if (score >= 80) return { label: 'Excellent', color: 'text-emerald-600', stroke: '#059669', trackColor: '#D1FAE5' }
  if (score >= 60) return { label: 'Good', color: 'text-blue-600', stroke: '#2563EB', trackColor: '#DBEAFE' }
  if (score >= 40) return { label: 'Warning', color: 'text-amber-600', stroke: '#D97706', trackColor: '#FEF3C7' }
  return { label: 'Critical', color: 'text-red-600', stroke: '#DC2626', trackColor: '#FEE2E2' }
}

/* ── pt 22: SVG arc gauge ── */
function HealthGauge({ score, config }: { score: number; config: ReturnType<typeof getHealthConfig> }) {
  const radius = 40
  const stroke = 8
  const cx = 50
  const cy = 50
  // 270° arc (from 135° to 405°)
  const startAngle = 135
  const endAngle = 405
  const range = endAngle - startAngle
  const circumference = (range / 360) * 2 * Math.PI * radius
  const filled = (Math.min(Math.max(score, 0), 100) / 100) * circumference
  const dashOffset = circumference - filled

  const toXY = (angle: number) => ({
    x: cx + radius * Math.cos((angle * Math.PI) / 180),
    y: cy + radius * Math.sin((angle * Math.PI) / 180),
  })

  const start = toXY(startAngle)
  const end = toXY(endAngle)
  const largeArc = range > 180 ? 1 : 0

  const arcPath = `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y}`

  return (
    <svg viewBox="0 0 100 100" className="h-[88px] w-[88px]">
      {/* Track */}
      <path d={arcPath} fill="none" stroke={config.trackColor} strokeWidth={stroke} strokeLinecap="round" />
      {/* Filled arc */}
      <path
        d={arcPath}
        fill="none"
        stroke={config.stroke}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${circumference}`}
        strokeDashoffset={dashOffset}
        className="transition-all duration-700 ease-out"
      />
      {/* Score text */}
      <text x={cx} y={cy - 2} textAnchor="middle" className={cn('text-[18px] font-bold', config.color)} fill={config.stroke}>
        {Math.round(score)}
      </text>
      <text x={cx} y={cy + 12} textAnchor="middle" className="text-[8px] font-medium" fill="#6B7280">
        / 100
      </text>
    </svg>
  )
}

export function NetworkHealthCard({ score, unhealthyCount = 0, totalBundles = 0, confidence = 'full' }: NetworkHealthCardProps) {
  const health = getHealthConfig(score)
  return (
    <div className={cn(
      'rounded-[var(--radius-card)] bg-[var(--color-surface)]',
      'border border-[var(--color-border-subtle)]',
      'shadow-[var(--shadow-card)] p-4',
    )}>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Network Health</p>

      <div className="mt-2 flex items-center gap-3">
        <HealthGauge score={score} config={health} />
        <div className="flex-1 min-w-0">
          <p className={cn('text-lg font-bold', health.color)}>{health.label}</p>
          {totalBundles > 0 && (
            <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
              {totalBundles - unhealthyCount}/{totalBundles} bundles healthy
            </p>
          )}
          {unhealthyCount > 0 && (
            <p className="mt-0.5 text-xs font-medium text-[var(--color-warning-dark)]">
              {unhealthyCount} need attention
            </p>
          )}
          {confidence !== 'full' && (
            <p className="mt-0.5 text-[11px] text-amber-600">
              {confidence === 'partial' ? 'Partial data' : 'Low confidence'}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
