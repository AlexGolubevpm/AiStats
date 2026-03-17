'use client'

import { cn } from '@/lib/utils'

interface SkeletonProps {
  className?: string
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn('block animate-shimmer rounded-[10px] bg-[#E5E7EB]', className)}
    />
  )
}

export function KPICardSkeleton() {
  return (
    <div className="min-h-[144px] rounded-[16px] border border-[#E5E7EB] bg-white p-5 shadow-[0_1px_3px_rgba(16,24,40,0.06),0_1px_2px_rgba(16,24,40,0.04)]">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="mt-4 h-10 w-28" />
      <div className="mt-4 flex items-end justify-between">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-7 w-[120px]" />
      </div>
    </div>
  )
}

export function ChartSkeleton() {
  return (
    <div className="rounded-[16px] border border-[#E5E7EB] bg-white shadow-[0_1px_3px_rgba(16,24,40,0.06),0_1px_2px_rgba(16,24,40,0.04)]">
      <div className="px-5 py-4">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="mt-1 h-3 w-20" />
      </div>
      <div className="px-5 pb-5">
        <Skeleton className="h-[280px] w-full rounded-[12px]" />
      </div>
    </div>
  )
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="rounded-[16px] border border-[#E5E7EB] bg-white shadow-[0_1px_3px_rgba(16,24,40,0.06),0_1px_2px_rgba(16,24,40,0.04)]">
      <div className="border-b border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3">
        <div className="flex gap-8">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
      <div className="divide-y divide-[#E5E7EB]">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-8 px-4 py-3.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function PageSkeleton() {
  return (
    <div className="mx-auto max-w-[1600px] space-y-8 px-6 py-6">
      <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => <KPICardSkeleton key={i} />)}
      </div>
      <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <KPICardSkeleton key={i} />)}
      </div>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        <ChartSkeleton />
        <ChartSkeleton />
        <ChartSkeleton />
      </div>
    </div>
  )
}
