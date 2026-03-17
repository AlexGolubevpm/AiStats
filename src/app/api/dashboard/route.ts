import { NextRequest } from 'next/server'
import { subDays, startOfDay, endOfDay, differenceInDays } from 'date-fns'
import { prisma } from '@/lib/db'
import { parsePeriodParam, jsonResponse, errorResponse } from '@/lib/api-utils'
import {
  aggregateNetworkMetrics,
  aggregateBundleMetrics,
  getNetworkTrend,
  calculateDelta,
  getPreviousDateRange,
} from '@/services/metrics'

/**
 * Compute comparison period based on compare mode:
 * - prev_period: same length window immediately before (default)
 * - prev_7d: the 7 days immediately before `from`
 * - prev_day: the single day before `from`
 */
function getComparisonRange(
  from: Date,
  to: Date,
  compare: string
): { from: Date; to: Date } {
  switch (compare) {
    case 'prev_7d': {
      const prevTo = endOfDay(subDays(from, 1))
      const prevFrom = startOfDay(subDays(from, 7))
      return { from: prevFrom, to: prevTo }
    }
    case 'prev_day': {
      const prevDay = subDays(from, 1)
      return { from: startOfDay(prevDay), to: endOfDay(prevDay) }
    }
    case 'prev_period':
    default:
      return getPreviousDateRange(from, to)
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const { from, to } = parsePeriodParam(searchParams)
    const compare = searchParams.get('compare') || 'prev_period'
    const { from: prevFrom, to: prevTo } = getComparisonRange(from, to, compare)

    // Current and previous period network metrics
    const current = await aggregateNetworkMetrics(from, to)
    const previous = await aggregateNetworkMetrics(prevFrom, prevTo)

    // Trend data: minimum 7 days for sparklines, full range for longer periods
    const periodDays = differenceInDays(to, from) + 1
    const trendFrom = periodDays < 7 ? startOfDay(subDays(to, 6)) : from
    const trend = await getNetworkTrend(trendFrom, to)

    // Build KPI cards
    const kpis = [
      {
        label: 'Visitors',
        value: current.users,
        delta: calculateDelta(current.users, previous.users),
        format: 'number',
        trend: trend.map((d) => d.users),
      },
      {
        label: 'Ad Requests',
        value: current.hits,
        delta: calculateDelta(current.hits, previous.hits),
        format: 'number',
        trend: trend.map((d) => d.hits),
      },
      {
        label: 'Ad Revenue',
        value: current.adRevenue,
        delta: calculateDelta(current.adRevenue, previous.adRevenue),
        format: 'currency',
        trend: trend.map((d) => d.adRevenue),
      },
      {
        label: 'Affiliate Revenue',
        value: current.affiliateRevenue,
        delta: calculateDelta(current.affiliateRevenue, previous.affiliateRevenue),
        format: 'currency',
        trend: trend.map((d) => d.affiliateRevenue),
      },
      {
        label: 'Total Revenue',
        value: current.totalRevenue,
        delta: calculateDelta(current.totalRevenue, previous.totalRevenue),
        format: 'currency',
        trend: trend.map((d) => d.totalRevenue),
      },
      {
        label: 'Costs',
        value: current.costs,
        delta: calculateDelta(current.costs, previous.costs),
        format: 'currency',
        trend: trend.map((d) => d.costs),
      },
      {
        label: 'Profit',
        value: current.profit,
        delta: calculateDelta(current.profit, previous.profit),
        format: 'currency',
        trend: trend.map((d) => d.profit),
      },
      {
        label: 'ROMI',
        value: current.romi,
        delta: calculateDelta(current.romi, previous.romi),
        format: 'percent',
        trend: [],
      },
      {
        label: 'RPM',
        value: current.rpm,
        delta: calculateDelta(current.rpm, previous.rpm),
        format: 'currency',
        trend: [],
      },
    ]

    // Bundle-level metrics with comparison deltas
    const allBundles = await prisma.bundle.findMany({
      include: { sites: { select: { id: true } } },
    })

    const bundles = await Promise.all(
      allBundles.map(async (bundle) => {
        const metrics = await aggregateBundleMetrics(bundle.id, from, to)
        const prevMetrics = await aggregateBundleMetrics(bundle.id, prevFrom, prevTo)
        return {
          id: bundle.id,
          name: bundle.name,
          slug: bundle.slug,
          color: bundle.color,
          sitesCount: bundle.sites.length,
          ...metrics,
          delta: calculateDelta(metrics.totalRevenue, prevMetrics.totalRevenue),
        }
      })
    )

    // Recent anomalies as insight cards
    const anomalies = await prisma.anomaly.findMany({
      where: {
        date: { gte: from, lte: to },
        resolved: false,
      },
      orderBy: { date: 'desc' },
      take: 10,
      include: { site: { select: { name: true, slug: true } } },
    })

    const insights = anomalies.map((a) => ({
      entity: a.site.name,
      entitySlug: a.site.slug,
      entityType: 'site',
      metric: a.metric,
      value: `${Number(a.actual).toFixed(2)}`,
      delta: Number(a.delta),
      reason: a.description ?? `${a.type} detected: expected ${Number(a.expected).toFixed(2)}, got ${Number(a.actual).toFixed(2)}`,
      action: `Investigate ${a.type} anomaly on ${a.metric}`,
      severity: a.severity,
      type: a.type === 'spike' || a.type === 'drop' ? 'risk' as const : 'info' as const,
    }))

    return jsonResponse({ kpis, bundles, insights, trend, compareMode: compare })
  } catch (error) {
    console.error('Dashboard API error:', error)
    return errorResponse('Failed to load dashboard data')
  }
}
