import { Worker, Job } from 'bullmq'
import { PrismaClient } from '@prisma/client'
import { AdSpyglassService } from '../services/adspyglass'

const connection = {
  host: process.env.REDIS_URL ? new URL(process.env.REDIS_URL).hostname : 'localhost',
  port: process.env.REDIS_URL ? Number(new URL(process.env.REDIS_URL).port) || 6379 : 6379,
}

const prisma = new PrismaClient()

interface SyncAdspyglassJobData {
  siteId?: string
  from?: string
  to?: string
}

async function processSyncAdspyglass(job: Job<SyncAdspyglassJobData>) {
  const { siteId, from, to } = job.data
  const fromDate = from ? new Date(from) : new Date(Date.now() - 24 * 60 * 60 * 1000)
  const toDate = to ? new Date(to) : new Date()

  const syncLog = await prisma.syncLog.create({
    data: {
      source: 'adspyglass',
      status: 'running',
      startedAt: new Date(),
    },
  })

  try {
    await job.updateProgress(10)

    // Determine which sites to sync
    const sites = siteId
      ? await prisma.site.findMany({ where: { id: siteId, isActive: true } })
      : await prisma.site.findMany({ where: { isActive: true, externalId: { not: null } } })

    if (sites.length === 0) {
      await prisma.syncLog.update({
        where: { id: syncLog.id },
        data: { status: 'completed', completedAt: new Date(), recordsProcessed: 0 },
      })
      return { syncLogId: syncLog.id, sitesProcessed: 0 }
    }

    const service = new AdSpyglassService()
    let totalRecords = 0

    for (let i = 0; i < sites.length; i++) {
      const site = sites[i]
      await job.updateProgress(10 + Math.round((i / sites.length) * 70))
      await job.log(`Syncing site: ${site.name} (${site.externalId})`)

      try {
        // Fetch site-level metrics
        const siteMetrics = await service.fetchSiteMetrics(
          site.externalId || site.id,
          fromDate,
          toDate
        )

        // Fetch format-level metrics
        const formatMetrics = await service.fetchFormatMetrics(
          site.externalId || site.id,
          fromDate,
          toDate
        )

        // TODO: Upsert metrics into DailyMetric / FormatMetric tables
        // once the service returns real data

        totalRecords++
        await job.log(`Completed site: ${site.name}`)
      } catch (siteError) {
        const message = siteError instanceof Error ? siteError.message : String(siteError)
        await job.log(`Error syncing site ${site.name}: ${message}`)
        // Continue with other sites rather than failing the entire job
      }
    }

    await job.updateProgress(90)

    await prisma.syncLog.update({
      where: { id: syncLog.id },
      data: {
        status: 'completed',
        completedAt: new Date(),
        recordsProcessed: totalRecords,
      },
    })

    await job.updateProgress(100)
    await job.log(`Sync completed: ${totalRecords} sites processed`)

    return { syncLogId: syncLog.id, sitesProcessed: totalRecords }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)

    await prisma.syncLog.update({
      where: { id: syncLog.id },
      data: {
        status: 'failed',
        completedAt: new Date(),
        error: errorMessage,
      },
    })

    throw error
  }
}

export const syncAdspyglassWorker = new Worker<SyncAdspyglassJobData>(
  'sync-adspyglass',
  processSyncAdspyglass,
  {
    connection,
    concurrency: 1,
    limiter: {
      max: 5,
      duration: 60_000,
    },
  }
)

syncAdspyglassWorker.on('completed', (job) => {
  console.log(`[sync-adspyglass] Job ${job.id} completed`)
})

syncAdspyglassWorker.on('failed', (job, error) => {
  console.error(`[sync-adspyglass] Job ${job?.id} failed:`, error.message)
})

export default syncAdspyglassWorker
