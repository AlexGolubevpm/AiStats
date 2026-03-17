'use client'

import { Card, Group, Text, Box, ThemeIcon, SimpleGrid } from '@mantine/core'
import { TrendingUp, TrendingDown, AlertTriangle, Trophy } from 'lucide-react'
import { formatCurrency, formatPercent } from '@/lib/utils'

interface SignalData {
  type: 'gain' | 'drop' | 'risk' | 'winner'
  entity: string
  metric: string
  value: number
  delta: number
  reason: string
}

const signalConfig = {
  gain: {
    icon: TrendingUp,
    label: 'Biggest Revenue Gain',
    iconBg: '#ECFDF3',
    iconColor: '#039855',
    borderColor: '#10B981',
  },
  drop: {
    icon: TrendingDown,
    label: 'Biggest Revenue Drop',
    iconBg: '#FEF3F2',
    iconColor: '#D92D20',
    borderColor: '#F04438',
  },
  risk: {
    icon: AlertTriangle,
    label: 'Highest Risk',
    iconBg: '#FFFAEB',
    iconColor: '#DC6803',
    borderColor: '#F79009',
  },
  winner: {
    icon: Trophy,
    label: 'Strongest Bundle',
    iconBg: '#EEF2FF',
    iconColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
}

function SignalCard({ signal }: { signal: SignalData }) {
  const config = signalConfig[signal.type]
  const Icon = config.icon

  return (
    <Card
      padding="sm"
      radius="lg"
      shadow="xs"
      withBorder
      styles={{
        root: {
          borderColor: '#E5E7EB',
          borderLeft: `3px solid ${config.borderColor}`,
          transition: 'all 0.15s ease',
          '&:hover': {
            transform: 'translateY(-1px)',
            boxShadow: '0 4px 10px rgba(16,24,40,0.08)',
          },
        },
      }}
    >
      <Group align="flex-start" gap="sm" wrap="nowrap">
        <ThemeIcon
          size={32}
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
          <Icon size={16} />
        </ThemeIcon>
        <Box flex={1} miw={0}>
          <Text
            size="xs"
            fw={600}
            tt="uppercase"
            c="#6B7280"
            style={{ letterSpacing: '0.04em', fontSize: 11 }}
          >
            {config.label}
          </Text>
          <Group gap="xs" mt={2} align="baseline">
            <Text size="sm" fw={600} c="#111827" truncate>
              {signal.entity}
            </Text>
            <Text size="xs" fw={600} c="#4B5563" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {signal.type === 'winner' ? `${signal.delta.toFixed(1)}% ROMI` : formatCurrency(signal.value)}
            </Text>
            {signal.type !== 'winner' && (
              <Text
                size="xs"
                fw={600}
                style={{ fontVariantNumeric: 'tabular-nums' }}
                c={signal.delta >= 0 ? '#039855' : '#D92D20'}
              >
                {formatPercent(signal.delta)}
              </Text>
            )}
          </Group>
          <Text size="xs" c="#6B7280" mt={4} truncate style={{ fontSize: 11 }}>
            {signal.reason}
          </Text>
        </Box>
      </Group>
    </Card>
  )
}

interface SignalStripProps {
  bundles: Array<{
    name: string
    totalRevenue: number
    profit: number
    romi: number
    delta?: number
    healthScore?: number
  }>
  insights: Array<{
    entity: string
    metric: string
    value: string
    delta?: number
    reason?: string
    severity: string
    type?: string
  }>
}

export function SignalStrip({ bundles, insights }: SignalStripProps) {
  const signals: SignalData[] = []

  if (bundles.length > 0) {
    const sortedByDelta = [...bundles].filter(b => b.delta !== undefined).sort((a, b) => (b.delta ?? 0) - (a.delta ?? 0))

    if (sortedByDelta.length > 0 && (sortedByDelta[0].delta ?? 0) > 0) {
      const b = sortedByDelta[0]
      signals.push({
        type: 'gain',
        entity: b.name,
        metric: 'Revenue',
        value: b.totalRevenue,
        delta: b.delta ?? 0,
        reason: `Revenue up ${formatPercent(b.delta ?? 0)} vs previous period`,
      })
    }

    const worstBundle = sortedByDelta[sortedByDelta.length - 1]
    if (worstBundle && (worstBundle.delta ?? 0) < 0) {
      signals.push({
        type: 'drop',
        entity: worstBundle.name,
        metric: 'Revenue',
        value: worstBundle.totalRevenue,
        delta: worstBundle.delta ?? 0,
        reason: `Revenue dropped ${formatPercent(worstBundle.delta ?? 0)} — needs attention`,
      })
    }

    const bestByRomi = [...bundles].sort((a, b) => b.romi - a.romi)[0]
    if (bestByRomi) {
      signals.push({
        type: 'winner',
        entity: bestByRomi.name,
        metric: 'ROMI',
        value: bestByRomi.profit,
        delta: bestByRomi.romi,
        reason: `Best return on investment with ${formatCurrency(bestByRomi.profit)} profit`,
      })
    }
  }

  const risks = insights.filter(i => i.type === 'risk' && (i.severity === 'high' || i.severity === 'critical'))
  if (risks.length > 0) {
    const r = risks[0]
    signals.push({
      type: 'risk',
      entity: r.entity,
      metric: r.metric,
      value: parseFloat(r.value) || 0,
      delta: r.delta ?? 0,
      reason: r.reason || `Anomaly detected on ${r.metric}`,
    })
  }

  if (signals.length === 0) return null

  return (
    <SimpleGrid cols={{ base: 1, sm: 2, xl: 4 }} spacing="md">
      {signals.slice(0, 4).map((signal, i) => (
        <SignalCard key={i} signal={signal} />
      ))}
    </SimpleGrid>
  )
}
