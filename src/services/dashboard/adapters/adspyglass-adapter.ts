/**
 * AdSpyglassDashboardAdapter
 *
 * Returns normalized monetization payload for a requested period.
 * Source of truth for: ad revenue, impressions, clicks, CTR, fill rate, eCPM.
 */

import { adok, cleanDomain } from '@/services/adspyglass'
import type { SourceStatus, MonetizationPayload } from '../types'

export async function fetchMonetizationPayload(
  from: string,
  to: string,
): Promise<MonetizationPayload> {
  const fetchStart = Date.now()
  const notes: string[] = []

  if (!adok.isConfigured) {
    return emptyPayload('AdOK API not configured')
  }

  try {
    // Parallel fetch: daily totals + per-website breakdown (15s timeout)
    const results = await Promise.race([
      Promise.all([
        adok.fetchReport({ from, to, group_by: 'date' }),
        adok.fetchReport({ from, to, group_by: 'website' }),
      ]),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('AdOK API timed out after 15s')), 15_000),
      ),
    ])
    const [dailyRows, websiteRows] = results

    // Build total by date
    const totalByDate = new Map<string, {
      revenue: number
      impressions: number
      clicks: number
      hits: number
      ctr: number
      fillRate: number
      ecpm: number
    }>()

    for (const row of dailyRows) {
      if (!row.name) continue
      totalByDate.set(row.name, {
        revenue: row.broker_income,
        impressions: row.impressions,
        clicks: row.clicks,
        hits: row.hits,
        ctr: row.ctr,
        fillRate: row.fill_rate,
        ecpm: row.impressions > 0 ? (row.broker_income / row.impressions) * 1000 : 0,
      })
    }

    // Build per-site aggregates (period total, not daily breakdown)
    // For daily per-site, we'd need day-by-day website queries — too expensive.
    // Instead, we store period aggregate per site and distribute daily proportionally.
    const revenueBySite = new Map<string, Map<string, number>>()
    const impressionsBySite = new Map<string, Map<string, number>>()
    const clicksBySite = new Map<string, Map<string, number>>()
    const hitsBySite = new Map<string, Map<string, number>>()

    // Calculate total network revenue for proportional distribution
    const totalNetworkRevenue = websiteRows.reduce((s, r) => s + r.broker_income, 0)

    for (const row of websiteRows) {
      if (!row.name) continue
      const domain = cleanDomain(row.name)
      const siteShare = totalNetworkRevenue > 0 ? row.broker_income / totalNetworkRevenue : 0

      const revMap = new Map<string, number>()
      const impMap = new Map<string, number>()
      const clickMap = new Map<string, number>()
      const hitMap = new Map<string, number>()

      // Distribute daily totals proportionally by site share
      for (const [date, totals] of totalByDate) {
        revMap.set(date, totals.revenue * siteShare)
        impMap.set(date, Math.round(totals.impressions * siteShare))
        clickMap.set(date, Math.round(totals.clicks * siteShare))
        hitMap.set(date, Math.round(totals.hits * siteShare))
      }

      revenueBySite.set(domain, revMap)
      impressionsBySite.set(domain, impMap)
      clicksBySite.set(domain, clickMap)
      hitsBySite.set(domain, hitMap)
    }

    const freshnessMs = Date.now() - fetchStart

    return {
      source: makeStatus('fresh', 'complete', freshnessMs, notes),
      revenueBySite,
      impressionsBySite,
      clicksBySite,
      hitsBySite,
      totalByDate,
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    notes.push(`AdOK fetch failed: ${msg}`)
    return emptyPayload(msg)
  }
}

function emptyPayload(reason: string): MonetizationPayload {
  return {
    source: makeStatus('failed', 'incomplete', null, [reason]),
    revenueBySite: new Map(),
    impressionsBySite: new Map(),
    clicksBySite: new Map(),
    hitsBySite: new Map(),
    totalByDate: new Map(),
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
    source: 'adSpyglass',
    status,
    completeness,
    lastFetchedAt: now,
    lastSuccessfulAt: status !== 'failed' ? now : null,
    freshnessMinutes: freshnessMs != null ? Math.round(freshnessMs / 60000 * 100) / 100 : null,
    notes,
  }
}
