'use client'

import { Suspense } from 'react'
import { Box, SimpleGrid, Stack, Text, Card, Group, Badge } from '@mantine/core'
import { motion, AnimatePresence } from 'framer-motion'
import { fadeInUp, staggerContainer } from '@/lib/motion'
import Link from 'next/link'
import { TopContextBar } from '@/components/layout/topbar'
import { KPICard } from '@/components/shared/kpi-card'
import { ChartCard } from '@/components/shared/chart-card'
import { InsightCard } from '@/components/shared/insight-card'
import { HealthBadge } from '@/components/shared/health-badge'
import { MetricDelta } from '@/components/shared/delta-indicator'
import { SignalStrip } from '@/components/shared/signal-strip'
import { KPICardSkeleton, ChartSkeleton } from '@/components/shared/loading-skeleton'
import { RevenueTrendChart } from '@/components/features/charts/revenue-trend-chart'
import { TrafficTrendChart } from '@/components/features/charts/traffic-trend-chart'
import { ProfitTrendChart } from '@/components/features/charts/profit-trend-chart'
import { useDashboard } from '@/hooks/use-api'
import { usePeriod } from '@/hooks/use-period'
import { formatCurrency, formatCompact } from '@/lib/utils'
import { ChevronRight } from 'lucide-react'
import type { AnomalySeverity } from '@/types'

const PRIMARY_KPIS = ['Visitors', 'Ad Revenue', 'Total Revenue', 'Profit', 'ROMI']
const SECONDARY_KPIS = ['Ad Requests', 'Affiliate Revenue', 'Costs', 'RPM']

const BUNDLE_COLORS: Record<string, string> = {
  JAV: '#EF4444',
  Gays: '#3B82F6',
  Hentai: '#8B5CF6',
  Trans: '#EC4899',
}

type BundleData = {
  id: string; name: string; slug: string; color: string; sitesCount: number;
  hits: number; totalRevenue: number; profit: number; romi: number;
  healthScore?: number; delta?: number
}

type InsightData = {
  entity: string; entitySlug?: string; entityType: string; metric: string;
  value: string; delta?: number; reason: string; action?: string;
  severity: AnomalySeverity; type?: 'risk' | 'opportunity' | 'info' | 'winner' | 'loser'
}

function BundleSummaryCard({ bundle }: { bundle: BundleData }) {
  const accentColor = BUNDLE_COLORS[bundle.name] || bundle.color

  return (
    <Card
      component={Link}
      href={`/bundles/${bundle.slug}`}
      padding="lg"
      radius="xl"
      shadow="sm"
      withBorder
      styles={{
        root: {
          borderColor: '#E5E7EB',
          textDecoration: 'none',
          transition: 'all 0.15s ease',
          cursor: 'pointer',
          '&:hover': {
            transform: 'translateY(-1px)',
            boxShadow: '0 4px 10px rgba(16,24,40,0.08), 0 2px 4px rgba(16,24,40,0.04)',
            borderColor: '#D7DCE5',
          },
        },
      }}
    >
      {/* Header */}
      <Group justify="space-between">
        <Group gap="xs">
          <Box style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: accentColor }} />
          <Text size="sm" fw={600} c="#111827">{bundle.name}</Text>
        </Group>
        <Group gap="xs">
          {bundle.healthScore != null && <HealthBadge score={bundle.healthScore} showLabel={true} size="sm" />}
          <ChevronRight size={16} color="#9CA3AF" />
        </Group>
      </Group>

      {/* Metrics grid */}
      <SimpleGrid cols={2} spacing="xs" mt="md">
        <Box>
          <Text size="xs" fw={600} tt="uppercase" c="#6B7280" style={{ letterSpacing: '0.04em', fontSize: 11 }}>
            Ad Requests
          </Text>
          <Text size="md" fw={700} c="#111827" mt={2} style={{ fontVariantNumeric: 'tabular-nums' }}>
            {formatCompact(bundle.hits || 0)}
          </Text>
        </Box>
        <Box>
          <Text size="xs" fw={600} tt="uppercase" c="#6B7280" style={{ letterSpacing: '0.04em', fontSize: 11 }}>
            Revenue
          </Text>
          <Text size="md" fw={700} c="#111827" mt={2} style={{ fontVariantNumeric: 'tabular-nums' }}>
            {formatCurrency(bundle.totalRevenue || 0)}
          </Text>
        </Box>
        <Box>
          <Text size="xs" fw={600} tt="uppercase" c="#6B7280" style={{ letterSpacing: '0.04em', fontSize: 11 }}>
            Profit
          </Text>
          <Text size="md" fw={700} c="#039855" mt={2} style={{ fontVariantNumeric: 'tabular-nums' }}>
            {formatCurrency(bundle.profit || 0)}
          </Text>
        </Box>
        <Box>
          <Text size="xs" fw={600} tt="uppercase" c="#6B7280" style={{ letterSpacing: '0.04em', fontSize: 11 }}>
            ROMI
          </Text>
          <Text size="md" fw={700} c="#111827" mt={2} style={{ fontVariantNumeric: 'tabular-nums' }}>
            {(bundle.romi || 0).toFixed(1)}%
          </Text>
        </Box>
      </SimpleGrid>

      {/* Footer */}
      <Group justify="space-between" mt="md" pt="sm" style={{ borderTop: '1px solid #E5E7EB' }}>
        <Text size="xs" fw={500} c="#6B7280">{bundle.sitesCount || 0} sites</Text>
        {bundle.delta !== undefined && <MetricDelta value={bundle.delta} />}
      </Group>
    </Card>
  )
}

function computeTypedInsights(
  bundles: BundleData[],
  rawInsights: InsightData[]
): InsightData[] {
  const typed: InsightData[] = []

  if (bundles.length > 0) {
    const bestGain = [...bundles]
      .filter(b => b.delta !== undefined && b.delta > 0)
      .sort((a, b) => (b.delta ?? 0) - (a.delta ?? 0))[0]

    if (bestGain) {
      typed.push({
        entity: bestGain.name,
        entityType: 'bundle',
        metric: 'Revenue Growth',
        value: formatCurrency(bestGain.totalRevenue),
        delta: bestGain.delta,
        reason: `${bestGain.name} is the fastest growing bundle. Consider allocating more traffic.`,
        action: `View ${bestGain.name} details`,
        actionHref: `/bundles/${bestGain.slug}`,
        severity: 'low' as AnomalySeverity,
        type: 'opportunity',
      } as InsightData)
    }
  }

  const sortedRisks = [...rawInsights]
    .filter(i => i.type === 'risk')
    .sort((a, b) => {
      const w: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 }
      return (w[b.severity] || 0) - (w[a.severity] || 0)
    })
  if (sortedRisks.length > 0) {
    typed.push({ ...sortedRisks[0], type: 'risk' })
  }

  if (bundles.length > 0) {
    const worstDrop = [...bundles]
      .filter(b => b.delta !== undefined && b.delta < 0)
      .sort((a, b) => (a.delta ?? 0) - (b.delta ?? 0))[0]

    if (worstDrop) {
      typed.push({
        entity: worstDrop.name,
        entityType: 'bundle',
        metric: 'Revenue Decline',
        value: formatCurrency(worstDrop.totalRevenue),
        delta: worstDrop.delta,
        reason: `${worstDrop.name} revenue declined significantly. Check traffic sources and site health.`,
        action: `Investigate ${worstDrop.name}`,
        actionHref: `/bundles/${worstDrop.slug}`,
        severity: (worstDrop.delta ?? 0) < -20 ? 'high' : 'medium',
        type: 'loser',
      } as InsightData & { actionHref: string })
    }
  }

  if (bundles.length > 0) {
    const bestRomi = [...bundles].sort((a, b) => b.romi - a.romi)[0]
    if (bestRomi && bestRomi.romi > 0) {
      typed.push({
        entity: bestRomi.name,
        entityType: 'bundle',
        metric: 'ROMI',
        value: `${bestRomi.romi.toFixed(1)}%`,
        delta: bestRomi.delta,
        reason: `Best return on investment: ${formatCurrency(bestRomi.profit)} profit from ${formatCurrency(bestRomi.totalRevenue)} revenue.`,
        action: `View ${bestRomi.name} performance`,
        actionHref: `/bundles/${bestRomi.slug}`,
        severity: 'low' as AnomalySeverity,
        type: 'winner',
      } as InsightData & { actionHref: string })
    }
  }

  return typed
}

function ChartFadeIn({ children }: { children: React.ReactNode }) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}

function DashboardSkeleton() {
  return (
    <Box maw={1600} mx="auto" px="xl" py="xl">
      <Stack gap="xl">
        <SimpleGrid cols={{ base: 2, sm: 3, lg: 4, xl: 5 }} spacing="md">
          {Array.from({ length: 5 }).map((_, i) => <KPICardSkeleton key={i} />)}
        </SimpleGrid>
        <SimpleGrid cols={{ base: 2, sm: 3, lg: 4 }} spacing="md">
          {Array.from({ length: 4 }).map((_, i) => <KPICardSkeleton key={i} />)}
        </SimpleGrid>
        <SimpleGrid cols={{ base: 1, md: 2, xl: 3 }} spacing="md">
          <ChartSkeleton />
          <ChartSkeleton />
          <ChartSkeleton />
        </SimpleGrid>
      </Stack>
    </Box>
  )
}

function DashboardContent() {
  const { period, compare } = usePeriod()
  const { data, isLoading } = useDashboard(period, compare)

  if (isLoading || !data) {
    return <DashboardSkeleton />
  }

  const hasKpis = data.kpis && data.kpis.length > 0
  const hasBundles = data.bundles && data.bundles.length > 0
  const hasTrend = data.trend && data.trend.length > 0
  const hasInsights = data.insights && data.insights.length > 0

  if (!hasKpis && !hasBundles && !hasTrend) {
    return (
      <Box maw={1600} mx="auto" px="xl" py="xl">
        <Card padding="xl" radius="xl" withBorder styles={{ root: { borderColor: '#E5E7EB', borderStyle: 'dashed' } }}>
          <Stack align="center" py="xl" gap="xs">
            <Text size="sm" c="#6B7280">No data available yet</Text>
            <Text size="xs" fw={500} c="#6B7280">Data will appear after syncing with AdSpyglass</Text>
          </Stack>
        </Card>
      </Box>
    )
  }

  const allKpis = data.kpis as Array<{ label: string; value: number; delta?: number; format: 'currency' | 'number' | 'percent' | 'score' | 'compact'; trend?: number[] }>
  const primaryKpis = PRIMARY_KPIS.map(label => allKpis.find(k => k.label === label)).filter(Boolean)
  const secondaryKpis = SECONDARY_KPIS.map(label => allKpis.find(k => k.label === label)).filter(Boolean)
  const typedInsights = computeTypedInsights(data.bundles || [], data.insights || [])
  const compareLabel = compare === 'prev_7d' ? 'vs 7d ago' : compare === 'prev_day' ? 'vs yesterday' : 'vs prev period'

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
    >
      <Box maw={1600} mx="auto" px="xl" py="xl" pb={48} style={{ overflow: 'hidden' }}>
        <Stack gap="xl">

          {/* === Coverage indicator === */}
          {data.coverage && !data.coverage.complete && data.coverage.syncTriggered && (
            <motion.div custom={0} variants={fadeInUp}>
              <Badge
                variant="light"
                color="indigo"
                size="lg"
                radius="lg"
                styles={{ root: { textTransform: 'none', fontWeight: 500 } }}
              >
                Loading historical data for {data.coverage.missingDates} missing days...
              </Badge>
            </motion.div>
          )}

          {/* === KPI Section === */}
          {hasKpis && (
            <Stack gap="md">
              <SimpleGrid cols={{ base: 1, sm: 2, lg: 3, xl: 5 }} spacing="md">
                {primaryKpis.map((kpi, i) => (
                  <motion.div key={kpi!.label} custom={i} variants={fadeInUp}>
                    <KPICard {...kpi!} />
                  </motion.div>
                ))}
              </SimpleGrid>
              <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
                {secondaryKpis.map((kpi, i) => (
                  <motion.div key={kpi!.label} custom={i + 5} variants={fadeInUp}>
                    <KPICard {...kpi!} />
                  </motion.div>
                ))}
              </SimpleGrid>
            </Stack>
          )}

          {/* === Network Signals Strip === */}
          {(hasBundles || hasInsights) && (
            <motion.div custom={9} variants={fadeInUp}>
              <SignalStrip bundles={data.bundles || []} insights={data.insights || []} />
            </motion.div>
          )}

          {/* === Trends Section === */}
          {hasTrend && (
            <Box>
              <Text size="lg" fw={600} c="#111827" mb="md" style={{ fontSize: 20 }}>
                Trends
              </Text>
              <SimpleGrid cols={{ base: 1, md: 2, xl: 3 }} spacing="md">
                <motion.div custom={10} variants={fadeInUp}>
                  <ChartFadeIn>
                    <ChartCard title="Revenue Trend" description={`${data.trend.length} days \u00B7 ${compareLabel}`}>
                      <RevenueTrendChart data={data.trend} />
                    </ChartCard>
                  </ChartFadeIn>
                </motion.div>
                <motion.div custom={11} variants={fadeInUp}>
                  <ChartFadeIn>
                    <ChartCard title="Traffic Trend" description={`${data.trend.length} days \u00B7 ${compareLabel}`}>
                      <TrafficTrendChart data={data.trend} />
                    </ChartCard>
                  </ChartFadeIn>
                </motion.div>
                <motion.div custom={12} variants={fadeInUp}>
                  <ChartFadeIn>
                    <ChartCard title="Profit Trend" description={`${data.trend.length} days \u00B7 ${compareLabel}`}>
                      <ProfitTrendChart data={data.trend} />
                    </ChartCard>
                  </ChartFadeIn>
                </motion.div>
              </SimpleGrid>
            </Box>
          )}

          {/* === Bundles Section === */}
          {hasBundles && (
            <Box>
              <Text size="lg" fw={600} c="#111827" mb="md" style={{ fontSize: 20 }}>
                Bundles
              </Text>
              <SimpleGrid cols={{ base: 1, sm: 2, xl: 4 }} spacing="md">
                {data.bundles.map((bundle: BundleData, i: number) => (
                  <motion.div key={bundle.id} custom={i + 13} variants={fadeInUp}>
                    <BundleSummaryCard bundle={bundle} />
                  </motion.div>
                ))}
              </SimpleGrid>
            </Box>
          )}

          {/* === Operational Insights === */}
          {typedInsights.length > 0 && (
            <Box>
              <Text size="lg" fw={600} c="#111827" mb="md" style={{ fontSize: 20 }}>
                Operational Insights
              </Text>
              <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
                {typedInsights.map((insight, i) => (
                  <motion.div key={i} custom={i + 17} variants={fadeInUp}>
                    <InsightCard {...insight} />
                  </motion.div>
                ))}
              </SimpleGrid>
            </Box>
          )}

          {/* === Recent Anomalies === */}
          {hasInsights && data.insights.length > 0 && (
            <Box>
              <Text size="lg" fw={600} c="#111827" mb="md" style={{ fontSize: 20 }}>
                Recent Anomalies
              </Text>
              <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
                {data.insights.slice(0, 6).map((insight: InsightData, i: number) => (
                  <motion.div key={i} custom={i + 21} variants={fadeInUp}>
                    <InsightCard {...insight} />
                  </motion.div>
                ))}
              </SimpleGrid>
            </Box>
          )}

        </Stack>
      </Box>
    </motion.div>
  )
}

export default function DashboardPage() {
  return (
    <Box bg="#F6F8FB" mih="100vh">
      <TopContextBar title="Dashboard" subtitle="Network overview and key metrics" showExport showCompare />
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent />
      </Suspense>
    </Box>
  )
}
