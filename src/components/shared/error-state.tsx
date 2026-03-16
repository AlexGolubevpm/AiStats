'use client'

import { cn } from '@/lib/utils'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'

interface ErrorStateProps {
  title?: string
  description?: string
  className?: string
}

export function ErrorState({
  title = 'Failed to load data',
  description = 'Something went wrong. Try refreshing or run a sync.',
  className,
}: ErrorStateProps) {
  const queryClient = useQueryClient()

  return (
    <div className={cn('flex flex-col items-center justify-center py-16 text-center', className)}>
      <div className="mb-4 rounded-full bg-[var(--color-background)] p-4">
        <AlertTriangle className="h-8 w-8 text-[var(--color-warning)]" />
      </div>
      <h3 className="text-sm font-medium text-[var(--color-text-primary)]">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-[var(--color-text-muted)]">{description}</p>
      <button
        onClick={() => queryClient.invalidateQueries()}
        className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-[var(--color-surface-raised)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-overlay)]"
      >
        <RefreshCw className="h-3.5 w-3.5" />
        Retry
      </button>
    </div>
  )
}
