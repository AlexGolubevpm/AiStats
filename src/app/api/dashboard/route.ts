import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { parsePeriodParam, parsePreviousPeriod, jsonResponse, errorResponse } from '@/lib/api-utils'
import {
  aggregateNetworkMetrics,
  aggregateBundleMetrics,
  getNetworkTrend,
  calculateDelta,
} from '@/services/metrics'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const { from, to } = parsePeriodParam(searchParams)
    const { from: prevFrom, to: prevTo } = parsePreviousPeriod(from, to)

    // Current and previous period network metrics
    const current = await aggregateNetworkMetrics(from, to)
    const previous = await aggregateNetworkMetrics(prevFrom, prevTo)

    // Trend data for sparklines (last 7 days)
    const trend = await getNetworkTrend(from, to)
    const last7 = trend.slice(-7)

    // Build KPI cards
    const kpis = [
      {
        label: 'Visitors',
        value: current.users,
        delta: calculateDelta(current.users, previous.users),
        format: 'number',
        trend: last7.map((d) => d.users),
      },
      {
        label: 'Ad Requests',
        value: current.hits,
        delta: calculateDelta(current.hits, previous.hits),
        format: 'number',
        trend: last7.map((d) => d.hits),
      },
      {
        label: 'Ad Revenue',
        value: current.adRevenue,
        delta: calculateDelta(current.adRevenue, previous.adRevenue),
        format: 'currency',
        trend: last7.map((d) => d.adRevenue),
      },
      {
        label: 'Affiliate Revenue',
        value: current.affiliateRevenue,
        delta: calculateDelta(current.affiliateRevenue, previous.affiliateRevenue),
        format: 'currency',
        trend: last7.map((d) => d.affiliateRevenue),
      },
      {
        label: 'Total Revenue',
        value: current.totalRevenue,
        delta: calculateDelta(current.totalRevenue, previous.totalRevenue),
        format: 'currency',
        trend: last7.map((d) => d.totalRevenue),
      },
      {
        label: 'Costs',
        value: current.costs,
        delta: calculateDelta(current.costs, previous.costs),
        format: 'currency',
        trend: last7.map((d) => d.costs),
      },
      {
        label: 'Profit',
        value: current.profit,
        delta: calculateDelta(current.profit, previous.profit),
        format: 'currency',
        trend: last7.map((d) => d.profit),
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

    // Bundle-level metrics
    const allBundles = await prisma.bundle.findMany({
      include: { sites: { select: { id: true } } },
    })

    const bundles = await Promise.all(
      allBundles.map(async (bundle) => {
        const metrics = await aggregateBundleMetrics(bundle.id, from, to)
        return {
          id: bundle.id,
          name: bundle.name,
          slug: bundle.slug,
          color: bundle.color,
          sitesCount: bundle.sites.length,
          ...metrics,
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
      entityType: 'site',
      metric: a.metric,
      value: `${Number(a.actual).toFixed(2)}`,
      delta: Number(a.delta),
      reason: a.description ?? `${a.type} detected: expected ${Number(a.expected).toFixed(2)}, got ${Number(a.actual).toFixed(2)}`,
      action: `Investigate ${a.type} anomaly on ${a.metric}`,
      severity: a.severity,
      type: a.type === 'spike' || a.type === 'drop' ? 'risk' as const : 'info' as const,
    }))

    return jsonResponse({ kpis, bundles, insights, trend })
  } catch (error) {
    console.error('Dashboard API error:', error)
    return errorResponse('Failed to load dashboard data')
  }
}
