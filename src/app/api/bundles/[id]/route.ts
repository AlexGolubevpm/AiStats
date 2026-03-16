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

    // Bundle-level KPIs with deltas
    const current = await aggregateBundleMetrics(bundle.id, from, to)
    const previous = await aggregateBundleMetrics(bundle.id, prevFrom, prevTo)

    // Only show KPIs that have actual data
    const kpis: Array<{ label: string; value: number; delta?: number; format: string }> = [
      {
        label: 'Hits',
        value: current.hits,
        delta: calculateDelta(current.hits, previous.hits),
        format: 'number',
      },
      {
        label: 'Impressions',
        value: current.impressions,
        delta: calculateDelta(current.impressions, previous.impressions),
        format: 'number',
      },
      {
        label: 'Ad Revenue',
        value: current.adRevenue,
        delta: calculateDelta(current.adRevenue, previous.adRevenue),
        format: 'currency',
      },
      {
        label: 'RPM',
        value: current.rpm,
        delta: calculateDelta(current.rpm, previous.rpm),
        format: 'currency',
      },
    ]

    // Add costs-related KPIs only if cost data exists
    if (current.costs > 0) {
      kpis.push(
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
      )
    }

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
    })
  } catch (error) {
    console.error('Bundle detail API error:', error)
    return errorResponse('Failed to load bundle data')
  }
}
