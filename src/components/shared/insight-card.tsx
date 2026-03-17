'use client'

import Link from 'next/link'
import { Card, Group, Text, Badge, Box, ThemeIcon } from '@mantine/core'
import { Trophy, TrendingDown, AlertTriangle, Lightbulb, ArrowRight, TrendingUp as TrendingUpIcon } from 'lucide-react'
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
    borderColor: '#16A34A',
    iconColor: '#16A34A',
    iconBg: '#F0FDF4',
  },
  loser: {
    icon: TrendingDown,
    borderColor: '#DC2626',
    iconColor: '#DC2626',
    iconBg: '#FEF2F2',
  },
  risk: {
    icon: AlertTriangle,
    borderColor: '#D97706',
    iconColor: '#D97706',
    iconBg: '#FFFBEB',
  },
  opportunity: {
    icon: TrendingUpIcon,
    borderColor: '#4F46E5',
    iconColor: '#4F46E5',
    iconBg: '#EEF2FF',
  },
  info: {
    icon: Lightbulb,
    borderColor: '#06B6D4',
    iconColor: '#06B6D4',
    iconBg: '#F0F9FF',
  },
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
  const href = actionHref || (entitySlug && entityType === 'site' ? `/sites/${entitySlug}` : undefined)

  return (
    <Card
      padding={0}
      radius={18}
      styles={{
        root: {
          background: '#FFFFFF',
          border: '1px solid #E6EAF0',
          boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
          transition: 'all 0.15s ease',
          '&:hover': {
            transform: 'translateY(-1px)',
            boxShadow: '0 8px 24px rgba(15, 23, 42, 0.06)',
          },
        },
      }}
    >
      <Box style={{ padding: 20, display: 'flex', gap: 14 }}>
        <ThemeIcon
          size={36}
          radius={10}
          variant="light"
          styles={{
            root: {
              backgroundColor: config.iconBg,
              color: config.iconColor,
              flexShrink: 0,
              border: 'none',
            },
          }}
        >
          <Icon size={18} />
        </ThemeIcon>

        <Box style={{ flex: 1, minWidth: 0 }}>
          <Group gap={8} align="center">
            <Text fw={600} c="#0F172A" truncate style={{ fontSize: 15 }}>
              {metric}
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
          </Group>

          <Group gap={8} mt={6} align="baseline">
            <Text fw={600} c="#0F172A" style={{ fontSize: 15 }}>
              {entity}
            </Text>
            <Text
              fw={600}
              style={{
                fontVariantNumeric: 'tabular-nums',
                fontSize: 14,
                color: '#4B5563',
              }}
            >
              {value}
            </Text>
            {delta !== undefined && (
              <Text
                fw={600}
                style={{
                  fontVariantNumeric: 'tabular-nums',
                  fontSize: 13,
                  color: delta >= 0 ? '#16A34A' : '#DC2626',
                }}
              >
                {delta >= 0 ? '+' : ''}{delta.toFixed(1)}%
              </Text>
            )}
          </Group>

          <Text c="#64748B" mt={8} style={{ fontSize: 13, lineHeight: 1.6 }}>
            {reason}
          </Text>

          {action && href && (
            <Text
              component={Link}
              href={href}
              fw={600}
              c="#4F46E5"
              mt={10}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                textDecoration: 'none',
                transition: 'color 0.15s',
                fontSize: 13,
              }}
            >
              {action}
              <ArrowRight size={13} />
            </Text>
          )}
          {action && !href && (
            <Text
              fw={600}
              c="#4F46E5"
              mt={10}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13 }}
            >
              {action}
              <ArrowRight size={13} />
            </Text>
          )}
        </Box>
      </Box>
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
