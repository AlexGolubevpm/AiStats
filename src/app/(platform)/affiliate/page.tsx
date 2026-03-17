'use client'

import { Suspense } from 'react'
import { Box, Stack, SimpleGrid, Text, Card } from '@mantine/core'
import { motion } from 'framer-motion'
import { fadeInUp } from '@/lib/motion'
import { TopContextBar } from '@/components/layout/topbar'
import { KPICard } from '@/components/shared/kpi-card'
import { ChartCard } from '@/components/shared/chart-card'
import { KPICardSkeleton, ChartSkeleton, TableSkeleton } from '@/components/shared/loading-skeleton'
import { AffiliateComparisonChart } from '@/components/features/charts/affiliate-comparison-chart'
import { DataTable } from '@/components/features/data-table'
import { useAffiliate } from '@/hooks/use-api'
import { usePeriod } from '@/hooks/use-period'
import { formatCurrency } from '@/lib/utils'
import type { ColumnDef } from '@tanstack/react-table'

interface AffiliateRow {
  site: string
  bundle: string
  revenue: number
  share: number
}

const columns: ColumnDef<AffiliateRow, unknown>[] = [
  { accessorKey: 'site', header: 'Site', cell: ({ row }) => <Text fw={600} size="sm">{row.original.site}</Text> },
  { accessorKey: 'bundle', header: 'Bundle' },
  { accessorKey: 'revenue', header: 'Affiliate Revenue', cell: ({ row }) => <Text fw={600} size="sm" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(row.original.revenue || 0)}</Text> },
  { accessorKey: 'share', header: 'Share of Total', cell: ({ row }) => <Text size="sm" style={{ fontVariantNumeric: 'tabular-nums' }}>{(row.original.share || 0).toFixed(1)}%</Text> },
]

function AffiliateContent() {
  const { period } = usePeriod()
  const { data, isLoading } = useAffiliate(period)

  if (isLoading || !data) {
    return (
      <Stack gap="xl" px="xl" py="xl">
        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
          {Array.from({ length: 3 }).map((_, i) => <KPICardSkeleton key={i} />)}
        </SimpleGrid>
        <ChartSkeleton />
        <TableSkeleton />
      </Stack>
    )
  }

  const summary = data.summary || {}
  const sites = data.sites || []
  const trend = data.trend || []

  const tableRows: AffiliateRow[] = sites.map((s: { name: string; bundle: { name: string }; affiliateRevenue: number; shareOfTotal: number }) => ({
    site: s.name,
    bundle: s.bundle?.name || '',
    revenue: s.affiliateRevenue || 0,
    share: s.shareOfTotal || 0,
  }))

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={fadeInUp}
      custom={0}
    >
      <Stack gap="xl" px="xl" py="xl">
        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
          <KPICard label="Affiliate Revenue" value={summary.totalAffiliateRevenue || 0} format="currency" />
          <KPICard label="Ad Revenue" value={summary.totalAdRevenue || 0} format="currency" />
          <KPICard label="Total Revenue" value={summary.totalRevenue || 0} format="currency" />
        </SimpleGrid>

        {tableRows.length > 0 ? (
          <Box>
            <Text size="lg" fw={600} c="#111827" mb="md" style={{ fontSize: 20 }}>Revenue by Site</Text>
            <DataTable columns={columns} data={tableRows} searchKey="site" searchPlaceholder="Search sites..." />
          </Box>
        ) : (
          <Card padding="xl" radius="xl" withBorder styles={{ root: { borderColor: 'var(--color-border-default)', borderStyle: 'dashed' } }}>
            <Stack align="center" py="xl" gap="xs">
              <Text size="sm" c="var(--color-text-muted)">No affiliate data available</Text>
              <Text size="xs" fw={500} c="#6B7280">Affiliate data will appear after syncing</Text>
            </Stack>
          </Card>
        )}

        {trend.length > 0 && (
          <ChartCard title="Revenue Comparison" description="Affiliate vs Ad revenue over time">
            <AffiliateComparisonChart data={trend} />
          </ChartCard>
        )}
      </Stack>
    </motion.div>
  )
}

export default function AffiliatePage() {
  return (
    <Box>
      <TopContextBar title="Affiliate" subtitle="Affiliate and SPA revenue tracking" showExport />
      <Suspense fallback={
        <Stack gap="xl" px="xl" py="xl">
          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
            {Array.from({ length: 3 }).map((_, i) => <KPICardSkeleton key={i} />)}
          </SimpleGrid>
        </Stack>
      }>
        <AffiliateContent />
      </Suspense>
    </Box>
  )
}
