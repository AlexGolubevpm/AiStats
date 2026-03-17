import { Worker, Job } from 'bullmq'
import { PrismaClient } from '@prisma/client'
import { YandexMetricaService } from '../services/yandex-metrica'

const connection = {
  host: process.env.REDIS_URL ? new URL(process.env.REDIS_URL).hostname : 'localhost',
  port: process.env.REDIS_URL ? Number(new URL(process.env.REDIS_URL).port) || 6379 : 6379,
}

const prisma = new PrismaClient()

interface SyncYandexMetricaJobData {
  from?: string // YYYY-MM-DD
  to?: string   // YYYY-MM-DD
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

async function processSyncYandexMetrica(job: Job<SyncYandexMetricaJobData>) {
  const now = new Date()
  const fromDate = job.data.from || formatDate(new Date(now.getTime() - 24 * 60 * 60 * 1000))
  const toDate = job.data.to || formatDate(now)

  const syncLog = await prisma.syncLog.create({
    data: { source: 'yandex_metrica', status: 'running' },
  })

  try {
    // Try to get token from Settings DB first, fall back to env var
    let oauthToken = process.env.YANDEX_METRIKA_OAUTH_TOKEN || ''
    try {
      const setting = await prisma.setting.findUnique({ where: { key: 'yandex_metrika_oauth_token' } })
      if (setting?.value) {
        const val = typeof setting.value === 'string' ? setting.value : JSON.stringify(setting.value)
        // Settings store as JSON, unwrap quotes if needed
        const cleaned = val.replace(/^"|"$/g, '')
        if (cleaned) oauthToken = cleaned
      }
    } catch { /* ignore, use env */ }

    const service = new YandexMetricaService(oauthToken)

    if (!service.isConfigured) {
      throw new Error('Yandex Metrica not configured. Set YANDEX_METRIKA_OAUTH_TOKEN in env or Settings → API Config.')
    }

    await job.updateProgress(5)
    await job.log(`Syncing Yandex Metrica data from ${fromDate} to ${toDate}`)

    // Load sites with metrikaCounterId
    const sites = await prisma.site.findMany({
      where: {
        isActive: true,
        metrikaCounterId: { not: null },
      },
    })

    const sitesWithCounter = sites.filter((s) => s.metrikaCounterId)

    if (sitesWithCounter.length === 0) {
      await job.log('No sites with Yandex Metrica counter IDs configured')
      throw new Error(
        'No sites have metrikaCounterId set. Go to Sites page and add Yandex Metrica counter IDs.'
      )
    }

    await job.log(`Found ${sitesWithCounter.length} sites with Metrica counters`)
    let totalRecords = 0

    for (let i = 0; i < sitesWithCounter.length; i++) {
      const site = sitesWithCounter[i]
      const counterId = site.metrikaCounterId!
      const progress = 5 + Math.round((i / sitesWithCounter.length) * 90)
      await job.updateProgress(progress)

      await job.log(`Fetching visitors for ${site.name} (counter: ${counterId})`)

      try {
        const dailyData = await service.fetchDailyVisitors(counterId, fromDate, toDate)

        for (const row of dailyData) {
          const date = new Date(row.date + 'T00:00:00.000Z')

          // Update the users field in DailyMetric (create if missing)
          const existing = await prisma.dailyMetric.findUnique({
            where: { siteId_date: { siteId: site.id, date } },
          })

          if (existing) {
            // Update users and recalculate RPM
            const totalRevenue = Number(existing.totalRevenue)
            const rpm = row.users > 0 ? (totalRevenue / row.users) * 1000 : 0

            await prisma.dailyMetric.update({
              where: { id: existing.id },
              data: {
                users: row.users,
                rpm: rpm.toFixed(4),
              },
            })
          } else {
            // Create a skeleton record with users only (AdOK data may arrive later)
            await prisma.dailyMetric.create({
              data: {
                siteId: site.id,
                date,
                users: row.users,
              },
            })
          }
          totalRecords++
        }

        await job.log(`  ${site.name}: ${dailyData.length} days updated`)
      } catch (siteError) {
        const message = siteError instanceof Error ? siteError.message : String(siteError)
        await job.log(`  Error for ${site.name} (counter ${counterId}): ${message}`)
        // Continue with other sites
      }
    }

    // ── Done ──
    await job.updateProgress(100)

    await prisma.syncLog.update({
      where: { id: syncLog.id },
      data: {
        status: 'completed',
        completedAt: new Date(),
        recordsProcessed: totalRecords,
      },
    })

    await job.log(`Sync completed: ${totalRecords} records processed`)
    return { syncLogId: syncLog.id, recordsProcessed: totalRecords }
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

export const syncYandexMetricaWorker = new Worker<SyncYandexMetricaJobData>(
  'sync-yandex-metrica',
  processSyncYandexMetrica,
  {
    connection,
    concurrency: 1,
    limiter: {
      max: 3,
      duration: 60_000,
    },
  }
)

syncYandexMetricaWorker.on('completed', (job) => {
  console.log(`[sync-yandex-metrica] Job ${job.id} completed:`, job.returnvalue)
})

syncYandexMetricaWorker.on('failed', (job, error) => {
  console.error(`[sync-yandex-metrica] Job ${job?.id} failed:`, error.message)
})

export default syncYandexMetricaWorker
