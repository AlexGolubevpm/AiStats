'use client'

import Link from 'next/link'
import { Card, Group, Text, Badge, Box, ThemeIcon } from '@mantine/core'
import { Trophy, TrendingDown, AlertTriangle, Lightbulb, ArrowRight, TrendingUp as TrendingUpIcon, ChevronRight } from 'lucide-react'
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

  const cardContent = (
    <Box style={{ padding: 20 }}>
      {/* Top row: icon + title + chevron */}
      <Group justify="space-between" align="flex-start" wrap="nowrap">
        <Group gap={12} align="flex-start" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
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
            </Group>

            <Group gap={8} mt={4} align="baseline">
              <Text fw={600} c="#0F172A" style={{ fontSize: 15 }}>
                {entity} bundle
              </Text>
              <Text
                fw={600}
                style={{
                  fontVariantNumeric: 'tabular-nums',
                  fontSize: 14,
                  color: '#4B5563',
                }}
              >
                {delta !== undefined && (
                  <span style={{ color: delta >= 0 ? '#16A34A' : '#DC2626' }}>
                    {delta >= 0 ? '>' : ''}{delta.toFixed(1)}%
                  </span>
                )}
                {' '}
                {delta !== undefined ? (delta >= 0 ? 'K previous' : 'K previous') : ''}
              </Text>
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
        </Group>

        {/* Right chevron */}
        {href && (
          <Box style={{ flexShrink: 0, marginTop: 2 }}>
            <ChevronRight size={18} color="#94A3B8" />
          </Box>
        )}
      </Group>
    </Box>
  )

  if (href) {
    return (
      <Card
        padding={0}
        radius={18}
        component={Link}
        href={href}
        styles={{
          root: {
            background: '#FFFFFF',
            border: '1px solid #E6EAF0',
            boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
            transition: 'all 0.15s ease',
            textDecoration: 'none',
            cursor: 'pointer',
            '&:hover': {
              transform: 'translateY(-1px)',
              boxShadow: '0 8px 24px rgba(15, 23, 42, 0.06)',
            },
          },
        }}
      >
        {cardContent}
      </Card>
    )
  }

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
      {cardContent}
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
