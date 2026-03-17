'use client'

import { Card, Text, Group, Box, Tooltip } from '@mantine/core'
import { motion } from 'framer-motion'
import { formatCurrency, formatNumber, formatPercent, formatCompact } from '@/lib/utils'
import { MetricDelta } from './delta-indicator'
import { MiniSparkline } from './sparkline'

const METRIC_COLORS: Record<string, string> = {
  'Visitors': '#06B6D4',
  'Ad Requests': '#0EA5E9',
  'Ad Revenue': '#4F46E5',
  'Affiliate Revenue': '#EC4899',
  'Total Revenue': '#6366F1',
  'Costs': '#F59E0B',
  'Profit': '#10B981',
  'ROMI': '#8B5CF6',
  'RPM': '#14B8A6',
}

interface KPICardProps {
  label: string
  value: number
  previousValue?: number
  delta?: number
  format?: 'currency' | 'number' | 'percent' | 'score' | 'compact'
  trend?: number[]
  className?: string
}

export function KPICard({
  label,
  value,
  delta,
  format = 'number',
  trend,
}: KPICardProps) {
  const isInvalidValue = isNaN(value)

  const formattedValue = (() => {
    if (isInvalidValue) return '\u2014'
    switch (format) {
      case 'currency':
        return formatCurrency(value)
      case 'percent':
        return `${value.toFixed(1)}%`
      case 'score':
        return value.toString()
      case 'compact':
        return formatCompact(value)
      default:
        return formatNumber(value)
    }
  })()

  const sparkColor = METRIC_COLORS[label] || '#6366F1'

  return (
    <Card
      padding="lg"
      radius="xl"
      shadow="sm"
      withBorder
      styles={{
        root: {
          borderColor: '#E5E7EB',
          minHeight: 144,
          transition: 'all 0.16s ease',
          cursor: 'default',
          '&:hover': {
            transform: 'translateY(-1px)',
            boxShadow: '0 4px 10px rgba(16,24,40,0.08), 0 2px 4px rgba(16,24,40,0.04)',
            borderColor: '#D7DCE5',
          },
        },
      }}
    >
      {/* Label */}
      <Text
        size="xs"
        fw={600}
        tt="uppercase"
        c="#6B7280"
        style={{ letterSpacing: '0.04em', fontSize: 12 }}
      >
        {label}
      </Text>

      {/* Value */}
      <Text
        fw={700}
        c="#111827"
        mt={10}
        style={{
          fontSize: 38,
          lineHeight: '44px',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {formattedValue}
      </Text>

      {/* Delta + Sparkline */}
      <Group justify="space-between" align="flex-end" mt={12}>
        <Box>
          {delta !== undefined && (
            <Group gap={6} align="center">
              <MetricDelta value={delta} size="sm" />
              <Text size="xs" c="#6B7280" fw={500}>
                vs prev
              </Text>
            </Group>
          )}
        </Box>
        {trend && trend.length > 1 && (
          <MiniSparkline data={trend} color={sparkColor} width={120} height={28} />
        )}
      </Group>
    </Card>
  )
}
