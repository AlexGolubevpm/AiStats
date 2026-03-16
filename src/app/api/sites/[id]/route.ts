import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { parsePeriodParam, parsePreviousPeriod, jsonResponse, errorResponse } from '@/lib/api-utils'
import {
  aggregateSiteMetrics,
  getSiteTrend,
  getFormatBreakdown,
  getTierBreakdown,
  calculateDelta,
} from '@/services/metrics'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = request.nextUrl
    const { from, to } = parsePeriodParam(searchParams)
    const { from: prevFrom, to: prevTo } = parsePreviousPeriod(from, to)

    // Find site by slug or id
    const site = await prisma.site.findFirst({
      where: {
        OR: [{ slug: id }, { id }],
      },
      include: {
        bundle: { select: { id: true, name: true, slug: true, color: true } },
      },
    })

    if (!site) {
      return errorResponse('Site not found', 404)
    }

    // KPIs with deltas
    const current = await aggregateSiteMetrics(site.id, from, to)
    const previous = await aggregateSiteMetrics(site.id, prevFrom, prevTo)

    const kpis = [
      {
        label: 'Requests',
        value: current.hits,
        delta: calculateDelta(current.hits, previous.hits),
        format: 'number',
      },
      {
        label: 'Ad Revenue',
        value: current.adRevenue,
        delta: calculateDelta(current.adRevenue, previous.adRevenue),
        format: 'currency',
      },
      {
        label: 'Affiliate Revenue',
        value: current.affiliateRevenue,
        delta: calculateDelta(current.affiliateRevenue, previous.affiliateRevenue),
        format: 'currency',
      },
      {
        label: 'Total Revenue',
        value: current.totalRevenue,
        delta: calculateDelta(current.totalRevenue, previous.totalRevenue),
        format: 'currency',
      },
      {
        label: 'Costs',
        value: current.costs,
        delta: calculateDelta(current.costs, previous.costs),
        format: 'currency',
      },
      {
        label: 'Profit',
        value: current.profit,
        delta: calculateDelta(current.profit, previous.profit),
        format: 'currency',
      },
      {
        label: 'ROMI',
        value: current.romi,
        delta: calculateDelta(current.romi, previous.romi),
        format: 'percent',
      },
      {
        label: 'RPM',
        value: current.rpm,
        delta: calculateDelta(current.rpm, previous.rpm),
        format: 'currency',
      },
    ]

    // Breakdowns and trend
    const formatBreakdown = await getFormatBreakdown(site.id, from, to)
    const tierBreakdown = await getTierBreakdown(site.id, from, to)
    const trend = await getSiteTrend(site.id, from, to)

    // Health score
    const healthScore = await prisma.healthScore.findFirst({
      where: {
        siteId: site.id,
        date: { gte: from, lte: to },
      },
      orderBy: { date: 'desc' },
    })

    const health = healthScore
      ? {
          score: Number(healthScore.score),
          status: healthScore.status,
          profitQuality: Number(healthScore.profitQuality),
          romiQuality: Number(healthScore.romiQuality),
          revenueTrend: Number(healthScore.revenueTrend),
          costPressure: Number(healthScore.costPressure),
          formatQuality: Number(healthScore.formatQuality),
          tierQuality: Number(healthScore.tierQuality),
          anomalyPressure: Number(healthScore.anomalyPressure),
          stability: Number(healthScore.stability),
        }
      : null

    // Recent anomalies
    const anomalies = await prisma.anomaly.findMany({
      where: {
        siteId: site.id,
        date: { gte: from, lte: to },
      },
      orderBy: { date: 'desc' },
      take: 20,
    })

    const formattedAnomalies = anomalies.map((a) => ({
      id: a.id,
      type: a.type,
      severity: a.severity,
      metric: a.metric,
      expected: Number(a.expected),
      actual: Number(a.actual),
      delta: Number(a.delta),
      description: a.description,
      date: a.date,
      resolved: a.resolved,
    }))

    // Costs
    const costs = await prisma.cost.findMany({
      where: {
        siteId: site.id,
        date: { gte: from, lte: to },
      },
      orderBy: { date: 'desc' },
    })

    const formattedCosts = costs.map((c) => ({
      id: c.id,
      date: c.date,
      amount: Number(c.amount),
      source: c.source,
      mappingStatus: c.mappingStatus,
    }))

    // Affiliate revenue
    const affiliateRevenue = await prisma.affiliateRevenue.findMany({
      where: {
        siteId: site.id,
        date: { gte: from, lte: to },
      },
      orderBy: { date: 'desc' },
    })

    const formattedAffiliate = affiliateRevenue.map((a) => ({
      id: a.id,
      date: a.date,
      amount: Number(a.amount),
      source: a.source,
    }))

    return jsonResponse({
      site: {
        id: site.id,
        name: site.name,
        slug: site.slug,
        domain: site.domain,
        isActive: site.isActive,
        bundle: site.bundle,
      },
      kpis,
      formatBreakdown,
      tierBreakdown,
      trend,
      health,
      anomalies: formattedAnomalies,
      costs: formattedCosts,
      affiliateRevenue: formattedAffiliate,
    })
  } catch (error) {
    console.error('Site detail API error:', error)
    return errorResponse('Failed to load site data')
  }
}
