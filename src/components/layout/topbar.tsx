'use client'

import { RefreshCw, Loader2 } from 'lucide-react'
import { Suspense } from 'react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { PeriodSelector } from '@/components/features/period-selector'
import { useSyncStatus } from '@/hooks/use-sync-status'

function SyncButton() {
  const { triggerSync, isSyncing } = useSyncStatus()

  return (
    <Button variant="outline" size="sm" onClick={() => triggerSync()} disabled={isSyncing}>
      {isSyncing ? (
        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
      ) : (
        <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
      )}
      {isSyncing ? 'Syncing...' : 'Sync'}
    </Button>
  )
}

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
        <Suspense fallback={<Skeleton className="h-9 w-[160px]" />}>
          <PeriodSelector />
        </Suspense>
        <Suspense fallback={<Skeleton className="h-9 w-20" />}>
          <SyncButton />
        </Suspense>
      </div>
    </header>
  )
}
