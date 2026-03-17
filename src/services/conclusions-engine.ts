import { prisma } from '@/lib/db'
import {
  aggregateNetworkMetrics,
  aggregateBundleMetrics,
  aggregateSiteMetrics,
  getPreviousDateRange,
  calculateDelta,
} from '@/services/metrics'

// ─── TYPES ───

export interface ConclusionItem {
  entity: string
  entityType: 'network' | 'bundle' | 'site'
  metric: string
  value: number
  delta: number
  reason: string
  action: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  type: 'winner' | 'loser' | 'risk' | 'opportunity'
}

export interface Conclusions {
  winners: ConclusionItem[]
  losers: ConclusionItem[]
  risks: ConclusionItem[]
  opportunities: ConclusionItem[]
}

// ─── HELPERS ───

function toNum(val: unknown): number {
  if (val == null) return 0
  return Number(val)
}

interface EntityMetrics {
  id: string
  name: string
  entityType: 'bundle' | 'site'
  current: {
    totalRevenue: number
    profit: number
    romi: number
    costs: number
    hits: number   // ad requests from AdOK (traffic proxy)
  }
  previous: {
    totalRevenue: number
    profit: number
    romi: number
    costs: number
    hits: number
  }
  revenueDelta: number
  profitDelta: number
  romiDelta: number
}

// ─── MAIN ───

export async function generateConclusions(
  from: Date,
  to: Date
): Promise<Conclusions> {
  const { from: prevFrom, to: prevTo } = getPreviousDateRange(from, to)

  // Fetch all bundles and active sites
  const [bundles, sites] = await Promise.all([
    prisma.bundle.findMany({ include: { sites: { where: { isActive: true } } } }),
    prisma.site.findMany({ where: { isActive: true } }),
  ])

  // Gather metrics for each entity in parallel
  const entityMetrics: EntityMetrics[] = []

  // Bundle metrics
  const bundleResults = await Promise.all(
    bundles.map(async (bundle) => {
      const [current, previous] = await Promise.all([
        aggregateBundleMetrics(bundle.id, from, to),
        aggregateBundleMetrics(bundle.id, prevFrom, prevTo),
      ])
      return {
        id: bundle.id,
        name: bundle.name,
        entityType: 'bundle' as const,
        current: {
          totalRevenue: current.totalRevenue,
          profit: current.profit,
          romi: current.romi,
          costs: current.costs,
          hits: current.hits,
        },
        previous: {
          totalRevenue: previous.totalRevenue,
          profit: previous.profit,
          romi: previous.romi,
          costs: previous.costs,
          hits: previous.hits,
        },
        revenueDelta: calculateDelta(current.totalRevenue, previous.totalRevenue),
        profitDelta: calculateDelta(current.profit, previous.profit),
        romiDelta: calculateDelta(current.romi, previous.romi),
      }
    })
  )
  entityMetrics.push(...bundleResults)

  // Site metrics
  const siteResults = await Promise.all(
    sites.map(async (site) => {
      const [current, previous] = await Promise.all([
        aggregateSiteMetrics(site.id, from, to),
        aggregateSiteMetrics(site.id, prevFrom, prevTo),
      ])
      return {
        id: site.id,
        name: site.name,
        entityType: 'site' as const,
        current: {
          totalRevenue: current.totalRevenue,
          profit: current.profit,
          romi: current.romi,
          costs: current.costs,
          hits: current.hits,
        },
        previous: {
          totalRevenue: previous.totalRevenue,
          profit: previous.profit,
          romi: previous.romi,
          costs: previous.costs,
          hits: previous.hits,
        },
        revenueDelta: calculateDelta(current.totalRevenue, previous.totalRevenue),
        profitDelta: calculateDelta(current.profit, previous.profit),
        romiDelta: calculateDelta(current.romi, previous.romi),
      }
    })
  )
  entityMetrics.push(...siteResults)

  // Fetch anomalies for the period
  const anomalies = await prisma.anomaly.findMany({
    where: {
      date: { gte: from, lte: to },
      resolved: false,
    },
    include: { site: true },
  })

  // ─── WINNERS: top 3 by revenue delta or ROMI ───
  const sortedByRevenueDelta = [...entityMetrics]
    .filter((e) => e.current.totalRevenue > 0)
    .sort((a, b) => b.revenueDelta - a.revenueDelta)

  const sortedByRomi = [...entityMetrics]
    .filter((e) => e.current.romi > 0)
    .sort((a, b) => b.current.romi - a.current.romi)

  const winnerSet = new Set<string>()
  const winners: ConclusionItem[] = []

  // Take top by revenue growth
  for (const e of sortedByRevenueDelta) {
    if (winnerSet.size >= 3) break
    if (e.revenueDelta <= 0) continue
    const key = `${e.entityType}:${e.id}`
    if (winnerSet.has(key)) continue
    winnerSet.add(key)
    winners.push({
      entity: e.name,
      entityType: e.entityType,
      metric: 'totalRevenue',
      value: e.current.totalRevenue,
      delta: e.revenueDelta,
      reason: `Revenue grew ${e.revenueDelta.toFixed(1)}% vs previous period`,
      action: 'Scale traffic and optimize ad formats to capitalize on growth',
      severity: e.revenueDelta > 50 ? 'high' : e.revenueDelta > 20 ? 'medium' : 'low',
      type: 'winner',
    })
  }

  // Fill remaining spots with high ROMI
  for (const e of sortedByRomi) {
    if (winnerSet.size >= 3) break
    const key = `${e.entityType}:${e.id}`
    if (winnerSet.has(key)) continue
    winnerSet.add(key)
    winners.push({
      entity: e.name,
      entityType: e.entityType,
      metric: 'romi',
      value: e.current.romi,
      delta: e.romiDelta,
      reason: `ROMI at ${e.current.romi.toFixed(1)}% - strong return on investment`,
      action: 'Increase budget allocation to maximize returns',
      severity: e.current.romi > 200 ? 'high' : e.current.romi > 100 ? 'medium' : 'low',
      type: 'winner',
    })
  }

  // ─── LOSERS: bottom 3 by revenue delta ───
  const sortedByRevenueDeltaAsc = [...entityMetrics]
    .filter((e) => e.previous.totalRevenue > 0) // Only include entities that had revenue before
    .sort((a, b) => a.revenueDelta - b.revenueDelta)

  const losers: ConclusionItem[] = sortedByRevenueDeltaAsc
    .slice(0, 3)
    .filter((e) => e.revenueDelta < 0)
    .map((e) => ({
      entity: e.name,
      entityType: e.entityType,
      metric: 'totalRevenue',
      value: e.current.totalRevenue,
      delta: e.revenueDelta,
      reason: `Revenue dropped ${Math.abs(e.revenueDelta).toFixed(1)}% vs previous period`,
      action: 'Investigate traffic quality, ad fill rates, and cost efficiency',
      severity:
        e.revenueDelta < -50
          ? 'critical'
          : e.revenueDelta < -30
            ? 'high'
            : e.revenueDelta < -15
              ? 'medium'
              : 'low',
      type: 'loser' as const,
    }))

  // ─── RISKS: negative trends + unresolved anomalies ───
  const risks: ConclusionItem[] = []

  // Entities with declining profit
  const decliningProfit = entityMetrics
    .filter((e) => e.profitDelta < -10 && e.current.costs > 0)
    .sort((a, b) => a.profitDelta - b.profitDelta)
    .slice(0, 3)

  for (const e of decliningProfit) {
    risks.push({
      entity: e.name,
      entityType: e.entityType,
      metric: 'profit',
      value: e.current.profit,
      delta: e.profitDelta,
      reason: `Profit declined ${Math.abs(e.profitDelta).toFixed(1)}% - costs may be outpacing revenue`,
      action: 'Review cost structure and identify inefficiencies',
      severity:
        e.profitDelta < -50
          ? 'critical'
          : e.profitDelta < -30
            ? 'high'
            : 'medium',
      type: 'risk',
    })
  }

  // Critical/high severity anomalies
  const severeAnomalies = anomalies.filter(
    (a) => a.severity === 'critical' || a.severity === 'high'
  )

  for (const anomaly of severeAnomalies.slice(0, 5)) {
    risks.push({
      entity: anomaly.site.name,
      entityType: 'site',
      metric: anomaly.metric,
      value: toNum(anomaly.actual),
      delta: toNum(anomaly.delta),
      reason:
        anomaly.description ??
        `${anomaly.metric} anomaly: expected ${toNum(anomaly.expected).toFixed(2)}, got ${toNum(anomaly.actual).toFixed(2)}`,
      action: `Investigate ${anomaly.type} anomaly on ${anomaly.metric}`,
      severity: anomaly.severity as 'high' | 'critical',
      type: 'risk',
    })
  }

  // ─── OPPORTUNITIES: positive trends ───
  const opportunities: ConclusionItem[] = []

  // Entities with growing traffic (hits/requests) and decent ROMI
  const growingTraffic = entityMetrics
    .filter((e) => {
      const trafficDelta = calculateDelta(e.current.hits, e.previous.hits)
      return trafficDelta > 10 && e.current.romi > 50
    })
    .sort((a, b) => {
      const aDelta = calculateDelta(a.current.hits, a.previous.hits)
      const bDelta = calculateDelta(b.current.hits, b.previous.hits)
      return bDelta - aDelta
    })
    .slice(0, 3)

  for (const e of growingTraffic) {
    const trafficDelta = calculateDelta(e.current.hits, e.previous.hits)
    opportunities.push({
      entity: e.name,
      entityType: e.entityType,
      metric: 'hits',
      value: e.current.hits,
      delta: trafficDelta,
      reason: `Requests up ${trafficDelta.toFixed(1)}% with ROMI at ${e.current.romi.toFixed(1)}% - scaling potential`,
      action: 'Increase traffic budget while maintaining ROMI targets',
      severity: trafficDelta > 30 ? 'high' : 'medium',
      type: 'opportunity',
    })
  }

  // Entities with improving ROMI (underinvested)
  const improvingRomi = entityMetrics
    .filter(
      (e) =>
        e.romiDelta > 15 &&
        e.current.totalRevenue > 0 &&
        !growingTraffic.some((g) => g.id === e.id && g.entityType === e.entityType)
    )
    .sort((a, b) => b.romiDelta - a.romiDelta)
    .slice(0, 3)

  for (const e of improvingRomi) {
    opportunities.push({
      entity: e.name,
      entityType: e.entityType,
      metric: 'romi',
      value: e.current.romi,
      delta: e.romiDelta,
      reason: `ROMI improved ${e.romiDelta.toFixed(1)}% - efficiency gains present scaling opportunity`,
      action: 'Gradually increase spend to test scaling while monitoring ROMI',
      severity: e.romiDelta > 40 ? 'high' : 'medium',
      type: 'opportunity',
    })
  }

  return { winners, losers, risks, opportunities }
}
