'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useCallback } from 'react'

interface SyncLogEntry {
  id: string
  source: string
  status: string
  startedAt: string
  completedAt: string | null
  recordsProcessed: number
  error: string | null
}

export function useSyncStatus() {
  const queryClient = useQueryClient()
  const [isSyncing, setIsSyncing] = useState(false)

  const { data: syncLogs } = useQuery<SyncLogEntry[]>({
    queryKey: ['sync-status'],
    queryFn: async () => {
      const res = await fetch('/api/sync')
      if (!res.ok) throw new Error('Failed to fetch sync status')
      return res.json()
    },
    refetchInterval: isSyncing ? 5000 : false,
  })

  const syncMutation = useMutation({
    mutationFn: async (source?: string) => {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: source || 'all' }),
      })
      if (!res.ok) throw new Error('Failed to trigger sync')
      return res.json()
    },
    onMutate: () => setIsSyncing(true),
    onSettled: () => {
      setTimeout(() => {
        setIsSyncing(false)
        queryClient.invalidateQueries({ queryKey: ['sync-status'] })
      }, 10000)
    },
  })

  const triggerSync = useCallback(
    (source?: string) => syncMutation.mutate(source),
    [syncMutation]
  )

  const latestBySource = (source: string) =>
    syncLogs?.find((log) => log.source === source)

  return {
    syncLogs,
    triggerSync,
    isSyncing,
    latestBySource,
    isPending: syncMutation.isPending,
  }
}
