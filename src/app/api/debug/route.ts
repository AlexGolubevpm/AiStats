import { prisma } from '@/lib/db'
import { jsonResponse, errorResponse } from '@/lib/api-utils'
import { AdOkService } from '@/services/adspyglass'

export async function GET() {
  try {
    const results: Record<string, unknown> = {}

    // 1. Check DB connection and counts
    const [siteCount, bundleCount, dailyMetricCount, syncLogCount] = await Promise.all([
      prisma.site.count(),
      prisma.bundle.count(),
      prisma.dailyMetric.count(),
      prisma.syncLog.count(),
    ])

    results.db = {
      connected: true,
      sites: siteCount,
      bundles: bundleCount,
      dailyMetrics: dailyMetricCount,
      syncLogs: syncLogCount,
    }

    // 2. List all sites with domains
    const sites = await prisma.site.findMany({
      select: { id: true, name: true, domain: true, isActive: true, bundleId: true },
      orderBy: { domain: 'asc' },
    })
    results.sitesDomains = sites.map(s => ({ domain: s.domain, name: s.name, active: s.isActive }))

    // 3. Check AdOK API connection
    const service = new AdOkService()
    results.adok = { configured: service.isConfigured }

    if (service.isConfigured) {
      try {
        const today = new Date().toISOString().slice(0, 10)
        const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)

        // Fetch spot data for yesterday to see what domains AdOK returns
        const spotRows = await service.fetchReport({ from: yesterday, to: today, group_by: 'spot' })

        // Extract domains from spot names
        const adokDomains = new Set<string>()
        for (const row of spotRows) {
          const match = (row.name || '').match(/\(([^)]+)\)\s*$/)
          if (match) {
            const domain = match[1].replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '')
            adokDomains.add(domain)
          }
        }

        // Compare with our sites
        const ourDomains = new Set(sites.map(s => s.domain))
        const matched = [...adokDomains].filter(d => ourDomains.has(d))
        const unmatchedAdok = [...adokDomains].filter(d => !ourDomains.has(d))
        const unmatchedOurs = [...ourDomains].filter(d => !adokDomains.has(d))

        results.adok = {
          configured: true,
          apiWorking: true,
          spotsReturned: spotRows.length,
          domainsFromAdok: [...adokDomains].sort(),
          domainsInDb: [...ourDomains].sort(),
          matched,
          unmatchedFromAdok: unmatchedAdok,
          unmatchedFromDb: unmatchedOurs,
          sampleSpotNames: spotRows.slice(0, 5).map(r => r.name),
        }
      } catch (err) {
        results.adok = {
          configured: true,
          apiWorking: false,
          error: err instanceof Error ? err.message : String(err),
        }
      }
    }

    // 4. Check Yandex Metrica
    const yandexToken = process.env.YANDEX_OAUTH_TOKEN || ''
    results.yandex = {
      configured: Boolean(yandexToken),
      tokenPresent: yandexToken.length > 0,
      sitesWithCounterId: sites.filter(s => {
        // Need to check yandexCounterId field
        return false // We don't have it in select, check below
      }).length,
    }

    // Get sites with yandex counter IDs
    const sitesWithYandex = await prisma.site.findMany({
      where: { yandexCounterId: { not: null } },
      select: { domain: true, yandexCounterId: true },
    })
    results.yandex = {
      configured: Boolean(yandexToken),
      tokenPresent: yandexToken.length > 0,
      sitesWithCounterId: sitesWithYandex.length,
      sites: sitesWithYandex,
    }

    // 5. Last sync logs
    const lastSyncs = await prisma.syncLog.findMany({
      orderBy: { startedAt: 'desc' },
      take: 5,
    })
    results.lastSyncs = lastSyncs.map(l => ({
      source: l.source,
      status: l.status,
      startedAt: l.startedAt,
      completedAt: l.completedAt,
      records: l.recordsProcessed,
      error: l.error,
    }))

    // 6. Sample daily metrics (latest 3 days)
    const latestMetrics = await prisma.dailyMetric.findMany({
      orderBy: { date: 'desc' },
      take: 10,
      include: { site: { select: { domain: true } } },
    })
    results.latestMetrics = latestMetrics.map(m => ({
      site: m.site.domain,
      date: m.date.toISOString().slice(0, 10),
      users: m.users,
      hits: m.hits,
      impressions: m.impressions,
      adRevenue: Number(m.adRevenue),
      totalRevenue: Number(m.totalRevenue),
      profit: Number(m.profit),
    }))

    return jsonResponse(results)
  } catch (error) {
    console.error('Debug API error:', error)
    return errorResponse(`Debug failed: ${error instanceof Error ? error.message : String(error)}`)
  }
}
