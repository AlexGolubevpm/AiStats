/**
 * CostsSheetAdapter
 *
 * Returns normalized costs payload from Google Sheets.
 * Uses shared site-matching utility (same logic as sync-costs worker).
 */

import { GoogleSheetsService } from '@/services/google-sheets'
import { cleanDomain } from '@/services/adspyglass'
import { buildSiteKeyMap, matchSite, normalizeSites } from '@/services/site-matching'
import { prisma } from '@/lib/db'
import type { SourceStatus, CostsPayload } from '../types'

export async function fetchCostsPayload(
  from: string,
  to: string,
): Promise<CostsPayload> {
  const fetchStart = Date.now()
  const notes: string[] = []

  try {
    // Load sheet ID from DB settings (same as sync workers)
    const costsSetting = await prisma.setting.findUnique({ where: { key: 'costs_sheet_id' } })
    const costsSheetId = costsSetting?.value as string | undefined

    if (!costsSheetId) {
      return {
        source: makeStatus('failed', 'incomplete', null, ['Costs sheet not configured in Settings']),
        costsBySite: new Map(),
        totalByDate: new Map(),
        unmatchedRows: 0,
        mappingIssues: [],
      }
    }

    const service = new GoogleSheetsService(costsSheetId)
    const fromDate = new Date(from)
    const toDate = new Date(to)
    const rows = await service.fetchCosts(fromDate, toDate)

    // Load sites for matching (shared utility)
    const sites = await prisma.site.findMany({
      where: { isActive: true },
      select: { id: true, domain: true, name: true, slug: true, sheetName: true },
    })

    const keyMap = buildSiteKeyMap(sites)
    const normalized = normalizeSites(sites)

    const costsBySite = new Map<string, Map<string, number>>()
    const totalByDate = new Map<string, number>()
    let unmatchedRows = 0
    const mappingIssues: string[] = []

    for (const row of rows) {
      if (row.date < from || row.date > to) continue

      const site = matchSite(row.siteName, keyMap, normalized)
      if (!site) {
        unmatchedRows++
        if (!mappingIssues.includes(row.siteName)) {
          mappingIssues.push(row.siteName)
        }
        continue
      }

      const domain = cleanDomain(site.domain)
      if (!costsBySite.has(domain)) {
        costsBySite.set(domain, new Map())
      }
      const siteMap = costsBySite.get(domain)!
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
