'use client'

import { RefreshCw } from 'lucide-react'
import { Suspense } from 'react'
import { PeriodSelector } from '@/components/features/period-selector'

interface TopbarProps {
  title: string
  description?: string
}

export function Topbar({ title, description }: TopbarProps) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface)] px-8">
      <div>
        <h1 className="text-lg font-semibold text-[var(--color-text-primary)]">{title}</h1>
        {description && (
          <p className="text-sm text-[var(--color-text-muted)]">{description}</p>
        )}
      </div>

      <div className="flex items-center gap-3">
        <Suspense fallback={<div className="h-8 w-32 animate-pulse rounded-[var(--radius-md)] bg-[var(--color-background)]" />}>
          <PeriodSelector />
        </Suspense>

        <button className="flex items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-sm text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-background)]">
          <RefreshCw className="h-3.5 w-3.5" />
          Sync
        </button>
      </div>
    </header>
  )
}
