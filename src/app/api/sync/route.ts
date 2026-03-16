import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { Prisma, AdFormat } from '@prisma/client'
import { jsonResponse, errorResponse } from '@/lib/api-utils'
import { AdOkService, mapAdTypeToFormat } from '@/services/adspyglass'
import { YandexMetricaService, getGeoTierByCountryName } from '@/services/yandex-metrica'
import { calculateHealthScore } from '@/services/health-score'
import { detectAnomalies } from '@/services/anomaly-detector'

export async function GET() {
  try {
    const logs = await prisma.syncLog.findMany({
      orderBy: { startedAt: 'desc' },
      take: 50,
    })

    const result = logs.map((log) => ({
      id: log.id,
      source: log.source,
      status: log.status,
      startedAt: log.startedAt,
      completedAt: log.completedAt,
      recordsProcessed: log.recordsProcessed,
      error: log.error,
    }))

    return jsonResponse(result)
  } catch (error) {
    console.error('Sync API error:', error)
    return errorResponse('Failed to load sync logs')
  }
}

// ─── GEO tier classification ───

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

function extractDomain(spotName: string): string | null {
  const match = spotName.match(/\(([^)]+)\)\s*$/)
  if (!match) return null
  return match[1]
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/$/, '')
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

// ─── POST: Optimized sync — 4-5 API calls instead of 120+ ───

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const source = (body as { source?: string }).source || 'all'

  if (!['adspyglass', 'yandex', 'all'].includes(source)) {
    return jsonResponse({ message: `Source '${source}' not supported` }, 400)
  }

  const syncLog = await prisma.syncLog.create({
    data: { source, status: 'running' },
  })

  try {
    const service = new AdOkService()
    const skipAdspyglass = source === 'yandex'

    if (!skipAdspyglass && !service.isConfigured) {
      throw new Error('AdOK API not configured. Set ADOK_AUTH_EMAIL and ADOK_AUTH_TOKEN.')
    }

    // Default: sync last 7 days (was 30 — too many API calls)
    const now = new Date()
    const fromDate = (body as { from?: string }).from || formatDate(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000))
    const toDate = (body as { to?: string }).to || formatDate(now)

    // Load site mapping: domain → site record
    const allSites = await prisma.site.findMany({ where: { isActive: true } })
    const siteByDomain = new Map<string, typeof allSites[0]>()
    for (const site of allSites) {
      const cleanDomain = site.domain.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '')
      siteByDomain.set(cleanDomain, site)
    }

    let totalRecords = 0

    if (!skipAdspyglass) {
      // ── Step 1: Fetch spot data for entire period (1 API call) ──
      console.log(`[sync] Fetching spot data from ${fromDate} to ${toDate}...`)
      const spotRows = await service.fetchReport({ from: fromDate, to: toDate, group_by: 'spot' })
      console.log(`[sync] Got ${spotRows.length} spot rows`)

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

      console.log(`[sync] Aggregated ${domainAgg.size} domains from spots`)

      // Also fetch daily totals for trend (1 API call)
      const dailyRows = await service.fetchReport({ from: fromDate, to: toDate, group_by: 'date' })
      console.log(`[sync] Got ${dailyRows.length} daily rows for trend`)

      const totalDays = dailyRows.length || 1

      // For each matched site: create one DailyMetric per day, distributed evenly
      // Or create aggregate metric for the period
      for (const [domain, agg] of domainAgg) {
        const site = siteByDomain.get(domain)
        if (!site) {
          console.log(`[sync] WARN: domain ${domain} from AdOK not found in DB`)
          continue
        }

        // Distribute aggregate data across days proportionally
        for (const dayRow of dailyRows) {
          const dateStr = dayRow.name
          if (!dateStr) continue
          const date = new Date(dateStr + 'T00:00:00.000Z')

          // Calculate this day's share of total network metrics
          const totalNetworkRevenue = dailyRows.reduce((s, r) => s + r.broker_income, 0)
          const dayShare = totalNetworkRevenue > 0 ? dayRow.broker_income / totalNetworkRevenue : 1 / totalDays

          const dayHits = Math.round(agg.hits * dayShare)
          const dayClicks = Math.round(agg.clicks * dayShare)
          const dayImpressions = Math.round(agg.impressions * dayShare)
          const dayRevenue = agg.revenue * dayShare

          const ctr = dayImpressions > 0 ? (dayClicks / dayImpressions) * 100 : 0
          const fillRate = dayHits > 0 ? (dayImpressions / dayHits) * 100 : 0
          const ecpm = dayImpressions > 0 ? (dayRevenue / dayImpressions) * 1000 : 0
          const rpm = dayImpressions > 0 ? (dayRevenue / dayImpressions) * 1000 : 0

          // Check existing record for affiliate revenue and costs
          const existing = await prisma.dailyMetric.findUnique({
            where: { siteId_date: { siteId: site.id, date } },
            select: { users: true, pageviews: true, affiliateRevenue: true, costs: true },
          })
          const hasYandexData = existing && existing.pageviews > 0
          const existingAffiliate = existing ? Number(existing.affiliateRevenue) : 0
          const existingCosts = existing ? Number(existing.costs) : 0
          const totalRevenue = dayRevenue + existingAffiliate
          const profit = totalRevenue - existingCosts
          const romi = existingCosts > 0 ? ((totalRevenue - existingCosts) / existingCosts) * 100 : 0

          await prisma.dailyMetric.upsert({
            where: { siteId_date: { siteId: site.id, date } },
            create: {
              siteId: site.id,
              date,
              users: dayHits,
              hits: dayHits,
              impressions: dayImpressions,
              clicks: dayClicks,
              adRevenue: new Prisma.Decimal(dayRevenue.toFixed(4)),
              totalRevenue: new Prisma.Decimal(totalRevenue.toFixed(4)),
              profit: new Prisma.Decimal(profit.toFixed(4)),
              romi: new Prisma.Decimal(romi.toFixed(2)),
              ctr: new Prisma.Decimal(ctr.toFixed(4)),
              fillRate: new Prisma.Decimal(fillRate.toFixed(4)),
              ecpm: new Prisma.Decimal(ecpm.toFixed(4)),
              rpm: new Prisma.Decimal(rpm.toFixed(4)),
            },
            update: {
              ...(hasYandexData ? {} : { users: dayHits }),
              hits: dayHits,
              impressions: dayImpressions,
              clicks: dayClicks,
              adRevenue: new Prisma.Decimal(dayRevenue.toFixed(4)),
              totalRevenue: new Prisma.Decimal(totalRevenue.toFixed(4)),
              profit: new Prisma.Decimal(profit.toFixed(4)),
              romi: new Prisma.Decimal(romi.toFixed(2)),
              ctr: new Prisma.Decimal(ctr.toFixed(4)),
              fillRate: new Prisma.Decimal(fillRate.toFixed(4)),
              ecpm: new Prisma.Decimal(ecpm.toFixed(4)),
              rpm: new Prisma.Decimal(rpm.toFixed(4)),
            },
          })
          totalRecords++
        }

        console.log(`[sync] ${domain}: ${dailyRows.length} daily records`)
      }

      // ── Step 2: Fetch format data for entire period (1 API call) ──
      console.log('[sync] Fetching format breakdown...')
      const formatRows = await service.fetchReport({ from: fromDate, to: toDate, group_by: 'ad_type' })

      // Store format metrics at network level, distributed to sites by revenue share
      const totalNetworkHits = spotRows.reduce((s, r) => s + r.hits, 0)
      const latestDate = dailyRows.length > 0 ? new Date((dailyRows[dailyRows.length - 1].name || toDate) + 'T00:00:00.000Z') : new Date(toDate + 'T00:00:00.000Z')

      for (const site of allSites) {
        const siteData = domainAgg.get(site.domain)
        if (!siteData || totalNetworkHits === 0) continue

        const siteShare = siteData.hits / totalNetworkHits

        for (const fRow of formatRows) {
          if (!fRow.name || fRow.impressions === 0) continue
          const formatKey = mapAdTypeToFormat(fRow.name) as AdFormat

          const siteImpressions = Math.round(fRow.impressions * siteShare)
          const siteClicks = Math.round(fRow.clicks * siteShare)
          const siteRevenue = fRow.broker_income * siteShare
          if (siteImpressions === 0) continue

          const siteCtr = siteImpressions > 0 ? (siteClicks / siteImpressions) * 100 : 0
          const siteEcpm = siteImpressions > 0 ? (siteRevenue / siteImpressions) * 1000 : 0

          await prisma.formatMetric.upsert({
            where: { siteId_date_format: { siteId: site.id, date: latestDate, format: formatKey } },
            create: {
              siteId: site.id, date: latestDate, format: formatKey,
              impressions: siteImpressions, clicks: siteClicks,
              revenue: new Prisma.Decimal(siteRevenue.toFixed(4)),
              ctr: new Prisma.Decimal(siteCtr.toFixed(4)),
              fillRate: new Prisma.Decimal(fRow.fill_rate.toFixed(4)),
              ecpm: new Prisma.Decimal(siteEcpm.toFixed(4)),
              rpm: new Prisma.Decimal(siteEcpm.toFixed(4)),
            },
            update: {
              impressions: siteImpressions, clicks: siteClicks,
              revenue: new Prisma.Decimal(siteRevenue.toFixed(4)),
              ctr: new Prisma.Decimal(siteCtr.toFixed(4)),
              fillRate: new Prisma.Decimal(fRow.fill_rate.toFixed(4)),
              ecpm: new Prisma.Decimal(siteEcpm.toFixed(4)),
              rpm: new Prisma.Decimal(siteEcpm.toFixed(4)),
            },
          })
          totalRecords++
        }
      }

      // ── Step 3: Fetch country data for tier metrics (1 API call) ──
      console.log('[sync] Fetching country/tier breakdown...')
      const countryRows = await service.fetchReport({ from: fromDate, to: toDate, group_by: 'country' })

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
            hits: cRow.hits, impressions: cRow.impressions,
            clicks: cRow.clicks, revenue: cRow.broker_income,
          })
        }
      }

      const totalHitsCountry = Array.from(tierAgg.values()).reduce((s, v) => s + v.hits, 0)

      for (const site of allSites) {
        const siteData = domainAgg.get(site.domain)
        if (!siteData || totalHitsCountry === 0) continue

        const siteShare = siteData.hits / totalHitsCountry

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
            where: { siteId_date_tier: { siteId: site.id, date: latestDate, tier: tier as 'TIER_1' | 'TIER_2' | 'TIER_3' | 'TIER_4' } },
            create: {
              siteId: site.id, date: latestDate,
              tier: tier as 'TIER_1' | 'TIER_2' | 'TIER_3' | 'TIER_4',
              users: siteUsers, impressions: siteImpressions,
              clicks: siteClicks,
              revenue: new Prisma.Decimal(siteRevenue.toFixed(4)),
              ctr: new Prisma.Decimal(siteCtr.toFixed(4)),
              fillRate: new Prisma.Decimal(siteFillRate.toFixed(4)),
              rpm: new Prisma.Decimal(siteRpm.toFixed(4)),
            },
            update: {
              users: siteUsers, impressions: siteImpressions,
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

      console.log(`[sync] AdOK: done (4 API calls, ${totalRecords} records)`)
    } // end if (!skipAdspyglass)

    // ── Step 4: Yandex Metrica — real users, pageviews ──
    let yandexSynced = 0

    let yandexToken = process.env.YANDEX_OAUTH_TOKEN || ''
    if (!yandexToken) {
      const setting = await prisma.setting.findUnique({ where: { key: 'yandex.oauth_token' } })
      if (setting) yandexToken = setting.value as string
    }

    if (yandexToken) {
      console.log('[sync] Starting Yandex Metrica sync...')
      const ym = new YandexMetricaService(yandexToken)

      const sitesWithCounters = allSites.filter(s => s.yandexCounterId)

      for (const site of sitesWithCounters) {
        const counterId = parseInt(site.yandexCounterId!, 10)
        if (!counterId) continue

        try {
          const dailyStats = await ym.getDailyStats(counterId, fromDate, toDate)

          for (const day of dailyStats) {
            if (!day.date) continue
            const date = new Date(day.date + 'T00:00:00.000Z')

            await prisma.dailyMetric.upsert({
              where: { siteId_date: { siteId: site.id, date } },
              create: {
                siteId: site.id,
                date,
                users: day.users,
                pageviews: day.pageviews,
                hits: day.visits,
              },
              update: {
                users: day.users,
                pageviews: day.pageviews,
              },
            })
            yandexSynced++
          }

          console.log(`[sync:yandex] ${site.domain}: synced counter ${counterId}`)
        } catch (err) {
          console.error(`[sync:yandex] Error for ${site.domain} (counter ${counterId}):`, err instanceof Error ? err.message : err)
        }
      }

      console.log(`[sync:yandex] Done: ${yandexSynced} records`)
    } else {
      console.log('[sync] Yandex Metrica: skipped (no OAuth token)')
    }

    totalRecords += yandexSynced

    // ── Step 5: Calculate health scores and detect anomalies ──
    console.log('[sync] Calculating health scores and detecting anomalies...')
    const today = new Date(toDate + 'T00:00:00.000Z')

    for (const site of allSites) {
      try {
        await calculateHealthScore(site.id, today)
        await detectAnomalies(site.id, today)
      } catch (err) {
        console.error(`[sync:health] Error for ${site.domain}:`, err instanceof Error ? err.message : err)
      }
    }
    console.log(`[sync] Health scores and anomalies calculated for ${allSites.length} sites`)

    // ── Done ──
    await prisma.syncLog.update({
      where: { id: syncLog.id },
      data: {
        status: 'completed',
        completedAt: new Date(),
        recordsProcessed: totalRecords,
      },
    })

    console.log(`[sync] Completed: ${totalRecords} records processed`)

    return jsonResponse({
      message: 'Sync completed',
      syncLogId: syncLog.id,
      recordsProcessed: totalRecords,
      yandexRecords: yandexSynced,
      period: { from: fromDate, to: toDate },
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('[sync] Failed:', errorMessage)

    await prisma.syncLog.update({
      where: { id: syncLog.id },
      data: {
        status: 'failed',
        completedAt: new Date(),
        error: errorMessage,
      },
    })

    return errorResponse(`Sync failed: ${errorMessage}`)
  }
}
