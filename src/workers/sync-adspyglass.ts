import { Worker, Job } from 'bullmq'
import { PrismaClient, Prisma, AdFormat } from '@prisma/client'
import { AdOkService, mapAdTypeToFormat, cleanDomain } from '../services/adspyglass'

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
    // Read credentials from Settings DB, fall back to env vars
    let authEmail = process.env.ADOK_AUTH_EMAIL || ''
    let authToken = process.env.ADOK_AUTH_TOKEN || ''
    let apiUrl = process.env.ADOK_API_URL || ''
    try {
      const settings = await prisma.setting.findMany({
        where: { key: { in: ['adok_auth_email', 'adok_auth_token', 'adspyglass_url'] } },
      })
      for (const s of settings) {
        const val = typeof s.value === 'string' ? s.value : JSON.stringify(s.value)
        const cleaned = val.replace(/^"|"$/g, '')
        if (!cleaned) continue
        if (s.key === 'adok_auth_email') authEmail = cleaned
        if (s.key === 'adok_auth_token') authToken = cleaned
        if (s.key === 'adspyglass_url') apiUrl = cleaned
      }
    } catch { /* ignore, use env */ }

    const service = new AdOkService(apiUrl || undefined, authEmail, authToken)

    if (!service.isConfigured) {
      throw new Error('AdOK API not configured. Set ADOK_AUTH_EMAIL and ADOK_AUTH_TOKEN in Settings → API Config.')
    }

    await job.updateProgress(5)
    await job.log(`Syncing AdOK data from ${fromDate} to ${toDate}`)

    // Load site mapping: domain/name/slug/sheetName → site record
    // Multiple keys per site to improve matching with AdOK website names
    const allSites = await prisma.site.findMany({ where: { isActive: true } })
    const siteByDomain = new Map<string, typeof allSites[0]>()
    for (const site of allSites) {
      // Primary: clean domain
      siteByDomain.set(cleanDomain(site.domain), site)
      // Fallback: domain without TLD (e.g. "mysite" from "mysite.com")
      const withoutTld = cleanDomain(site.domain).replace(/\.[^.]+$/, '')
      if (withoutTld && !siteByDomain.has(withoutTld)) {
        siteByDomain.set(withoutTld, site)
      }
      // Fallback: slug, name, sheetName (lowercased)
      if (site.slug) siteByDomain.set(site.slug.toLowerCase(), site)
      if (site.name) siteByDomain.set(site.name.toLowerCase(), site)
      if (site.sheetName) siteByDomain.set(cleanDomain(site.sheetName), site)
    }

    await job.log(`Loaded ${allSites.length} sites with ${siteByDomain.size} mapping keys`)
    let totalRecords = 0

    // ── Step 1: Fetch per-website data using group_by=website ──
    await job.updateProgress(10)
    await job.log('Fetching daily data with website grouping...')

    const dailyRows = await service.fetchReport({ from: fromDate, to: toDate, group_by: 'date' })
    await job.log(`Got ${dailyRows.length} daily rows`)

    for (let dayIdx = 0; dayIdx < dailyRows.length; dayIdx++) {
      const dayRow = dailyRows[dayIdx]
      const dateStr = dayRow.name
      if (!dateStr) continue

      const date = new Date(dateStr + 'T00:00:00.000Z')
      const progress = 10 + Math.round((dayIdx / dailyRows.length) * 50)
      await job.updateProgress(progress)

      // Fetch real per-website data — no spot parsing needed
      const websiteRows = await service.fetchReport({ from: dateStr, to: dateStr, group_by: 'website' })

      let matchedSites = 0
      const unmatchedDomains: string[] = []
      for (const row of websiteRows) {
        if (!row.name) continue
        const domain = cleanDomain(row.name)
        // Try multiple matching strategies
        const site = siteByDomain.get(domain)
          || siteByDomain.get(domain.replace(/\.[^.]+$/, ''))  // without TLD
          || siteByDomain.get(row.name.toLowerCase())          // raw name lowercased
        if (!site) {
          unmatchedDomains.push(domain)
          continue
        }

        // Use predicted_income for website-level data (broker_income is only confirmed/partial)
        // At date-level, broker_income ≈ sum of website predicted_income
        const adRevenue = row.predicted_income || row.broker_income
        const ctr = row.impressions > 0 ? (row.clicks / row.impressions) * 100 : 0
        const fillRate = row.hits > 0 ? (row.impressions / row.hits) * 100 : 0
        const ecpm = row.impressions > 0 ? (adRevenue / row.impressions) * 1000 : 0

        // hits = ad script requests from AdOK
        // users = 0 here, will be filled from Yandex Metrica
        await prisma.dailyMetric.upsert({
          where: { siteId_date: { siteId: site.id, date } },
          create: {
            siteId: site.id,
            date,
            users: 0,
            hits: row.hits,
            impressions: row.impressions,
            clicks: row.clicks,
            adRevenue: new Prisma.Decimal(adRevenue.toFixed(4)),
            totalRevenue: new Prisma.Decimal(adRevenue.toFixed(4)),
            ctr: new Prisma.Decimal(ctr.toFixed(4)),
            fillRate: new Prisma.Decimal(fillRate.toFixed(4)),
            ecpm: new Prisma.Decimal(ecpm.toFixed(4)),
            rpm: new Prisma.Decimal('0'),
          },
          update: {
            hits: row.hits,
            impressions: row.impressions,
            clicks: row.clicks,
            adRevenue: new Prisma.Decimal(adRevenue.toFixed(4)),
            totalRevenue: new Prisma.Decimal(adRevenue.toFixed(4)),
            ctr: new Prisma.Decimal(ctr.toFixed(4)),
            fillRate: new Prisma.Decimal(fillRate.toFixed(4)),
            ecpm: new Prisma.Decimal(ecpm.toFixed(4)),
          },
        })
        totalRecords++
        matchedSites++
      }

      if (unmatchedDomains.length > 0) {
        await job.log(`  Unmatched domains: ${unmatchedDomains.join(', ')}`)
      }
      await job.log(`  ${dateStr}: ${matchedSites} matched, ${unmatchedDomains.length} unmatched from ${websiteRows.length} websites`)
    }

    // ── Step 2: Fetch format data (ad_type) per date ──
    // ad_type is network-wide from AdOK, distributed proportionally by hits
    await job.updateProgress(65)
    await job.log('Fetching format breakdown...')

    for (let dayIdx = 0; dayIdx < dailyRows.length; dayIdx++) {
      const dateStr = dailyRows[dayIdx].name
      if (!dateStr) continue
      const date = new Date(dateStr + 'T00:00:00.000Z')

      const formatRows = await service.fetchReport({ from: dateStr, to: dateStr, group_by: 'ad_type' })

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
          const siteCtr = Math.min(siteImpressions > 0 ? (siteClicks / siteImpressions) * 100 : 0, 9999)
          const siteFillRate = Math.min(fRow.fill_rate, 9999)
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
    // country is also network-wide, distributed proportionally by hits
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
          const siteHits = Math.round(agg.hits * siteShare)
          const siteImpressions = Math.round(agg.impressions * siteShare)
          const siteClicks = Math.round(agg.clicks * siteShare)
          const siteRevenue = agg.revenue * siteShare

          if (siteHits === 0) continue

          const siteCtr = siteImpressions > 0 ? (siteClicks / siteImpressions) * 100 : 0
          const siteFillRate = siteHits > 0 ? (siteImpressions / siteHits) * 100 : 0
          const siteRpm = siteHits > 0 ? (siteRevenue / siteHits) * 1000 : 0

          await prisma.tierMetric.upsert({
            where: { siteId_date_tier: { siteId: site.id, date, tier: tier as any } },
            create: {
              siteId: site.id,
              date,
              tier: tier as any,
              users: siteHits, // proportional hits as traffic proxy (no per-tier Metrica data)
              impressions: siteImpressions,
              clicks: siteClicks,
              revenue: new Prisma.Decimal(siteRevenue.toFixed(4)),
              ctr: new Prisma.Decimal(siteCtr.toFixed(4)),
              fillRate: new Prisma.Decimal(siteFillRate.toFixed(4)),
              rpm: new Prisma.Decimal(siteRpm.toFixed(4)),
            },
            update: {
              users: siteHits,
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
