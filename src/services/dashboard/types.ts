/**
 * Federated Dashboard Types
 *
 * Defines the complete type system for the reactive federated analytics architecture.
 * All dashboard data flows through these types.
 */

// ─── Completeness & Freshness ───

export type SourceName = 'yandex' | 'adSpyglass' | 'costs' | 'affiliate'

export type FreshnessStatus = 'fresh' | 'partial' | 'stale' | 'failed'

export type CompletenessStatus = 'complete' | 'partial' | 'incomplete'

export interface SourceStatus {
  source: SourceName
  status: FreshnessStatus
  completeness: CompletenessStatus
  lastFetchedAt: string | null
  lastSuccessfulAt: string | null
  freshnessMinutes: number | null
  notes: string[]
}

export interface ResponseCompleteness {
  currentPeriod: CompletenessStatus
  comparePeriod: CompletenessStatus
  overall: CompletenessStatus
}

// ─── Period ───

export type PeriodType = 'today' | 'yesterday' | '7d' | '30d' | 'custom'

export type CompareMode = 'prev_period' | 'prev_7d' | 'prev_day'

export interface ResolvedPeriod {
  current: { from: string; to: string }
  compare: { from: string; to: string }
  includesToday: boolean
  periodDays: number
  periodType: PeriodType
}

// ─── KPI ───

export type KpiTier = 'primary' | 'secondary' | 'supporting'

export type TargetEvaluation = 'aboveTarget' | 'belowTarget' | 'nearThreshold' | 'notEvaluated'

export interface DashboardKpi {
  key: string
  label: string
  value: number | null
  previousValue: number | null
  delta: number | null
  format: 'number' | 'currency' | 'percent' | 'score'
  tier: KpiTier
  trend: number[]
  completeness: CompletenessStatus
  requiredSources: SourceName[]
  targetEvaluation: TargetEvaluation
}

// ─── Trends ───

export interface TrendPoint {
  date: string
  value: number | null
  completeness: CompletenessStatus
}

export interface TrendSeries {
  revenue: TrendPoint[]
  traffic: TrendPoint[]
  profit: TrendPoint[]
  costs: TrendPoint[]
  adRevenue: TrendPoint[]
  affiliateRevenue: TrendPoint[]
}

export interface TrendMeta {
  direction: 'up' | 'down' | 'flat'
  delta: number | null
  completeness: CompletenessStatus
  volatility?: 'stable' | 'moderate' | 'volatile'
}

// ─── Bundles ───

export interface DashboardBundle {
  id: string
  name: string
  slug: string
  color: string | null
  sitesCount: number
  visits: number | null
  adRevenue: number | null
  affiliateRevenue: number | null
  totalRevenue: number | null
  costs: number | null
  profit: number | null
  romi: number | null
  rpm: number | null
  delta: number | null
  health: number | null
  healthStatus: 'healthy' | 'warning' | 'critical' | null
  momentum: 'accelerating' | 'stable' | 'decelerating' | null
  riskLevel: 'low' | 'medium' | 'high' | null
  completeness: CompletenessStatus
}

// ─── Signals & Insights ───

export interface DashboardSignal {
  type: 'winner' | 'drop' | 'risk' | 'recovery'
  entityType: 'network' | 'bundle' | 'site'
  entityName: string
  metric: string
  value: number | null
  delta: number | null
  reason: string
  actionHint: string
  completeness: CompletenessStatus
}

export interface DashboardInsight {
  type: 'winner' | 'loser' | 'risk' | 'opportunity'
  entityType: 'network' | 'bundle' | 'site'
  entityName: string
  metric: string
  value: number | null
  delta: number | null
  reason: string
  action: string
  severity: 'info' | 'warning' | 'critical'
  completeness: CompletenessStatus
}

// ─── Executive Summary ───

export interface ExecutiveSummary {
  networkHealth: number | null
  networkHealthStatus: 'healthy' | 'warning' | 'critical' | null
  networkHealthConfidence: 'high' | 'medium' | 'low' | null
  topRisk: string | null
  topOpportunity: string | null
  strongestBundle: string | null
  weakestBundle: string | null
}

// ─── Health ───

export interface HealthScore {
  value: number
  status: 'healthy' | 'warning' | 'critical'
  confidence: 'high' | 'medium' | 'low'
  components: {
    profitQuality: number
    romiQuality: number
    revenueTrend: number
    costPressure: number
    trafficStability: number
    monetizationQuality: number
    anomalyPressure: number
    completenessConfidence: number
  }
}

// ─── Targets ───

export interface BusinessTargets {
  targetRomi: number
  minimumProfit: number
  revenueDropThreshold: number
  costGrowthThreshold: number
  healthAlertThreshold: number
}

export const DEFAULT_TARGETS: BusinessTargets = {
  targetRomi: 150,
  minimumProfit: 0,
  revenueDropThreshold: -15,
  costGrowthThreshold: 25,
  healthAlertThreshold: 60,
}

// ─── Source Adapter Payloads ───

export interface TrafficPayload {
  source: SourceStatus
  visitsBySite: Map<string, Map<string, number>> // siteKey → date → visits
  totalVisitsByDate: Map<string, number>          // date → visits
}

export interface MonetizationPayload {
  source: SourceStatus
  revenueBySite: Map<string, Map<string, number>>  // siteKey → date → revenue
  impressionsBySite: Map<string, Map<string, number>>
  clicksBySite: Map<string, Map<string, number>>
  hitsBySite: Map<string, Map<string, number>>
  totalByDate: Map<string, {
    revenue: number
    impressions: number
    clicks: number
    hits: number
    ctr: number
    fillRate: number
    ecpm: number
  }>
}

export interface CostsPayload {
  source: SourceStatus
  costsBySite: Map<string, Map<string, number>> // siteKey → date → cost
  totalByDate: Map<string, number>
  unmatchedRows: number
  mappingIssues: string[]
}

export interface AffiliatePayload {
  source: SourceStatus
  revenueBySite: Map<string, Map<string, number>> // siteKey → date → revenue
  totalByDate: Map<string, number>
  unmatchedRows: number
  mappingIssues: string[]
}

// ─── Normalized Data ───

export interface NormalizedSiteDay {
  siteId: string
  siteName: string
  bundleId: string
  date: string
  visits: number | null
  adRevenue: number | null
  affiliateRevenue: number | null
  costs: number | null
  impressions: number | null
  clicks: number | null
  hits: number | null
  sourceCompleteness: {
    yandex: boolean
    adSpyglass: boolean
    costs: boolean
    affiliate: boolean
  }
}

export interface NormalizedData {
  sites: NormalizedSiteDay[]
  dateRange: string[]
  sourceStatuses: Record<SourceName, SourceStatus>
}

// ─── Cache ───

export interface CacheEntry {
  querySignature: string
  response: DashboardResponse
  createdAt: string
  expiresAt: string
  sourceSnapshot: Record<SourceName, SourceStatus>
}

// ─── Final Response ───

export interface DashboardResponse {
  sourceStatus: Record<SourceName, SourceStatus>
  completeness: ResponseCompleteness
  executiveSummary: ExecutiveSummary
  kpis: DashboardKpi[]
  trends: TrendSeries
  bundles: DashboardBundle[]
  signals: DashboardSignal[]
  insights: DashboardInsight[]
  warnings: string[]
  period: ResolvedPeriod
  cachedAt: string | null
}
