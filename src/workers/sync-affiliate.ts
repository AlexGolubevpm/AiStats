import { Worker, Job } from 'bullmq'
import { PrismaClient, Prisma } from '@prisma/client'
import { GoogleSheetsService } from '../services/google-sheets'
import { cleanDomain } from '../services/adspyglass'

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
  // Google Sheets CSV is fetched in full — no need to restrict by default date range.
  // Only filter when explicit from/to is provided.
  const fromDate = from ? new Date(from) : null
  const toDate = to ? new Date(to) : null

  const syncLog = await prisma.syncLog.create({
    data: {
      source: 'google_sheets_affiliate',
      status: 'running',
      startedAt: new Date(),
    },
  })

  try {
    await job.updateProgress(10)
    await job.log('Loading Google Sheets settings...')

    const affiliateSetting = await prisma.setting.findUnique({ where: { key: 'affiliate_sheet_id' } })
    const affiliateSheetId = affiliateSetting?.value as string | undefined

    if (!affiliateSheetId) {
      throw new Error('Affiliate sheet ID not configured. Go to Settings → Google Sheets and save the sheet URL.')
    }

    const service = new GoogleSheetsService(undefined, affiliateSheetId)

    await job.updateProgress(20)
    await job.log('Fetching affiliate revenue from Google Sheets...')

    const affiliateData = await service.fetchAffiliateRevenue(fromDate ?? new Date(0), toDate ?? new Date())
    await job.log(`Fetched ${affiliateData.length} affiliate rows from sheet`)

    await job.updateProgress(50)
    await job.log('Matching sites and upserting affiliate records...')

    const sites = await prisma.site.findMany({
      select: { id: true, name: true, domain: true, sheetName: true, slug: true },
    })

    const sitesWithNorm = sites.map(s => ({
      ...s,
      norm: cleanDomain(s.domain.toLowerCase()),
      normName: s.name.toLowerCase().trim(),
      normSheet: s.sheetName?.toLowerCase().trim() || '',
      normSlug: s.slug.toLowerCase().trim(),
    }))

    let recordsProcessed = 0
    let skipped = 0

    for (const row of affiliateData) {
      const rawName = row.siteName.toLowerCase().trim()
      const normInput = cleanDomain(rawName)

      const site = sitesWithNorm.find(s =>
        (s.normSheet && s.normSheet === rawName) ||
        s.normName === rawName ||
        s.norm === normInput ||
        s.normSlug === rawName ||
        s.norm.includes(normInput) ||
        normInput.includes(s.norm)
      )

      if (!site) {
        skipped++
        if (skipped <= 5) {
          await job.log(`Warning: no matching site for "${row.siteName}", skipping`)
        }
        continue
      }

      const date = new Date(row.date + 'T00:00:00.000Z')
      // Filter by date range only if explicit bounds were provided
      if (fromDate && date < fromDate) continue
      if (toDate && date > toDate) continue

      const source = row.source || 'google_sheets'

      await prisma.affiliateRevenue.upsert({
        where: {
          siteId_date_source: { siteId: site.id, date, source },
        },
        create: {
          siteId: site.id,
          date,
          amount: new Prisma.Decimal(row.amount.toFixed(4)),
          source,
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

    await job.updateProgress(85)
    await job.log('Updating daily metrics with affiliate revenue...')
    // Recalculate for the full range of imported data
    const allAffDates = await prisma.affiliateRevenue.aggregate({
      _min: { date: true },
      _max: { date: true },
    })
    if (allAffDates._min.date && allAffDates._max.date) {
      await recalcDailyMetricsAffiliate(
        fromDate || allAffDates._min.date,
        toDate || allAffDates._max.date,
      )
    }

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

/**
 * After upserting affiliate revenue, recalculate affiliateRevenue/totalRevenue/profit in DailyMetric
 */
async function recalcDailyMetricsAffiliate(from: Date, to: Date) {
  const revenues = await prisma.affiliateRevenue.groupBy({
    by: ['siteId', 'date'],
    where: {
      date: { gte: from, lte: to },
    },
    _sum: { amount: true },
  })

  for (const r of revenues) {
    const totalAffiliate = Number(r._sum.amount || 0)

    const daily = await prisma.dailyMetric.findUnique({
      where: { siteId_date: { siteId: r.siteId, date: r.date } },
    })

    if (daily) {
      const adRev = Number(daily.adRevenue)
      const totalRevenue = adRev + totalAffiliate
      const costs = Number(daily.costs)
      const profit = totalRevenue - costs
      const romi = costs > 0 ? ((totalRevenue - costs) / costs) * 100 : 0

      await prisma.dailyMetric.update({
        where: { siteId_date: { siteId: r.siteId, date: r.date } },
        data: {
          affiliateRevenue: new Prisma.Decimal(totalAffiliate.toFixed(4)),
          totalRevenue: new Prisma.Decimal(totalRevenue.toFixed(4)),
          profit: new Prisma.Decimal(profit.toFixed(4)),
          romi: new Prisma.Decimal(romi.toFixed(2)),
        },
      })
    }
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
