import { Worker, Job } from 'bullmq'
import { PrismaClient } from '@prisma/client'
import { GoogleSheetsService } from '../services/google-sheets'

const connection = {
  host: process.env.REDIS_URL ? new URL(process.env.REDIS_URL).hostname : 'localhost',
  port: process.env.REDIS_URL ? Number(new URL(process.env.REDIS_URL).port) || 6379 : 6379,
}

const prisma = new PrismaClient()

interface SyncCostsJobData {
  from?: string
  to?: string
}

async function processSyncCosts(job: Job<SyncCostsJobData>) {
  const { from, to } = job.data
  const fromDate = from ? new Date(from) : new Date(Date.now() - 24 * 60 * 60 * 1000)
  const toDate = to ? new Date(to) : new Date()

  const syncLog = await prisma.syncLog.create({
    data: {
      source: 'google_sheets_costs',
      status: 'running',
      startedAt: new Date(),
    },
  })

  try {
    await job.updateProgress(10)
    await job.log('Fetching costs from Google Sheets...')

    const service = new GoogleSheetsService()
    const costsData = await service.fetchCosts(fromDate, toDate)

    await job.updateProgress(50)
    await job.log('Processing cost records...')

    // TODO: Parse and upsert cost records into the Cost table
    // Map sheet rows to site IDs using site.sheetName
    // For each row:
    //   const site = await prisma.site.findFirst({ where: { sheetName: row.siteName } })
    //   if (site) {
    //     await prisma.cost.upsert({
    //       where: { siteId_date_source: { siteId: site.id, date: row.date, source: 'google_sheets' } },
    //       create: { siteId: site.id, date: row.date, amount: row.amount, source: 'google_sheets' },
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
    await job.log(`Costs sync completed: ${recordsProcessed} records processed`)

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

export const syncCostsWorker = new Worker<SyncCostsJobData>(
  'sync-costs',
  processSyncCosts,
  {
    connection,
    concurrency: 1,
  }
)

syncCostsWorker.on('completed', (job) => {
  console.log(`[sync-costs] Job ${job.id} completed`)
})

syncCostsWorker.on('failed', (job, error) => {
  console.error(`[sync-costs] Job ${job?.id} failed:`, error.message)
})

export default syncCostsWorker
