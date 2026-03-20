/**
 * DashboardQueryOrchestrator
 *
 * Single data path: reads from dailyMetric DB (same as bundles/sites/forecast).
 * Sync workers write data → all pages read from the same DB.
 *
 * Flow:
 * 1. Resolve period
 * 2. Check cache
 * 3. Read from DB (via normalizer)
 * 4. Compute KPIs, trends, bundles, health, signals, insights
 * 5. Cache & return
 */

import { prisma } from '@/lib/db'
import {
  resolvePeriod,
  parsePeriodType,
  parseCompareMode,
} from './period-resolver'
import { normalize } from './normalizer'
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
 * Execute a full dashboard query.
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

  // 3. Read from DB — same dailyMetric table that bundles/sites/forecast use
  const [currentData, compareData] = await Promise.all([
    normalize(period.current.from, period.current.to),
    normalize(period.compare.from, period.compare.to),
  ])

  // 4. Compute trends (current + comparison overlay)
  const { series: trends, byDate: trendByDate } = computeTrends(currentData)
  const { series: compareTrendsSeries } = computeTrends(compareData)

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

  // 10. Executive summary
  const executiveSummary = computeExecutiveSummary(bundles, health, kpis)

  // 11. Completeness
  const completeness = computeOverallCompleteness(currentData, compareData)

  // 12. Build response
  // Build compare trends — align to current period length for chart overlay
  const compareTrends = (() => {
    const cur = trends.revenue.length
    const cmp = compareTrendsSeries.revenue.length
    if (cmp === 0 || cur === 0) return undefined
    // If compare period has different length, take last N points matching current length
    const slice = (arr: typeof trends.revenue) =>
      arr.length > cur ? arr.slice(arr.length - cur) : arr.length < cur
        ? [...Array.from({ length: cur - arr.length }, (_, i) => ({ date: '', value: null as number | null, completeness: 'incomplete' as const })), ...arr]
        : arr
    return {
      revenue: slice(compareTrendsSeries.revenue),
      traffic: slice(compareTrendsSeries.traffic),
      profit: slice(compareTrendsSeries.profit),
    }
  })()

  const response: DashboardResponse = {
    sourceStatus: currentData.sourceStatuses,
    completeness,
    executiveSummary,
    kpis,
    trends,
    compareTrends,
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
