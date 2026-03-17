import { Worker, Job } from 'bullmq'
import { PrismaClient, Prisma } from '@prisma/client'
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
    await job.log('Loading Google Sheets settings...')

    // Load sheet ID from settings
    const costsSetting = await prisma.setting.findUnique({ where: { key: 'costs_sheet_id' } })
    const costsSheetId = costsSetting?.value as string | undefined

    if (!costsSheetId) {
      throw new Error('Costs sheet ID not configured. Go to Settings → Google Sheets and save the sheet URL.')
    }

    const service = new GoogleSheetsService(costsSheetId)

    await job.updateProgress(20)
    await job.log('Fetching costs from Google Sheets...')

    const costsData = await service.fetchCosts(fromDate, toDate)
    await job.log(`Fetched ${costsData.length} cost rows from sheet`)

    await job.updateProgress(50)
    await job.log('Matching sites and upserting cost records...')

    // Load all sites for matching by name/domain/sheetName
    const sites = await prisma.site.findMany({
      select: { id: true, name: true, domain: true, sheetName: true, slug: true },
    })

    let recordsProcessed = 0
    let skipped = 0

    for (const row of costsData) {
      // Match site by sheetName, name, domain, or slug (case-insensitive)
      const siteName = row.siteName.toLowerCase().trim()
      const site = sites.find(s =>
        (s.sheetName && s.sheetName.toLowerCase() === siteName) ||
        s.name.toLowerCase() === siteName ||
        s.domain.toLowerCase() === siteName ||
        s.slug.toLowerCase() === siteName ||
        s.domain.toLowerCase().includes(siteName) ||
        siteName.includes(s.domain.toLowerCase())
      )

      if (!site) {
        skipped++
        if (skipped <= 5) {
          await job.log(`Warning: no matching site for "${row.siteName}", skipping`)
        }
        continue
      }

      const date = new Date(row.date + 'T00:00:00.000Z')

      // Filter by date range
      if (date < fromDate || date > toDate) continue

      await prisma.cost.upsert({
        where: {
          siteId_date_source: {
            siteId: site.id,
            date,
            source: 'google_sheets',
          },
        },
        create: {
          siteId: site.id,
          date,
          amount: new Prisma.Decimal(row.amount.toFixed(4)),
          source: 'google_sheets',
        },
        update: {
          amount: new Prisma.Decimal(row.amount.toFixed(4)),
        },
      })

      recordsProcessed++
    }

    if (skipped > 0) {
      await job.log(`Skipped ${skipped} rows with no matching site`)
    }

    await job.updateProgress(90)

    // Update daily metrics costs for affected sites/dates
    await job.log('Updating daily metrics with new cost data...')
    await recalcDailyMetricsCosts(fromDate, toDate)

    await prisma.syncLog.update({
      where: { id: syncLog.id },
      data: {
        status: 'completed',
        completedAt: new Date(),
        recordsProcessed,
      },
    })

    await job.updateProgress(100)
    await job.log(`Costs sync completed: ${recordsProcessed} records processed, ${skipped} skipped`)

    return { syncLogId: syncLog.id, recordsProcessed, skipped }
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

/**
 * After upserting costs, recalculate the costs/profit fields in DailyMetric
 */
async function recalcDailyMetricsCosts(from: Date, to: Date) {
  const costs = await prisma.cost.groupBy({
    by: ['siteId', 'date'],
    where: {
      date: { gte: from, lte: to },
    },
    _sum: { amount: true },
  })

  for (const c of costs) {
    const totalCost = Number(c._sum.amount || 0)

    const daily = await prisma.dailyMetric.findUnique({
      where: { siteId_date: { siteId: c.siteId, date: c.date } },
    })

    if (daily) {
      const totalRevenue = Number(daily.totalRevenue)
      const profit = totalRevenue - totalCost
      const romi = totalCost > 0 ? ((totalRevenue - totalCost) / totalCost) * 100 : 0

      await prisma.dailyMetric.update({
        where: { siteId_date: { siteId: c.siteId, date: c.date } },
        data: {
          costs: new Prisma.Decimal(totalCost.toFixed(4)),
          profit: new Prisma.Decimal(profit.toFixed(4)),
          romi: new Prisma.Decimal(romi.toFixed(2)),
        },
      })
    }
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
