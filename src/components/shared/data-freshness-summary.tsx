'use client'
import { useSyncStatus } from '@/hooks/use-sync-status'
import { cn } from '@/lib/utils'
import { RefreshCw, CheckCircle, AlertTriangle, XCircle, HelpCircle } from 'lucide-react'

type SourceStatus = 'fresh' | 'partial' | 'stale' | 'failed' | 'missing'

interface SourceStatusPillProps {
  label: string
  status: SourceStatus
  lastSync?: string
}

function SourceStatusPill({ label, status }: SourceStatusPillProps) {
  const config = {
    fresh: { icon: CheckCircle, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
    partial: { icon: AlertTriangle, color: 'text-amber-600 bg-amber-50 border-amber-200' },
    stale: { icon: RefreshCw, color: 'text-orange-600 bg-orange-50 border-orange-200' },
    failed: { icon: XCircle, color: 'text-red-600 bg-red-50 border-red-200' },
    missing: { icon: HelpCircle, color: 'text-gray-500 bg-gray-50 border-gray-200' },
  }
  const { icon: Icon, color } = config[status]
  return (
    <div className={cn('flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium', color)}>
      <Icon size={12} strokeWidth={2} />
      <span>{label}</span>
    </div>
  )
}

export function DataFreshnessSummary() {
  const { syncLogs } = useSyncStatus()

  const sources: { label: string; key: string }[] = [
    { label: 'Yandex Metrica', key: 'yandex' },
    { label: 'AdSpyglass', key: 'adspyglass' },
    { label: 'Costs', key: 'costs' },
    { label: 'Affiliate', key: 'affiliate' },
  ]

  function getStatus(key: string): SourceStatus {
    if (!syncLogs) return 'missing'
    const source = syncLogs.find(log => log.source === key)
    if (!source) return 'missing'
    if (source.status === 'failed') return 'failed'
    if (source.status === 'stale') return 'stale'
    if (source.status === 'partial') return 'partial'
    return 'fresh'
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium text-muted-foreground">Data Sources:</span>
      {sources.map(s => (
        <SourceStatusPill key={s.key} label={s.label} status={getStatus(s.key)} />
      ))}
    </div>
  )
}
