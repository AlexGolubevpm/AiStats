'use client'

import { cn } from '@/lib/utils'

function Shimmer({ className }: { className?: string }) {
  return (
    <div className={cn('animate-pulse rounded-md bg-gray-100', className)} />
  )
}

export function KPICardSkeleton() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <Shimmer className="h-3.5 w-20" />
        <Shimmer className="h-5 w-14 rounded-full" />
      </div>
      <Shimmer className="mt-3 h-8 w-28" />
      <Shimmer className="mt-2 h-3 w-16" />
      <Shimmer className="mt-4 h-10 w-full" />
    </div>
  )
}

export function ChartSkeleton() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="px-5 pt-5 pb-3">
        <Shimmer className="h-4 w-28" />
        <Shimmer className="mt-2 h-3 w-20" />
      </div>
      <div className="px-5 pb-5">
        <Shimmer className="h-72 w-full rounded-lg" />
      </div>
    </div>
  )
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div className="flex gap-8 border-b border-gray-100 bg-gray-50/50 px-4 py-3">
        <Shimmer className="h-3 w-24" />
        <Shimmer className="h-3 w-16" />
        <Shimmer className="h-3 w-16" />
        <Shimmer className="h-3 w-16" />
        <Shimmer className="h-3 w-20" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className={cn('flex gap-8 px-4 py-3', i < rows - 1 && 'border-b border-gray-100')}
        >
          <Shimmer className="h-4 w-32" />
          <Shimmer className="h-4 w-20" />
          <Shimmer className="h-4 w-16" />
          <Shimmer className="h-4 w-16" />
          <Shimmer className="h-4 w-24" />
        </div>
      ))}
    </div>
  )
}

export function PageSkeleton() {
  return (
    <div className="mx-auto w-full max-w-[1440px] px-6 py-6">
      <div className="flex flex-col gap-7">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => <KPICardSkeleton key={i} />)}
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <KPICardSkeleton key={i} />)}
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <ChartSkeleton />
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
      </div>
    </div>
  )
}
