/**
 * DashboardNormalizer
 *
 * Reads from the SAME dailyMetric table that bundles/sites/forecast pages use.
 * Produces NormalizedData for the metrics-engine and signal-engine.
 *
 * This is the single source of truth — sync workers write to dailyMetric,
 * ALL pages (including dashboard) read from it.
 */

import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { generateDateRange } from './period-resolver'
import type {
  NormalizedSiteDay,
  NormalizedData,
  SourceName,
  SourceStatus,
} from './types'

function toNum(val: Prisma.Decimal | number | null | undefined): number | null {
  if (val == null) return null
  if (typeof val === 'number') return val
  return Number(val)
}

/**
 * Load normalized data from DB for a date range.
 * Same dailyMetric table that /api/bundles, /api/sites, /api/forecast use.
 */
export async function normalize(
  from: string,
  to: string,
): Promise<NormalizedData> {
  const fromDate = new Date(from + 'T00:00:00.000Z')
  const toDate = new Date(to + 'T23:59:59.999Z')

  // Query dailyMetric — exact same table other pages read
  const rows = await prisma.dailyMetric.findMany({
    where: {
      date: { gte: fromDate, lte: toDate },
      site: { isActive: true },
    },
    include: {
      site: {
        select: { id: true, name: true, bundleId: true },
      },
    },
    orderBy: { date: 'asc' },
  })

  const dateRange = generateDateRange(from, to)
  const result: NormalizedSiteDay[] = []

  for (const row of rows) {
    const date = row.date.toISOString().split('T')[0]
    const users = row.users
    const adRevenue = toNum(row.adRevenue)
    const affiliateRevenue = toNum(row.affiliateRevenue)
    const costs = toNum(row.costs)
    const impressions = row.impressions
    const clicks = row.clicks
    const hits = row.hits

    result.push({
      siteId: row.siteId,
      siteName: row.site.name,
      bundleId: row.site.bundleId,
      date,
      visits: users != null && users > 0 ? users : null,
      adRevenue: adRevenue != null && adRevenue > 0 ? adRevenue : null,
      affiliateRevenue: affiliateRevenue != null && affiliateRevenue > 0 ? affiliateRevenue : null,
      costs: costs != null && costs > 0 ? costs : null,
      impressions: impressions != null && impressions > 0 ? impressions : null,
      clicks: clicks != null && clicks > 0 ? clicks : null,
      hits: hits != null && hits > 0 ? hits : null,
      sourceCompleteness: {
        yandex: users != null && users > 0,
        adSpyglass: (adRevenue != null && adRevenue > 0) || (impressions != null && impressions > 0),
        costs: costs != null && costs > 0,
        affiliate: affiliateRevenue != null && affiliateRevenue > 0,
      },
    })
  }

  // Determine source statuses based on actual data presence
  const sourceStatuses = buildSourceStatuses(result)

  return {
    sites: result,
    dateRange,
    sourceStatuses,
  }
}

/**
 * Build source statuses by checking if we have data for each source.
 * Since we read from DB, "freshness" = when sync last ran.
 */
function buildSourceStatuses(
  rows: NormalizedSiteDay[],
): Record<SourceName, SourceStatus> {
  const now = new Date().toISOString()

  const hasYandex = rows.some(r => r.sourceCompleteness.yandex)
  const hasAdSpyglass = rows.some(r => r.sourceCompleteness.adSpyglass)
  const hasCosts = rows.some(r => r.sourceCompleteness.costs)
  const hasAffiliate = rows.some(r => r.sourceCompleteness.affiliate)

  function status(source: SourceName, hasData: boolean): SourceStatus {
    return {
      source,
      status: hasData ? 'fresh' : 'stale',
      completeness: hasData ? 'complete' : 'incomplete',
      lastFetchedAt: now,
      lastSuccessfulAt: hasData ? now : null,
      freshnessMinutes: null,
      notes: hasData ? [] : [`No ${source} data found in DB for this period`],
    }
  }

  return {
    yandex: status('yandex', hasYandex),
    adSpyglass: status('adSpyglass', hasAdSpyglass),
    costs: status('costs', hasCosts),
    affiliate: status('affiliate', hasAffiliate),
  }
}
