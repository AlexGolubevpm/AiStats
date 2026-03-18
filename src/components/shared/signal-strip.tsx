'use client'

import { Card, Group, Text, Box, ThemeIcon, SimpleGrid } from '@mantine/core'
import { TrendingDown, AlertTriangle, Trophy } from 'lucide-react'
import { formatCurrency, formatPercent } from '@/lib/utils'

interface SignalData {
  type: 'drop' | 'risk' | 'winner'
  title: string
  entity: string
  metric: string
  value: number
  delta: number
  reason: string
}

const signalConfig = {
  drop: {
    icon: TrendingDown,
    label: 'BIGGEST REVENUE DROP',
    iconBg: '#FEF2F2',
    iconColor: '#DC2626',
    accentColor: '#DC2626',
  },
  risk: {
    icon: AlertTriangle,
    label: 'MAIN RISK',
    iconBg: '#FFFBEB',
    iconColor: '#D97706',
    accentColor: '#D97706',
  },
  winner: {
    icon: Trophy,
    label: 'STRONGEST BUNDLE',
    iconBg: '#EEF2FF',
    iconColor: '#4F46E5',
    accentColor: '#4F46E5',
  },
}

function SignalCard({ signal }: { signal: SignalData }) {
  const config = signalConfig[signal.type]
  const Icon = config.icon

  return (
    <Card
      padding={0}
      radius={18}
      styles={{
        root: {
          background: '#FFFFFF',
          border: '1px solid #E6EAF0',
          borderLeft: `3px solid ${config.accentColor}`,
          boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
          minHeight: 100,
          transition: 'all 0.15s ease',
          '&:hover': {
            transform: 'translateY(-1px)',
            boxShadow: '0 8px 24px rgba(15, 23, 42, 0.06)',
          },
        },
      }}
    >
      <Box style={{ padding: 18 }}>
        <Group align="flex-start" gap={14} wrap="nowrap">
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
          <Box flex={1} miw={0}>
            <Text
              style={{
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                fontWeight: 700,
                color: '#6B7280',
                lineHeight: '14px',
              }}
            >
              {config.label}
            </Text>
            <Group gap={8} mt={6} align="baseline">
              <Text
                fw={600}
                c="#0F172A"
                truncate
                style={{ fontSize: 15 }}
              >
                {signal.entity}
              </Text>
              <Text
                fw={600}
                style={{
                  fontVariantNumeric: 'tabular-nums',
                  fontSize: 13,
                  color: '#4B5563',
                }}
              >
                {signal.type === 'winner'
                  ? signal.entity
                  : formatCurrency(signal.value)}
              </Text>
              {signal.type !== 'winner' && (
                <Text
                  fw={600}
                  style={{
                    fontVariantNumeric: 'tabular-nums',
                    fontSize: 13,
                    color: signal.delta >= 0 ? '#16A34A' : '#DC2626',
                  }}
                >
                  {formatPercent(signal.delta)}
                </Text>
              )}
            </Group>
            <Text
              c="#64748B"
              mt={6}
              truncate
              style={{ fontSize: 12, lineHeight: '16px' }}
            >
              {signal.reason}
            </Text>
          </Box>
        </Group>
      </Box>
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
    // Biggest revenue drop
    const sortedByDelta = [...bundles]
      .filter(b => b.delta !== undefined)
      .sort((a, b) => (a.delta ?? 0) - (b.delta ?? 0))

    if (sortedByDelta.length > 0 && (sortedByDelta[0].delta ?? 0) < 0) {
      const b = sortedByDelta[0]
      signals.push({
        type: 'drop',
        title: 'Biggest Revenue Drop',
        entity: b.name,
        metric: 'Revenue',
        value: b.totalRevenue,
        delta: b.delta ?? 0,
        reason: `Revenue dropped ${formatCurrency(Math.abs(b.totalRevenue * (Math.abs(b.delta ?? 0) / 100)))} compared to previous day.`,
      })
    }
  }

  // Main risk
  const risks = insights.filter(i => i.type === 'risk' && (i.severity === 'high' || i.severity === 'critical'))
  if (risks.length > 0) {
    const r = risks[0]
    signals.push({
      type: 'risk',
      title: 'Main Risk',
      entity: r.entity,
      metric: r.metric,
      value: parseFloat(r.value) || 0,
      delta: r.delta ?? 0,
      reason: r.reason || `Anomaly detected on ${r.metric}`,
    })
  } else if (bundles.length > 0) {
    // Fallback: find bundle with empty ad slots or lowest health
    const worst = [...bundles].sort((a, b) => (a.healthScore ?? 100) - (b.healthScore ?? 100))[0]
    if (worst) {
      signals.push({
        type: 'risk',
        title: 'Main Risk',
        entity: worst.name,
        metric: 'Health',
        value: worst.totalRevenue,
        delta: worst.delta ?? 0,
        reason: `${worst.name} needs attention — check traffic and ad performance.`,
      })
    }
  }

  if (bundles.length > 0) {
    // Strongest bundle (best ROMI)
    const bestByRomi = [...bundles].sort((a, b) => b.romi - a.romi)[0]
    if (bestByRomi) {
      signals.push({
        type: 'winner',
        title: 'Strongest Bundle',
        entity: bestByRomi.name,
        metric: 'ROMI',
        value: bestByRomi.profit,
        delta: bestByRomi.romi,
        reason: `Best return on investment with ${formatCurrency(bestByRomi.profit)} profit.`,
      })
    }
  }

  if (signals.length === 0) return null

  return (
    <Box>
      <Text
        style={{
          fontSize: 20,
          fontWeight: 600,
          color: '#0F172A',
          marginBottom: 16,
        }}
      >
        Network Signals
      </Text>
      <SimpleGrid cols={{ base: 1, sm: 2, xl: 3 }} spacing={20}>
        {signals.slice(0, 3).map((signal, i) => (
          <SignalCard key={i} signal={signal} />
        ))}
      </SimpleGrid>
    </Box>
  )
}
