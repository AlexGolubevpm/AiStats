'use client'

import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { useCallback } from 'react'

export const periodOptions = [
  { label: 'Today', value: 'today' },
  { label: 'Yesterday', value: 'yesterday' },
  { label: 'Last 7 days', value: '7d' },
  { label: 'Last 30 days', value: '30d' },
]

export function usePeriod() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const period = searchParams.get('period') || '7d'

  const setPeriod = useCallback(
    (newPeriod: string) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set('period', newPeriod)
      router.push(`${pathname}?${params.toString()}`)
    },
    [searchParams, router, pathname]
  )

  return { period, setPeriod }
}
