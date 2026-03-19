/**
 * CostsSheetAdapter
 *
 * Returns normalized costs payload from Google Sheets.
 * Source of truth for: costs per site/date.
 */

import { googleSheets } from '@/services/google-sheets'
import { prisma } from '@/lib/db'
import type { SourceStatus, CostsPayload } from '../types'

export async function fetchCostsPayload(
  from: string,
  to: string,
): Promise<CostsPayload> {
  const fetchStart = Date.now()
  const notes: string[] = []

  try {
    const fromDate = new Date(from)
    const toDate = new Date(to)
    const rows = await googleSheets.fetchCosts(fromDate, toDate)

    // Load sites for matching
    const sites = await prisma.site.findMany({
      where: { isActive: true },
      select: { id: true, domain: true, name: true, slug: true, sheetName: true },
    })

    const siteByKey = buildSiteKeyMap(sites)

    const costsBySite = new Map<string, Map<string, number>>()
    const totalByDate = new Map<string, number>()
    let unmatchedRows = 0
    const mappingIssues: string[] = []

    for (const row of rows) {
      // Filter to requested date range
      if (row.date < from || row.date > to) continue

      const site = matchSite(row.siteName, siteByKey)
      if (!site) {
        unmatchedRows++
        if (!mappingIssues.includes(row.siteName)) {
          mappingIssues.push(row.siteName)
        }
        continue
      }

      // Aggregate by site domain + date
      if (!costsBySite.has(site.domain)) {
        costsBySite.set(site.domain, new Map())
      }
      const siteMap = costsBySite.get(site.domain)!
      siteMap.set(row.date, (siteMap.get(row.date) ?? 0) + row.amount)
      totalByDate.set(row.date, (totalByDate.get(row.date) ?? 0) + row.amount)
    }

    if (unmatchedRows > 0) {
      notes.push(`${unmatchedRows} unmatched cost rows`)
    }

    const freshnessMs = Date.now() - fetchStart
    const hasData = costsBySite.size > 0
    const completeness: SourceStatus['completeness'] = hasData ? (unmatchedRows > 0 ? 'partial' : 'complete') : 'incomplete'

    return {
      source: makeStatus(hasData ? 'fresh' : 'partial', completeness, freshnessMs, notes),
      costsBySite,
      totalByDate,
      unmatchedRows,
      mappingIssues,
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return {
      source: makeStatus('failed', 'incomplete', null, [msg]),
      costsBySite: new Map(),
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
    // Also without TLD
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
    source: 'costs',
    status,
    completeness,
    lastFetchedAt: now,
    lastSuccessfulAt: status !== 'failed' ? now : null,
    freshnessMinutes: freshnessMs != null ? Math.round(freshnessMs / 60000 * 100) / 100 : null,
    notes,
  }
}
