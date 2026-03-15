import { prisma } from '@/lib/db'

export async function calculateHealthScore(siteId: string, date: Date) {
  // Get recent metrics for calculations
  const sevenDaysAgo = new Date(date)
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const metrics = await prisma.dailyMetric.findMany({
    where: { siteId, date: { gte: sevenDaysAgo, lte: date } },
    orderBy: { date: 'asc' },
  })

  if (metrics.length === 0) return null

  const latest = metrics[metrics.length - 1]
  const profit = Number(latest.profit)
  const totalRevenue = Number(latest.totalRevenue)
  const costs = Number(latest.costs)
  const romi = Number(latest.romi)

  // Component scores (0-100 each)
  const profitQuality = Math.min(100, Math.max(0, profit > 0 ? 60 + (profit / totalRevenue) * 100 : 20))
  const romiQuality = Math.min(100, Math.max(0, romi > 150 ? 80 + (romi - 150) / 5 : romi * 0.5))

  // Revenue trend: compare last 3 days avg to first 3 days avg
  const firstHalf = metrics.slice(0, 3)
  const lastHalf = metrics.slice(-3)
  const avgFirst = firstHalf.reduce((s, m) => s + Number(m.totalRevenue), 0) / firstHalf.length
  const avgLast = lastHalf.reduce((s, m) => s + Number(m.totalRevenue), 0) / lastHalf.length
  const revenueTrend = Math.min(100, Math.max(0, 50 + ((avgLast - avgFirst) / avgFirst) * 200))

  // Cost pressure: lower is better
  const costRatio = costs / (totalRevenue || 1)
  const costPressure = Math.min(100, Math.max(0, 100 - costRatio * 100))

  // Format quality (check diversity from FormatMetric)
  const formatCount = await prisma.formatMetric.groupBy({
    by: ['format'],
    where: { siteId, date },
  })
  const formatQuality = Math.min(100, formatCount.length * 20)

  // Tier quality
  const tierMetrics = await prisma.tierMetric.findMany({
    where: { siteId, date },
  })
  const tier1Revenue = tierMetrics.find(t => t.tier === 'TIER_1')
  const totalTierRevenue = tierMetrics.reduce((s, t) => s + Number(t.revenue), 0)
  const tier1Share = tier1Revenue ? Number(tier1Revenue.revenue) / (totalTierRevenue || 1) : 0
  const tierQuality = Math.min(100, Math.max(0, 30 + tier1Share * 100))

  // Anomaly pressure
  const recentAnomalies = await prisma.anomaly.count({
    where: { siteId, date: { gte: sevenDaysAgo, lte: date }, resolved: false },
  })
  const anomalyPressure = Math.max(0, 100 - recentAnomalies * 15)

  // Stability: coefficient of variation of daily revenue
  const revenues = metrics.map(m => Number(m.totalRevenue))
  const mean = revenues.reduce((s, v) => s + v, 0) / revenues.length
  const variance = revenues.reduce((s, v) => s + (v - mean) ** 2, 0) / revenues.length
  const cv = Math.sqrt(variance) / (mean || 1)
  const stability = Math.min(100, Math.max(0, 100 - cv * 200))

  // Weighted score
  const weights = { profitQuality: 0.20, romiQuality: 0.15, revenueTrend: 0.15, costPressure: 0.10, formatQuality: 0.10, tierQuality: 0.10, anomalyPressure: 0.10, stability: 0.10 }
  const score = Math.round(
    profitQuality * weights.profitQuality +
    romiQuality * weights.romiQuality +
    revenueTrend * weights.revenueTrend +
    costPressure * weights.costPressure +
    formatQuality * weights.formatQuality +
    tierQuality * weights.tierQuality +
    anomalyPressure * weights.anomalyPressure +
    stability * weights.stability
  )

  const status = score >= 80 ? 'healthy' : score >= 60 ? 'warning' : 'critical'

  return { score, status, profitQuality, romiQuality, revenueTrend, costPressure, formatQuality, tierQuality, anomalyPressure, stability }
}

export async function getLatestHealthScore(siteId: string) {
  return prisma.healthScore.findFirst({
    where: { siteId },
    orderBy: { date: 'desc' },
  })
}

export async function getBundleHealthScore(bundleId: string, date: Date) {
  const result = await prisma.healthScore.aggregate({
    _avg: { score: true },
    where: {
      date,
      site: { bundleId },
    },
  })
  return Math.round(result._avg.score || 0)
}
