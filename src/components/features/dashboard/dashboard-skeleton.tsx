'use client'

import {
  KPICardSkeleton,
  ChartSkeleton,
  SignalCardSkeleton,
  BundleCardSkeleton,
} from '@/components/shared/loading-skeleton'

export function DashboardSkeleton() {
  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6">
      <div className="flex flex-col gap-6">
        {/* Data Freshness */}
        <div className="flex gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="animate-shimmer h-7 w-28 rounded-full" />
          ))}
        </div>
        {/* Primary KPIs */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => <KPICardSkeleton key={i} />)}
        </div>
        {/* Secondary KPIs */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <KPICardSkeleton key={i} />)}
        </div>
        {/* Signals */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 3 }).map((_, i) => <SignalCardSkeleton key={i} />)}
        </div>
        {/* Chart + Sidebar */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
          <div className="md:col-span-8"><ChartSkeleton /></div>
          <div className="md:col-span-4 flex flex-col gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-card)]">
                <div className="animate-shimmer h-3 w-16 rounded-md" />
                <div className="animate-shimmer mt-2 h-7 w-24 rounded-md" />
              </div>
            ))}
          </div>
        </div>
        {/* Bundles */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <BundleCardSkeleton key={i} />)}
        </div>
        {/* Bundle Comparison + Summary */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
          <div className="md:col-span-8">
            <div className="rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] shadow-[var(--shadow-card)]">
              <div className="px-5 pt-5 pb-3">
                <div className="animate-shimmer h-4 w-40 rounded-md" />
                <div className="animate-shimmer mt-2 h-3 w-28 rounded-md" />
              </div>
              <div className="px-5 pb-5 flex flex-col gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="animate-shimmer h-4 w-16 rounded-md" />
                      <div className="animate-shimmer h-4 w-20 rounded-md" />
                    </div>
                    <div className="animate-shimmer h-3 w-full rounded-full" />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="md:col-span-4 flex flex-col gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-card)]">
                <div className="animate-shimmer h-3 w-20 rounded-md" />
                <div className="animate-shimmer mt-2 h-7 w-24 rounded-md" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
