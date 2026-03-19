/**
 * DashboardNormalizer
 *
 * Merges source payloads into a unified internal structure.
 * Handles: site mapping, bundle mapping, date alignment,
 * source completeness propagation, missing metric propagation.
 */

import { prisma } from '@/lib/db'
import { generateDateRange } from './period-resolver'
import type {
  TrafficPayload,
  MonetizationPayload,
  CostsPayload,
  AffiliatePayload,
  NormalizedSiteDay,
  NormalizedData,
  SourceName,
  SourceStatus,
} from './types'

interface SiteInfo {
  id: string
  name: string
  domain: string
  slug: string
  bundleId: string
  sheetName: string | null
}

/**
 * Normalize and merge all source payloads into a unified structure.
 */
export async function normalize(
  traffic: TrafficPayload,
  monetization: MonetizationPayload,
  costs: CostsPayload,
  affiliate: AffiliatePayload,
  from: string,
  to: string,
): Promise<NormalizedData> {
  // Load all active sites with bundle info
  const sites = await prisma.site.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      domain: true,
      slug: true,
      bundleId: true,
      sheetName: true,
    },
  })

  const dateRange = generateDateRange(from, to)
  const result: NormalizedSiteDay[] = []

  // Log domain mapping for diagnostics
  const dbDomains = sites.map(s => s.domain.toLowerCase().replace(/^www\./, ''))
  const adokDomains = [...monetization.revenueBySite.keys()]
  const trafficDomains = [...traffic.visitsBySite.keys()]
  const costDomains = [...costs.costsBySite.keys()]
  const affDomains = [...affiliate.revenueBySite.keys()]
  console.log('[Normalizer] Domain mapping:', {
    dbSites: dbDomains,
    adokKeys: adokDomains,
    trafficKeys: trafficDomains,
    costKeys: costDomains,
    affiliateKeys: affDomains,
    adokMatches: dbDomains.filter(d => adokDomains.includes(d)),
    adokMisses: dbDomains.filter(d => !adokDomains.includes(d)),
  })

  for (const site of sites) {
    const domainKey = site.domain.toLowerCase().replace(/^www\./, '')

    for (const date of dateRange) {
      // Resolve visits from Yandex
      const visits = resolveFromSiteMap(traffic.visitsBySite, domainKey, date)

      // Resolve ad metrics from AdSpyglass
      const adRevenue = resolveFromSiteMap(monetization.revenueBySite, domainKey, date)
      const impressions = resolveFromSiteMap(monetization.impressionsBySite, domainKey, date)
      const clicks = resolveFromSiteMap(monetization.clicksBySite, domainKey, date)
      const hits = resolveFromSiteMap(monetization.hitsBySite, domainKey, date)

      // Resolve costs
      const costVal = resolveFromSiteMap(costs.costsBySite, domainKey, date)

      // Resolve affiliate revenue
      const affRevenue = resolveFromSiteMap(affiliate.revenueBySite, domainKey, date)

      result.push({
        siteId: site.id,
        siteName: site.name,
        bundleId: site.bundleId,
        date,
        visits,
        adRevenue,
        affiliateRevenue: affRevenue,
        costs: costVal,
        impressions,
        clicks,
        hits,
        sourceCompleteness: {
          yandex: visits !== null,
          adSpyglass: adRevenue !== null,
          costs: costVal !== null,
          affiliate: affRevenue !== null,
        },
      })
    }
  }

  return {
    sites: result,
    dateRange,
    sourceStatuses: {
      yandex: traffic.source,
      adSpyglass: monetization.source,
      costs: costs.source,
      affiliate: affiliate.source,
    },
  }
}

/**
 * Try to find a value in a site map using the domain key.
 * Returns null if site or date not found (preserving "no data" vs "zero" distinction).
 */
function resolveFromSiteMap(
  siteMap: Map<string, Map<string, number>>,
  domainKey: string,
  date: string,
): number | null {
  const dateMap = siteMap.get(domainKey)
  if (!dateMap) return null
  const val = dateMap.get(date)
  return val !== undefined ? val : null
}
