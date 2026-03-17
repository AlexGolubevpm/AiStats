'use client'

import { Suspense } from 'react'
import { Box, Stack, Card, Text } from '@mantine/core'
import { motion } from 'framer-motion'
import { fadeInUp } from '@/lib/motion'
import { TopContextBar } from '@/components/layout/topbar'
import { HealthBadge } from '@/components/shared/health-badge'
import { TableSkeleton } from '@/components/shared/loading-skeleton'
import { DataTable } from '@/components/features/data-table'
import { useSites } from '@/hooks/use-api'
import { usePeriod } from '@/hooks/use-period'
import { useFilters } from '@/hooks/use-filters'
import { FilterBar } from '@/components/features/filter-bar'
import { formatCurrency, formatCompact } from '@/lib/utils'
import Link from 'next/link'
import type { ColumnDef } from '@tanstack/react-table'

interface SiteRow {
  id: string
  name: string
  slug: string
  bundle: string
  bundleColor: string
  healthScore: number | null
  hits: number
  adRevenue: number
  affiliateRevenue: number
  costs: number
  profit: number
  romi: number
}

const columns: ColumnDef<SiteRow, unknown>[] = [
  {
    accessorKey: 'name',
    header: 'Site',
    cell: ({ row }) => (
      <Link href={`/sites/${row.original.slug}`} style={{ fontSize: 13, fontWeight: 600, color: '#4F46E5', textDecoration: 'none' }}>
        {row.original.name}
      </Link>
    ),
  },
  {
    accessorKey: 'bundle',
    header: 'Bundle',
    cell: ({ row }) => (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: row.original.bundleColor || '#9CA3AF' }} />
        <span style={{ fontSize: 13 }}>{row.original.bundle}</span>
      </div>
    ),
  },
  {
    accessorKey: 'healthScore',
    header: 'Health',
    cell: ({ row }) =>
      row.original.healthScore != null ? (
        <HealthBadge score={row.original.healthScore} showLabel={false} />
      ) : (
        <Text size="xs" c="#6B7280">--</Text>
      ),
  },
  {
    accessorKey: 'hits',
    header: 'Ad Requests',
    cell: ({ row }) => <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCompact(row.original.hits || 0)}</span>,
  },
  {
    accessorKey: 'adRevenue',
    header: 'Ad Revenue',
    cell: ({ row }) => <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(row.original.adRevenue || 0)}</span>,
  },
  {
    accessorKey: 'affiliateRevenue',
    header: 'Affiliate',
    cell: ({ row }) => <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(row.original.affiliateRevenue || 0)}</span>,
  },
  {
    accessorKey: 'costs',
    header: 'Costs',
    cell: ({ row }) => <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(row.original.costs || 0)}</span>,
  },
  {
    accessorKey: 'profit',
    header: 'Profit',
    cell: ({ row }) => {
      const profit = row.original.profit || 0
      return (
        <span style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: profit >= 0 ? '#039855' : '#D92D20' }}>
          {formatCurrency(profit)}
        </span>
      )
    },
  },
  {
    accessorKey: 'romi',
    header: 'ROMI',
    cell: ({ row }) => <span style={{ fontVariantNumeric: 'tabular-nums' }}>{(row.original.romi || 0).toFixed(1)}%</span>,
  },
]

const BUNDLE_COLORS: Record<string, string> = {
  Gays: '#3B82F6',
  Trans: '#EC4899',
  JAV: '#EF4444',
  Hentai: '#8B5CF6',
}

function SitesContent() {
  const { period } = usePeriod()
  const { filters } = useFilters()
  const { data: rawSites, isLoading } = useSites(period, filters.bundleId)

  if (isLoading || !rawSites) {
    return <Box px="xl" py="xl"><TableSkeleton rows={10} /></Box>
  }

  const sites: SiteRow[] = rawSites.map((s: { id: string; name: string; slug: string; bundle: { name: string }; health: { score: number } | null; hits: number; adRevenue: number; affiliateRevenue: number; costs: number; profit: number; romi: number }) => ({
    id: s.id,
    name: s.name,
    slug: s.slug,
    bundle: s.bundle?.name || '',
    bundleColor: BUNDLE_COLORS[s.bundle?.name] || '#94A3B8',
    healthScore: s.health?.score ?? null,
    hits: s.hits || 0,
    adRevenue: s.adRevenue || 0,
    affiliateRevenue: s.affiliateRevenue || 0,
    costs: s.costs || 0,
    profit: s.profit || 0,
    romi: s.romi || 0,
  }))

  if (sites.length === 0) {
    return (
      <Box px="xl" py="xl">
        <Stack gap="md">
          <FilterBar showBundle showFormat={false} showTier={false} />
          <Card padding="xl" radius="xl" withBorder styles={{ root: { borderColor: '#D7DCE5', borderStyle: 'dashed' } }}>
            <Stack align="center" py="xl" gap="xs">
              <Text size="sm" c="#6B7280">No sites found</Text>
              <Text size="xs" c="#6B7280" fw={500}>Sites will appear after syncing with AdSpyglass</Text>
            </Stack>
          </Card>
        </Stack>
      </Box>
    )
  }

  return (
    <motion.div initial="hidden" animate="visible" variants={fadeInUp} custom={0}>
      <Box px="xl" py="xl">
        <Stack gap="xl">
          <FilterBar showBundle showFormat={false} showTier={false} />
          <DataTable columns={columns} data={sites} searchKey="name" searchPlaceholder="Search sites..." />
        </Stack>
      </Box>
    </motion.div>
  )
}

export default function SitesPage() {
  return (
    <Box>
      <TopContextBar title="Sites" subtitle="All sites across bundles" showExport />
      <Suspense fallback={<Box px="xl" py="xl"><TableSkeleton rows={10} /></Box>}>
        <SitesContent />
      </Suspense>
    </Box>
  )
}
