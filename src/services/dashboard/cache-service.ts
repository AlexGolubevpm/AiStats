/**
 * DashboardCacheService
 *
 * Short-lived query cache for dashboard responses.
 * Cache is an optimization layer only — never the source of truth.
 *
 * TTL policy (from spec §17):
 *  - today → 5 min
 *  - yesterday → 10 min
 *  - 7d → 15 min
 *  - 30d → 30 min
 *
 * Cache key: dashboard:{period}:{compare}:{filtersHash}
 */

import type { DashboardResponse, PeriodType, SourceName, SourceStatus } from './types'
import { createHash } from 'crypto'

interface CacheEntry {
  response: DashboardResponse
  createdAt: number
  expiresAt: number
}

// In-memory cache. For production, swap with Redis.
const cache = new Map<string, CacheEntry>()

// TTL by period type (milliseconds)
const TTL: Record<string, number> = {
  today: 5 * 60 * 1000,
  yesterday: 10 * 60 * 1000,
  '7d': 15 * 60 * 1000,
  '30d': 30 * 60 * 1000,
}

const DEFAULT_TTL = 15 * 60 * 1000 // 15 min

function buildCacheKey(
  period: string,
  compare: string,
  from: string,
  to: string,
): string {
  const hash = createHash('md5')
    .update(`${period}:${compare}:${from}:${to}`)
    .digest('hex')
    .slice(0, 12)
  return `dashboard:${period}:${compare}:${hash}`
}

function getTtl(periodType: string): number {
  return TTL[periodType] ?? DEFAULT_TTL
}

export function getCached(
  periodType: string,
  compare: string,
  from: string,
  to: string,
): DashboardResponse | null {
  const key = buildCacheKey(periodType, compare, from, to)
  const entry = cache.get(key)

  if (!entry) return null

  if (Date.now() > entry.expiresAt) {
    cache.delete(key)
    return null
  }

  return entry.response
}

export function setCache(
  periodType: string,
  compare: string,
  from: string,
  to: string,
  response: DashboardResponse,
): void {
  const key = buildCacheKey(periodType, compare, from, to)
  const now = Date.now()
  const ttl = getTtl(periodType)

  cache.set(key, {
    response,
    createdAt: now,
    expiresAt: now + ttl,
  })

  // Lazy cleanup: remove expired entries if cache grows
  if (cache.size > 100) {
    for (const [k, v] of cache) {
      if (Date.now() > v.expiresAt) cache.delete(k)
    }
  }
}

export function invalidateAll(): void {
  cache.clear()
}

export function invalidateByPeriod(periodType: string): void {
  for (const [key] of cache) {
    if (key.includes(`:${periodType}:`)) {
      cache.delete(key)
    }
  }
}
