'use client'

import { useState, Suspense } from 'react'
import { Box, Stack, SimpleGrid, Group, Text, Card } from '@mantine/core'
import { motion } from 'framer-motion'
import { fadeInUp } from '@/lib/motion'
import { TopContextBar } from '@/components/layout/topbar'
import { ChartCard } from '@/components/shared/chart-card'
import { KPICardSkeleton, ChartSkeleton } from '@/components/shared/loading-skeleton'
import { ForecastChart } from '@/components/features/charts/forecast-chart'
import { useForecastBase } from '@/hooks/use-api'
import { formatCurrency, formatPercent } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { SlidersHorizontal, Info } from 'lucide-react'

interface ScenarioParam {
  label: string
  key: string
  value: number
  setter: (v: number) => void
  min: number
  max: number
}

function ScenarioSlider({ label, value, onChange, min, max }: { label: string; value: number; onChange: (v: number) => void; min: number; max: number }) {
  const pct = ((value - min) / (max - min)) * 100

  return (
    <Stack gap="xs">
      <Group justify="space-between">
        <Text size="sm" fw={500} c="var(--color-text-secondary)">{label}</Text>
        <Box
          component="span"
          style={{
            borderRadius: 'var(--radius-control)',
            padding: '4px 10px',
            fontSize: 13,
            fontWeight: 600,
            fontVariantNumeric: 'tabular-nums',
            backgroundColor: value > 0 ? 'var(--color-success-bg)' : value < 0 ? 'var(--color-danger-bg)' : 'var(--color-surface-secondary)',
            color: value > 0 ? 'var(--color-success-dark)' : value < 0 ? 'var(--color-danger-dark)' : 'var(--color-text-muted)',
          }}
        >
          {value >= 0 ? '+' : ''}{value}%
        </Box>
      </Group>
      <Box style={{ position: 'relative' }}>
        <Box style={{ height: 6, width: '100%', borderRadius: 9999, backgroundColor: 'var(--color-border-subtle)' }}>
          <Box
            style={{
              position: 'absolute',
              height: 6,
              borderRadius: 9999,
              backgroundColor: 'var(--color-primary-500)',
              width: `${pct}%`,
            }}
          />
        </Box>
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{ position: 'absolute', inset: 0, height: 6, width: '100%', cursor: 'pointer', opacity: 0 }}
        />
      </Box>
    </Stack>
  )
}

function ScenarioMetricCard({ label, current, projected }: { label: string; current: number; projected: number }) {
  const delta = current > 0 ? ((projected - current) / current) * 100 : 0
  const isPositive = projected >= current
  const isProfit = label.includes('Profit') || label.includes('ROMI')
  const isRomi = label.includes('ROMI')

  return (
    <Card padding="lg" radius="xl" shadow="sm" withBorder styles={{ root: { borderColor: 'var(--color-border-subtle)' } }}>
      <Text size="xs" fw={600} tt="uppercase" c="#6B7280" style={{ letterSpacing: '0.04em', fontSize: 11 }}>{label}</Text>
      <SimpleGrid cols={2} spacing="md" mt="sm">
        <Box>
          <Text size="xs" fw={600} tt="uppercase" c="#6B7280" style={{ letterSpacing: '0.04em', fontSize: 11 }}>Current</Text>
          <Text size="lg" fw={700} c="var(--color-text-primary)" mt={4} style={{ fontVariantNumeric: 'tabular-nums', fontSize: 20 }}>
            {isRomi ? `${current.toFixed(1)}%` : formatCurrency(current)}
          </Text>
        </Box>
        <Box>
          <Text size="xs" fw={600} tt="uppercase" c="#6B7280" style={{ letterSpacing: '0.04em', fontSize: 11 }}>Projected</Text>
          <Text
            size="lg"
            fw={700}
            c={isPositive ? 'var(--color-success-dark)' : 'var(--color-danger-dark)'}
            mt={4}
            style={{ fontVariantNumeric: 'tabular-nums', fontSize: 20 }}
          >
            {isRomi ? `${projected.toFixed(1)}%` : formatCurrency(projected)}
          </Text>
        </Box>
      </SimpleGrid>
      {current > 0 && (
        <Box
          mt="sm"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            borderRadius: 'var(--radius-control)',
            padding: '6px 10px',
            fontSize: 12,
            fontWeight: 600,
            fontVariantNumeric: 'tabular-nums',
            backgroundColor: isPositive ? 'var(--color-success-bg)' : 'var(--color-danger-bg)',
            color: isPositive ? 'var(--color-success-dark)' : 'var(--color-danger-dark)',
          }}
        >
          {delta >= 0 ? '+' : ''}{delta.toFixed(1)}% change
        </Box>
      )}
    </Card>
  )
}

function ForecastContent() {
  const { data: baseData, isLoading } = useForecastBase()

  const [trafficChange, setTrafficChange] = useState(0)
  const [costChange, setCostChange] = useState(0)
  const [rpmChange, setRpmChange] = useState(0)
  const [affiliateChange, setAffiliateChange] = useState(0)
  const [tierChange, setTierChange] = useState(0)
  const [formatChange, setFormatChange] = useState(0)

  if (isLoading || !baseData) {
    return (
      <Stack gap="xl" px="xl" py="xl">
        <ChartSkeleton />
        <SimpleGrid cols={{ base: 2, lg: 4 }} spacing="md">
          {Array.from({ length: 4 }).map((_, i) => <KPICardSkeleton key={i} />)}
        </SimpleGrid>
      </Stack>
    )
  }

  const baseRevenue = baseData.revenue || 0
  const baseAffiliate = baseData.affiliate || 0
  const baseCosts = baseData.costs || 0
  const baseTraffic = baseData.traffic || 0

  const hasData = baseRevenue > 0 || baseAffiliate > 0 || baseCosts > 0 || baseTraffic > 0

  if (!hasData) {
    return (
      <Box px="xl" py="xl">
        <Card padding="xl" radius="xl" withBorder styles={{ root: { borderColor: 'var(--color-border-default)', borderStyle: 'dashed' } }}>
          <Stack align="center" py="xl" gap="xs">
            <Text size="sm" c="var(--color-text-muted)">No baseline data available for forecasting</Text>
            <Text size="xs" fw={500} c="#6B7280">Forecast will be available after syncing metric data from AdSpyglass</Text>
          </Stack>
        </Card>
      </Box>
    )
  }

  // Calculations
  const revenueMultiplier = (1 + rpmChange / 100) * (1 + trafficChange / 100) * (1 + formatChange / 100)
  const projAdRevenue = baseRevenue * revenueMultiplier
  const projAffiliate = baseAffiliate * (1 + affiliateChange / 100)
  const projCosts = baseCosts * (1 + costChange / 100)
  const projTotalRevenue = projAdRevenue + projAffiliate
  const projProfit = projTotalRevenue - projCosts
  const projRomi = projCosts > 0 ? ((projTotalRevenue - projCosts) / projCosts) * 100 : 0
  const baseTotalRevenue = baseRevenue + baseAffiliate
  const baseProfit = baseTotalRevenue - baseCosts
  const baseRomi = baseCosts > 0 ? ((baseTotalRevenue - baseCosts) / baseCosts) * 100 : 0

  const params: ScenarioParam[] = [
    { label: 'Traffic Change', key: 'traffic', value: trafficChange, setter: setTrafficChange, min: -50, max: 50 },
    { label: 'Cost Change', key: 'cost', value: costChange, setter: setCostChange, min: -50, max: 50 },
    { label: 'RPM Change', key: 'rpm', value: rpmChange, setter: setRpmChange, min: -50, max: 50 },
    { label: 'Affiliate Revenue Change', key: 'affiliate', value: affiliateChange, setter: setAffiliateChange, min: -50, max: 50 },
    { label: 'Tier Performance Change', key: 'tier', value: tierChange, setter: setTierChange, min: -30, max: 30 },
    { label: 'Format Contribution Change', key: 'format', value: formatChange, setter: setFormatChange, min: -30, max: 30 },
  ]

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={fadeInUp}
      custom={0}
    >
      <Stack gap="xl" px="xl" py="xl">
        {/* Section 1: Scenario Controls */}
        <Card padding="lg" radius="xl" shadow="sm" withBorder styles={{ root: { borderColor: 'var(--color-border-subtle)' } }}>
          <Group gap="xs" mb="md">
            <SlidersHorizontal className="h-4 w-4" style={{ color: 'var(--color-primary-600)' }} />
            <Text size="sm" fw={600} c="var(--color-text-primary)" style={{ fontSize: 15 }}>Scenario Controls</Text>
          </Group>
          <SimpleGrid cols={{ base: 1, sm: 2, xl: 3 }} spacing="lg">
            {params.map(({ label, value, setter, min, max }) => (
              <ScenarioSlider key={label} label={label} value={value} onChange={setter} min={min} max={max} />
            ))}
          </SimpleGrid>
          <Group justify="flex-end" mt="md">
            <Text
              component="button"
              size="xs"
              fw={500}
              c="var(--color-primary-600)"
              style={{ cursor: 'pointer', border: 'none', background: 'none', padding: 0 }}
              onClick={() => {
                setTrafficChange(0); setCostChange(0); setRpmChange(0)
                setAffiliateChange(0); setTierChange(0); setFormatChange(0)
              }}
            >
              Reset all to baseline
            </Text>
          </Group>
        </Card>

        {/* Section 2: Baseline vs Projected Metrics */}
        <Box>
          <Text size="lg" fw={600} c="#111827" mb="md" style={{ fontSize: 20 }}>Baseline vs Projected</Text>
          <SimpleGrid cols={{ base: 2, xl: 4 }} spacing="md">
            <ScenarioMetricCard label="Revenue" current={baseTotalRevenue} projected={projTotalRevenue} />
            <ScenarioMetricCard label="Costs" current={baseCosts} projected={projCosts} />
            <ScenarioMetricCard label="Profit" current={baseProfit} projected={projProfit} />
            <ScenarioMetricCard label="ROMI" current={baseRomi} projected={projRomi} />
          </SimpleGrid>
        </Box>

        {/* Section 3: Forecast Chart */}
        <ChartCard title="Forecast Comparison" description="Current vs projected values">
          <ForecastChart
            currentValues={{ revenue: baseRevenue, affiliate: baseAffiliate, costs: baseCosts, profit: baseProfit }}
            projectedValues={{ revenue: projAdRevenue, affiliate: projAffiliate, costs: projCosts, profit: projProfit }}
          />
        </ChartCard>

        {/* Section 4: Assumptions */}
        <Card padding="lg" radius="xl" withBorder styles={{ root: { borderColor: 'var(--color-border-subtle)', backgroundColor: 'var(--color-surface-secondary)' } }}>
          <Group gap="xs" mb="sm">
            <Info className="h-4 w-4" style={{ color: 'var(--color-text-muted)' }} />
            <Text size="sm" fw={600} c="var(--color-text-secondary)" style={{ fontSize: 13 }}>Assumptions &amp; Notes</Text>
          </Group>
          <Stack gap={6}>
            <Text size="xs" c="var(--color-text-muted)" lh={1.6}>Projections are based on the most recent 30-day baseline data from AdSpyglass.</Text>
            <Text size="xs" c="var(--color-text-muted)" lh={1.6}>Traffic change impacts ad revenue proportionally through RPM calculations.</Text>
            <Text size="xs" c="var(--color-text-muted)" lh={1.6}>Format contribution change applies as a multiplier on ad revenue from format distribution shifts.</Text>
            <Text size="xs" c="var(--color-text-muted)" lh={1.6}>Tier performance change models geographic traffic quality shifts.</Text>
            <Text size="xs" c="var(--color-text-muted)" lh={1.6}>ROMI is calculated as (Total Revenue - Costs) / Costs x 100.</Text>
            <Text size="xs" c="var(--color-text-muted)" lh={1.6}>These projections assume linear scaling and do not account for market saturation or seasonality.</Text>
          </Stack>
        </Card>
      </Stack>
    </motion.div>
  )
}

export default function ForecastPage() {
  return (
    <Box>
      <TopContextBar title="Forecast" subtitle="Scenario modeling and projections" showPeriod={false} showSync={false} />
      <Suspense fallback={
        <Stack gap="xl" px="xl" py="xl">
          <ChartSkeleton />
        </Stack>
      }>
        <ForecastContent />
      </Suspense>
    </Box>
  )
}
