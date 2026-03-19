/**
 * DashboardQueryOrchestrator
 *
 * Main entry point for Dashboard query assembly.
 * Implements the full live query flow from spec §9:
 *
 * 1. Parse request → resolve period
 * 2. Check cache
 * 3. Fetch all sources in parallel
 * 4. Normalize & merge
 * 5. Compute metrics, health, signals, insights
 * 6. Cache result
 * 7. Return response
 */

import { prisma } from '@/lib/db'
import {
  resolvePeriod,
  parsePeriodType,
  parseCompareMode,
} from './period-resolver'
import {
  fetchTrafficPayload,
  fetchMonetizationPayload,
  fetchCostsPayload,
  fetchAffiliatePayload,
} from './adapters'
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
  PeriodType,
  CompareMode,
  CompletenessStatus,
  BusinessTargets,
  TrafficPayload,
  MonetizationPayload,
  CostsPayload,
  AffiliatePayload,
} from './types'
import { DEFAULT_TARGETS } from './types'

/** Per-source fetch timeout (ms). Prevents one slow API from blocking all. */
const SOURCE_TIMEOUT_MS = 15_000

/** Total orchestrator timeout (ms). Safety net for the entire query. */
const QUERY_TIMEOUT_MS = 30_000

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

  // 3. Fetch all sources in parallel (with per-source timeouts)
  const [traffic, monetization, costs, affiliate] = await Promise.all([
    withTimeout(fetchTrafficPayload(period.current.from, period.current.to), SOURCE_TIMEOUT_MS, emptyTraffic('timeout')),
    withTimeout(fetchMonetizationPayload(period.current.from, period.current.to), SOURCE_TIMEOUT_MS, emptyMonetization('timeout')),
    withTimeout(fetchCostsPayload(period.current.from, period.current.to), SOURCE_TIMEOUT_MS, emptyCosts('timeout')),
    withTimeout(fetchAffiliatePayload(period.current.from, period.current.to), SOURCE_TIMEOUT_MS, emptyAffiliate('timeout')),
  ])

  // Also fetch compare period in parallel
  const [compareTraffic, compareMonetization, compareCosts, compareAffiliate] = await Promise.all([
    withTimeout(fetchTrafficPayload(period.compare.from, period.compare.to), SOURCE_TIMEOUT_MS, emptyTraffic('timeout')),
    withTimeout(fetchMonetizationPayload(period.compare.from, period.compare.to), SOURCE_TIMEOUT_MS, emptyMonetization('timeout')),
    withTimeout(fetchCostsPayload(period.compare.from, period.compare.to), SOURCE_TIMEOUT_MS, emptyCosts('timeout')),
    withTimeout(fetchAffiliatePayload(period.compare.from, period.compare.to), SOURCE_TIMEOUT_MS, emptyAffiliate('timeout')),
  ])

  // 4. Normalize current and compare data
  const [currentData, compareData] = await Promise.all([
    normalize(traffic, monetization, costs, affiliate, period.current.from, period.current.to),
    normalize(compareTraffic, compareMonetization, compareCosts, compareAffiliate, period.compare.from, period.compare.to),
  ])

  // 5. Compute trends (current period)
  const { series: trends, byDate: trendByDate } = computeTrends(currentData)

  // 6. Compute network health
  const currentAgg = aggregateRows(currentData.sites)
  const previousAgg = aggregateRows(compareData.sites)
  const health = computeNetworkHealth(currentData, currentAgg, previousAgg)

  // 7. Load business targets from settings
  const targets = await loadTargets()

  // 8. Compute KPIs
  const kpis = computeKpis(currentData, compareData, trendByDate, health, targets)

  // 9. Compute bundles
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

  // 10. Compute signals and insights
  const signals = computeSignals(bundles, currentData, compareData, targets)
  const insights = computeInsights(bundles, currentData, compareData, targets)
  const warnings = computeWarnings(currentData, period.includesToday)

  // 11. Compute executive summary
  const executiveSummary = computeExecutiveSummary(bundles, health, kpis)

  // 12. Compute overall completeness
  const completeness = computeOverallCompleteness(currentData, compareData)

  // 13. Build response
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

  // 14. Cache
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

/**
 * Race a promise against a timeout. Returns fallback on timeout instead of throwing.
 */
async function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  let timer: ReturnType<typeof setTimeout>
  const timeout = new Promise<T>((resolve) => {
    timer = setTimeout(() => resolve(fallback), ms)
  })
  try {
    return await Promise.race([promise, timeout])
  } finally {
    clearTimeout(timer!)
  }
}

function makeFailedStatus(source: import('./types').SourceName, reason: string): import('./types').SourceStatus {
  return {
    source,
    status: 'failed',
    completeness: 'incomplete',
    lastFetchedAt: new Date().toISOString(),
    lastSuccessfulAt: null,
    freshnessMinutes: null,
    notes: [`Source ${reason}: request timed out after ${SOURCE_TIMEOUT_MS / 1000}s`],
  }
}

function emptyTraffic(reason: string): TrafficPayload {
  return { source: makeFailedStatus('yandex', reason), visitsBySite: new Map(), totalVisitsByDate: new Map() }
}
function emptyMonetization(reason: string): MonetizationPayload {
  return {
    source: makeFailedStatus('adSpyglass', reason),
    revenueBySite: new Map(), impressionsBySite: new Map(), clicksBySite: new Map(), hitsBySite: new Map(), totalByDate: new Map(),
  }
}
function emptyCosts(reason: string): CostsPayload {
  return { source: makeFailedStatus('costs', reason), costsBySite: new Map(), totalByDate: new Map(), unmatchedRows: 0, mappingIssues: [] }
}
function emptyAffiliate(reason: string): AffiliatePayload {
  return { source: makeFailedStatus('affiliate', reason), revenueBySite: new Map(), totalByDate: new Map(), unmatchedRows: 0, mappingIssues: [] }
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
