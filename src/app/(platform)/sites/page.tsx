'use client'

import { Suspense } from 'react'
import { Topbar } from '@/components/layout/topbar'
import { HealthBadge } from '@/components/shared/health-badge'
import { TableSkeleton } from '@/components/shared/loading-skeleton'
import { DataTable } from '@/components/features/data-table'
import { useSites } from '@/hooks/use-api'
import { usePeriod } from '@/hooks/use-period'
import { useFilters } from '@/hooks/use-filters'
import { FilterBar } from '@/components/features/filter-bar'
import Link from 'next/link'
import type { ColumnDef } from '@tanstack/react-table'

interface SiteRow {
  id: string
  name: string
  slug: string
  bundle: string
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
      <Link href={`/sites/${row.original.slug}`} className="font-medium text-[var(--color-accent)] hover:underline">
        {row.original.name}
      </Link>
    ),
  },
  { accessorKey: 'bundle', header: 'Bundle' },
  {
    accessorKey: 'healthScore',
    header: 'Health',
    cell: ({ row }) => row.original.healthScore != null ? <HealthBadge score={row.original.healthScore} showLabel={false} /> : <span className="text-xs text-[var(--color-text-muted)]">—</span>,
  },
  {
    accessorKey: 'users',
    header: 'Traffic',
    cell: ({ row }) => `${((row.original.users || 0) / 1000).toFixed(0)}K`,
  },
  {
    accessorKey: 'adRevenue',
    header: 'Ad Revenue',
    cell: ({ row }) => `$${(row.original.adRevenue || 0).toLocaleString()}`,
  },
  {
    accessorKey: 'affiliateRevenue',
    header: 'Affiliate',
    cell: ({ row }) => `$${(row.original.affiliateRevenue || 0).toLocaleString()}`,
  },
  {
    accessorKey: 'costs',
    header: 'Costs',
    cell: ({ row }) => `$${(row.original.costs || 0).toLocaleString()}`,
  },
  {
    accessorKey: 'profit',
    header: 'Profit',
    cell: ({ row }) => (
      <span className={`font-medium ${(row.original.profit || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
        ${(row.original.profit || 0).toLocaleString()}
      </span>
    ),
  },
  {
    accessorKey: 'romi',
    header: 'ROMI',
    cell: ({ row }) => `${(row.original.romi || 0).toFixed(1)}%`,
  },
]

function SitesContent() {
  const { period } = usePeriod()
  const { filters } = useFilters()
  const { data: rawSites, isLoading } = useSites(period, filters.bundleId)

  if (isLoading || !rawSites) {
    return <div className="p-8"><TableSkeleton rows={10} /></div>
  }

  // Map API response to table rows
  const sites: SiteRow[] = rawSites.map((s: { id: string; name: string; slug: string; bundle: { name: string }; health: { score: number } | null; users: number; adRevenue: number; affiliateRevenue: number; costs: number; profit: number; romi: number }) => ({
    id: s.id,
    name: s.name,
    slug: s.slug,
    bundle: s.bundle?.name || '',
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
      <div className="space-y-4 p-8">
        <FilterBar showBundle showFormat={false} showTier={false} />
        <div className="flex flex-col items-center justify-center rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] py-16">
          <p className="text-sm text-[var(--color-text-muted)]">No sites found</p>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">Sites will appear after syncing with AdSpyglass</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 p-8">
      <FilterBar showBundle showFormat={false} showTier={false} />
      <DataTable columns={columns} data={sites} searchKey="name" searchPlaceholder="Search sites..." />
    </div>
  )
}

export default function SitesPage() {
  return (
    <div>
      <Topbar title="Sites" description="All sites across bundles" />
      <Suspense fallback={<div className="p-8"><TableSkeleton rows={10} /></div>}>
        <SitesContent />
      </Suspense>
    </div>
  )
}
