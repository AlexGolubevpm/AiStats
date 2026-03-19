'use client'

import { cn } from '@/lib/utils'

function Shimmer({ className }: { className?: string }) {
  return <div className={cn('animate-shimmer rounded-md', className)} />
}

/* ── KPI Card ── */
export function KPICardSkeleton() {
  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] border-l-[3px] border-l-gray-200 bg-[var(--color-surface)] p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between">
        <Shimmer className="h-3 w-16" />
        <Shimmer className="h-5 w-14 rounded-full" />
      </div>
      <Shimmer className="mt-3 h-10 w-28" />
      <Shimmer className="mt-2 h-3 w-16" />
      <Shimmer className="mt-3 h-12 w-full" />
    </div>
  )
}

/* ── Chart Card ── */
export function ChartSkeleton() {
  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] shadow-[var(--shadow-card)]">
      <div className="px-5 pt-5 pb-3">
        <Shimmer className="h-4 w-24" />
        <Shimmer className="mt-2 h-3 w-20" />
      </div>
      <div className="px-5 pb-5">
        <Shimmer className="h-72 w-full rounded-lg" />
      </div>
    </div>
  )
}

/* ── Signal Card ── */
export function SignalCardSkeleton() {
  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] border-l-[3px] border-l-gray-200 bg-[var(--color-surface)] p-4 shadow-[var(--shadow-card)]">
      <div className="flex gap-3">
        <Shimmer className="h-9 w-9 shrink-0 rounded-[var(--radius-control)]" />
        <div className="flex-1">
          <Shimmer className="h-3 w-16" />
          <Shimmer className="mt-2 h-4 w-28" />
          <Shimmer className="mt-2 h-3 w-full" />
        </div>
      </div>
    </div>
  )
}

/* ── Bundle Card ── */
export function BundleCardSkeleton() {
  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] shadow-[var(--shadow-card)] overflow-hidden">
      <Shimmer className="h-[3px] w-full rounded-none" />
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Shimmer className="h-2.5 w-2.5 rounded-full" />
            <Shimmer className="h-4 w-16" />
          </div>
          <Shimmer className="h-5 w-14 rounded-full" />
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i}>
              <Shimmer className="h-2.5 w-14" />
              <Shimmer className="mt-1 h-5 w-16" />
            </div>
          ))}
        </div>
        <div className="mt-3 border-t border-[var(--color-border-subtle)] pt-3">
          <Shimmer className="h-3 w-12" />
        </div>
      </div>
    </div>
  )
}

/* ── Insight Card ── */
export function InsightCardSkeleton() {
  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] border-l-[3px] border-l-gray-200 bg-[var(--color-surface)] p-4 shadow-[var(--shadow-card)]">
      <div className="flex gap-3">
        <Shimmer className="h-9 w-9 shrink-0 rounded-[var(--radius-control)]" />
        <div className="flex-1">
          <Shimmer className="h-3 w-16" />
          <Shimmer className="mt-2 h-4 w-36" />
          <Shimmer className="mt-2 h-10 w-full" />
          <Shimmer className="mt-2 h-3 w-28" />
        </div>
      </div>
    </div>
  )
}

/* ── Table ── */
export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-surface)]">
      <div className="flex gap-8 border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-secondary)] px-4 py-3">
        <Shimmer className="h-3 w-24" />
        <Shimmer className="h-3 w-16" />
        <Shimmer className="h-3 w-16" />
        <Shimmer className="h-3 w-16" />
        <Shimmer className="h-3 w-20" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className={cn('flex gap-8 px-4 py-3', i < rows - 1 && 'border-b border-[var(--color-border-subtle)]')}>
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

/* ── Full Page ── */
export function PageSkeleton() {
  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6">
      <div className="flex flex-col gap-6">
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
          {Array.from({ length: 4 }).map((_, i) => <SignalCardSkeleton key={i} />)}
        </div>
        {/* Charts + Sidebar */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="lg:col-span-8"><ChartSkeleton /></div>
          <div className="lg:col-span-4 flex flex-col gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-card)]">
                <Shimmer className="h-3 w-16" />
                <Shimmer className="mt-2 h-7 w-24" />
              </div>
            ))}
          </div>
        </div>
        {/* Bundles */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <BundleCardSkeleton key={i} />)}
        </div>
      </div>
    </div>
  )
}
