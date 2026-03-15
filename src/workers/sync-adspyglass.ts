import { Worker, Job } from 'bullmq'
import { PrismaClient, Prisma, AdFormat } from '@prisma/client'
import { AdOkService, mapAdTypeToFormat } from '../services/adspyglass'

const connection = {
  host: process.env.REDIS_URL ? new URL(process.env.REDIS_URL).hostname : 'localhost',
  port: process.env.REDIS_URL ? Number(new URL(process.env.REDIS_URL).port) || 6379 : 6379,
}

const prisma = new PrismaClient()

interface SyncAdspyglassJobData {
  from?: string // YYYY-MM-DD
  to?: string   // YYYY-MM-DD
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

// GEO tier classification by ISO country code
const TIER_1_COUNTRIES = new Set([
  'US', 'GB', 'CA', 'AU', 'DE', 'FR', 'NL', 'SE', 'NO', 'DK', 'FI', 'CH', 'AT', 'BE', 'IE', 'NZ', 'LU',
])
const TIER_2_COUNTRIES = new Set([
  'ES', 'IT', 'PT', 'PL', 'CZ', 'RO', 'HU', 'GR', 'JP', 'KR', 'SG', 'HK', 'TW', 'IL', 'AE', 'SA',
  'BR', 'MX', 'AR', 'CL', 'CO',
])
const TIER_3_COUNTRIES = new Set([
  'RU', 'UA', 'TR', 'TH', 'VN', 'PH', 'ID', 'MY', 'IN', 'ZA', 'NG', 'EG', 'KE', 'PE', 'EC',
])

function getGeoTier(iso: string): 'TIER_1' | 'TIER_2' | 'TIER_3' | 'TIER_4' {
  const code = iso.toUpperCase()
  if (TIER_1_COUNTRIES.has(code)) return 'TIER_1'
  if (TIER_2_COUNTRIES.has(code)) return 'TIER_2'
  if (TIER_3_COUNTRIES.has(code)) return 'TIER_3'
  return 'TIER_4'
}

async function processSyncAdspyglass(job: Job<SyncAdspyglassJobData>) {
  const now = new Date()
  const fromDate = job.data.from || formatDate(new Date(now.getTime() - 24 * 60 * 60 * 1000))
  const toDate = job.data.to || formatDate(now)

  const syncLog = await prisma.syncLog.create({
    data: { source: 'adspyglass', status: 'running' },
  })

  try {
    const service = new AdOkService()

    if (!service.isConfigured) {
      throw new Error('AdOK API not configured. Set ADOK_AUTH_EMAIL and ADOK_AUTH_TOKEN.')
    }

    await job.updateProgress(5)
    await job.log(`Syncing AdOK data from ${fromDate} to ${toDate}`)

    // Load site mapping: domain → site record
    const allSites = await prisma.site.findMany({ where: { isActive: true } })
    const siteByDomain = new Map<string, typeof allSites[0]>()
    for (const site of allSites) {
      // Store by clean domain
      const cleanDomain = site.domain.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '')
      siteByDomain.set(cleanDomain, site)
    }

    await job.log(`Loaded ${siteByDomain.size} site mappings`)
    let totalRecords = 0

    // ── Step 1: Fetch daily spot data (per-site breakdown) ──
    await job.updateProgress(10)
    await job.log('Fetching daily data with spot grouping...')

    const dailyRows = await service.fetchReport({ from: fromDate, to: toDate, group_by: 'date' })
    await job.log(`Got ${dailyRows.length} daily rows`)

    for (let dayIdx = 0; dayIdx < dailyRows.length; dayIdx++) {
      const dayRow = dailyRows[dayIdx]
      const dateStr = dayRow.name
      if (!dateStr) continue

      const date = new Date(dateStr + 'T00:00:00.000Z')
      const progress = 10 + Math.round((dayIdx / dailyRows.length) * 50)
      await job.updateProgress(progress)

      // Fetch spot-level data for this specific date
      const spotRows = await service.fetchReport({ from: dateStr, to: dateStr, group_by: 'spot' })

      // Aggregate spots by domain
      const domainAgg = new Map<string, {
        hits: number; clicks: number; impressions: number; revenue: number; predictedRevenue: number
      }>()

      for (const spot of spotRows) {
        const rawDomain = extractDomain(spot.name || '')
        if (!rawDomain) continue

        const existing = domainAgg.get(rawDomain)
        if (existing) {
          existing.hits += spot.hits
          existing.clicks += spot.clicks
          existing.impressions += spot.impressions
          existing.revenue += spot.broker_income
          existing.predictedRevenue += spot.predicted_income
        } else {
          domainAgg.set(rawDomain, {
            hits: spot.hits,
            clicks: spot.clicks,
            impressions: spot.impressions,
            revenue: spot.broker_income,
            predictedRevenue: spot.predicted_income,
          })
        }
      }

      // Upsert DailyMetric for each matched site
      for (const [domain, agg] of domainAgg) {
        const site = siteByDomain.get(domain)
        if (!site) {
          await job.log(`  Unmatched domain: ${domain}`)
          continue
        }

        const adRevenue = agg.revenue
        const ctr = agg.impressions > 0 ? (agg.clicks / agg.impressions) * 100 : 0
        const fillRate = agg.hits > 0 ? (agg.impressions / agg.hits) * 100 : 0
        const ecpm = agg.impressions > 0 ? (adRevenue / agg.impressions) * 1000 : 0
        const rpm = agg.hits > 0 ? (adRevenue / agg.hits) * 1000 : 0

        await prisma.dailyMetric.upsert({
          where: { siteId_date: { siteId: site.id, date } },
          create: {
            siteId: site.id,
            date,
            users: agg.hits, // hits ≈ users (page views)
            hits: agg.hits,
            impressions: agg.impressions,
            clicks: agg.clicks,
            adRevenue: new Prisma.Decimal(adRevenue.toFixed(4)),
            totalRevenue: new Prisma.Decimal(adRevenue.toFixed(4)),
            ctr: new Prisma.Decimal(ctr.toFixed(4)),
            fillRate: new Prisma.Decimal(fillRate.toFixed(4)),
            ecpm: new Prisma.Decimal(ecpm.toFixed(4)),
            rpm: new Prisma.Decimal(rpm.toFixed(4)),
          },
          update: {
            users: agg.hits,
            hits: agg.hits,
            impressions: agg.impressions,
            clicks: agg.clicks,
            adRevenue: new Prisma.Decimal(adRevenue.toFixed(4)),
            totalRevenue: new Prisma.Decimal(adRevenue.toFixed(4)),
            ctr: new Prisma.Decimal(ctr.toFixed(4)),
            fillRate: new Prisma.Decimal(fillRate.toFixed(4)),
            ecpm: new Prisma.Decimal(ecpm.toFixed(4)),
            rpm: new Prisma.Decimal(rpm.toFixed(4)),
          },
        })
        totalRecords++
      }

      await job.log(`  ${dateStr}: ${domainAgg.size} sites, ${spotRows.length} spots`)
    }

    // ── Step 2: Fetch format data (ad_type) per date ──
    await job.updateProgress(65)
    await job.log('Fetching format breakdown...')

    for (let dayIdx = 0; dayIdx < dailyRows.length; dayIdx++) {
      const dateStr = dailyRows[dayIdx].name
      if (!dateStr) continue
      const date = new Date(dateStr + 'T00:00:00.000Z')

      const formatRows = await service.fetchReport({ from: dateStr, to: dateStr, group_by: 'ad_type' })

      // Format data is network-wide (not per-site), so we store it at network level
      // We'll distribute to sites proportionally based on their traffic share
      const totalHitsForDay = formatRows.reduce((sum, r) => sum + r.hits, 0)

      for (const site of allSites) {
        const dailyMetric = await prisma.dailyMetric.findUnique({
          where: { siteId_date: { siteId: site.id, date } },
        })
        if (!dailyMetric || dailyMetric.hits === 0) continue

        const siteShare = dailyMetric.hits / totalHitsForDay

        for (const fRow of formatRows) {
          if (!fRow.name || fRow.impressions === 0) continue
          const formatKey = mapAdTypeToFormat(fRow.name) as AdFormat

          const siteImpressions = Math.round(fRow.impressions * siteShare)
          const siteClicks = Math.round(fRow.clicks * siteShare)
          const siteRevenue = fRow.broker_income * siteShare
          const siteCtr = siteImpressions > 0 ? (siteClicks / siteImpressions) * 100 : 0
          const siteFillRate = fRow.fill_rate
          const siteEcpm = siteImpressions > 0 ? (siteRevenue / siteImpressions) * 1000 : 0
          const siteRpm = dailyMetric.hits > 0 ? (siteRevenue / Number(dailyMetric.hits)) * 1000 : 0

          if (siteImpressions === 0) continue

          await prisma.formatMetric.upsert({
            where: { siteId_date_format: { siteId: site.id, date, format: formatKey } },
            create: {
              siteId: site.id,
              date,
              format: formatKey,
              impressions: siteImpressions,
              clicks: siteClicks,
              revenue: new Prisma.Decimal(siteRevenue.toFixed(4)),
              ctr: new Prisma.Decimal(siteCtr.toFixed(4)),
              fillRate: new Prisma.Decimal(siteFillRate.toFixed(4)),
              ecpm: new Prisma.Decimal(siteEcpm.toFixed(4)),
              rpm: new Prisma.Decimal(siteRpm.toFixed(4)),
            },
            update: {
              impressions: siteImpressions,
              clicks: siteClicks,
              revenue: new Prisma.Decimal(siteRevenue.toFixed(4)),
              ctr: new Prisma.Decimal(siteCtr.toFixed(4)),
              fillRate: new Prisma.Decimal(siteFillRate.toFixed(4)),
              ecpm: new Prisma.Decimal(siteEcpm.toFixed(4)),
              rpm: new Prisma.Decimal(siteRpm.toFixed(4)),
            },
          })
          totalRecords++
        }
      }
    }

    // ── Step 3: Fetch country data for tier metrics ──
    await job.updateProgress(80)
    await job.log('Fetching country/tier breakdown...')

    for (let dayIdx = 0; dayIdx < dailyRows.length; dayIdx++) {
      const dateStr = dailyRows[dayIdx].name
      if (!dateStr) continue
      const date = new Date(dateStr + 'T00:00:00.000Z')

      const countryRows = await service.fetchReport({ from: dateStr, to: dateStr, group_by: 'country' })

      // Aggregate countries into tiers
      const tierAgg = new Map<string, { hits: number; impressions: number; clicks: number; revenue: number }>()

      for (const cRow of countryRows) {
        if (!cRow.iso) continue
        const tier = getGeoTier(cRow.iso)

        const existing = tierAgg.get(tier)
        if (existing) {
          existing.hits += cRow.hits
          existing.impressions += cRow.impressions
          existing.clicks += cRow.clicks
          existing.revenue += cRow.broker_income
        } else {
          tierAgg.set(tier, {
            hits: cRow.hits,
            impressions: cRow.impressions,
            clicks: cRow.clicks,
            revenue: cRow.broker_income,
          })
        }
      }

      const totalHitsCountry = Array.from(tierAgg.values()).reduce((s, v) => s + v.hits, 0)

      // Distribute tier data across sites proportionally
      for (const site of allSites) {
        const dailyMetric = await prisma.dailyMetric.findUnique({
          where: { siteId_date: { siteId: site.id, date } },
        })
        if (!dailyMetric || dailyMetric.hits === 0) continue

        const siteShare = dailyMetric.hits / (totalHitsCountry || 1)

        for (const [tier, agg] of tierAgg) {
          const siteUsers = Math.round(agg.hits * siteShare)
          const siteImpressions = Math.round(agg.impressions * siteShare)
          const siteClicks = Math.round(agg.clicks * siteShare)
          const siteRevenue = agg.revenue * siteShare

          if (siteUsers === 0) continue

          const siteCtr = siteImpressions > 0 ? (siteClicks / siteImpressions) * 100 : 0
          const siteFillRate = siteUsers > 0 ? (siteImpressions / siteUsers) * 100 : 0
          const siteRpm = siteUsers > 0 ? (siteRevenue / siteUsers) * 1000 : 0

          await prisma.tierMetric.upsert({
            where: { siteId_date_tier: { siteId: site.id, date, tier: tier as any } },
            create: {
              siteId: site.id,
              date,
              tier: tier as any,
              users: siteUsers,
              impressions: siteImpressions,
              clicks: siteClicks,
              revenue: new Prisma.Decimal(siteRevenue.toFixed(4)),
              ctr: new Prisma.Decimal(siteCtr.toFixed(4)),
              fillRate: new Prisma.Decimal(siteFillRate.toFixed(4)),
              rpm: new Prisma.Decimal(siteRpm.toFixed(4)),
            },
            update: {
              users: siteUsers,
              impressions: siteImpressions,
              clicks: siteClicks,
              revenue: new Prisma.Decimal(siteRevenue.toFixed(4)),
              ctr: new Prisma.Decimal(siteCtr.toFixed(4)),
              fillRate: new Prisma.Decimal(siteFillRate.toFixed(4)),
              rpm: new Prisma.Decimal(siteRpm.toFixed(4)),
            },
          })
          totalRecords++
        }
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

function extractDomain(spotName: string): string | null {
  const match = spotName.match(/\(([^)]+)\)\s*$/)
  if (!match) return null
  return match[1]
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/$/, '')
}

export const syncAdspyglassWorker = new Worker<SyncAdspyglassJobData>(
  'sync-adspyglass',
  processSyncAdspyglass,
  {
    connection,
    concurrency: 1,
    limiter: {
      max: 2,
      duration: 60_000,
    },
  }
)

syncAdspyglassWorker.on('completed', (job) => {
  console.log(`[sync-adspyglass] Job ${job.id} completed:`, job.returnvalue)
})

syncAdspyglassWorker.on('failed', (job, error) => {
  console.error(`[sync-adspyglass] Job ${job?.id} failed:`, error.message)
})

export default syncAdspyglassWorker
