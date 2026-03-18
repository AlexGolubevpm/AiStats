/**
 * YandexMetricaDashboardAdapter
 *
 * Returns normalized traffic payload for a requested period.
 * Source of truth for: visits, users, countries, tiers, GEO.
 */

import { yandexMetrica } from '@/services/yandex-metrica'
import { prisma } from '@/lib/db'
import type { SourceStatus, TrafficPayload } from '../types'

const SOURCE_TIMEOUT = 15_000

export async function fetchTrafficPayload(
  from: string,
  to: string,
): Promise<TrafficPayload> {
  const fetchStart = Date.now()
  const notes: string[] = []

  if (!yandexMetrica.isConfigured) {
    return {
      source: makeStatus('failed', 'incomplete', null, ['Yandex Metrica not configured']),
      visitsBySite: new Map(),
      totalVisitsByDate: new Map(),
    }
  }

  // Load sites with metrikaCounterId
  const sites = await prisma.site.findMany({
    where: { isActive: true, metrikaCounterId: { not: null } },
    select: { id: true, domain: true, metrikaCounterId: true },
  })

  if (sites.length === 0) {
    return {
      source: makeStatus('fresh', 'incomplete', null, ['No sites with Yandex Metrica counters']),
      visitsBySite: new Map(),
      totalVisitsByDate: new Map(),
    }
  }

  const visitsBySite = new Map<string, Map<string, number>>()
  const totalVisitsByDate = new Map<string, number>()
  let failCount = 0

  // Fetch all counters in parallel with individual timeouts
  const results = await Promise.allSettled(
    sites.map(async (site) => {
      const daily = await yandexMetrica.fetchDailyVisitors(
        site.metrikaCounterId!,
        from,
        to,
      )
      return { site, daily }
    }),
  )

  for (const result of results) {
    if (result.status === 'fulfilled') {
      const { site, daily } = result.value
      const siteMap = new Map<string, number>()
      for (const d of daily) {
        siteMap.set(d.date, d.users)
        totalVisitsByDate.set(d.date, (totalVisitsByDate.get(d.date) ?? 0) + d.users)
      }
      visitsBySite.set(site.domain, siteMap)
    } else {
      failCount++
      notes.push(`Failed to fetch counter: ${result.reason}`)
    }
  }

  const freshnessMs = Date.now() - fetchStart
  const allFailed = failCount === sites.length
  const someFailed = failCount > 0

  const status: SourceStatus['status'] = allFailed ? 'failed' : someFailed ? 'partial' : 'fresh'
  const completeness: SourceStatus['completeness'] = allFailed ? 'incomplete' : someFailed ? 'partial' : 'complete'

  return {
    source: makeStatus(status, completeness, freshnessMs, notes),
    visitsBySite,
    totalVisitsByDate,
  }
}

function makeStatus(
  status: SourceStatus['status'],
  completeness: SourceStatus['completeness'],
  freshnessMs: number | null,
  notes: string[],
): SourceStatus {
  const now = new Date().toISOString()
  return {
    source: 'yandex',
    status,
    completeness,
    lastFetchedAt: now,
    lastSuccessfulAt: status !== 'failed' ? now : null,
    freshnessMinutes: freshnessMs != null ? Math.round(freshnessMs / 60000 * 100) / 100 : null,
    notes,
  }
}
