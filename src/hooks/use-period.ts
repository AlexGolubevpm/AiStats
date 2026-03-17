'use client'

import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { useCallback } from 'react'

export const periodOptions = [
  { label: 'Today', value: 'today' },
  { label: 'Yesterday', value: 'yesterday' },
  { label: 'Last 7 days', value: '7d' },
  { label: 'Last 30 days', value: '30d' },
  { label: 'Last 90 days', value: '90d' },
  { label: 'Custom', value: 'custom' },
]

export function usePeriod() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const period = searchParams.get('period') || 'yesterday'
  const customFrom = searchParams.get('from') || ''
  const customTo = searchParams.get('to') || ''

  const setPeriod = useCallback(
    (newPeriod: string) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set('period', newPeriod)
      if (newPeriod !== 'custom') {
        params.delete('from')
        params.delete('to')
      }
      router.push(`${pathname}?${params.toString()}`)
    },
    [searchParams, router, pathname]
  )

  const setCustomRange = useCallback(
    (from: string, to: string) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set('period', 'custom')
      params.set('from', from)
      params.set('to', to)
      router.push(`${pathname}?${params.toString()}`)
    },
    [searchParams, router, pathname]
  )

  return { period, setPeriod, customFrom, customTo, setCustomRange }
}
