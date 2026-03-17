'use client'

import Link from 'next/link'
import { Card, Group, Text, Badge, Box, ThemeIcon } from '@mantine/core'
import { Trophy, TrendingDown, AlertTriangle, Lightbulb, ArrowRight } from 'lucide-react'
import type { AnomalySeverity } from '@/types'

interface InsightCardProps {
  entity: string
  entitySlug?: string
  entityType: string
  metric: string
  value: string
  delta?: number
  reason: string
  action?: string
  actionHref?: string
  severity: AnomalySeverity
  type?: 'risk' | 'opportunity' | 'info' | 'winner' | 'loser'
  className?: string
}

const typeConfig = {
  winner: {
    icon: Trophy,
    borderColor: '#12B76A',
    iconColor: '#039855',
    iconBg: '#ECFDF3',
  },
  loser: {
    icon: TrendingDown,
    borderColor: '#F04438',
    iconColor: '#D92D20',
    iconBg: '#FEF3F2',
  },
  risk: {
    icon: AlertTriangle,
    borderColor: '#F79009',
    iconColor: '#DC6803',
    iconBg: '#FFFAEB',
  },
  opportunity: {
    icon: Lightbulb,
    borderColor: '#6366F1',
    iconColor: '#4F46E5',
    iconBg: '#EEF2FF',
  },
  info: {
    icon: Lightbulb,
    borderColor: '#06B6D4',
    iconColor: '#06B6D4',
    iconBg: '#F9FAFB',
  },
}

const severityWeight: Record<AnomalySeverity, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
}

export function InsightCard({
  entity,
  entitySlug,
  entityType,
  metric,
  value,
  delta,
  reason,
  action,
  actionHref,
  severity,
  type = 'info',
}: InsightCardProps) {
  const config = typeConfig[type]
  const Icon = config.icon
  const isCritical = severityWeight[severity] >= 3
  const href = actionHref || (entitySlug && entityType === 'site' ? `/sites/${entitySlug}` : undefined)

  return (
    <Card
      padding="md"
      radius="xl"
      shadow="sm"
      withBorder
      styles={{
        root: {
          borderColor: '#E5E7EB',
          borderLeft: `3px solid ${config.borderColor}`,
          transition: 'all 0.15s ease',
          '&:hover': {
            transform: 'translateY(-1px)',
            boxShadow: '0 4px 10px rgba(16,24,40,0.08), 0 2px 4px rgba(16,24,40,0.04)',
          },
        },
      }}
    >
      <Group align="flex-start" gap="sm" wrap="nowrap">
        <ThemeIcon
          size={28}
          radius="md"
          variant="light"
          styles={{
            root: {
              backgroundColor: config.iconBg,
              color: config.iconColor,
              flexShrink: 0,
            },
          }}
        >
          <Icon size={14} />
        </ThemeIcon>

        <Box flex={1} miw={0}>
          <Group gap="xs" align="center">
            <Text size="sm" fw={600} c="#111827" truncate>
              {entity}
            </Text>
            <Badge
              size="xs"
              variant="light"
              color="gray"
              radius="xl"
              styles={{ root: { textTransform: 'none', fontWeight: 500, fontSize: 10 } }}
            >
              {entityType}
            </Badge>
            {isCritical && (
              <Badge size="xs" color="red" variant="light" radius="xl" tt="uppercase" fw={600}>
                {severity}
              </Badge>
            )}
          </Group>

          <Group gap="xs" mt={6} align="baseline">
            <Text size="xs" c="#6B7280">{metric}:</Text>
            <Text size="sm" fw={600} style={{ fontVariantNumeric: 'tabular-nums' }} c="#111827">
              {value}
            </Text>
            {delta !== undefined && (
              <Text
                size="xs"
                fw={600}
                style={{ fontVariantNumeric: 'tabular-nums' }}
                c={delta >= 0 ? '#039855' : '#D92D20'}
              >
                {delta >= 0 ? '+' : ''}{delta.toFixed(1)}%
              </Text>
            )}
          </Group>

          <Text size="xs" c="#6B7280" mt={6} lh={1.6}>
            {reason}
          </Text>

          {action && href && (
            <Text
              component={Link}
              href={href}
              size="xs"
              fw={600}
              c="#4F46E5"
              mt={8}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                textDecoration: 'none',
                transition: 'color 0.15s',
              }}
            >
              {action}
              <ArrowRight size={12} />
            </Text>
          )}
          {action && !href && (
            <Text size="xs" fw={600} c="#4F46E5" mt={8} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              {action}
              <ArrowRight size={12} />
            </Text>
          )}
        </Box>
      </Group>
    </Card>
  )
}

// Specialized card variants
export function WinnerCard(props: Omit<InsightCardProps, 'type'>) {
  return <InsightCard {...props} type="winner" />
}

export function LoserCard(props: Omit<InsightCardProps, 'type'>) {
  return <InsightCard {...props} type="loser" />
}

export function RiskCard(props: Omit<InsightCardProps, 'type'>) {
  return <InsightCard {...props} type="risk" />
}

export function OpportunityCard(props: Omit<InsightCardProps, 'type'>) {
  return <InsightCard {...props} type="opportunity" />
}
