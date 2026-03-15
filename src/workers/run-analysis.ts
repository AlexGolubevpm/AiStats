import { Worker, Job } from 'bullmq'
import { PrismaClient, Prisma } from '@prisma/client'
import { AiAnalysisService } from '../services/ai-analysis'

const connection = {
  host: process.env.REDIS_URL ? new URL(process.env.REDIS_URL).hostname : 'localhost',
  port: process.env.REDIS_URL ? Number(new URL(process.env.REDIS_URL).port) || 6379 : 6379,
}

const prisma = new PrismaClient()

interface RunAnalysisJobData {
  date?: string
  scope?: string
}

async function processRunAnalysis(job: Job<RunAnalysisJobData>) {
  const { date: dateStr, scope = 'network' } = job.data
  const date = dateStr ? new Date(dateStr) : new Date()
  date.setHours(0, 0, 0, 0)

  await job.log(`Running AI analysis for ${date.toISOString().slice(0, 10)} (scope: ${scope})`)
  await job.updateProgress(10)

  try {
    // ── Step 1: Gather network-level metrics ──
    const sevenDaysAgo = new Date(date)
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const networkAgg = await prisma.dailyMetric.aggregate({
      _sum: {
        users: true,
        hits: true,
        impressions: true,
        clicks: true,
        adRevenue: true,
        affiliateRevenue: true,
        totalRevenue: true,
        costs: true,
        profit: true,
      },
      where: {
        date: { gte: sevenDaysAgo, lte: date },
      },
    })

    const networkMetrics: Record<string, unknown> = {
      period: { from: sevenDaysAgo.toISOString(), to: date.toISOString() },
      users: networkAgg._sum.users ?? 0,
      hits: networkAgg._sum.hits ?? 0,
      impressions: networkAgg._sum.impressions ?? 0,
      clicks: networkAgg._sum.clicks ?? 0,
      adRevenue: Number(networkAgg._sum.adRevenue) || 0,
      affiliateRevenue: Number(networkAgg._sum.affiliateRevenue) || 0,
      totalRevenue: Number(networkAgg._sum.totalRevenue) || 0,
      costs: Number(networkAgg._sum.costs) || 0,
      profit: Number(networkAgg._sum.profit) || 0,
    }

    await job.updateProgress(30)
    await job.log('Network metrics gathered')

    // ── Step 2: Gather bundle summaries ──
    const bundles = await prisma.bundle.findMany({
      include: {
        sites: {
          where: { isActive: true },
          select: { id: true },
        },
      },
    })

    const bundleSummaries: Record<string, unknown>[] = []
    for (const bundle of bundles) {
      const siteIds = bundle.sites.map(s => s.id)
      if (siteIds.length === 0) continue

      const bundleAgg = await prisma.dailyMetric.aggregate({
        _sum: {
          users: true,
          totalRevenue: true,
          costs: true,
          profit: true,
        },
        where: {
          siteId: { in: siteIds },
          date: { gte: sevenDaysAgo, lte: date },
        },
      })

      const avgHealth = await prisma.healthScore.aggregate({
        _avg: { score: true },
        where: {
          siteId: { in: siteIds },
          date,
        },
      })

      bundleSummaries.push({
        bundleId: bundle.id,
        bundleName: bundle.name,
        siteCount: siteIds.length,
        users: bundleAgg._sum.users ?? 0,
        totalRevenue: Number(bundleAgg._sum.totalRevenue) || 0,
        costs: Number(bundleAgg._sum.costs) || 0,
        profit: Number(bundleAgg._sum.profit) || 0,
        avgHealthScore: Math.round(avgHealth._avg.score || 0),
      })
    }

    await job.updateProgress(50)
    await job.log(`Gathered summaries for ${bundleSummaries.length} bundles`)

    // ── Step 3: Gather recent anomalies ──
    const recentAnomalies = await prisma.anomaly.findMany({
      where: {
        date: { gte: sevenDaysAgo, lte: date },
        resolved: false,
      },
      include: {
        site: { select: { name: true, slug: true } },
      },
      orderBy: [{ severity: 'asc' }, { date: 'desc' }],
      take: 50,
    })

    const anomaliesData: Record<string, unknown>[] = recentAnomalies.map(a => ({
      site: a.site.name,
      type: a.type,
      severity: a.severity,
      metric: a.metric,
      delta: Number(a.delta),
      description: a.description,
      date: a.date.toISOString().slice(0, 10),
    }))

    await job.updateProgress(70)
    await job.log(`Found ${anomaliesData.length} unresolved anomalies`)

    // ── Step 4: Run AI analysis ──
    const service = new AiAnalysisService()
    const analysis = await service.generateAnalysis({
      networkMetrics,
      bundleSummaries,
      anomalies: anomaliesData,
    })

    await job.updateProgress(90)

    // ── Step 5: Store analysis result ──
    await prisma.aiAnalysis.upsert({
      where: { date_scope: { date, scope } },
      create: {
        date,
        scope,
        summary: analysis.summary,
        risks: analysis.risks as Prisma.InputJsonValue,
        opportunities: analysis.opportunities as Prisma.InputJsonValue,
        recommendations: analysis.recommendations as Prisma.InputJsonValue,
      },
      update: {
        summary: analysis.summary,
        risks: analysis.risks as Prisma.InputJsonValue,
        opportunities: analysis.opportunities as Prisma.InputJsonValue,
        recommendations: analysis.recommendations as Prisma.InputJsonValue,
      },
    })

    await job.updateProgress(100)
    await job.log('AI analysis stored successfully')

    return {
      date: date.toISOString().slice(0, 10),
      scope,
      summaryLength: analysis.summary.length,
      risksCount: Array.isArray(analysis.risks) ? analysis.risks.length : 0,
      opportunitiesCount: Array.isArray(analysis.opportunities) ? analysis.opportunities.length : 0,
      recommendationsCount: Array.isArray(analysis.recommendations) ? analysis.recommendations.length : 0,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    await job.log(`Analysis failed: ${errorMessage}`)
    throw error
  }
}

export const runAnalysisWorker = new Worker<RunAnalysisJobData>(
  'run-analysis',
  processRunAnalysis,
  {
    connection,
    concurrency: 1,
  }
)

runAnalysisWorker.on('completed', (job) => {
  console.log(`[run-analysis] Job ${job.id} completed:`, job.returnvalue)
})

runAnalysisWorker.on('failed', (job, error) => {
  console.error(`[run-analysis] Job ${job?.id} failed:`, error.message)
})

export default runAnalysisWorker
