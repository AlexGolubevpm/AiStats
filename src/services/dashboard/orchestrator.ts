/**
 * DashboardQueryOrchestrator
 *
 * Reads from the database (same source as Bundles/Sites/Costs tabs)
 * and computes dashboard metrics, signals, and insights.
 *
 * Flow:
 * 1. Parse request → resolve period
 * 2. Check cache
 * 3. Load data from DB (dailyMetric + sync logs)
 * 4. Build NormalizedData
 * 5. Compute metrics, health, signals, insights
 * 6. Cache result
 * 7. Return response
 */

import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { format } from 'date-fns'
import {
  resolvePeriod,
  parsePeriodType,
  parseCompareMode,
  generateDateRange,
} from './period-resolver'
import {
  computeKpis,
  computeTrends,
  computeBundles,
  computeExecutiveSummary,
  computeNetworkHealth,
  aggregateRows,
} from './metrics-engine'
import {
  computeSignals,
  computeInsights,
  computeWarnings,
} from './signal-engine'
import { getCached, setCache } from './cache-service'
import type {
  DashboardResponse,
  CompletenessStatus,
  BusinessTargets,
  NormalizedSiteDay,
  NormalizedData,
  SourceName,
  SourceStatus,
} from './types'
import { DEFAULT_TARGETS } from './types'

export interface DashboardQuery {
  period?: string | null
  compare?: string | null
  from?: string | null
  to?: string | null
  forceRefresh?: boolean
}

/**
 * Execute a full dashboard query using database data.
 */
export async function executeDashboardQuery(
  query: DashboardQuery,
): Promise<DashboardResponse> {
  // 1. Resolve period
  const periodType = parsePeriodType(query.period ?? null)
  const compareMode = parseCompareMode(query.compare ?? null)

  const period = resolvePeriod(
    periodType,
    compareMode,
    query.from || undefined,
    query.to || undefined,
  )

  // 2. Check cache (unless force refresh)
  if (!query.forceRefresh) {
    const cached = getCached(
      String(period.periodType),
      String(compareMode),
      period.current.from,
      period.current.to,
    )
    if (cached) {
      return { ...cached, cachedAt: new Date().toISOString() }
    }
  }

  // 3. Load data from DB for both periods
  const [currentData, compareData] = await Promise.all([
    loadNormalizedData(period.current.from, period.current.to),
    loadNormalizedData(period.compare.from, period.compare.to),
  ])

  // 4. Compute trends (current period)
  const { series: trends, byDate: trendByDate } = computeTrends(currentData)

  // 5. Compute network health
  const currentAgg = aggregateRows(currentData.sites)
  const previousAgg = aggregateRows(compareData.sites)
  const health = computeNetworkHealth(currentData, currentAgg, previousAgg)

  // 6. Load business targets from settings
  const targets = await loadTargets()

  // 7. Compute KPIs
  const kpis = computeKpis(currentData, compareData, trendByDate, health, targets)

  // 8. Compute bundles
  let bundles = computeBundles(currentData, compareData, targets)

  // Fill bundle metadata from DB
  const bundleMeta = await prisma.bundle.findMany({
    select: { id: true, name: true, slug: true, color: true },
  })
  const metaMap = new Map(bundleMeta.map(b => [b.id, b]))
  bundles = bundles.map(b => {
    const meta = metaMap.get(b.id)
    return meta ? { ...b, name: meta.name, slug: meta.slug, color: meta.color } : b
  })

  // 9. Compute signals and insights
  const signals = computeSignals(bundles, currentData, compareData, targets)
  const insights = computeInsights(bundles, currentData, compareData, targets)
  const warnings = computeWarnings(currentData, period.includesToday)

  // 10. Compute executive summary
  const executiveSummary = computeExecutiveSummary(bundles, health, kpis)

  // 11. Compute overall completeness
  const completeness = computeOverallCompleteness(currentData, compareData)

  // 12. Build response
  const response: DashboardResponse = {
    sourceStatus: currentData.sourceStatuses,
    completeness,
    executiveSummary,
    kpis,
    trends,
    bundles,
    signals,
    insights,
    warnings,
    period,
    cachedAt: null,
  }

  // 13. Cache
  setCache(
    period.periodType,
    compareMode,
    period.current.from,
    period.current.to,
    response,
  )

  return response
}

// ─── DB data loading ───

function toNum(val: Prisma.Decimal | number | null | undefined): number {
  if (val == null) return 0
  if (typeof val === 'number') return val
  return Number(val)
}

/**
 * Build NormalizedData from the database — the same dailyMetric table
 * that Bundles, Sites, Costs tabs all use.
 */
async function loadNormalizedData(from: string, to: string): Promise<NormalizedData> {
  const fromDate = new Date(from + 'T00:00:00.000Z')
  const toDate = new Date(to + 'T23:59:59.999Z')

  // Load daily metrics with site + bundle info
  const rows = await prisma.dailyMetric.findMany({
    where: {
      date: { gte: fromDate, lte: toDate },
      site: { isActive: true },
    },
    include: {
      site: {
        select: { id: true, name: true, domain: true, bundleId: true },
      },
    },
    orderBy: { date: 'asc' },
  })

  const dateRange = generateDateRange(from, to)

  // Build NormalizedSiteDay entries from DB rows
  const sites: NormalizedSiteDay[] = rows.map(row => ({
    siteId: row.siteId,
    siteName: row.site.name,
    bundleId: row.site.bundleId,
    date: format(row.date, 'yyyy-MM-dd'),
    visits: row.users > 0 ? row.users : null,
    adRevenue: toNum(row.adRevenue) > 0 ? toNum(row.adRevenue) : null,
    affiliateRevenue: toNum(row.affiliateRevenue) > 0 ? toNum(row.affiliateRevenue) : null,
    costs: toNum(row.costs) > 0 ? toNum(row.costs) : null,
    impressions: row.impressions > 0 ? row.impressions : null,
    clicks: row.clicks > 0 ? row.clicks : null,
    hits: row.hits > 0 ? row.hits : null,
    sourceCompleteness: {
      yandex: row.users > 0,
      adSpyglass: toNum(row.adRevenue) > 0 || row.impressions > 0,
      costs: toNum(row.costs) > 0,
      affiliate: toNum(row.affiliateRevenue) > 0,
    },
  }))

  // Build source statuses from latest sync logs
  const sourceStatuses = await buildSourceStatuses(fromDate, toDate, sites)

  return { sites, dateRange, sourceStatuses }
}

/**
 * Build source statuses from sync log entries.
 */
async function buildSourceStatuses(
  from: Date,
  to: Date,
  sites: NormalizedSiteDay[],
): Promise<Record<SourceName, SourceStatus>> {
  // Get latest successful sync per source
  const syncSources: Record<SourceName, string> = {
    yandex: 'yandex_metrica',
    adSpyglass: 'adspyglass',
    costs: 'google_sheets_costs',
    affiliate: 'google_sheets_affiliate',
  }

  const result = {} as Record<SourceName, SourceStatus>

  for (const [name, dbSource] of Object.entries(syncSources)) {
    const sourceName = name as SourceName
    const lastSync = await prisma.syncLog.findFirst({
      where: { source: dbSource },
      orderBy: { startedAt: 'desc' },
    })

    const lastSuccess = await prisma.syncLog.findFirst({
      where: { source: dbSource, status: 'completed' },
      orderBy: { startedAt: 'desc' },
    })

    // Check if we have data from this source
    const hasData = sites.some(s => s.sourceCompleteness[sourceName])

    let status: SourceStatus['status'] = 'fresh'
    let completeness: SourceStatus['completeness'] = 'complete'

    if (!lastSuccess) {
      status = 'failed'
      completeness = 'incomplete'
    } else if (!hasData) {
      status = 'partial'
      completeness = 'incomplete'
    } else {
      // Check freshness (stale if >24h since last successful sync)
      const hoursSince = lastSuccess.completedAt
        ? (Date.now() - lastSuccess.completedAt.getTime()) / 3600000
        : Infinity
      status = hoursSince > 24 ? 'stale' : 'fresh'

      const allHaveSource = sites.every(s => s.sourceCompleteness[sourceName])
      completeness = allHaveSource ? 'complete' : 'partial'
    }

    const notes: string[] = []
    if (lastSync?.status === 'failed' && lastSync.error) {
      notes.push(lastSync.error.slice(0, 200))
    }

    result[sourceName] = {
      source: sourceName,
      status,
      completeness,
      lastFetchedAt: lastSync?.startedAt?.toISOString() ?? null,
      lastSuccessfulAt: lastSuccess?.completedAt?.toISOString() ?? null,
      freshnessMinutes: lastSuccess?.completedAt
        ? Math.round((Date.now() - lastSuccess.completedAt.getTime()) / 60000)
        : null,
      notes,
    }
  }

  return result
}

// ─── Helpers ───

function computeOverallCompleteness(
  currentData: { sourceStatuses: Record<string, { completeness: CompletenessStatus }> },
  compareData: { sourceStatuses: Record<string, { completeness: CompletenessStatus }> },
): { currentPeriod: CompletenessStatus; comparePeriod: CompletenessStatus; overall: CompletenessStatus } {
  const currentStatuses = Object.values(currentData.sourceStatuses).map(s => s.completeness)
  const compareStatuses = Object.values(compareData.sourceStatuses).map(s => s.completeness)

  const currentPeriod = resolveStatusList(currentStatuses)
  const comparePeriod = resolveStatusList(compareStatuses)
  const overall = resolveStatusList([currentPeriod, comparePeriod])

  return { currentPeriod, comparePeriod, overall }
}

function resolveStatusList(statuses: CompletenessStatus[]): CompletenessStatus {
  if (statuses.every(s => s === 'complete')) return 'complete'
  if (statuses.some(s => s === 'incomplete')) return 'incomplete'
  return 'partial'
}

async function loadTargets(): Promise<BusinessTargets> {
  try {
    const setting = await prisma.setting.findUnique({
      where: { key: 'dashboard_targets' },
    })
    if (setting?.value && typeof setting.value === 'object') {
      return { ...DEFAULT_TARGETS, ...(setting.value as Partial<BusinessTargets>) }
    }
  } catch {
    // Settings not available — use defaults
  }
  return DEFAULT_TARGETS
}
