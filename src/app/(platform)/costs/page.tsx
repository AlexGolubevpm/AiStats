'use client'

import { Suspense } from 'react'
import { Box, Stack, SimpleGrid, Group, Text, Card } from '@mantine/core'
import { motion } from 'framer-motion'
import { fadeInUp } from '@/lib/motion'
import { TopContextBar } from '@/components/layout/topbar'
import { KPICard } from '@/components/shared/kpi-card'
import { ChartCard } from '@/components/shared/chart-card'
import { MetricDelta } from '@/components/shared/delta-indicator'
import { KPICardSkeleton, ChartSkeleton, TableSkeleton } from '@/components/shared/loading-skeleton'
import { CostTrendChart } from '@/components/features/charts/cost-trend-chart'
import { DataTable } from '@/components/features/data-table'
import { useCosts } from '@/hooks/use-api'
import { usePeriod } from '@/hooks/use-period'
import { formatCurrency } from '@/lib/utils'
import type { ColumnDef } from '@tanstack/react-table'

interface CostRow {
  site: string
  bundle: string
  yesterday: number
  avg7d: number
  total30d: number
  change: number
  status: string
}

const columns: ColumnDef<CostRow, unknown>[] = [
  {
    accessorKey: 'site',
    header: 'Site',
    cell: ({ row }) => <Text fw={600} size="sm" c="var(--color-text-primary)">{row.original.site}</Text>,
  },
  { accessorKey: 'bundle', header: 'Bundle' },
  {
    accessorKey: 'yesterday',
    header: 'Yesterday',
    cell: ({ row }) => <Text size="sm" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(row.original.yesterday || 0)}</Text>,
  },
  {
    accessorKey: 'avg7d',
    header: '7d Avg',
    cell: ({ row }) => <Text size="sm" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(row.original.avg7d || 0)}</Text>,
  },
  {
    accessorKey: 'total30d',
    header: '30d Total',
    cell: ({ row }) => <Text fw={600} size="sm" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(row.original.total30d || 0)}</Text>,
  },
  {
    accessorKey: 'change',
    header: 'Change',
    cell: ({ row }) => <MetricDelta value={row.original.change || 0} />,
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.original.status
      const config = status === 'matched'
        ? { bg: 'var(--color-success-bg)', text: 'var(--color-success-dark)', dot: 'var(--color-success)', label: 'Matched' }
        : status === 'no_data'
        ? { bg: 'var(--color-bg-subtle)', text: 'var(--color-text-muted)', dot: 'var(--color-text-muted)', label: 'No Data' }
        : { bg: 'var(--color-warning-bg)', text: 'var(--color-warning-dark)', dot: 'var(--color-warning)', label: 'Unmatched' }
      return (
        <Box
          component="span"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            borderRadius: 'var(--radius-pill)',
            padding: '4px 10px',
            fontSize: 11,
            fontWeight: 600,
            backgroundColor: config.bg,
            color: config.text,
          }}
        >
          <Box component="span" style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: config.dot }} />
          {config.label}
        </Box>
      )
    },
  },
]


function CostsContent() {
  const { period } = usePeriod()
  const { data, isLoading } = useCosts(period)

  if (isLoading || !data) {
    return (
      <Stack gap="xl" px="xl" py="xl">
        <SimpleGrid cols={{ base: 2, sm: 2, lg: 4 }} spacing="md">
          {Array.from({ length: 4 }).map((_, i) => <KPICardSkeleton key={i} />)}
        </SimpleGrid>
        <ChartSkeleton />
        <TableSkeleton />
      </Stack>
    )
  }

  const summary = data.summary || {}
  const sites = data.sites || []
  const trend = data.trend || []

  const tableRows: CostRow[] = sites.map((s: { name: string; bundle: { name: string }; yesterdayCost: number; sevenDayAvg: number; thirtyDayTotal: number; changePercent: number; mappingStatus: string | null; hasCostData: boolean }) => ({
    site: s.name,
    bundle: s.bundle?.name || '',
    yesterday: s.yesterdayCost || 0,
    avg7d: s.sevenDayAvg || 0,
    total30d: s.thirtyDayTotal || 0,
    change: s.changePercent || 0,
    status: s.hasCostData ? (s.mappingStatus || 'unmatched') : 'no_data',
  }))

  const unmatchedCount = tableRows.filter(r => r.status === 'unmatched').length
  const noDataCount = tableRows.filter(r => r.status === 'no_data').length

  return (
    <motion.div initial="hidden" animate="visible" variants={fadeInUp}>
      <Stack gap="xl" px="xl" py="xl">
        {/* KPI Row */}
        <SimpleGrid cols={{ base: 2, sm: 2, lg: 4 }} spacing="md">
          <KPICard label="Yesterday Total" value={summary.yesterdayTotal || 0} format="currency" />
          <KPICard label="7-Day Average" value={summary.sevenDayAvg || 0} format="currency" />
          <KPICard label="30-Day Total" value={summary.thirtyDayTotal || 0} format="currency" />
          <KPICard label="No Cost Data" value={noDataCount} format="number" />
        </SimpleGrid>

        {/* Cost Trend */}
        {trend.length > 0 && (
          <ChartCard title="Cost Trend" description="Daily cost breakdown">
            <CostTrendChart data={trend} />
          </ChartCard>
        )}

        {/* Table */}
        {tableRows.length > 0 ? (
          <Box>
            <Text size="lg" fw={600} c="#111827" mb="md" style={{ fontSize: 20 }}>Cost Breakdown</Text>
            <DataTable columns={columns} data={tableRows} searchKey="site" searchPlaceholder="Search sites..." />
          </Box>
        ) : (
          <Card padding="xl" radius="xl" withBorder styles={{ root: { borderColor: 'var(--color-border-default)', borderStyle: 'dashed' } }}>
            <Stack align="center" py="xl" gap="xs">
              <Text size="sm" c="var(--color-text-muted)">No cost data available</Text>
              <Text size="xs" fw={500} c="#6B7280">Cost data will appear after syncing</Text>
            </Stack>
          </Card>
        )}

        {/* Mapping Issues Banner */}
        {unmatchedCount > 0 && (
          <Box
            p="md"
            style={{
              borderRadius: 'var(--radius-card)',
              border: '1px solid var(--color-warning)',
              backgroundColor: 'var(--color-warning-bg)',
            }}
          >
            <Text size="sm" fw={600} c="var(--color-warning-dark)">
              {unmatchedCount} site{unmatchedCount > 1 ? 's' : ''} with unmatched cost mapping
            </Text>
            <Text size="xs" c="var(--color-warning-dark)" mt={4} style={{ opacity: 0.7 }}>
              Check site mappings in Settings to ensure cost data is correctly attributed.
            </Text>
          </Box>
        )}

        {/* No Data Info Banner */}
        {noDataCount > 0 && unmatchedCount === 0 && (
          <Box
            p="md"
            style={{
              borderRadius: 'var(--radius-card)',
              border: '1px solid var(--color-border-default)',
              backgroundColor: 'var(--color-bg-subtle)',
            }}
          >
            <Text size="sm" fw={600} c="var(--color-text-secondary)">
              {noDataCount} site{noDataCount > 1 ? 's' : ''} awaiting cost data
            </Text>
            <Text size="xs" c="var(--color-text-muted)" mt={4}>
              Cost data will appear after syncing from Google Sheets. Configure the sheet in Settings &rarr; Google Sheets.
            </Text>
          </Box>
        )}
      </Stack>
    </motion.div>
  )
}

export default function CostsPage() {
  return (
    <Box>
      <TopContextBar title="Costs" subtitle="Cost tracking and analysis" showExport />
      <Suspense fallback={
        <Stack gap="xl" px="xl" py="xl">
          <SimpleGrid cols={{ base: 2, sm: 2, lg: 4 }} spacing="md">
            {Array.from({ length: 4 }).map((_, i) => <KPICardSkeleton key={i} />)}
          </SimpleGrid>
        </Stack>
      }>
        <CostsContent />
      </Suspense>
    </Box>
  )
}
