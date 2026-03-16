import { prisma } from '@/lib/db'

export async function detectAnomalies(siteId: string, date: Date) {
  const sevenDaysAgo = new Date(date)
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  // Get 7-day average
  const avgResult = await prisma.dailyMetric.aggregate({
    _avg: { users: true, adRevenue: true, costs: true, fillRate: true },
    where: { siteId, date: { gte: sevenDaysAgo, lt: date } },
  })

  // Get today's metrics
  const today = await prisma.dailyMetric.findUnique({
    where: { siteId_date: { siteId, date } },
  })

  if (!today) return []

  const anomalies: Array<{
    type: string; severity: string; metric: string;
    expected: number; actual: number; delta: number; description: string
  }> = []

  const avgUsers = avgResult._avg.users || 0
  const avgRevenue = Number(avgResult._avg.adRevenue) || 0
  const avgCosts = Number(avgResult._avg.costs) || 0
  const avgFillRate = Number(avgResult._avg.fillRate) || 0

  // Traffic drop > 20%
  const trafficDelta = avgUsers > 0 ? ((today.users - avgUsers) / avgUsers) * 100 : 0
  if (trafficDelta < -20) {
    anomalies.push({
      type: 'traffic_drop', severity: 'critical', metric: 'users',
      expected: avgUsers, actual: today.users, delta: trafficDelta,
      description: `Traffic dropped ${Math.abs(trafficDelta).toFixed(1)}% below 7-day average`
    })
  }

  // Revenue change > 15%
  const actualRevenue = Number(today.adRevenue)
  const revenueDelta = avgRevenue > 0 ? ((actualRevenue - avgRevenue) / avgRevenue) * 100 : 0
  if (Math.abs(revenueDelta) > 15) {
    anomalies.push({
      type: revenueDelta > 0 ? 'revenue_spike' : 'revenue_drop',
      severity: 'high', metric: 'adRevenue',
      expected: avgRevenue, actual: actualRevenue, delta: revenueDelta,
      description: `Revenue ${revenueDelta > 0 ? 'spiked' : 'dropped'} ${Math.abs(revenueDelta).toFixed(1)}% vs 7-day average`
    })
  }

  // Cost spike > 25%
  const actualCosts = Number(today.costs)
  const costDelta = avgCosts > 0 ? ((actualCosts - avgCosts) / avgCosts) * 100 : 0
  if (costDelta > 25) {
    anomalies.push({
      type: 'cost_spike', severity: 'high', metric: 'costs',
      expected: avgCosts, actual: actualCosts, delta: costDelta,
      description: `Costs spiked ${costDelta.toFixed(1)}% above 7-day average`
    })
  }

  // Fill rate drop > 10%
  const actualFillRate = Number(today.fillRate)
  const fillRateDelta = avgFillRate > 0 ? ((actualFillRate - avgFillRate) / avgFillRate) * 100 : 0
  if (fillRateDelta < -10) {
    anomalies.push({
      type: 'fill_rate_drop', severity: 'medium', metric: 'fillRate',
      expected: avgFillRate, actual: actualFillRate, delta: fillRateDelta,
      description: `Fill rate dropped ${Math.abs(fillRateDelta).toFixed(1)}% below 7-day average`
    })
  }

  // ROMI below 100%
  const romi = Number(today.romi)
  if (romi < 100) {
    anomalies.push({
      type: 'romi_critical', severity: 'critical', metric: 'romi',
      expected: 100, actual: romi, delta: romi - 100,
      description: `ROMI at ${romi.toFixed(1)}% — below breakeven threshold`
    })
  }

  // Persist anomalies to database
  if (anomalies.length > 0) {
    // Delete old anomalies for this site/date before inserting new ones
    await prisma.anomaly.deleteMany({
      where: { siteId, date },
    })

    await prisma.anomaly.createMany({
      data: anomalies.map(a => ({
        siteId,
        date,
        type: a.type,
        severity: a.severity,
        metric: a.metric,
        expected: a.expected,
        actual: a.actual,
        delta: a.delta,
        description: a.description,
      })),
    })
  }

  return anomalies
}

export async function getRecentAnomalies(from: Date, to: Date, severity?: string) {
  return prisma.anomaly.findMany({
    where: {
      date: { gte: from, lte: to },
      ...(severity ? { severity } : {}),
    },
    include: { site: { select: { name: true, slug: true, bundle: { select: { name: true } } } } },
    orderBy: { date: 'desc' },
    take: 20,
  })
}
