/**
 * DashboardNormalizer
 *
 * Merges source payloads into a unified internal structure.
 * Uses the shared site-matching utility (same as sync workers)
 * for consistent domain resolution across the entire app.
 */

import { prisma } from '@/lib/db'
import { cleanDomain } from '@/services/adspyglass'
import { buildSiteKeyMap, matchSite, normalizeSites } from '@/services/site-matching'
import type { SiteRef } from '@/services/site-matching'
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

  // Build shared matching structures (same as sync workers)
  const siteRefs: SiteRef[] = sites.map(s => ({
    id: s.id, domain: s.domain, name: s.name, slug: s.slug, sheetName: s.sheetName,
  }))
  const keyMap = buildSiteKeyMap(siteRefs)
  const normalizedSites = normalizeSites(siteRefs)

  // Remap external API keys → cleanDomain(site.domain) for each source
  const trafficByDomain = remapSourceKeys(traffic.visitsBySite, keyMap, normalizedSites)
  const revenueBySite = remapSourceKeys(monetization.revenueBySite, keyMap, normalizedSites)
  const impressionsBySite = remapSourceKeys(monetization.impressionsBySite, keyMap, normalizedSites)
  const clicksBySite = remapSourceKeys(monetization.clicksBySite, keyMap, normalizedSites)
  const hitsBySite = remapSourceKeys(monetization.hitsBySite, keyMap, normalizedSites)
  const costsBySite = remapSourceKeys(costs.costsBySite, keyMap, normalizedSites)
  const affiliateBySite = remapSourceKeys(affiliate.revenueBySite, keyMap, normalizedSites)

  const dateRange = generateDateRange(from, to)
  const result: NormalizedSiteDay[] = []

  for (const site of sites) {
    const domainKey = cleanDomain(site.domain)

    for (const date of dateRange) {
      const visits = resolveFromSiteMap(trafficByDomain, domainKey, date)
      const adRevenue = resolveFromSiteMap(revenueBySite, domainKey, date)
      const impressions = resolveFromSiteMap(impressionsBySite, domainKey, date)
      const clicks = resolveFromSiteMap(clicksBySite, domainKey, date)
      const hits = resolveFromSiteMap(hitsBySite, domainKey, date)
      const costVal = resolveFromSiteMap(costsBySite, domainKey, date)
      const affRevenue = resolveFromSiteMap(affiliateBySite, domainKey, date)

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
 * Remap external API keys to canonical site domain keys.
 * Uses the shared matchSite utility so matching is identical to sync workers.
 */
function remapSourceKeys(
  sourceMap: Map<string, Map<string, number>>,
  keyMap: Map<string, SiteRef>,
  normalizedSites: ReturnType<typeof normalizeSites>,
): Map<string, Map<string, number>> {
  const remapped = new Map<string, Map<string, number>>()

  for (const [externalKey, dateMap] of sourceMap) {
    const site = matchSite(externalKey, keyMap, normalizedSites)
    if (site) {
      const canonical = cleanDomain(site.domain)
      // Merge if multiple external keys map to same site
      const existing = remapped.get(canonical)
      if (existing) {
        for (const [date, value] of dateMap) {
          existing.set(date, (existing.get(date) ?? 0) + value)
        }
      } else {
        remapped.set(canonical, new Map(dateMap))
      }
    }
  }

  return remapped
}

/**
 * Resolve a value from a site map by domain key + date.
 * Returns null if not found (preserving "no data" vs "zero" distinction).
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
