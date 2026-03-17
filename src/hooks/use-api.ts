'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

async function fetchApi(url: string) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}

function buildPeriodParams(period: string, extraParams?: Record<string, string>): string {
  const params = new URLSearchParams({ period })
  // For custom period, read from/to from the URL
  if (period === 'custom' && typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search)
    const from = urlParams.get('from')
    const to = urlParams.get('to')
    if (from) params.set('from', from)
    if (to) params.set('to', to)
  }
  if (extraParams) {
    for (const [key, value] of Object.entries(extraParams)) {
      if (value) params.set(key, value)
    }
  }
  return params.toString()
}

export function useDashboard(period: string) {
  const qs = buildPeriodParams(period)
  return useQuery({
    queryKey: ['dashboard', qs],
    queryFn: () => fetchApi(`/api/dashboard?${qs}`),
  })
}

export function useBundles(period: string) {
  const qs = buildPeriodParams(period)
  return useQuery({
    queryKey: ['bundles', qs],
    queryFn: () => fetchApi(`/api/bundles?${qs}`),
  })
}

export function useBundle(id: string, period: string) {
  const qs = buildPeriodParams(period)
  return useQuery({
    queryKey: ['bundle', id, qs],
    queryFn: () => fetchApi(`/api/bundles/${id}?${qs}`),
  })
}

export function useSites(period: string, bundleId?: string) {
  const qs = buildPeriodParams(period, bundleId ? { bundleSlug: bundleId } : undefined)
  return useQuery({
    queryKey: ['sites', qs],
    queryFn: () => fetchApi(`/api/sites?${qs}`),
  })
}

export function useSite(id: string, period: string) {
  const qs = buildPeriodParams(period)
  return useQuery({
    queryKey: ['site', id, qs],
    queryFn: () => fetchApi(`/api/sites/${id}?${qs}`),
  })
}

export function useCosts(period: string) {
  const qs = buildPeriodParams(period)
  return useQuery({
    queryKey: ['costs', qs],
    queryFn: () => fetchApi(`/api/costs?${qs}`),
  })
}

export function useAffiliate(period: string) {
  const qs = buildPeriodParams(period)
  return useQuery({
    queryKey: ['affiliate', qs],
    queryFn: () => fetchApi(`/api/affiliate?${qs}`),
  })
}

export function useForecastBase() {
  return useQuery({
    queryKey: ['forecast-base'],
    queryFn: () => fetchApi('/api/forecast'),
  })
}

export function useConclusions(period: string) {
  const qs = buildPeriodParams(period)
  return useQuery({
    queryKey: ['conclusions', qs],
    queryFn: () => fetchApi(`/api/conclusions?${qs}`),
  })
}

export function useAnalysis() {
  return useQuery({
    queryKey: ['analysis'],
    queryFn: () => fetchApi('/api/analysis'),
  })
}

export function useRunAnalysis() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () =>
      fetch('/api/analysis', { method: 'POST' }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['analysis'] })
    },
  })
}

export function useSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: () => fetchApi('/api/settings'),
  })
}

export function useSaveSettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
    },
  })
}
