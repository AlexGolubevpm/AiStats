'use client'

import { Suspense } from 'react'
import { Topbar } from '@/components/layout/topbar'
import { HealthBadge } from '@/components/shared/health-badge'
import { DeltaIndicator } from '@/components/shared/delta-indicator'
import { TableSkeleton } from '@/components/shared/loading-skeleton'
import { DataTable } from '@/components/features/data-table'
import { useSites } from '@/hooks/use-api'
import { usePeriod } from '@/hooks/use-period'
import Link from 'next/link'
import type { ColumnDef } from '@tanstack/react-table'

interface SiteRow {
  id: string
  name: string
  slug: string
  bundle: string
  health: number
  traffic: number
  adRevenue: number
  affiliateRevenue: number
  costs: number
  profit: number
  romi: number
  delta: number
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
    accessorKey: 'health',
    header: 'Health',
    cell: ({ row }) => <HealthBadge score={row.original.health} showLabel={false} />,
  },
  {
    accessorKey: 'traffic',
    header: 'Traffic',
    cell: ({ row }) => `${(row.original.traffic / 1000).toFixed(0)}K`,
  },
  {
    accessorKey: 'adRevenue',
    header: 'Ad Revenue',
    cell: ({ row }) => `$${row.original.adRevenue.toLocaleString()}`,
  },
  {
    accessorKey: 'affiliateRevenue',
    header: 'Affiliate',
    cell: ({ row }) => `$${row.original.affiliateRevenue.toLocaleString()}`,
  },
  {
    accessorKey: 'costs',
    header: 'Costs',
    cell: ({ row }) => `$${row.original.costs.toLocaleString()}`,
  },
  {
    accessorKey: 'profit',
    header: 'Profit',
    cell: ({ row }) => (
      <span className={`font-medium ${row.original.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
        ${row.original.profit.toLocaleString()}
      </span>
    ),
  },
  {
    accessorKey: 'romi',
    header: 'ROMI',
    cell: ({ row }) => `${row.original.romi}%`,
  },
  {
    accessorKey: 'delta',
    header: 'Trend',
    cell: ({ row }) => <DeltaIndicator value={row.original.delta} />,
  },
]

function SitesContent() {
  const { period } = usePeriod()
  const { data: sites, isLoading } = useSites(period)

  if (isLoading || !sites) {
    return <div className="p-8"><TableSkeleton rows={10} /></div>
  }

  return (
    <div className="p-8">
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
