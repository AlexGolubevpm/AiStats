/**
 * Unified site matching utility.
 *
 * Shared across dashboard adapters, sync workers, and normalizer.
 * Mirrors the matching logic from sync-costs.ts / sync-affiliate.ts
 * so that domain resolution is identical everywhere.
 */

import { cleanDomain } from '@/services/adspyglass'

export interface SiteRef {
  id: string
  domain: string
  name: string
  slug: string
  sheetName: string | null
}

export interface NormalizedSiteRef extends SiteRef {
  norm: string      // cleanDomain(domain)
  normName: string   // name.toLowerCase().trim()
  normSheet: string  // sheetName?.toLowerCase().trim() || ''
  normSlug: string   // slug.toLowerCase().trim()
  normNoTld: string  // domain without TLD
}

/**
 * Pre-compute normalized fields for each site.
 * Call once per request, reuse for all lookups.
 */
export function normalizeSites(sites: SiteRef[]): NormalizedSiteRef[] {
  return sites.map(s => {
    const norm = cleanDomain(s.domain)
    return {
      ...s,
      norm,
      normName: s.name.toLowerCase().trim(),
      normSheet: s.sheetName?.toLowerCase().trim() || '',
      normSlug: s.slug.toLowerCase().trim(),
      normNoTld: norm.replace(/\.[^.]+$/, ''),
    }
  })
}

/**
 * Build a multi-key Map for O(1) domain lookups.
 * Adds all keys that sync workers use: domain, name, slug, sheetName, without-TLD.
 */
export function buildSiteKeyMap(sites: SiteRef[]): Map<string, SiteRef> {
  const map = new Map<string, SiteRef>()
  for (const site of sites) {
    const norm = cleanDomain(site.domain)
    map.set(norm, site)
    map.set(site.name.toLowerCase().trim(), site)
    map.set(site.slug.toLowerCase().trim(), site)
    if (site.sheetName) {
      map.set(site.sheetName.toLowerCase().trim(), site)
    }
    // Without TLD
    const noTld = norm.replace(/\.[^.]+$/, '')
    if (noTld !== norm) {
      map.set(noTld, site)
    }
  }
  return map
}

/**
 * Match a raw domain/name string to a site.
 * Uses the same multi-level matching as sync-costs.ts:
 * 1. Exact match via Map (O(1))
 * 2. cleanDomain of input via Map (O(1))
 * 3. Substring fallback (O(n)) — only if exact fails
 */
export function matchSite(rawName: string, keyMap: Map<string, SiteRef>, normalizedSites?: NormalizedSiteRef[]): SiteRef | null {
  const lower = rawName.toLowerCase().trim()
  const normed = cleanDomain(lower)

  // 1. Exact match on raw name (handles sheetName, name, slug)
  const exact = keyMap.get(lower) ?? keyMap.get(normed)
  if (exact) return exact

  // 2. Substring fallback (same as sync-costs.ts lines 84-86)
  if (normalizedSites) {
    const found = normalizedSites.find(s =>
      s.norm.includes(normed) || normed.includes(s.norm)
    )
    if (found) return found
  }

  return null
}

/**
 * Match a domain key from an external API (AdOK, Yandex) to the DB site domain.
 * Used by normalizer to resolve adapter Map keys → site domain keys.
 */
export function findSiteDomainKey(
  externalDomain: string,
  siteKeyMap: Map<string, SiteRef>,
  normalizedSites?: NormalizedSiteRef[],
): string | null {
  const site = matchSite(externalDomain, siteKeyMap, normalizedSites)
  return site ? cleanDomain(site.domain) : null
}
