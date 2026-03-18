'use client'

import { useId } from 'react'
import { Card, Text, Group, Box, Badge } from '@mantine/core'
import { ResponsiveContainer, AreaChart, Area } from 'recharts'
import { formatCurrency, formatNumber, formatPercent, formatCompact } from '@/lib/utils'

const METRIC_COLORS: Record<string, { line: string; fill: string }> = {
  'Visitors': { line: '#4AA3D8', fill: '#4AA3D8' },
  'Ad Revenue': { line: '#7C5CFA', fill: '#7C5CFA' },
  'Total Revenue': { line: '#8B6BFF', fill: '#8B6BFF' },
  'Profit': { line: '#43B08A', fill: '#43B08A' },
  'ROMI': { line: '#6485F7', fill: '#6485F7' },
  'Ad Requests': { line: '#58A8E7', fill: '#58A8E7' },
  'Affiliate Revenue': { line: '#E879C6', fill: '#E879C6' },
  'Costs': { line: '#E4A05F', fill: '#E4A05F' },
  'RPM': { line: '#31B4C8', fill: '#31B4C8' },
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

function formatPreviousCompact(value: number, format: string): string {
  if (isNaN(value)) return ''
  switch (format) {
    case 'currency': {
      if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
      if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(1)}K`
      return `$${value.toFixed(0)}`
    }
    case 'percent':
      return `${value.toFixed(1)}%`
    case 'score':
      return value.toFixed(2)
    case 'compact': {
      if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
      if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(0)}K`
      return value.toFixed(0)
    }
    default: {
      if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
      if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(0)}K`
      return value.toFixed(0)
    }
  }
}

export function KPICard({
  label,
  value,
  previousValue,
  delta,
  format = 'number',
  trend,
}: KPICardProps) {
  const id = useId()
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

  const colors = METRIC_COLORS[label] || { line: '#6366F1', fill: '#6366F1' }
  const gradientId = `kpiGrad-${id}`

  // Sparkline data
  const sparkData = trend && trend.length > 1
    ? (trend.length > 14 ? trend.slice(-14) : trend).map((v, i) => ({ i, v }))
    : null

  const deltaColor = delta !== undefined
    ? delta > 0 ? '#16A34A' : delta < 0 ? '#DC2626' : '#64748B'
    : '#64748B'

  // Compute previous value from delta if not provided directly
  const prevVal = previousValue ?? (delta !== undefined && delta !== 0 && !isInvalidValue
    ? value / (1 + delta / 100)
    : undefined)

  const prevBadgeText = prevVal !== undefined ? formatPreviousCompact(prevVal, format) : undefined

  return (
    <Card
      padding={0}
      radius={20}
      styles={{
        root: {
          background: '#FFFFFF',
          border: '1px solid #E6EAF0',
          boxShadow: '0 8px 24px rgba(15, 23, 42, 0.06)',
          minHeight: 160,
          transition: 'all 0.16s ease',
          cursor: 'default',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          '&:hover': {
            transform: 'translateY(-1px)',
            boxShadow: '0 12px 28px rgba(15, 23, 42, 0.08)',
          },
        },
      }}
    >
      <Box style={{ padding: 20, display: 'flex', flexDirection: 'column', flex: 1 }}>
        {/* Label row */}
        <Group gap={8} align="center" style={{ marginBottom: 14 }}>
          <Text
            style={{
              fontSize: 12,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              fontWeight: 700,
              color: '#6B7280',
              lineHeight: '16px',
            }}
          >
            {label}
          </Text>
          {prevBadgeText && (
            <Badge
              size="xs"
              radius="md"
              variant="light"
              styles={{
                root: {
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: 10,
                  height: 18,
                  paddingLeft: 5,
                  paddingRight: 5,
                  color: colors.line,
                  backgroundColor: `${colors.line}14`,
                  border: 'none',
                  fontVariantNumeric: 'tabular-nums',
                },
              }}
            >
              {prevBadgeText}
            </Badge>
          )}
        </Group>

        {/* Value row */}
        <Text
          style={{
            fontSize: 42,
            lineHeight: '46px',
            fontWeight: 700,
            color: '#0F172A',
            fontVariantNumeric: 'tabular-nums',
            fontFamily: 'Inter, sans-serif',
            marginBottom: 10,
          }}
        >
          {formattedValue}
        </Text>

        {/* Delta row — uses ~ prefix like reference */}
        <Box style={{ marginBottom: 16 }}>
          {delta !== undefined && (
            <Group gap={4} align="center">
              <Text
                style={{
                  fontSize: 13,
                  lineHeight: '18px',
                  fontWeight: 600,
                  color: deltaColor,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                ~{formatPercent(delta)}
              </Text>
              <Text style={{ fontSize: 13, color: '#64748B', fontWeight: 500 }}>
                vs prev
              </Text>
            </Group>
          )}
        </Box>

        {/* Sparkline row — right-aligned, 46% width */}
        <Box style={{ marginTop: 'auto', display: 'flex', justifyContent: 'flex-end' }}>
          {sparkData && (
            <Box style={{ width: '46%', height: 36 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sparkData} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={colors.fill} stopOpacity={0.18} />
                      <stop offset="65%" stopColor={colors.fill} stopOpacity={0.06} />
                      <stop offset="100%" stopColor={colors.fill} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="v"
                    stroke={colors.line}
                    strokeWidth={2.25}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill={`url(#${gradientId})`}
                    fillOpacity={1}
                    dot={false}
                    activeDot={false}
                    isAnimationActive={true}
                    animationDuration={800}
                    animationEasing="ease-out"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Box>
          )}
        </Box>
      </Box>
    </Card>
  )
}
