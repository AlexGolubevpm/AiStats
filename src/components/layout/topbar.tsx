'use client'

import { CalendarDays, RefreshCw } from 'lucide-react'

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
        {/* Period Selector */}
        <div className="flex items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5">
          <CalendarDays className="h-4 w-4 text-[var(--color-text-muted)]" />
          <span className="text-sm text-[var(--color-text-secondary)]">Last 7 days</span>
        </div>

        {/* Sync Button */}
        <button className="flex items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-sm text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-background)]">
          <RefreshCw className="h-3.5 w-3.5" />
          Sync
        </button>
      </div>
    </header>
  )
}
