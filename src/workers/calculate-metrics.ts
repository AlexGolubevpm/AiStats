import { Worker, Job } from 'bullmq'
import { PrismaClient, Prisma } from '@prisma/client'
import { calculateHealthScore } from '../services/health-score'
import { detectAnomalies } from '../services/anomaly-detector'

const connection = {
  host: process.env.REDIS_URL ? new URL(process.env.REDIS_URL).hostname : 'localhost',
  port: process.env.REDIS_URL ? Number(new URL(process.env.REDIS_URL).port) || 6379 : 6379,
}

const prisma = new PrismaClient()

interface CalculateMetricsJobData {
  siteId?: string
  date?: string
}

async function processCalculateMetrics(job: Job<CalculateMetricsJobData>) {
  const { siteId, date: dateStr } = job.data
  const date = dateStr ? new Date(dateStr) : new Date()
  // Normalize to start of day
  date.setHours(0, 0, 0, 0)

  await job.log(`Calculating metrics for ${date.toISOString().slice(0, 10)}`)
  await job.updateProgress(5)

  // Determine which sites to process
  const sites = siteId
    ? await prisma.site.findMany({ where: { id: siteId, isActive: true } })
    : await prisma.site.findMany({ where: { isActive: true } })

  if (sites.length === 0) {
    await job.log('No active sites found')
    return { sitesProcessed: 0 }
  }

  let sitesProcessed = 0
  let anomaliesDetected = 0
  let healthScoresCalculated = 0

  for (let i = 0; i < sites.length; i++) {
    const site = sites[i]
    const progressBase = 5 + Math.round((i / sites.length) * 85)
    await job.updateProgress(progressBase)
    await job.log(`Processing site: ${site.name}`)

    try {
      // ── Step 1: Recalculate derived fields on DailyMetric ──
      const dailyMetric = await prisma.dailyMetric.findUnique({
        where: { siteId_date: { siteId: site.id, date } },
      })

      if (dailyMetric) {
        // Sum costs from Cost table
        const costAgg = await prisma.cost.aggregate({
          _sum: { amount: true },
          where: { siteId: site.id, date },
        })
        const totalCosts = Number(costAgg._sum.amount) || 0

        // Sum affiliate revenue from AffiliateRevenue table
        const affAgg = await prisma.affiliateRevenue.aggregate({
          _sum: { amount: true },
          where: { siteId: site.id, date },
        })
        const affiliateRev = Number(affAgg._sum.amount) || 0

        const adRevenue = Number(dailyMetric.adRevenue)
        const totalRevenue = adRevenue + affiliateRev
        const profit = totalRevenue - totalCosts
        const romi = totalCosts > 0 ? ((totalRevenue - totalCosts) / totalCosts) * 100 : 0
        const rpm = dailyMetric.users > 0 ? (totalRevenue / dailyMetric.users) * 1000 : 0
        const ctr = dailyMetric.impressions > 0 ? (dailyMetric.clicks / dailyMetric.impressions) * 100 : 0
        const ecpm = dailyMetric.impressions > 0 ? (adRevenue / dailyMetric.impressions) * 1000 : 0

        await prisma.dailyMetric.update({
          where: { id: dailyMetric.id },
          data: {
            affiliateRevenue: new Prisma.Decimal(affiliateRev.toFixed(4)),
            totalRevenue: new Prisma.Decimal(totalRevenue.toFixed(4)),
            costs: new Prisma.Decimal(totalCosts.toFixed(4)),
            profit: new Prisma.Decimal(profit.toFixed(4)),
            romi: new Prisma.Decimal(romi.toFixed(2)),
            rpm: new Prisma.Decimal(rpm.toFixed(4)),
            ctr: new Prisma.Decimal(ctr.toFixed(4)),
            ecpm: new Prisma.Decimal(ecpm.toFixed(4)),
          },
        })

        await job.log(`Updated derived fields for ${site.name}`)
      }

      // ── Step 2: Health score calculation ──
      const healthResult = await calculateHealthScore(site.id, date)
      if (healthResult) {
        await prisma.healthScore.upsert({
          where: { siteId_date: { siteId: site.id, date } },
          create: {
            siteId: site.id,
            date,
            score: healthResult.score,
            status: healthResult.status,
            profitQuality: new Prisma.Decimal(healthResult.profitQuality.toFixed(2)),
            romiQuality: new Prisma.Decimal(healthResult.romiQuality.toFixed(2)),
            revenueTrend: new Prisma.Decimal(healthResult.revenueTrend.toFixed(2)),
            costPressure: new Prisma.Decimal(healthResult.costPressure.toFixed(2)),
            formatQuality: new Prisma.Decimal(healthResult.formatQuality.toFixed(2)),
            tierQuality: new Prisma.Decimal(healthResult.tierQuality.toFixed(2)),
            anomalyPressure: new Prisma.Decimal(healthResult.anomalyPressure.toFixed(2)),
            stability: new Prisma.Decimal(healthResult.stability.toFixed(2)),
          },
          update: {
            score: healthResult.score,
            status: healthResult.status,
            profitQuality: new Prisma.Decimal(healthResult.profitQuality.toFixed(2)),
            romiQuality: new Prisma.Decimal(healthResult.romiQuality.toFixed(2)),
            revenueTrend: new Prisma.Decimal(healthResult.revenueTrend.toFixed(2)),
            costPressure: new Prisma.Decimal(healthResult.costPressure.toFixed(2)),
            formatQuality: new Prisma.Decimal(healthResult.formatQuality.toFixed(2)),
            tierQuality: new Prisma.Decimal(healthResult.tierQuality.toFixed(2)),
            anomalyPressure: new Prisma.Decimal(healthResult.anomalyPressure.toFixed(2)),
            stability: new Prisma.Decimal(healthResult.stability.toFixed(2)),
          },
        })
        healthScoresCalculated++
        await job.log(`Health score for ${site.name}: ${healthResult.score} (${healthResult.status})`)
      }

      // ── Step 3: Anomaly detection ──
      const anomalies = await detectAnomalies(site.id, date)
      for (const anomaly of anomalies) {
        await prisma.anomaly.create({
          data: {
            siteId: site.id,
            date,
            type: anomaly.type,
            severity: anomaly.severity,
            metric: anomaly.metric,
            expected: new Prisma.Decimal(anomaly.expected.toFixed(4)),
            actual: new Prisma.Decimal(anomaly.actual.toFixed(4)),
            delta: new Prisma.Decimal(anomaly.delta.toFixed(2)),
            description: anomaly.description,
          },
        })
        anomaliesDetected++
      }

      if (anomalies.length > 0) {
        await job.log(`Detected ${anomalies.length} anomalies for ${site.name}`)
      }

      sitesProcessed++
    } catch (siteError) {
      const message = siteError instanceof Error ? siteError.message : String(siteError)
      await job.log(`Error processing site ${site.name}: ${message}`)
    }
  }

  await job.updateProgress(100)
  await job.log(
    `Metrics calculation completed: ${sitesProcessed} sites, ` +
    `${healthScoresCalculated} health scores, ${anomaliesDetected} anomalies`
  )

  return { sitesProcessed, healthScoresCalculated, anomaliesDetected }
}

export const calculateMetricsWorker = new Worker<CalculateMetricsJobData>(
  'calculate-metrics',
  processCalculateMetrics,
  {
    connection,
    concurrency: 1,
  }
)

calculateMetricsWorker.on('completed', (job) => {
  console.log(`[calculate-metrics] Job ${job.id} completed:`, job.returnvalue)
})

calculateMetricsWorker.on('failed', (job, error) => {
  console.error(`[calculate-metrics] Job ${job?.id} failed:`, error.message)
})

export default calculateMetricsWorker
