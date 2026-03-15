import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { Prisma, AdFormat } from '@prisma/client'
import { jsonResponse, errorResponse } from '@/lib/api-utils'
import { AdOkService, mapAdTypeToFormat } from '@/services/adspyglass'

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

// ─── POST: Direct sync from AdSpyglass API ───

export async function POST(request: NextRequest) {
  const syncLog = await prisma.syncLog.create({
    data: { source: 'adspyglass', status: 'running' },
  })

  try {
    const body = await request.json().catch(() => ({}))
    const source = (body as { source?: string }).source || 'adspyglass'

    if (source !== 'adspyglass' && source !== 'all') {
      return jsonResponse({ message: `Source '${source}' not supported for direct sync` }, 400)
    }

    const service = new AdOkService()
    if (!service.isConfigured) {
      throw new Error('AdOK API not configured. Set ADOK_AUTH_EMAIL and ADOK_AUTH_TOKEN.')
    }

    // Default: sync last 30 days
    const now = new Date()
    const fromDate = (body as { from?: string }).from || formatDate(new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000))
    const toDate = (body as { to?: string }).to || formatDate(now)

    // Load site mapping: domain → site record
    const allSites = await prisma.site.findMany({ where: { isActive: true } })
    const siteByDomain = new Map<string, typeof allSites[0]>()
    for (const site of allSites) {
      const cleanDomain = site.domain.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '')
      siteByDomain.set(cleanDomain, site)
    }

    let totalRecords = 0

    // ── Step 1: Fetch daily spot data (per-site breakdown) ──
    console.log(`[sync] Fetching daily data from ${fromDate} to ${toDate}...`)

    const dailyRows = await service.fetchReport({ from: fromDate, to: toDate, group_by: 'date' })
    console.log(`[sync] Got ${dailyRows.length} daily rows`)

    for (const dayRow of dailyRows) {
      const dateStr = dayRow.name
      if (!dateStr) continue

      const date = new Date(dateStr + 'T00:00:00.000Z')

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
        if (!site) continue

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

      console.log(`[sync] ${dateStr}: ${domainAgg.size} domains, ${spotRows.length} spots`)
    }

    // ── Step 2: Fetch format data (ad_type) per date ──
    console.log('[sync] Fetching format breakdown...')

    for (const dayRow of dailyRows) {
      const dateStr = dayRow.name
      if (!dateStr) continue
      const date = new Date(dateStr + 'T00:00:00.000Z')

      const formatRows = await service.fetchReport({ from: dateStr, to: dateStr, group_by: 'ad_type' })
      const totalHitsForDay = formatRows.reduce((sum, r) => sum + r.hits, 0)

      for (const site of allSites) {
        const dailyMetric = await prisma.dailyMetric.findUnique({
          where: { siteId_date: { siteId: site.id, date } },
        })
        if (!dailyMetric || dailyMetric.hits === 0) continue

        const siteShare = dailyMetric.hits / (totalHitsForDay || 1)

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
              siteId: site.id, date, format: formatKey,
              impressions: siteImpressions, clicks: siteClicks,
              revenue: new Prisma.Decimal(siteRevenue.toFixed(4)),
              ctr: new Prisma.Decimal(siteCtr.toFixed(4)),
              fillRate: new Prisma.Decimal(siteFillRate.toFixed(4)),
              ecpm: new Prisma.Decimal(siteEcpm.toFixed(4)),
              rpm: new Prisma.Decimal(siteRpm.toFixed(4)),
            },
            update: {
              impressions: siteImpressions, clicks: siteClicks,
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
    console.log('[sync] Fetching country/tier breakdown...')

    for (const dayRow of dailyRows) {
      const dateStr = dayRow.name
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
            hits: cRow.hits, impressions: cRow.impressions,
            clicks: cRow.clicks, revenue: cRow.broker_income,
          })
        }
      }

      const totalHitsCountry = Array.from(tierAgg.values()).reduce((s, v) => s + v.hits, 0)

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
            where: { siteId_date_tier: { siteId: site.id, date, tier: tier as 'TIER_1' | 'TIER_2' | 'TIER_3' | 'TIER_4' } },
            create: {
              siteId: site.id, date,
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
    }

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
