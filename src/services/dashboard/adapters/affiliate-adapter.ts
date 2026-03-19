/**
 * AffiliateSheetAdapter
 *
 * Returns normalized affiliate revenue payload from Google Sheets.
 * Source of truth for: affiliate/partner revenue per site/date.
 */

import { GoogleSheetsService } from '@/services/google-sheets'
import { prisma } from '@/lib/db'
import type { SourceStatus, AffiliatePayload } from '../types'

export async function fetchAffiliatePayload(
  from: string,
  to: string,
): Promise<AffiliatePayload> {
  const fetchStart = Date.now()
  const notes: string[] = []

  try {
    // Load sheet ID from DB settings (same as sync workers)
    const affiliateSetting = await prisma.setting.findUnique({ where: { key: 'affiliate_sheet_id' } })
    const affiliateSheetId = affiliateSetting?.value as string | undefined

    if (!affiliateSheetId) {
      return {
        source: makeStatus('failed', 'incomplete', null, ['Affiliate sheet not configured in Settings']),
        revenueBySite: new Map(),
        totalByDate: new Map(),
        unmatchedRows: 0,
        mappingIssues: [],
      }
    }

    const service = new GoogleSheetsService(undefined, affiliateSheetId)
    const fromDate = new Date(from)
    const toDate = new Date(to)
    const rows = await service.fetchAffiliateRevenue(fromDate, toDate)

    const sites = await prisma.site.findMany({
      where: { isActive: true },
      select: { id: true, domain: true, name: true, slug: true, sheetName: true },
    })

    const siteByKey = buildSiteKeyMap(sites)

    const revenueBySite = new Map<string, Map<string, number>>()
    const totalByDate = new Map<string, number>()
    let unmatchedRows = 0
    const mappingIssues: string[] = []

    for (const row of rows) {
      if (row.date < from || row.date > to) continue

      const site = matchSite(row.siteName, siteByKey)
      if (!site) {
        unmatchedRows++
        if (!mappingIssues.includes(row.siteName)) {
          mappingIssues.push(row.siteName)
        }
        continue
      }

      if (!revenueBySite.has(site.domain)) {
        revenueBySite.set(site.domain, new Map())
      }
      const siteMap = revenueBySite.get(site.domain)!
      siteMap.set(row.date, (siteMap.get(row.date) ?? 0) + row.amount)
      totalByDate.set(row.date, (totalByDate.get(row.date) ?? 0) + row.amount)
    }

    if (unmatchedRows > 0) {
      notes.push(`${unmatchedRows} unmatched affiliate rows`)
    }

    const freshnessMs = Date.now() - fetchStart
    const hasData = revenueBySite.size > 0
    const completeness: SourceStatus['completeness'] = hasData ? (unmatchedRows > 0 ? 'partial' : 'complete') : 'incomplete'

    return {
      source: makeStatus(hasData ? 'fresh' : 'partial', completeness, freshnessMs, notes),
      revenueBySite,
      totalByDate,
      unmatchedRows,
      mappingIssues,
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return {
      source: makeStatus('failed', 'incomplete', null, [msg]),
      revenueBySite: new Map(),
      totalByDate: new Map(),
      unmatchedRows: 0,
      mappingIssues: [],
    }
  }
}

interface SiteRef {
  id: string
  domain: string
  name: string
  slug: string
  sheetName: string | null
}

function buildSiteKeyMap(sites: SiteRef[]): Map<string, SiteRef> {
  const map = new Map<string, SiteRef>()
  for (const site of sites) {
    const norm = site.domain.toLowerCase().replace(/^www\./, '')
    map.set(norm, site)
    map.set(site.name.toLowerCase(), site)
    map.set(site.slug.toLowerCase(), site)
    if (site.sheetName) {
      map.set(site.sheetName.toLowerCase(), site)
    }
    const withoutTld = norm.replace(/\.[^.]+$/, '')
    map.set(withoutTld, site)
  }
  return map
}

function matchSite(rawName: string, keyMap: Map<string, SiteRef>): SiteRef | null {
  const lower = rawName.toLowerCase().trim().replace(/^www\./, '').replace(/\/$/, '')
  return keyMap.get(lower) ?? null
}

function makeStatus(
  status: SourceStatus['status'],
  completeness: SourceStatus['completeness'],
  freshnessMs: number | null,
  notes: string[],
): SourceStatus {
  const now = new Date().toISOString()
  return {
    source: 'affiliate',
    status,
    completeness,
    lastFetchedAt: now,
    lastSuccessfulAt: status !== 'failed' ? now : null,
    freshnessMinutes: freshnessMs != null ? Math.round(freshnessMs / 60000 * 100) / 100 : null,
    notes,
  }
}
