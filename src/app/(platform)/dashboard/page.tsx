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
import { ChevronRight, ArrowRight } from 'lucide-react'
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

/* ─── Bundle Summary Card ─── */
function BundleSummaryCard({ bundle }: { bundle: BundleData }) {
  const accentColor = BUNDLE_COLORS[bundle.name] || bundle.color

  return (
    <Card
      component={Link}
      href={`/bundles/${bundle.slug}`}
      padding={0}
      radius={20}
      styles={{
        root: {
          background: '#FFFFFF',
          border: '1px solid #E6EAF0',
          boxShadow: '0 8px 24px rgba(15, 23, 42, 0.06)',
          textDecoration: 'none',
          transition: 'all 0.16s ease',
          cursor: 'pointer',
          minHeight: 180,
          '&:hover': {
            transform: 'translateY(-1px)',
            boxShadow: '0 12px 28px rgba(15, 23, 42, 0.08)',
          },
        },
      }}
    >
      <Box style={{ padding: 20 }}>
        {/* Header */}
        <Group justify="space-between">
          <Group gap={10}>
            <Box style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: accentColor }} />
            <Text style={{ fontSize: 20, fontWeight: 600, color: '#0F172A' }}>{bundle.name}</Text>
          </Group>
          <Group gap={8}>
            {bundle.healthScore != null && <HealthBadge score={bundle.healthScore} showLabel={true} size="sm" />}
            {bundle.delta !== undefined && (
              <Badge
                size="xs"
                radius="md"
                styles={{
                  root: {
                    textTransform: 'none',
                    fontWeight: 600,
                    fontSize: 11,
                    color: bundle.delta >= 0 ? '#16A34A' : '#DC2626',
                    backgroundColor: bundle.delta >= 0 ? 'rgba(22, 163, 74, 0.08)' : 'rgba(220, 38, 38, 0.08)',
                    border: 'none',
                  },
                }}
              >
                {bundle.delta >= 0 ? '+' : ''}{bundle.delta.toFixed(1)}%
              </Badge>
            )}
            <ChevronRight size={16} color="#94A3B8" />
          </Group>
        </Group>

        {/* Metrics grid */}
        <SimpleGrid cols={2} spacing={12} mt={16}>
          <Box>
            <Text style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, color: '#6B7280' }}>
              Ad Requests
            </Text>
            <Text style={{ fontSize: 26, fontWeight: 700, color: '#0F172A', fontVariantNumeric: 'tabular-nums', marginTop: 2 }}>
              {formatCompact(bundle.hits || 0)}
            </Text>
          </Box>
          <Box>
            <Text style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, color: '#6B7280' }}>
              Revenue
            </Text>
            <Text style={{ fontSize: 26, fontWeight: 700, color: '#0F172A', fontVariantNumeric: 'tabular-nums', marginTop: 2 }}>
              {formatCurrency(bundle.totalRevenue || 0)}
            </Text>
          </Box>
          <Box>
            <Text style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, color: '#6B7280' }}>
              Profit
            </Text>
            <Text style={{ fontSize: 26, fontWeight: 700, color: '#16A34A', fontVariantNumeric: 'tabular-nums', marginTop: 2 }}>
              {formatCurrency(bundle.profit || 0)}
            </Text>
          </Box>
          <Box>
            <Text style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, color: '#6B7280' }}>
              ROMI
            </Text>
            <Text style={{ fontSize: 26, fontWeight: 700, color: '#0F172A', fontVariantNumeric: 'tabular-nums', marginTop: 2 }}>
              {(bundle.romi || 0).toFixed(1)}%
            </Text>
          </Box>
        </SimpleGrid>

        {/* Footer */}
        <Group justify="space-between" mt={16} pt={12} style={{ borderTop: '1px solid #E6EAF0' }}>
          <Text style={{ fontSize: 12, fontWeight: 500, color: '#64748B' }}>{bundle.sitesCount || 0} sites</Text>
          {bundle.delta !== undefined && <MetricDelta value={bundle.delta} />}
        </Group>
      </Box>
    </Card>
  )
}

/* ─── Compute typed insights ─── */
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

/* ─── Chart fade in wrapper ─── */
function ChartFadeIn({ children }: { children: React.ReactNode }) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}

/* ─── Skeleton ─── */
function DashboardSkeleton() {
  return (
    <Box maw={1600} w="100%" mx="auto" px={24} py={24}>
      <Stack gap={32}>
        <SimpleGrid cols={{ base: 2, sm: 3, lg: 4, xl: 5 }} spacing={20}>
          {Array.from({ length: 5 }).map((_, i) => <KPICardSkeleton key={i} />)}
        </SimpleGrid>
        <SimpleGrid cols={{ base: 2, sm: 3, lg: 4 }} spacing={20}>
          {Array.from({ length: 4 }).map((_, i) => <KPICardSkeleton key={i} />)}
        </SimpleGrid>
        <SimpleGrid cols={{ base: 1, md: 2, xl: 3 }} spacing={20}>
          <ChartSkeleton />
          <ChartSkeleton />
          <ChartSkeleton />
        </SimpleGrid>
      </Stack>
    </Box>
  )
}

/* ─── Main Dashboard Content ─── */
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
      <Box maw={1600} w="100%" mx="auto" px={24} py={24}>
        <Card
          padding="xl"
          radius={20}
          styles={{
            root: {
              background: '#FFFFFF',
              border: '1px dashed #E6EAF0',
              boxShadow: '0 8px 24px rgba(15, 23, 42, 0.04)',
            },
          }}
        >
          <Stack align="center" py="xl" gap="xs">
            <Text style={{ fontSize: 14, color: '#64748B' }}>No data available yet</Text>
            <Text style={{ fontSize: 12, fontWeight: 500, color: '#94A3B8' }}>
              Data will appear after syncing with AdSpyglass
            </Text>
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
      <Box maw={1600} w="100%" mx="auto" px={24} py={24} pb={40} style={{ overflow: 'hidden' }}>
        <Stack gap={32}>

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
            <Stack gap={20}>
              {/* Row 1: 5 primary KPIs */}
              <SimpleGrid cols={{ base: 1, sm: 2, lg: 3, xl: 5 }} spacing={20}>
                {primaryKpis.map((kpi, i) => (
                  <motion.div key={kpi!.label} custom={i} variants={fadeInUp}>
                    <KPICard {...kpi!} />
                  </motion.div>
                ))}
              </SimpleGrid>
              {/* Row 2: 4 secondary KPIs */}
              <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing={20}>
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

          {/* === Bundles "Trends" Section (horizontal scrollable like reference) === */}
          {hasBundles && (
            <Box>
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: 600,
                  color: '#0F172A',
                  marginBottom: 16,
                }}
              >
                Trends
              </Text>
              <Box style={{ position: 'relative' }}>
                <Box
                  style={{
                    display: 'flex',
                    gap: 20,
                    overflowX: 'auto',
                    paddingBottom: 4,
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none',
                  }}
                  className="hide-scrollbar"
                >
                  {data.bundles.map((bundle: BundleData, i: number) => (
                    <motion.div
                      key={bundle.id}
                      custom={i + 13}
                      variants={fadeInUp}
                      style={{ minWidth: 280, flex: '0 0 auto' }}
                    >
                      <BundleSummaryCard bundle={bundle} />
                    </motion.div>
                  ))}
                </Box>
                {/* Scroll arrow */}
                {data.bundles.length > 3 && (
                  <Box
                    style={{
                      position: 'absolute',
                      right: -10,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      background: '#FFFFFF',
                      border: '1px solid #E6EAF0',
                      boxShadow: '0 4px 12px rgba(15, 23, 42, 0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      zIndex: 2,
                    }}
                  >
                    <ArrowRight size={16} color="#64748B" />
                  </Box>
                )}
              </Box>
            </Box>
          )}

          {/* === Charts Section === */}
          {hasTrend && (
            <Box>
              <SimpleGrid cols={{ base: 1, md: 2, xl: 3 }} spacing={20}>
                <motion.div custom={17} variants={fadeInUp}>
                  <ChartFadeIn>
                    <ChartCard title="Revenue Trend" description={`${data.trend.length} days \u00B7 ${compareLabel}`}>
                      <RevenueTrendChart data={data.trend} />
                    </ChartCard>
                  </ChartFadeIn>
                </motion.div>
                <motion.div custom={18} variants={fadeInUp}>
                  <ChartFadeIn>
                    <ChartCard title="Traffic Trend" description={`${data.trend.length} days \u00B7 ${compareLabel}`}>
                      <TrafficTrendChart data={data.trend} />
                    </ChartCard>
                  </ChartFadeIn>
                </motion.div>
                <motion.div custom={19} variants={fadeInUp}>
                  <ChartFadeIn>
                    <ChartCard title="Profit Trend" description={`${data.trend.length} days \u00B7 ${compareLabel}`}>
                      <ProfitTrendChart data={data.trend} />
                    </ChartCard>
                  </ChartFadeIn>
                </motion.div>
              </SimpleGrid>
            </Box>
          )}

          {/* === Operational Insights === */}
          {typedInsights.length > 0 && (
            <Box>
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: 600,
                  color: '#0F172A',
                  marginBottom: 16,
                }}
              >
                Operational Insights
              </Text>
              <SimpleGrid cols={{ base: 1, md: 2 }} spacing={20}>
                {typedInsights.map((insight, i) => (
                  <motion.div key={i} custom={i + 17} variants={fadeInUp}>
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
    <Box style={{ background: '#F4F6FB', minHeight: '100vh' }}>
      <TopContextBar title="Dashboard" subtitle="Network overview and key metrics" showExport showCompare />
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent />
      </Suspense>
    </Box>
  )
}
