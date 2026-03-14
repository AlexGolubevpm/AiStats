export type Period = 'today' | 'yesterday' | '7d' | '30d' | 'custom'

export type BundleName = 'Gays' | 'Trans' | 'JAV' | 'Hentai'

export type HealthStatus = 'healthy' | 'warning' | 'critical'

export type AdFormatType = 'POP' | 'PUSH' | 'BANNER' | 'SLIDER' | 'OUTSTREAM' | 'VAST' | 'OTHER'

export type GeoTierType = 'TIER_1' | 'TIER_2' | 'TIER_3' | 'TIER_4'

export type AnomalySeverity = 'low' | 'medium' | 'high' | 'critical'

export interface KPIData {
  label: string
  value: number
  previousValue?: number
  delta?: number
  format: 'currency' | 'number' | 'percent' | 'score'
  trend?: number[]
}

export interface DateRange {
  from: Date
  to: Date
}

export interface BundleOverview {
  id: string
  name: string
  slug: string
  color: string
  sitesCount: number
  traffic: number
  adRevenue: number
  affiliateRevenue: number
  totalRevenue: number
  costs: number
  profit: number
  romi: number
  rpm: number
  healthScore: number
  healthStatus: HealthStatus
  delta: number
  bestSite?: string
  worstSite?: string
  bestFormat?: string
  worstFormat?: string
}

export interface SiteOverview {
  id: string
  name: string
  slug: string
  domain: string
  bundleName: string
  bundleId: string
  healthScore: number
  healthStatus: HealthStatus
  traffic: number
  adRevenue: number
  affiliateRevenue: number
  totalRevenue: number
  costs: number
  profit: number
  romi: number
  rpm: number
  trend: number[]
  alertsCount: number
  delta: number
}

export interface InsightData {
  entity: string
  entityType: 'site' | 'bundle' | 'format' | 'tier'
  metric: string
  value: number
  delta: number
  reason: string
  action: string
  severity: AnomalySeverity
}

export interface ForecastParams {
  trafficChange: number
  costChange: number
  rpmChange: number
  affiliateChange: number
}

export interface ForecastResult {
  projectedAdRevenue: number
  projectedAffiliateRevenue: number
  projectedTotalRevenue: number
  projectedCosts: number
  projectedProfit: number
  projectedRomi: number
}
