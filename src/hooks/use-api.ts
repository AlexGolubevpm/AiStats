'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

async function fetchApi(url: string) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}

const defaultOpts = { retry: 2, staleTime: 30_000 } as const

export function useDashboard(period: string) {
  return useQuery({
    queryKey: ['dashboard', period],
    queryFn: () => fetchApi(`/api/dashboard?period=${period}`),
    ...defaultOpts,
  })
}

export function useBundles(period: string) {
  return useQuery({
    queryKey: ['bundles', period],
    queryFn: () => fetchApi(`/api/bundles?period=${period}`),
    ...defaultOpts,
  })
}

export function useBundle(id: string, period: string) {
  return useQuery({
    queryKey: ['bundle', id, period],
    queryFn: () => fetchApi(`/api/bundles/${id}?period=${period}`),
    ...defaultOpts,
  })
}

export function useSites(period: string, bundleId?: string) {
  const params = new URLSearchParams({ period })
  if (bundleId) params.set('bundleId', bundleId)
  return useQuery({
    queryKey: ['sites', period, bundleId],
    queryFn: () => fetchApi(`/api/sites?${params}`),
    ...defaultOpts,
  })
}

export function useSite(id: string, period: string) {
  return useQuery({
    queryKey: ['site', id, period],
    queryFn: () => fetchApi(`/api/sites/${id}?period=${period}`),
    ...defaultOpts,
  })
}

export function useCosts(period: string) {
  return useQuery({
    queryKey: ['costs', period],
    queryFn: () => fetchApi(`/api/costs?period=${period}`),
    ...defaultOpts,
  })
}

export function useAffiliate(period: string) {
  return useQuery({
    queryKey: ['affiliate', period],
    queryFn: () => fetchApi(`/api/affiliate?period=${period}`),
    ...defaultOpts,
  })
}

export function useForecastBase() {
  return useQuery({
    queryKey: ['forecast-base'],
    queryFn: () => fetchApi('/api/forecast'),
    ...defaultOpts,
  })
}

export function useConclusions(period: string) {
  return useQuery({
    queryKey: ['conclusions', period],
    queryFn: () => fetchApi(`/api/conclusions?period=${period}`),
    ...defaultOpts,
  })
}

export function useAnalysis() {
  return useQuery({
    queryKey: ['analysis'],
    queryFn: () => fetchApi('/api/analysis'),
    ...defaultOpts,
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
    ...defaultOpts,
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
