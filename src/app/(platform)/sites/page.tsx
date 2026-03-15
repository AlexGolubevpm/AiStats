'use client'

import { Suspense } from 'react'
import { motion } from 'framer-motion'
import { TopContextBar } from '@/components/layout/topbar'
import { HealthBadge } from '@/components/shared/health-badge'
import { MetricDelta } from '@/components/shared/delta-indicator'
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
  users: number
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
      <Link href={`/sites/${row.original.slug}`} className="text-[13px] font-semibold text-[var(--color-primary-600)] hover:text-[var(--color-primary-700)] hover:underline">
        {row.original.name}
      </Link>
    ),
  },
  {
    accessorKey: 'bundle',
    header: 'Bundle',
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: row.original.bundleColor || 'var(--color-text-disabled)' }} />
        <span className="text-[13px]">{row.original.bundle}</span>
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
        <span className="text-meta">--</span>
      ),
  },
  {
    accessorKey: 'users',
    header: 'Traffic',
    cell: ({ row }) => <span className="tabular-nums">{formatCompact(row.original.users || 0)}</span>,
  },
  {
    accessorKey: 'adRevenue',
    header: 'Ad Revenue',
    cell: ({ row }) => <span className="tabular-nums">{formatCurrency(row.original.adRevenue || 0)}</span>,
  },
  {
    accessorKey: 'affiliateRevenue',
    header: 'Affiliate',
    cell: ({ row }) => <span className="tabular-nums">{formatCurrency(row.original.affiliateRevenue || 0)}</span>,
  },
  {
    accessorKey: 'costs',
    header: 'Costs',
    cell: ({ row }) => <span className="tabular-nums">{formatCurrency(row.original.costs || 0)}</span>,
  },
  {
    accessorKey: 'profit',
    header: 'Profit',
    cell: ({ row }) => {
      const profit = row.original.profit || 0
      return (
        <span className={`font-semibold tabular-nums ${profit >= 0 ? 'text-[var(--color-success-dark)]' : 'text-[var(--color-danger-dark)]'}`}>
          {formatCurrency(profit)}
        </span>
      )
    },
  },
  {
    accessorKey: 'romi',
    header: 'ROMI',
    cell: ({ row }) => <span className="tabular-nums">{(row.original.romi || 0).toFixed(1)}%</span>,
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
    return <div className="px-6 py-8"><TableSkeleton rows={10} /></div>
  }

  const sites: SiteRow[] = rawSites.map((s: { id: string; name: string; slug: string; bundle: { name: string }; health: { score: number } | null; users: number; adRevenue: number; affiliateRevenue: number; costs: number; profit: number; romi: number }) => ({
    id: s.id,
    name: s.name,
    slug: s.slug,
    bundle: s.bundle?.name || '',
    bundleColor: BUNDLE_COLORS[s.bundle?.name] || '#94A3B8',
    healthScore: s.health?.score ?? null,
    users: s.users || 0,
    adRevenue: s.adRevenue || 0,
    affiliateRevenue: s.affiliateRevenue || 0,
    costs: s.costs || 0,
    profit: s.profit || 0,
    romi: s.romi || 0,
  }))

  if (sites.length === 0) {
    return (
      <div className="space-y-4 px-6 py-8">
        <FilterBar showBundle showFormat={false} showTier={false} />
        <div className="flex flex-col items-center justify-center rounded-[var(--radius-card)] border border-dashed border-[var(--color-border-default)] py-20">
          <p className="text-[14px] text-[var(--color-text-muted)]">No sites found</p>
          <p className="mt-1.5 text-meta">Sites will appear after syncing with AdSpyglass</p>
        </div>
      </div>
    )
  }

  return (
    <motion.div
      className="space-y-5 px-6 py-8"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
    >
      <FilterBar showBundle showFormat={false} showTier={false} />
      <DataTable columns={columns} data={sites} searchKey="name" searchPlaceholder="Search sites..." />
    </motion.div>
  )
}

export default function SitesPage() {
  return (
    <div>
      <TopContextBar title="Sites" subtitle="All sites across bundles" showExport />
      <Suspense fallback={<div className="px-6 py-8"><TableSkeleton rows={10} /></div>}>
        <SitesContent />
      </Suspense>
    </div>
  )
}
