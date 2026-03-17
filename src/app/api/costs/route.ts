import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { parsePeriodParam, jsonResponse, errorResponse } from '@/lib/api-utils'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const { from, to } = parsePeriodParam(searchParams)

    const now = new Date()
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    yesterday.setHours(0, 0, 0, 0)

    const sevenDaysAgo = new Date(now)
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const thirtyDaysAgo = new Date(now)
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    // Get all sites with cost data
    const sites = await prisma.site.findMany({
      where: { isActive: true },
      include: {
        bundle: { select: { id: true, name: true, slug: true, color: true } },
      },
    })

    const siteData = await Promise.all(
      sites.map(async (site) => {
        // Yesterday's cost
        const yesterdayCost = await prisma.cost.aggregate({
          where: {
            siteId: site.id,
            date: yesterday,
          },
          _sum: { amount: true },
        })

        // 7-day average cost
        const sevenDayCosts = await prisma.cost.aggregate({
          where: {
            siteId: site.id,
            date: { gte: sevenDaysAgo, lte: now },
          },
          _sum: { amount: true },
          _count: true,
        })

        // 30-day total cost
        const thirtyDayCosts = await prisma.cost.aggregate({
          where: {
            siteId: site.id,
            date: { gte: thirtyDaysAgo, lte: now },
          },
          _sum: { amount: true },
        })

        // Previous 7-day average for change calculation
        const fourteenDaysAgo = new Date(now)
        fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)

        const prevSevenDayCosts = await prisma.cost.aggregate({
          where: {
            siteId: site.id,
            date: { gte: fourteenDaysAgo, lt: sevenDaysAgo },
          },
          _sum: { amount: true },
          _count: true,
        })

        const yesterdayTotal = Number(yesterdayCost._sum.amount ?? 0)
        const sevenDayTotal = Number(sevenDayCosts._sum.amount ?? 0)
        const sevenDayAvg = sevenDayCosts._count > 0 ? sevenDayTotal / 7 : 0
        const thirtyDayTotal = Number(thirtyDayCosts._sum.amount ?? 0)
        const prevSevenDayTotal = Number(prevSevenDayCosts._sum.amount ?? 0)
        const prevSevenDayAvg = prevSevenDayCosts._count > 0 ? prevSevenDayTotal / 7 : 0
        const changePercent =
          prevSevenDayAvg > 0
            ? ((sevenDayAvg - prevSevenDayAvg) / prevSevenDayAvg) * 100
            : 0

        // Latest mapping status
        const latestCost = await prisma.cost.findFirst({
          where: { siteId: site.id },
          orderBy: { date: 'desc' },
          select: { mappingStatus: true },
        })

        // Count total cost records for this site
        const costCount = await prisma.cost.count({
          where: { siteId: site.id },
        })

        return {
          id: site.id,
          name: site.name,
          slug: site.slug,
          bundle: site.bundle,
          yesterdayCost: yesterdayTotal,
          sevenDayAvg,
          thirtyDayTotal,
          changePercent,
          mappingStatus: latestCost?.mappingStatus ?? null,
          hasCostData: costCount > 0,
        }
      })
    )

    // Summary KPIs
    const totalYesterday = siteData.reduce((sum, s) => sum + s.yesterdayCost, 0)
    const totalSevenDayAvg = siteData.reduce((sum, s) => sum + s.sevenDayAvg, 0)
    const totalThirtyDay = siteData.reduce((sum, s) => sum + s.thirtyDayTotal, 0)

    // Daily cost trend for the period
    const dailyCosts = await prisma.cost.groupBy({
      by: ['date'],
      where: {
        date: { gte: from, lte: to },
      },
      _sum: { amount: true },
      orderBy: { date: 'asc' },
    })

    const costTrend = dailyCosts.map((d) => ({
      date: d.date,
      total: Number(d._sum.amount ?? 0),
    }))

    return jsonResponse({
      summary: {
        yesterdayTotal: totalYesterday,
        sevenDayAvg: totalSevenDayAvg,
        thirtyDayTotal: totalThirtyDay,
      },
      sites: siteData,
      trend: costTrend,
    })
  } catch (error) {
    console.error('Costs API error:', error)
    return errorResponse('Failed to load cost data')
  }
}
