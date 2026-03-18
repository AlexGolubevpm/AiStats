'use client'
import { cn } from '@/lib/utils'
import { Activity } from 'lucide-react'

interface NetworkHealthCardProps {
  score: number
  unhealthyCount?: number
  totalBundles?: number
  confidence?: 'full' | 'partial' | 'low'
}

function getHealthConfig(score: number) {
  if (score >= 80) return { label: 'Excellent', color: 'text-emerald-600' }
  if (score >= 60) return { label: 'Good', color: 'text-blue-600' }
  if (score >= 40) return { label: 'Warning', color: 'text-amber-600' }
  return { label: 'Critical', color: 'text-red-600' }
}

export function NetworkHealthCard({ score, unhealthyCount = 0, totalBundles = 0, confidence = 'full' }: NetworkHealthCardProps) {
  const health = getHealthConfig(score)
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">Network Health</span>
        <Activity size={16} className="text-muted-foreground" />
      </div>
      <div className={cn('mt-2 text-2xl font-bold', health.color)}>
        {Math.round(score)}
        <span className="ml-1 text-sm font-normal">{health.label}</span>
      </div>
      {unhealthyCount > 0 && (
        <p className="mt-1 text-xs text-muted-foreground">
          {unhealthyCount} of {totalBundles} bundles need attention
        </p>
      )}
      {confidence !== 'full' && (
        <p className="mt-1 text-xs text-amber-600">
          {confidence === 'partial' ? 'Partial data — score may change' : 'Low confidence — insufficient data'}
        </p>
      )}
    </div>
  )
}
