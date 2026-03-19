/**
 * DashboardMetricsEngine
 *
 * Computes all derived metrics, executive metrics, KPI hierarchy,
 * health scores, target evaluations, bundle summaries, and trends.
 */

import type {
  NormalizedData,
  NormalizedSiteDay,
  DashboardKpi,
  DashboardBundle,
  TrendSeries,
  TrendPoint,
  TrendMeta,
  ExecutiveSummary,
  HealthScore,
  CompletenessStatus,
  SourceName,
  BusinessTargets,
  TargetEvaluation,
  DEFAULT_TARGETS,
} from './types'
import { DEFAULT_TARGETS as DEFAULTS } from './types'

// ─── Aggregation helpers ───

interface AggregatedPeriod {
  visits: number | null
  adRevenue: number | null
  affiliateRevenue: number | null
  totalRevenue: number | null
  costs: number | null
  profit: number | null
  romi: number | null
  rpm: number | null
  impressions: number | null
  clicks: number | null
  hits: number | null
  ctr: number | null
  fillRate: number | null
  ecpm: number | null
}

function aggregateRows(rows: NormalizedSiteDay[]): AggregatedPeriod {
  let visits = 0, hasVisits = false
  let adRevenue = 0, hasAdRevenue = false
  let affiliateRevenue = 0, hasAffiliate = false
  let costs = 0, hasCosts = false
  let impressions = 0, hasImpressions = false
  let clicks = 0, hasClicks = false
  let hits = 0, hasHits = false

  for (const r of rows) {
    if (r.visits != null) { visits += r.visits; hasVisits = true }
    if (r.adRevenue != null) { adRevenue += r.adRevenue; hasAdRevenue = true }
    if (r.affiliateRevenue != null) { affiliateRevenue += r.affiliateRevenue; hasAffiliate = true }
    if (r.costs != null) { costs += r.costs; hasCosts = true }
    if (r.impressions != null) { impressions += r.impressions; hasImpressions = true }
    if (r.clicks != null) { clicks += r.clicks; hasClicks = true }
    if (r.hits != null) { hits += r.hits; hasHits = true }
  }

  const totalRevenue = (hasAdRevenue || hasAffiliate)
    ? (hasAdRevenue ? adRevenue : 0) + (hasAffiliate ? affiliateRevenue : 0)
    : null
  const profit = (totalRevenue != null && hasCosts) ? totalRevenue - costs : null
  const romi = (totalRevenue != null && hasCosts && costs > 0)
    ? ((totalRevenue - costs) / costs) * 100
    : null
  const rpm = (totalRevenue != null && hasVisits && visits > 0)
    ? (totalRevenue / visits) * 1000
    : null
  const ctr = (hasImpressions && impressions > 0 && hasClicks)
    ? (clicks / impressions) * 100
    : null
  const fillRate = (hasHits && hits > 0 && hasImpressions)
    ? (impressions / hits) * 100
    : null
  const ecpm = (hasImpressions && impressions > 0 && hasAdRevenue)
    ? (adRevenue / impressions) * 1000
    : null

  return {
    visits: hasVisits ? visits : null,
    adRevenue: hasAdRevenue ? adRevenue : null,
    affiliateRevenue: hasAffiliate ? affiliateRevenue : null,
    totalRevenue,
    costs: hasCosts ? costs : null,
    profit,
    romi,
    rpm,
    impressions: hasImpressions ? impressions : null,
    clicks: hasClicks ? clicks : null,
    hits: hasHits ? hits : null,
    ctr,
    fillRate,
    ecpm,
  }
}

// ─── Completeness ───

function metricCompleteness(
  data: NormalizedData,
  requiredSources: SourceName[],
): CompletenessStatus {
  const statuses = requiredSources.map(s => data.sourceStatuses[s].completeness)
  if (statuses.every(s => s === 'complete')) return 'complete'
  if (statuses.some(s => s === 'incomplete')) return 'incomplete'
  return 'partial'
}

// ─── Delta ───

function calcDelta(current: number | null, previous: number | null): number | null {
  if (current == null || previous == null) return null
  if (previous === 0) return current > 0 ? 100 : 0
  return ((current - previous) / Math.abs(previous)) * 100
}

// ─── Target evaluation ───

function evaluateTarget(
  key: string,
  value: number | null,
  delta: number | null,
  targets: BusinessTargets,
): TargetEvaluation {
  if (value == null) return 'notEvaluated'

  switch (key) {
    case 'romi':
      if (value >= targets.targetRomi) return 'aboveTarget'
      if (value >= targets.targetRomi * 0.8) return 'nearThreshold'
      return 'belowTarget'
    case 'profit':
      if (value >= targets.minimumProfit) return 'aboveTarget'
      if (value >= targets.minimumProfit * 0.5) return 'nearThreshold'
      return 'belowTarget'
    case 'totalRevenue':
      if (delta != null && delta < targets.revenueDropThreshold) return 'belowTarget'
      if (delta != null && delta < targets.revenueDropThreshold * 0.5) return 'nearThreshold'
      return 'aboveTarget'
    case 'costs':
      if (delta != null && delta > targets.costGrowthThreshold) return 'belowTarget'
      if (delta != null && delta > targets.costGrowthThreshold * 0.7) return 'nearThreshold'
      return 'aboveTarget'
    default:
      return 'notEvaluated'
  }
}

// ─── KPI hierarchy ───

const KPI_DEFS: Array<{
  key: string
  label: string
  tier: DashboardKpi['tier']
  format: DashboardKpi['format']
  sources: SourceName[]
  extract: (a: AggregatedPeriod) => number | null
}> = [
  { key: 'visits', label: 'Visits', tier: 'primary', format: 'number', sources: ['yandex'], extract: a => a.visits },
  { key: 'totalRevenue', label: 'Total Revenue', tier: 'primary', format: 'currency', sources: ['adSpyglass', 'affiliate'], extract: a => a.totalRevenue },
  { key: 'profit', label: 'Profit', tier: 'primary', format: 'currency', sources: ['adSpyglass', 'affiliate', 'costs'], extract: a => a.profit },
  { key: 'romi', label: 'ROMI', tier: 'primary', format: 'percent', sources: ['adSpyglass', 'affiliate', 'costs'], extract: a => a.romi },
  { key: 'networkHealth', label: 'Network Health', tier: 'primary', format: 'score', sources: ['yandex', 'adSpyglass', 'affiliate', 'costs'], extract: _ => null }, // computed separately
  { key: 'adRevenue', label: 'Ad Revenue', tier: 'secondary', format: 'currency', sources: ['adSpyglass'], extract: a => a.adRevenue },
  { key: 'affiliateRevenue', label: 'Affiliate Revenue', tier: 'secondary', format: 'currency', sources: ['affiliate'], extract: a => a.affiliateRevenue },
  { key: 'costs', label: 'Costs', tier: 'secondary', format: 'currency', sources: ['costs'], extract: a => a.costs },
  { key: 'rpm', label: 'Revenue per 1000 Visits', tier: 'secondary', format: 'currency', sources: ['yandex', 'adSpyglass', 'affiliate'], extract: a => a.rpm },
  { key: 'ctr', label: 'CTR', tier: 'supporting', format: 'percent', sources: ['adSpyglass'], extract: a => a.ctr },
  { key: 'fillRate', label: 'Fill Rate', tier: 'supporting', format: 'percent', sources: ['adSpyglass'], extract: a => a.fillRate },
  { key: 'ecpm', label: 'eCPM', tier: 'supporting', format: 'currency', sources: ['adSpyglass'], extract: a => a.ecpm },
  { key: 'hits', label: 'Ad Requests', tier: 'supporting', format: 'number', sources: ['adSpyglass'], extract: a => a.hits },
]

// ─── Public API ───

export function computeKpis(
  currentData: NormalizedData,
  compareData: NormalizedData,
  trendByDate: Map<string, AggregatedPeriod>,
  health: HealthScore | null,
  targets: BusinessTargets = DEFAULTS,
): DashboardKpi[] {
  const current = aggregateRows(currentData.sites)
  const previous = aggregateRows(compareData.sites)

  return KPI_DEFS.map(def => {
    let value = def.extract(current)
    let previousValue = def.extract(previous)

    // Special case: networkHealth is computed externally
    if (def.key === 'networkHealth' && health) {
      value = health.value
      previousValue = null
    }

    const delta = calcDelta(value, previousValue)

    // Build trend array from daily data
    const trend: number[] = []
    if (def.key !== 'networkHealth') {
      const sortedDates = [...trendByDate.keys()].sort()
      for (const date of sortedDates) {
        const dayAgg = trendByDate.get(date)!
        const v = def.extract(dayAgg)
        trend.push(v ?? 0)
      }
    }

    return {
      key: def.key,
      label: def.label,
      value,
      previousValue,
      delta,
      format: def.format,
      tier: def.tier,
      trend,
      completeness: metricCompleteness(currentData, def.sources),
      requiredSources: def.sources,
      targetEvaluation: evaluateTarget(def.key, value, delta, targets),
    }
  })
}

export function computeTrends(
  data: NormalizedData,
): { series: TrendSeries; byDate: Map<string, AggregatedPeriod> } {
  const byDate = new Map<string, AggregatedPeriod>()
  const sortedDates = [...data.dateRange].sort()

  for (const date of sortedDates) {
    const dayRows = data.sites.filter(s => s.date === date)
    byDate.set(date, aggregateRows(dayRows))
  }

  const revenue: TrendPoint[] = []
  const traffic: TrendPoint[] = []
  const profit: TrendPoint[] = []
  const costs: TrendPoint[] = []
  const adRevenue: TrendPoint[] = []
  const affiliateRevenue: TrendPoint[] = []

  for (const date of sortedDates) {
    const agg = byDate.get(date)!
    revenue.push({
      date,
      value: agg.totalRevenue,
      completeness: (agg.adRevenue != null || agg.affiliateRevenue != null) ? 'complete' : 'incomplete',
    })
    traffic.push({
      date,
      value: agg.visits,
      completeness: agg.visits != null ? 'complete' : 'incomplete',
    })
    profit.push({
      date,
      value: agg.profit,
      completeness: agg.profit != null ? 'complete' : 'incomplete',
    })
    costs.push({
      date,
      value: agg.costs,
      completeness: agg.costs != null ? 'complete' : 'incomplete',
    })
    adRevenue.push({
      date,
      value: agg.adRevenue,
      completeness: agg.adRevenue != null ? 'complete' : 'incomplete',
    })
    affiliateRevenue.push({
      date,
      value: agg.affiliateRevenue,
      completeness: agg.affiliateRevenue != null ? 'complete' : 'incomplete',
    })
  }

  return {
    series: { revenue, traffic, profit, costs, adRevenue, affiliateRevenue },
    byDate,
  }
}

export function computeBundles(
  currentData: NormalizedData,
  compareData: NormalizedData,
  targets: BusinessTargets = DEFAULTS,
): DashboardBundle[] {
  // Group by bundleId
  const bundleIds = new Set(currentData.sites.map(s => s.bundleId))
  const bundleMap = new Map<string, { name: string; slug: string; color: string | null }>()

  // We need bundle metadata from DB — but we already have sites with bundleId.
  // We'll collect unique bundle names from site data and fill in from prisma later.
  // For now, use a simplified approach.

  const results: DashboardBundle[] = []

  for (const bundleId of bundleIds) {
    const currentRows = currentData.sites.filter(s => s.bundleId === bundleId)
    const compareRows = compareData.sites.filter(s => s.bundleId === bundleId)

    const current = aggregateRows(currentRows)
    const previous = aggregateRows(compareRows)

    const delta = calcDelta(current.totalRevenue, previous.totalRevenue)

    // Health for bundle
    const health = computeBundleHealth(current, previous)

    // Momentum
    const momentum = computeMomentum(current, previous)

    // Risk level
    const riskLevel = computeRiskLevel(current, delta, targets)

    // Count unique sites
    const siteIds = new Set(currentRows.map(r => r.siteId))

    results.push({
      id: bundleId,
      name: '', // filled by orchestrator
      slug: '', // filled by orchestrator
      color: null, // filled by orchestrator
      sitesCount: siteIds.size,
      visits: current.visits,
      adRevenue: current.adRevenue,
      affiliateRevenue: current.affiliateRevenue,
      totalRevenue: current.totalRevenue,
      costs: current.costs,
      profit: current.profit,
      romi: current.romi,
      rpm: current.rpm,
      delta,
      health: health?.value ?? null,
      healthStatus: health?.status ?? null,
      momentum,
      riskLevel,
      completeness: overallCompleteness(currentData),
    })
  }

  return results.sort((a, b) => (b.totalRevenue ?? 0) - (a.totalRevenue ?? 0))
}

export function computeExecutiveSummary(
  bundles: DashboardBundle[],
  health: HealthScore | null,
  kpis: DashboardKpi[],
): ExecutiveSummary {
  const sorted = [...bundles].sort((a, b) => (b.totalRevenue ?? 0) - (a.totalRevenue ?? 0))
  const strongest = sorted[0]?.name || null
  const weakest = sorted.length > 1 ? sorted[sorted.length - 1].name : null

  // Top risk: bundle with worst delta
  const byDelta = [...bundles].sort((a, b) => (a.delta ?? 0) - (b.delta ?? 0))
  const topRisk = byDelta[0]?.delta != null && byDelta[0].delta < -10
    ? `${byDelta[0].name}: revenue ${byDelta[0].delta.toFixed(1)}%`
    : null

  // Top opportunity: bundle with best positive momentum
  const topOpp = byDelta.length > 0 && byDelta[byDelta.length - 1].delta != null && byDelta[byDelta.length - 1].delta! > 10
    ? `${byDelta[byDelta.length - 1].name}: revenue +${byDelta[byDelta.length - 1].delta!.toFixed(1)}%`
    : null

  return {
    networkHealth: health?.value ?? null,
    networkHealthStatus: health?.status ?? null,
    networkHealthConfidence: health?.confidence ?? null,
    topRisk,
    topOpportunity: topOpp,
    strongestBundle: strongest,
    weakestBundle: weakest,
  }
}

export function computeNetworkHealth(
  data: NormalizedData,
  current: AggregatedPeriod,
  previous: AggregatedPeriod,
): HealthScore {
  const components = {
    profitQuality: scoreProfitQuality(current),
    romiQuality: scoreRomiQuality(current),
    revenueTrend: scoreRevenueTrend(current, previous),
    costPressure: scoreCostPressure(current),
    trafficStability: 70, // simplified — would need daily variance
    monetizationQuality: scoreMonetizationQuality(current),
    anomalyPressure: 80, // simplified
    completenessConfidence: scoreCompleteness(data),
  }

  const weights = {
    profitQuality: 0.20,
    romiQuality: 0.15,
    revenueTrend: 0.15,
    costPressure: 0.10,
    trafficStability: 0.10,
    monetizationQuality: 0.10,
    anomalyPressure: 0.10,
    completenessConfidence: 0.10,
  }

  let score = 0
  for (const [key, weight] of Object.entries(weights)) {
    score += (components[key as keyof typeof components] ?? 50) * weight
  }
  score = Math.round(score)

  const status = score >= 80 ? 'healthy' as const : score >= 60 ? 'warning' as const : 'critical' as const

  // Confidence based on source completeness
  const failedSources = Object.values(data.sourceStatuses).filter(s => s.status === 'failed').length
  const confidence = failedSources === 0 ? 'high' as const
    : failedSources <= 1 ? 'medium' as const
    : 'low' as const

  return { value: score, status, confidence, components }
}

// ─── Component score helpers ───

function scoreProfitQuality(a: AggregatedPeriod): number {
  if (a.profit == null || a.totalRevenue == null) return 50
  if (a.profit <= 0) return 20
  const margin = a.totalRevenue > 0 ? a.profit / a.totalRevenue : 0
  return Math.min(100, Math.max(0, 60 + margin * 100))
}

function scoreRomiQuality(a: AggregatedPeriod): number {
  if (a.romi == null) return 50
  if (a.romi >= 200) return 100
  if (a.romi >= 150) return 80
  if (a.romi >= 100) return 60
  return Math.max(0, a.romi * 0.5)
}

function scoreRevenueTrend(current: AggregatedPeriod, previous: AggregatedPeriod): number {
  if (current.totalRevenue == null || previous.totalRevenue == null) return 50
  if (previous.totalRevenue === 0) return current.totalRevenue > 0 ? 80 : 50
  const change = (current.totalRevenue - previous.totalRevenue) / previous.totalRevenue
  return Math.min(100, Math.max(0, 50 + change * 200))
}

function scoreCostPressure(a: AggregatedPeriod): number {
  if (a.costs == null || a.totalRevenue == null) return 70
  if (a.totalRevenue === 0) return a.costs > 0 ? 20 : 70
  const ratio = a.costs / a.totalRevenue
  return Math.min(100, Math.max(0, 100 - ratio * 100))
}

function scoreMonetizationQuality(a: AggregatedPeriod): number {
  let score = 50
  if (a.fillRate != null && a.fillRate > 50) score += 20
  if (a.ctr != null && a.ctr > 1) score += 15
  if (a.ecpm != null && a.ecpm > 1) score += 15
  return Math.min(100, score)
}

function scoreCompleteness(data: NormalizedData): number {
  const statuses = Object.values(data.sourceStatuses)
  const complete = statuses.filter(s => s.completeness === 'complete').length
  return Math.round((complete / statuses.length) * 100)
}

function computeBundleHealth(
  current: AggregatedPeriod,
  previous: AggregatedPeriod,
): { value: number; status: 'healthy' | 'warning' | 'critical' } | null {
  if (current.totalRevenue == null) return null
  const profitScore = scoreProfitQuality(current)
  const romiScore = scoreRomiQuality(current)
  const trendScore = scoreRevenueTrend(current, previous)
  const value = Math.round(profitScore * 0.4 + romiScore * 0.3 + trendScore * 0.3)
  const status = value >= 80 ? 'healthy' as const : value >= 60 ? 'warning' as const : 'critical' as const
  return { value, status }
}

function computeMomentum(
  current: AggregatedPeriod,
  previous: AggregatedPeriod,
): 'accelerating' | 'stable' | 'decelerating' | null {
  const delta = calcDelta(current.totalRevenue, previous.totalRevenue)
  if (delta == null) return null
  if (delta > 10) return 'accelerating'
  if (delta < -10) return 'decelerating'
  return 'stable'
}

function computeRiskLevel(
  current: AggregatedPeriod,
  delta: number | null,
  targets: BusinessTargets,
): 'low' | 'medium' | 'high' | null {
  if (current.totalRevenue == null) return null
  let riskScore = 0
  if (current.profit != null && current.profit < targets.minimumProfit) riskScore += 2
  if (current.romi != null && current.romi < targets.targetRomi * 0.7) riskScore += 2
  if (delta != null && delta < targets.revenueDropThreshold) riskScore += 1
  if (riskScore >= 3) return 'high'
  if (riskScore >= 1) return 'medium'
  return 'low'
}

function overallCompleteness(data: NormalizedData): CompletenessStatus {
  const statuses = Object.values(data.sourceStatuses).map(s => s.completeness)
  if (statuses.every(s => s === 'complete')) return 'complete'
  if (statuses.some(s => s === 'incomplete')) return 'incomplete'
  return 'partial'
}

// Re-export for orchestrator use
export { aggregateRows, type AggregatedPeriod }
