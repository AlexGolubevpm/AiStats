import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { parsePeriodParam, parsePreviousPeriod, jsonResponse, errorResponse } from '@/lib/api-utils'
import {
  aggregateBundleMetrics,
  aggregateSiteMetrics,
  getBundleTrend,
  getBundleFormatBreakdown,
  calculateDelta,
} from '@/services/metrics'
import { ensureDataCoverage } from '@/services/data-coverage'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = request.nextUrl
    const { from, to } = parsePeriodParam(searchParams)
    const { from: prevFrom, to: prevTo } = parsePreviousPeriod(from, to)

    // Find bundle by slug or id
    const bundle = await prisma.bundle.findFirst({
      where: {
        OR: [{ slug: id }, { id }],
      },
      include: {
        sites: { select: { id: true, name: true, slug: true, domain: true, isActive: true } },
      },
    })

    if (!bundle) {
      return errorResponse('Bundle not found', 404)
    }

    // Check data coverage and trigger backfill if needed
    const coverage = await ensureDataCoverage(from, to)

    // Bundle-level KPIs with deltas
    const current = await aggregateBundleMetrics(bundle.id, from, to)
    const previous = await aggregateBundleMetrics(bundle.id, prevFrom, prevTo)

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

    // Per-site metrics within this bundle
    const sites = await Promise.all(
      bundle.sites.map(async (site) => {
        const metrics = await aggregateSiteMetrics(site.id, from, to)
        return {
          id: site.id,
          name: site.name,
          slug: site.slug,
          domain: site.domain,
          isActive: site.isActive,
          ...metrics,
        }
      })
    )

    // Format breakdown and trend
    const formatBreakdown = await getBundleFormatBreakdown(bundle.id, from, to)
    const trend = await getBundleTrend(bundle.id, from, to)

    return jsonResponse({
      bundle: {
        id: bundle.id,
        name: bundle.name,
        slug: bundle.slug,
        color: bundle.color,
      },
      kpis,
      sites,
      formatBreakdown,
      trend,
      coverage: {
        complete: coverage.covered,
        missingDates: coverage.missingDates.length,
        syncTriggered: coverage.enqueuedJobs.length > 0,
        resyncTriggered: coverage.resyncTriggered,
      },
    })
  } catch (error) {
    console.error('Bundle detail API error:', error)
    return errorResponse('Failed to load bundle data')
  }
}
