'use client'

import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { useCallback } from 'react'

export interface Filters {
  bundleId?: string
  format?: string
  tier?: string
}

export function useFilters() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const filters: Filters = {
    bundleId: searchParams.get('bundleId') || undefined,
    format: searchParams.get('format') || undefined,
    tier: searchParams.get('tier') || undefined,
  }

  const setFilter = useCallback(
    (key: keyof Filters, value: string | undefined) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
      router.push(`${pathname}?${params.toString()}`)
    },
    [searchParams, router, pathname]
  )

  const clearFilters = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('bundleId')
    params.delete('format')
    params.delete('tier')
    router.push(`${pathname}?${params.toString()}`)
  }, [searchParams, router, pathname])

  const filterQueryString = (() => {
    const params = new URLSearchParams()
    if (filters.bundleId) params.set('bundleId', filters.bundleId)
    if (filters.format) params.set('format', filters.format)
    if (filters.tier) params.set('tier', filters.tier)
    return params.toString()
  })()

  return { filters, setFilter, clearFilters, filterQueryString }
}
