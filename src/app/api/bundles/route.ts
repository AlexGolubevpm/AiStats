import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { parsePeriodParam, parsePreviousPeriod, jsonResponse, errorResponse } from '@/lib/api-utils'
import { aggregateBundleMetrics, calculateDelta } from '@/services/metrics'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const { from, to } = parsePeriodParam(searchParams)
    const { from: prevFrom, to: prevTo } = parsePreviousPeriod(from, to)

    const allBundles = await prisma.bundle.findMany({
      include: {
        sites: { select: { id: true } },
      },
    })

    const bundles = await Promise.all(
      allBundles.map(async (bundle) => {
        const current = await aggregateBundleMetrics(bundle.id, from, to)
        const previous = await aggregateBundleMetrics(bundle.id, prevFrom, prevTo)

        // Average health score across all sites in bundle
        const healthScores = await prisma.healthScore.findMany({
          where: {
            site: { bundleId: bundle.id },
            date: { gte: from, lte: to },
          },
          orderBy: { date: 'desc' },
          distinct: ['siteId'],
          select: { score: true },
        })

        const avgHealth =
          healthScores.length > 0
            ? healthScores.reduce((sum, h) => sum + Number(h.score), 0) / healthScores.length
            : null

        return {
          id: bundle.id,
          name: bundle.name,
          slug: bundle.slug,
          color: bundle.color,
          sitesCount: bundle.sites.length,
          requests: current.hits,
          adRevenue: current.adRevenue,
          affiliateRevenue: current.affiliateRevenue,
          totalRevenue: current.totalRevenue,
          costs: current.costs,
          profit: current.profit,
          romi: current.romi,
          rpm: current.rpm,
          health: avgHealth,
          delta: calculateDelta(current.totalRevenue, previous.totalRevenue),
        }
      })
    )

    return jsonResponse(bundles)
  } catch (error) {
    console.error('Bundles API error:', error)
    return errorResponse('Failed to load bundles data')
  }
}
