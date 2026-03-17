'use client'

import { Badge, Tooltip } from '@mantine/core'
import { getHealthStatus } from '@/lib/utils'

interface HealthBadgeProps {
  score: number
  showLabel?: boolean
  size?: 'sm' | 'md'
  className?: string
}

export function HealthBadge({ score, showLabel = true, size = 'sm' }: HealthBadgeProps) {
  const status = getHealthStatus(score)
  const colorMap = {
    healthy: 'green',
    warning: 'yellow',
    critical: 'red',
  } as const

  return (
    <Tooltip label={`Health Score: ${score.toFixed(0)}/100 (${status})`} withArrow>
      <Badge
        size={size === 'sm' ? 'xs' : 'sm'}
        color={colorMap[status]}
        variant="light"
        radius="xl"
        styles={{
          root: {
            textTransform: 'none',
            fontWeight: 600,
            cursor: 'default',
            fontVariantNumeric: 'tabular-nums',
          },
        }}
      >
        {score.toFixed(0)}/100{showLabel ? ` ${status}` : ''}
      </Badge>
    </Tooltip>
  )
}

export function HealthPill({ score }: { score: number; className?: string }) {
  return <HealthBadge score={score} showLabel={false} size="sm" />
}
