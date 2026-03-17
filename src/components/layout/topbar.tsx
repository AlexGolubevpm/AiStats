'use client'

import { Suspense } from 'react'
import { motion } from 'framer-motion'
import { RefreshCw, Loader2, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { PeriodSelector } from '@/components/features/period-selector'
import { useSyncStatus } from '@/hooks/use-sync-status'

function SyncStatusBadge() {
  const { latestBySource } = useSyncStatus()
  const latest = latestBySource('adspyglass')
  if (!latest?.completedAt) return null

  const ago = getTimeAgo(latest.completedAt)
  return (
    <span className="text-meta flex items-center gap-1.5">
      <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-success)]" />
      Synced {ago}
    </span>
  )
}

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

function SyncButton() {
  const { triggerSync, isSyncing } = useSyncStatus()

  return (
    <motion.div whileTap={{ scale: 0.97 }}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => triggerSync()}
        disabled={isSyncing}
        className="h-9 rounded-[var(--radius-control)] border-[var(--color-border-default)] text-[13px]"
      >
        {isSyncing ? (
          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
        ) : (
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
        )}
        {isSyncing ? 'Syncing...' : 'Sync'}
      </Button>
    </motion.div>
  )
}

interface TopContextBarProps {
  title: string
  subtitle?: string
  showPeriod?: boolean
  showSync?: boolean
  showExport?: boolean
  actions?: React.ReactNode
}

export function TopContextBar({
  title,
  subtitle,
  showPeriod = true,
  showSync = true,
  showExport = false,
  actions,
}: TopContextBarProps) {
  return (
    <header className="sticky top-0 z-30 flex min-h-[64px] items-center justify-between shadow-[0_1px_0_rgba(0,0,0,0.04)] bg-white/80 px-6 py-3 backdrop-blur-md">
      {/* Left: Title */}
      <div>
        <motion.h1
          key={title}
          className="text-page-title"
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2 }}
        >
          {title}
        </motion.h1>
        {subtitle && (
          <p className="mt-0.5 text-[13px] text-[var(--color-text-muted)]">{subtitle}</p>
        )}
      </div>

      {/* Right: Controls */}
      <div className="flex items-center gap-3">
        <Suspense fallback={<Skeleton className="h-5 w-24" />}>
          <SyncStatusBadge />
        </Suspense>

        {showPeriod && (
          <Suspense fallback={<Skeleton className="h-9 w-[160px]" />}>
            <PeriodSelector />
          </Suspense>
        )}

        {showExport && (
          <Button
            variant="outline"
            size="sm"
            className="h-9 rounded-[var(--radius-control)] border-[var(--color-border-default)] text-[13px]"
          >
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Export
          </Button>
        )}

        {showSync && (
          <Suspense fallback={<Skeleton className="h-9 w-20" />}>
            <SyncButton />
          </Suspense>
        )}

        {actions}
      </div>
    </header>
  )
}

// Keep backward compat
export const Topbar = TopContextBar
