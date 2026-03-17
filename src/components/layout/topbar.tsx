'use client'

import { Suspense, useState } from 'react'
import { motion } from 'framer-motion'
import { RefreshCw, Loader2, Download, GitCompare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { PeriodSelector } from '@/components/features/period-selector'
import { useSyncStatus } from '@/hooks/use-sync-status'
import { usePeriod } from '@/hooks/use-period'

function SyncStatusBadge() {
  const { latestBySource } = useSyncStatus()
  const latest = latestBySource('adspyglass')
  if (!latest?.completedAt) return null

  const ago = getTimeAgo(latest.completedAt)
  return (
    <span className="flex items-center gap-1.5 text-[12px] font-medium text-[#6B7280]">
      <span className="h-1.5 w-1.5 rounded-full bg-[#12B76A]" />
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
        className="h-9 rounded-[10px] border-[#E5E7EB] text-[13px]"
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

const COMPARE_OPTIONS = [
  { value: 'prev_period', label: 'vs Previous Period' },
  { value: 'prev_7d', label: 'vs Previous 7 Days' },
  { value: 'prev_day', label: 'vs Previous Day' },
] as const

function CompareModeSelect() {
  const { compare, setCompare } = usePeriod()
  const [isOpen, setIsOpen] = useState(false)

  const currentLabel = COMPARE_OPTIONS.find(o => o.value === compare)?.label || 'vs Previous Period'

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className={`h-9 rounded-[10px] border-[#E5E7EB] text-[13px] ${compare !== 'prev_period' ? 'border-[#4F46E5]/30 bg-[#EEF2FF] text-[#4F46E5]' : ''}`}
      >
        <GitCompare className="mr-1.5 h-3.5 w-3.5" />
        <span className="hidden sm:inline">{currentLabel}</span>
        <span className="sm:hidden">Compare</span>
      </Button>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-1 w-52 overflow-hidden rounded-[12px] border border-[#E5E7EB] bg-white shadow-[0_8px_24px_rgba(16,24,40,0.12),0_4px_8px_rgba(16,24,40,0.06)]">
            {COMPARE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => { setCompare(opt.value); setIsOpen(false) }}
                className={`flex w-full items-center px-3.5 py-2.5 text-left text-[13px] transition-colors hover:bg-[#F9FAFB] ${
                  compare === opt.value ? 'font-semibold text-[#4F46E5] bg-[#EEF2FF]/50' : 'text-[#4B5563]'
                }`}
              >
                {compare === opt.value && (
                  <span className="mr-2 h-1.5 w-1.5 rounded-full bg-[#4F46E5]" />
                )}
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

interface TopContextBarProps {
  title: string
  subtitle?: string
  showPeriod?: boolean
  showSync?: boolean
  showExport?: boolean
  showCompare?: boolean
  actions?: React.ReactNode
}

export function TopContextBar({
  title,
  subtitle,
  showPeriod = true,
  showSync = true,
  showExport = false,
  showCompare = false,
  actions,
}: TopContextBarProps) {
  return (
    <header className="sticky top-0 z-30 flex min-h-[72px] flex-col gap-2 border-b border-[#E5E7EB] bg-white/[0.88] px-4 py-3 backdrop-blur-md sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-0">
      {/* Left: Title — pl-12 on mobile to avoid sidebar hamburger overlap */}
      <div className="min-w-0 pl-12 lg:pl-0">
        <motion.h1
          key={title}
          className="text-page-title truncate"
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2 }}
        >
          {title}
        </motion.h1>
        {subtitle && (
          <p className="mt-0.5 hidden text-[14px] font-medium text-[#6B7280] sm:block">{subtitle}</p>
        )}
      </div>

      {/* Right: Controls */}
      <div className="flex flex-shrink-0 flex-wrap items-center gap-2 sm:gap-3">
        <Suspense fallback={<Skeleton className="h-5 w-24" />}>
          <SyncStatusBadge />
        </Suspense>

        {showPeriod && (
          <Suspense fallback={<Skeleton className="h-9 w-[160px]" />}>
            <PeriodSelector />
          </Suspense>
        )}

        {showCompare && (
          <Suspense fallback={<Skeleton className="h-9 w-[140px]" />}>
            <CompareModeSelect />
          </Suspense>
        )}

        {showExport && (
          <Button
            variant="outline"
            size="sm"
            className="h-9 rounded-[10px] border-[#E5E7EB] text-[13px]"
          >
            <Download className="mr-1.5 h-3.5 w-3.5" />
            <span className="hidden sm:inline">Export</span>
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
