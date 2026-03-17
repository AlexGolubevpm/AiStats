'use client'

import { use, Suspense } from 'react'
import { Box, Stack, SimpleGrid, Group, Text, Card, Tabs } from '@mantine/core'
import { motion } from 'framer-motion'
import { fadeInUp } from '@/lib/motion'
import { TopContextBar } from '@/components/layout/topbar'
import { KPICard } from '@/components/shared/kpi-card'
import { ChartCard } from '@/components/shared/chart-card'
import { HealthBadge } from '@/components/shared/health-badge'
import { InsightCard } from '@/components/shared/insight-card'
import { KPICardSkeleton, ChartSkeleton, PageSkeleton } from '@/components/shared/loading-skeleton'
import { RevenueTrendChart } from '@/components/features/charts/revenue-trend-chart'
import { TrafficTrendChart } from '@/components/features/charts/traffic-trend-chart'
import { ProfitTrendChart } from '@/components/features/charts/profit-trend-chart'
import { FormatBreakdownChart } from '@/components/features/charts/format-breakdown-chart'
import { TierBreakdownChart } from '@/components/features/charts/tier-breakdown-chart'
import { CostTrendChart } from '@/components/features/charts/cost-trend-chart'
import { DataTable } from '@/components/features/data-table'
import { useSite } from '@/hooks/use-api'
import { usePeriod } from '@/hooks/use-period'
import { formatCurrency, formatCompact, getHealthStatus } from '@/lib/utils'
import { ExternalLink, AlertTriangle, Shield } from 'lucide-react'
import type { ColumnDef } from '@tanstack/react-table'

interface FormatRow { format: string; impressions: number; clicks: number; ctr: number; revenue: number; fillRate: number; rpm: number }
interface TierRow { tier: string; users: number; impressions: number; revenue: number; ctr: number; rpm: number }

const formatColumns: ColumnDef<FormatRow, unknown>[] = [
  { accessorKey: 'format', header: 'Format', cell: ({ row }) => <Text fw={600} size="sm">{row.original.format}</Text> },
  { accessorKey: 'impressions', header: 'Impressions', cell: ({ row }) => <Text size="sm" style={{ fontVariantNumeric: 'tabular-nums' }}>{(row.original.impressions || 0).toLocaleString()}</Text> },
  { accessorKey: 'clicks', header: 'Clicks', cell: ({ row }) => <Text size="sm" style={{ fontVariantNumeric: 'tabular-nums' }}>{(row.original.clicks || 0).toLocaleString()}</Text> },
  { accessorKey: 'ctr', header: 'CTR', cell: ({ row }) => <Text size="sm" style={{ fontVariantNumeric: 'tabular-nums' }}>{(row.original.ctr || 0).toFixed(2)}%</Text> },
  { accessorKey: 'revenue', header: 'Revenue', cell: ({ row }) => <Text fw={600} size="sm" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(row.original.revenue || 0)}</Text> },
  { accessorKey: 'fillRate', header: 'Fill Rate', cell: ({ row }) => <Text size="sm" style={{ fontVariantNumeric: 'tabular-nums' }}>{(row.original.fillRate || 0).toFixed(1)}%</Text> },
  { accessorKey: 'rpm', header: 'RPM', cell: ({ row }) => <Text size="sm" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(row.original.rpm || 0)}</Text> },
]

const tierColumns: ColumnDef<TierRow, unknown>[] = [
  { accessorKey: 'tier', header: 'Tier', cell: ({ row }) => <Text fw={600} size="sm">{row.original.tier.replace('TIER_', 'Tier ')}</Text> },
  { accessorKey: 'users', header: 'Ad Requests', cell: ({ row }) => <Text size="sm" style={{ fontVariantNumeric: 'tabular-nums' }}>{(row.original.users || 0).toLocaleString()}</Text> },
  { accessorKey: 'impressions', header: 'Impressions', cell: ({ row }) => <Text size="sm" style={{ fontVariantNumeric: 'tabular-nums' }}>{(row.original.impressions || 0).toLocaleString()}</Text> },
  { accessorKey: 'revenue', header: 'Revenue', cell: ({ row }) => <Text fw={600} size="sm" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(row.original.revenue || 0)}</Text> },
  { accessorKey: 'ctr', header: 'CTR', cell: ({ row }) => <Text size="sm" style={{ fontVariantNumeric: 'tabular-nums' }}>{(row.original.ctr || 0).toFixed(2)}%</Text> },
  { accessorKey: 'rpm', header: 'RPM', cell: ({ row }) => <Text size="sm" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(row.original.rpm || 0)}</Text> },
]

const BUNDLE_COLORS: Record<string, string> = {
  Gays: '#3B82F6',
  Trans: '#EC4899',
  JAV: '#EF4444',
  Hentai: '#8B5CF6',
}

function SiteDetailContent({ id }: { id: string }) {
  const { period } = usePeriod()
  const { data, isLoading } = useSite(id, period)

  if (isLoading || !data) {
    return <PageSkeleton />
  }

  const siteName = data.site?.name || 'Unknown'
  const domain = data.site?.domain || siteName
  const bundleName = data.site?.bundle?.name || ''
  const bundleColor = BUNDLE_COLORS[bundleName] || '#94A3B8'
  const healthScore = data.health?.score ?? null
  const healthStatus = healthScore != null ? getHealthStatus(healthScore) : null
  const hasKpis = data.kpis && data.kpis.length > 0
  const hasTrend = data.trend && data.trend.length > 0
  const hasFormats = data.formatBreakdown && data.formatBreakdown.length > 0
  const hasTiers = data.tierBreakdown && data.tierBreakdown.length > 0
  const hasCosts = data.costs && data.costs.length > 0
  const hasAnomalies = data.anomalies && data.anomalies.length > 0

  const costTrend = hasCosts
    ? data.costs.map((c: { date: string; amount: number }) => ({ date: c.date, total: c.amount }))
    : []

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={fadeInUp}
      custom={0}
    >
      <Stack gap="xl" px="xl" py="xl">
        {/* Site Header — Control Center */}
        <Card padding="lg" radius="xl" shadow="sm" withBorder styles={{ root: { borderColor: 'var(--color-border-subtle)' } }}>
          <Group justify="space-between" align="flex-start">
            <Box>
              <Group gap="sm">
                <Text size="xl" fw={700} c="var(--color-text-primary)" style={{ fontSize: 24 }}>{siteName}</Text>
                <a href={`https://${domain}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-text-disabled)' }}>
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Group>
              <Group gap="sm" mt="xs">
                <Box
                  component="span"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    borderRadius: 'var(--radius-pill)',
                    padding: '4px 10px',
                    fontSize: 12,
                    fontWeight: 600,
                    backgroundColor: bundleColor + '15',
                    color: bundleColor,
                  }}
                >
                  <Box component="span" style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: bundleColor }} />
                  {bundleName}
                </Box>
                {healthScore != null && <HealthBadge score={healthScore} size="md" />}
              </Group>
            </Box>

            {/* Health Explanation */}
            {healthScore != null && (
              <Card padding="md" radius="xl" withBorder styles={{ root: { borderColor: 'var(--color-border-subtle)', backgroundColor: 'var(--color-surface-secondary)', maxWidth: 384 } }}>
                <Group gap="xs" mb="xs">
                  <Shield className="h-4 w-4" style={{ color: 'var(--color-text-muted)' }} />
                  <Text size="xs" fw={600} c="var(--color-text-secondary)">Health Breakdown</Text>
                </Group>
                {data.health && (
                  <SimpleGrid cols={2} spacing={4}>
                    {[
                      { label: 'Profit Quality', value: data.health.profitQuality },
                      { label: 'ROMI Quality', value: data.health.romiQuality },
                      { label: 'Revenue Trend', value: data.health.revenueTrend },
                      { label: 'Cost Pressure', value: data.health.costPressure },
                      { label: 'Format Quality', value: data.health.formatQuality },
                      { label: 'Tier Quality', value: data.health.tierQuality },
                    ].map(({ label, value }) => value != null && (
                      <Group key={label} justify="space-between" py={2}>
                        <Text size="xs" c="var(--color-text-muted)" style={{ fontSize: 11 }}>{label}</Text>
                        <Text size="xs" fw={600} style={{ fontVariantNumeric: 'tabular-nums', fontSize: 11 }}>{typeof value === 'number' ? value.toFixed(0) : value}</Text>
                      </Group>
                    ))}
                  </SimpleGrid>
                )}
              </Card>
            )}
          </Group>

          {/* Quick KPI metrics in header */}
          {hasKpis && (
            <SimpleGrid cols={{ base: 2, sm: 3, lg: 5 }} spacing="md" mt="lg" pt="lg" style={{ borderTop: '1px solid var(--color-border-subtle)' }}>
              {data.kpis.slice(0, 5).map((kpi: { label: string; value: number; delta?: number; format: 'currency' | 'number' | 'percent' | 'score' | 'compact' }) => (
                <Box key={kpi.label}>
                  <Text size="xs" fw={600} tt="uppercase" c="#6B7280" style={{ letterSpacing: '0.04em', fontSize: 11 }}>{kpi.label}</Text>
                  <Text size="lg" fw={700} c="var(--color-text-primary)" mt={2} style={{ fontVariantNumeric: 'tabular-nums', fontSize: 18 }}>
                    {kpi.format === 'currency' ? formatCurrency(kpi.value) : kpi.format === 'compact' ? formatCompact(kpi.value) : kpi.format === 'percent' ? `${kpi.value.toFixed(1)}%` : kpi.value.toLocaleString()}
                  </Text>
                </Box>
              ))}
            </SimpleGrid>
          )}

          {/* Anomaly Alert */}
          {hasAnomalies && (
            <Box
              mt="md"
              px="md"
              py="sm"
              style={{
                borderRadius: 'var(--radius-control)',
                border: '1px solid var(--color-warning)',
                backgroundColor: 'var(--color-warning-bg)',
              }}
            >
              <Group gap="xs">
                <AlertTriangle className="h-4 w-4" style={{ color: 'var(--color-warning-dark)' }} />
                <Text size="xs" fw={600} c="var(--color-warning-dark)">
                  {data.anomalies.length} active anomal{data.anomalies.length > 1 ? 'ies' : 'y'} detected
                </Text>
              </Group>
            </Box>
          )}
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="overview">
          <Tabs.List
            style={{
              height: 44,
              gap: 4,
              borderRadius: 'var(--radius-card)',
              border: '1px solid var(--color-border-subtle)',
              backgroundColor: 'var(--color-surface-secondary)',
              padding: 4,
            }}
          >
            <Tabs.Tab value="overview" style={{ borderRadius: 'var(--radius-control)', padding: '8px 16px', fontSize: 13, fontWeight: 500 }}>Overview</Tabs.Tab>
            <Tabs.Tab value="formats" style={{ borderRadius: 'var(--radius-control)', padding: '8px 16px', fontSize: 13, fontWeight: 500 }}>Formats</Tabs.Tab>
            <Tabs.Tab value="tiers" style={{ borderRadius: 'var(--radius-control)', padding: '8px 16px', fontSize: 13, fontWeight: 500 }}>GEO/Tiers</Tabs.Tab>
            <Tabs.Tab value="costs" style={{ borderRadius: 'var(--radius-control)', padding: '8px 16px', fontSize: 13, fontWeight: 500 }}>Costs</Tabs.Tab>
            <Tabs.Tab value="trends" style={{ borderRadius: 'var(--radius-control)', padding: '8px 16px', fontSize: 13, fontWeight: 500 }}>Trends</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="overview" pt="lg">
            {hasTrend ? (
              <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
                <ChartCard title="Revenue Trend" description="Daily revenue">
                  <RevenueTrendChart data={data.trend} />
                </ChartCard>
                <ChartCard title="Traffic Trend" description="Daily requests">
                  <TrafficTrendChart data={data.trend} />
                </ChartCard>
              </SimpleGrid>
            ) : (
              <Card padding="xl" radius="xl" withBorder styles={{ root: { borderColor: 'var(--color-border-default)', borderStyle: 'dashed' } }}>
                <Stack align="center" py="xl">
                  <Text size="sm" c="var(--color-text-muted)">No trend data available yet</Text>
                </Stack>
              </Card>
            )}
          </Tabs.Panel>

          <Tabs.Panel value="formats" pt="lg">
            <Stack gap="lg">
              {hasFormats ? (
                <>
                  <ChartCard title="Format Revenue" description="Revenue by ad format">
                    <FormatBreakdownChart data={data.formatBreakdown} />
                  </ChartCard>
                  <DataTable columns={formatColumns} data={data.formatBreakdown} />
                </>
              ) : (
                <Card padding="xl" radius="xl" withBorder styles={{ root: { borderColor: 'var(--color-border-default)', borderStyle: 'dashed' } }}>
                  <Stack align="center" py="xl">
                    <Text size="sm" c="var(--color-text-muted)">No format data available</Text>
                  </Stack>
                </Card>
              )}
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="tiers" pt="lg">
            <Stack gap="lg">
              {hasTiers ? (
                <>
                  <ChartCard title="Tier Distribution" description="Revenue and requests by GEO tier">
                    <TierBreakdownChart data={data.tierBreakdown} />
                  </ChartCard>
                  <DataTable columns={tierColumns} data={data.tierBreakdown} />
                </>
              ) : (
                <Card padding="xl" radius="xl" withBorder styles={{ root: { borderColor: 'var(--color-border-default)', borderStyle: 'dashed' } }}>
                  <Stack align="center" py="xl">
                    <Text size="sm" c="var(--color-text-muted)">No tier data available</Text>
                  </Stack>
                </Card>
              )}
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="costs" pt="lg">
            {costTrend.length > 0 ? (
              <ChartCard title="Cost Trend" description="Daily costs">
                <CostTrendChart data={costTrend} />
              </ChartCard>
            ) : (
              <Card padding="xl" radius="xl" withBorder styles={{ root: { borderColor: 'var(--color-border-default)', borderStyle: 'dashed' } }}>
                <Stack align="center" py="xl">
                  <Text size="sm" c="var(--color-text-muted)">No cost data available</Text>
                </Stack>
              </Card>
            )}
          </Tabs.Panel>

          <Tabs.Panel value="trends" pt="lg">
            {hasTrend ? (
              <Stack gap="lg">
                <ChartCard title="Revenue" description="Revenue over time">
                  <RevenueTrendChart data={data.trend} />
                </ChartCard>
                <ChartCard title="Traffic" description="Traffic over time">
                  <TrafficTrendChart data={data.trend} />
                </ChartCard>
                <ChartCard title="Profit" description="Profit over time">
                  <ProfitTrendChart data={data.trend} />
                </ChartCard>
              </Stack>
            ) : (
              <Card padding="xl" radius="xl" withBorder styles={{ root: { borderColor: 'var(--color-border-default)', borderStyle: 'dashed' } }}>
                <Stack align="center" py="xl">
                  <Text size="sm" c="var(--color-text-muted)">No trend data available</Text>
                </Stack>
              </Card>
            )}
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </motion.div>
  )
}

export default function SiteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)

  return (
    <Box>
      <TopContextBar title="Site Detail" subtitle="Site-level analytics and control center" />
      <Suspense fallback={<PageSkeleton />}>
        <SiteDetailContent id={id} />
      </Suspense>
    </Box>
  )
}
