import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { parsePeriodParam, jsonResponse, errorResponse } from '@/lib/api-utils'
import { aggregateSiteMetrics } from '@/services/metrics'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const { from, to } = parsePeriodParam(searchParams)
    const bundleId = searchParams.get('bundleId') || undefined

    const sites = await prisma.site.findMany({
      where: {
        isActive: true,
        ...(bundleId ? { bundleId } : {}),
      },
      include: {
        bundle: { select: { id: true, name: true, slug: true, color: true } },
      },
    })

    const result = await Promise.all(
      sites.map(async (site) => {
        const metrics = await aggregateSiteMetrics(site.id, from, to)

        // Latest health score
        const healthScore = await prisma.healthScore.findFirst({
          where: {
            siteId: site.id,
            date: { gte: from, lte: to },
          },
          orderBy: { date: 'desc' },
        })

        return {
          id: site.id,
          name: site.name,
          slug: site.slug,
          domain: site.domain,
          isActive: site.isActive,
          bundle: site.bundle,
          ...metrics,
          health: healthScore
            ? {
                score: Number(healthScore.score),
                status: healthScore.status,
              }
            : null,
        }
      })
    )

    return jsonResponse(result)
  } catch (error) {
    console.error('Sites API error:', error)
    return errorResponse('Failed to load sites data')
  }
}
