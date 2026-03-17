'use client'

import { use, Suspense } from 'react'
import { Box, SimpleGrid, Stack, Text, Card } from '@mantine/core'
import { motion } from 'framer-motion'
import { fadeInUp } from '@/lib/motion'
import { TopContextBar } from '@/components/layout/topbar'
import { KPICard } from '@/components/shared/kpi-card'
import { ChartCard } from '@/components/shared/chart-card'
import { PageSkeleton } from '@/components/shared/loading-skeleton'
import { FormatBreakdownChart } from '@/components/features/charts/format-breakdown-chart'
import { RevenueTrendChart } from '@/components/features/charts/revenue-trend-chart'
import { DataTable } from '@/components/features/data-table'
import { useBundle } from '@/hooks/use-api'
import { usePeriod } from '@/hooks/use-period'
import { formatCurrency, formatCompact } from '@/lib/utils'
import Link from 'next/link'
import type { ColumnDef } from '@tanstack/react-table'

interface SiteRow {
  id: string
  name: string
  slug: string
  hits: number
  totalRevenue: number
  profit: number
  romi: number
}

const siteColumns: ColumnDef<SiteRow, unknown>[] = [
  {
    accessorKey: 'name',
    header: 'Site',
    cell: ({ row }) => (
      <Link href={`/sites/${row.original.slug}`} style={{ fontWeight: 600, color: '#4F46E5', textDecoration: 'none' }}>
        {row.original.name}
      </Link>
    ),
  },
  { accessorKey: 'hits', header: 'Requests', cell: ({ row }) => <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCompact(row.original.hits || 0)}</span> },
  { accessorKey: 'totalRevenue', header: 'Revenue', cell: ({ row }) => <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(row.original.totalRevenue || 0)}</span> },
  {
    accessorKey: 'profit',
    header: 'Profit',
    cell: ({ row }) => {
      const profit = row.original.profit || 0
      return <span style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: profit >= 0 ? '#039855' : '#D92D20' }}>{formatCurrency(profit)}</span>
    },
  },
  { accessorKey: 'romi', header: 'ROMI', cell: ({ row }) => <span style={{ fontVariantNumeric: 'tabular-nums' }}>{(row.original.romi || 0).toFixed(1)}%</span> },
]

function BundleDetailContent({ id }: { id: string }) {
  const { period } = usePeriod()
  const { data, isLoading } = useBundle(id, period)

  if (isLoading || !data) return <PageSkeleton />

  const hasKpis = data.kpis && data.kpis.length > 0
  const hasSites = data.sites && data.sites.length > 0

  return (
    <motion.div initial="hidden" animate="visible" variants={fadeInUp} custom={0}>
      <Box px="xl" py="xl">
        <Stack gap="xl">
          {hasKpis && (
            <SimpleGrid cols={{ base: 2, sm: 3, lg: 5 }} spacing="md">
              {data.kpis.map((kpi: { label: string; value: number; delta?: number; format: 'currency' | 'number' | 'percent' | 'score' | 'compact' }) => (
                <KPICard key={kpi.label} {...kpi} />
              ))}
            </SimpleGrid>
          )}

          {hasSites ? (
            <Box>
              <Text size="lg" fw={600} c="#111827" mb="md" style={{ fontSize: 20 }}>
                Sites in Bundle
              </Text>
              <DataTable columns={siteColumns} data={data.sites} searchKey="name" searchPlaceholder="Search sites..." />
            </Box>
          ) : (
            <Card padding="xl" radius="xl" withBorder styles={{ root: { borderColor: '#D7DCE5', borderStyle: 'dashed' } }}>
              <Stack align="center" py="xl">
                <Text size="sm" c="#6B7280">No sites in this bundle yet</Text>
              </Stack>
            </Card>
          )}

          {data.formatBreakdown && data.formatBreakdown.length > 0 && (
            <ChartCard title="Format Breakdown" description="Revenue by ad format">
              <FormatBreakdownChart data={data.formatBreakdown} />
            </ChartCard>
          )}

          {data.trend && data.trend.length > 0 && (
            <ChartCard title="Revenue Trend" description="Bundle revenue over time">
              <RevenueTrendChart data={data.trend} />
            </ChartCard>
          )}
        </Stack>
      </Box>
    </motion.div>
  )
}

export default function BundleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)

  return (
    <Box>
      <TopContextBar title="Bundle Detail" subtitle="Bundle performance and analytics" />
      <Suspense fallback={<PageSkeleton />}>
        <BundleDetailContent id={id} />
      </Suspense>
    </Box>
  )
}
