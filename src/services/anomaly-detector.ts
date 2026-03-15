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

  if (!today || !avgResult._avg.users) return []

  const anomalies: Array<{
    type: string; severity: string; metric: string;
    expected: number; actual: number; delta: number; description: string
  }> = []

  const avgUsers = avgResult._avg.users || 0
  const avgRevenue = Number(avgResult._avg.adRevenue) || 0
  const avgCosts = Number(avgResult._avg.costs) || 0
  const avgFillRate = Number(avgResult._avg.fillRate) || 0

  // Traffic drop > 20%
  const trafficDelta = ((today.users - avgUsers) / avgUsers) * 100
  if (trafficDelta < -20) {
    anomalies.push({
      type: 'traffic_drop', severity: 'critical', metric: 'users',
      expected: avgUsers, actual: today.users, delta: trafficDelta,
      description: `Traffic dropped ${Math.abs(trafficDelta).toFixed(1)}% below 7-day average`
    })
  }

  // Revenue change > 15%
  const actualRevenue = Number(today.adRevenue)
  const revenueDelta = ((actualRevenue - avgRevenue) / avgRevenue) * 100
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
  const costDelta = ((actualCosts - avgCosts) / avgCosts) * 100
  if (costDelta > 25) {
    anomalies.push({
      type: 'cost_spike', severity: 'high', metric: 'costs',
      expected: avgCosts, actual: actualCosts, delta: costDelta,
      description: `Costs spiked ${costDelta.toFixed(1)}% above 7-day average`
    })
  }

  // Fill rate drop > 10%
  const actualFillRate = Number(today.fillRate)
  const fillRateDelta = ((actualFillRate - avgFillRate) / avgFillRate) * 100
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
