import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { parsePeriodParam, jsonResponse, errorResponse } from '@/lib/api-utils'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const { from, to } = parsePeriodParam(searchParams)

    // Get all active sites
    const sites = await prisma.site.findMany({
      where: { isActive: true },
      include: {
        bundle: { select: { id: true, name: true, slug: true, color: true } },
      },
    })

    // Aggregate total revenue across all sites for share calculation
    const totalMetrics = await prisma.dailyMetric.aggregate({
      where: {
        date: { gte: from, lte: to },
      },
      _sum: {
        totalRevenue: true,
        affiliateRevenue: true,
        adRevenue: true,
      },
    })

    const networkTotalRevenue = Number(totalMetrics._sum.totalRevenue ?? 0)

    // Per-site affiliate data
    const siteData = await Promise.all(
      sites.map(async (site) => {
        const metrics = await prisma.dailyMetric.aggregate({
          where: {
            siteId: site.id,
            date: { gte: from, lte: to },
          },
          _sum: {
            affiliateRevenue: true,
            adRevenue: true,
            totalRevenue: true,
          },
        })

        const affiliateRevenue = Number(metrics._sum.affiliateRevenue ?? 0)
        const adRevenue = Number(metrics._sum.adRevenue ?? 0)
        const totalRevenue = Number(metrics._sum.totalRevenue ?? 0)
        const shareOfTotal =
          networkTotalRevenue > 0
            ? (affiliateRevenue / networkTotalRevenue) * 100
            : 0

        // Affiliate revenue entries
        const entries = await prisma.affiliateRevenue.findMany({
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
          bundle: site.bundle,
          affiliateRevenue,
          adRevenue,
          totalRevenue,
          shareOfTotal,
          entries: entries.map((e) => ({
            id: e.id,
            date: e.date,
            amount: Number(e.amount),
            source: e.source,
          })),
        }
      })
    )

    // Daily trend: affiliate vs ad revenue
    const dailyMetrics = await prisma.dailyMetric.groupBy({
      by: ['date'],
      where: {
        date: { gte: from, lte: to },
      },
      _sum: {
        affiliateRevenue: true,
        adRevenue: true,
        totalRevenue: true,
      },
      orderBy: { date: 'asc' },
    })

    const trend = dailyMetrics.map((d) => ({
      date: d.date,
      affiliateRevenue: Number(d._sum.affiliateRevenue ?? 0),
      adRevenue: Number(d._sum.adRevenue ?? 0),
      totalRevenue: Number(d._sum.totalRevenue ?? 0),
    }))

    return jsonResponse({
      summary: {
        totalAffiliateRevenue: Number(totalMetrics._sum.affiliateRevenue ?? 0),
        totalAdRevenue: Number(totalMetrics._sum.adRevenue ?? 0),
        totalRevenue: networkTotalRevenue,
      },
      sites: siteData,
      trend,
    })
  } catch (error) {
    console.error('Affiliate API error:', error)
    return errorResponse('Failed to load affiliate data')
  }
}
