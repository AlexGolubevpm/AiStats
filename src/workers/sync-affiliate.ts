import { Worker, Job } from 'bullmq'
import { PrismaClient } from '@prisma/client'
import { GoogleSheetsService } from '../services/google-sheets'

const connection = {
  host: process.env.REDIS_URL ? new URL(process.env.REDIS_URL).hostname : 'localhost',
  port: process.env.REDIS_URL ? Number(new URL(process.env.REDIS_URL).port) || 6379 : 6379,
}

const prisma = new PrismaClient()

interface SyncAffiliateJobData {
  from?: string
  to?: string
}

async function processSyncAffiliate(job: Job<SyncAffiliateJobData>) {
  const { from, to } = job.data
  const fromDate = from ? new Date(from) : new Date(Date.now() - 24 * 60 * 60 * 1000)
  const toDate = to ? new Date(to) : new Date()

  const syncLog = await prisma.syncLog.create({
    data: {
      source: 'google_sheets_affiliate',
      status: 'running',
      startedAt: new Date(),
    },
  })

  try {
    await job.updateProgress(10)
    await job.log('Fetching affiliate revenue from Google Sheets...')

    const service = new GoogleSheetsService()
    const affiliateData = await service.fetchAffiliateRevenue(fromDate, toDate)

    await job.updateProgress(50)
    await job.log('Processing affiliate revenue records...')

    // TODO: Parse and upsert affiliate revenue records
    // Map sheet rows to site IDs using site.sheetName
    // For each row:
    //   const site = await prisma.site.findFirst({ where: { sheetName: row.siteName } })
    //   if (site) {
    //     await prisma.affiliateRevenue.upsert({
    //       where: { siteId_date_source: { siteId: site.id, date: row.date, source: row.source || 'google_sheets' } },
    //       create: { siteId: site.id, date: row.date, amount: row.amount, source: row.source || 'google_sheets' },
    //       update: { amount: row.amount },
    //     })
    //   }

    let recordsProcessed = 0

    await job.updateProgress(90)

    await prisma.syncLog.update({
      where: { id: syncLog.id },
      data: {
        status: 'completed',
        completedAt: new Date(),
        recordsProcessed,
      },
    })

    await job.updateProgress(100)
    await job.log(`Affiliate sync completed: ${recordsProcessed} records processed`)

    return { syncLogId: syncLog.id, recordsProcessed }
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

export const syncAffiliateWorker = new Worker<SyncAffiliateJobData>(
  'sync-affiliate',
  processSyncAffiliate,
  {
    connection,
    concurrency: 1,
  }
)

syncAffiliateWorker.on('completed', (job) => {
  console.log(`[sync-affiliate] Job ${job.id} completed`)
})

syncAffiliateWorker.on('failed', (job, error) => {
  console.error(`[sync-affiliate] Job ${job?.id} failed:`, error.message)
})

export default syncAffiliateWorker
