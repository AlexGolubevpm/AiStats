'use client'

import { Suspense } from 'react'
import { motion } from 'framer-motion'
import { TopContextBar } from '@/components/layout/topbar'
import { HealthBadge } from '@/components/shared/health-badge'
import { MetricDelta } from '@/components/shared/delta-indicator'
import { TableSkeleton } from '@/components/shared/loading-skeleton'
import { ErrorState } from '@/components/shared/error-state'
import { DataTable } from '@/components/features/data-table'
import { useSites } from '@/hooks/use-api'
import { usePeriod } from '@/hooks/use-period'
import { useFilters } from '@/hooks/use-filters'
import { FilterBar } from '@/components/features/filter-bar'
import { formatCurrency, formatCompact, formatRPM, downloadCSV } from '@/lib/utils'
import Link from 'next/link'
import type { ColumnDef } from '@tanstack/react-table'

interface SiteRow {
  id: string
  name: string
  domain: string
  slug: string
  bundle: string
  bundleColor: string
  healthScore: number | null
  users: number
  hits: number
  impressions: number
  adRevenue: number
  rpm: number
}

const columns: ColumnDef<SiteRow, unknown>[] = [
  {
    accessorKey: 'domain',
    header: 'Site',
    cell: ({ row }) => (
      <Link href={`/sites/${row.original.slug}`} className="text-[13px] font-semibold text-[var(--color-primary-600)] hover:text-[var(--color-primary-700)] hover:underline">
        {row.original.domain}
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
    header: 'Hits',
    cell: ({ row }) => <span className="tabular-nums">{formatCompact(row.original.hits || row.original.users || 0)}</span>,
  },
  {
    accessorKey: 'impressions',
    header: 'Impressions',
    cell: ({ row }) => <span className="tabular-nums">{formatCompact(row.original.impressions || 0)}</span>,
  },
  {
    accessorKey: 'adRevenue',
    header: 'Ad Revenue',
    cell: ({ row }) => (
      <span className="font-semibold tabular-nums text-[var(--color-success-dark)]">
        {formatCurrency(row.original.adRevenue || 0)}
      </span>
    ),
  },
  {
    accessorKey: 'rpm',
    header: 'RPM',
    cell: ({ row }) => <span className="tabular-nums">{formatRPM(row.original.rpm || 0)}</span>,
  },
]

function SitesContent() {
  const { period } = usePeriod()
  const { filters } = useFilters()
  const { data: rawSites, isLoading, error } = useSites(period, filters.bundleId)

  if (isLoading) {
    return <div className="px-6 py-8"><TableSkeleton rows={10} /></div>
  }

  if (error || !rawSites) {
    return <div className="px-6 py-8"><ErrorState /></div>
  }

  const sites: SiteRow[] = rawSites.map((s: { id: string; name: string; domain?: string; slug: string; bundle: { name: string; color?: string }; health: { score: number } | null; users: number; hits?: number; impressions?: number; adRevenue: number; rpm?: number }) => ({
    id: s.id,
    name: s.name,
    domain: s.domain || s.name,
    slug: s.slug,
    bundle: s.bundle?.name || '',
    bundleColor: s.bundle?.color || '#94A3B8',
    healthScore: s.health?.score ?? null,
    users: s.users || 0,
    hits: s.hits || s.users || 0,
    impressions: s.impressions || 0,
    adRevenue: s.adRevenue || 0,
    rpm: s.rpm || 0,
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

function SitesPageInner() {
  const { period } = usePeriod()
  const { data: rawSites } = useSites(period)

  const handleExport = () => {
    if (!rawSites?.length) return
    const exportData = rawSites.map((s: { name: string; bundle?: { name?: string }; users: number; adRevenue: number; affiliateRevenue: number; costs: number; profit: number; romi: number }) => ({
      name: s.name,
      bundle: s.bundle?.name || '',
      users: s.users || 0,
      adRevenue: (s.adRevenue || 0).toFixed(2),
      affiliateRevenue: (s.affiliateRevenue || 0).toFixed(2),
      costs: (s.costs || 0).toFixed(2),
      profit: (s.profit || 0).toFixed(2),
      romi: (s.romi || 0).toFixed(1),
    }))
    downloadCSV(exportData, `sites-${period}-${new Date().toISOString().slice(0, 10)}`)
  }

  return (
    <div>
      <TopContextBar title="Sites" subtitle="All sites across bundles" showExport onExport={handleExport} />
      <SitesContent />
    </div>
  )
}

export default function SitesPage() {
  return (
    <Suspense fallback={<div className="px-6 py-8"><TableSkeleton rows={10} /></div>}>
      <SitesPageInner />
    </Suspense>
  )
}
