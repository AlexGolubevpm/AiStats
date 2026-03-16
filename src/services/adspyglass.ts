/**
 * AdOK (AdSpyglass) API Client
 *
 * API: https://api.adok.ai
 * Auth: header-based (X-Asg-Auth-Email + X-Asg-Auth-Token)
 *
 * Endpoint: GET /api/report
 *   Params: from, to (YYYY-MM-DD), group_by (date|spot|country|ad_type|device|browser)
 *
 * Response fields per row:
 *   name, hits, clicks, impressions, bounces, broker_income, broker_hits,
 *   broker_clicks, predicted_income, ctr, fill_rate, broker_cpm, real_cpm,
 *   cpc, discrepancy, prediction_accuracy, requests, ...
 *   + iso (when group_by=country)
 */

// ─── Types ───

export interface AdOkReportRow {
  name: string | null
  hits: number
  clicks: number
  impressions: number
  bounces: number
  broker_income: number
  broker_hits: number
  broker_clicks: number
  predicted_income: number
  bounce_rate: number
  ctr: number
  broker_cpc: number
  broker_cpm: number
  broker_ctr: number
  fill_rate: number
  open_rate: number
  discrepancy: number
  hits_to_clicks: number
  real_cpm: number
  real_cpm_with_bounces: number
  real_cpm_open: number
  requests: number
  win_rate: number
  prediction_accuracy: number
  banner_ctr: number
  banner_view_rate: number
  predicted_cpm: number
  discrepancy_rev: number
  discrepancy_imp: number
  cpc: number
  // Only present when group_by=country
  iso?: string | null
}

export type GroupBy = 'date' | 'spot' | 'country' | 'ad_type' | 'device' | 'browser' | 'website'

export interface AdOkReportParams {
  from: string // YYYY-MM-DD
  to: string   // YYYY-MM-DD
  group_by?: GroupBy
}

/** Aggregated per-site metrics derived from spot-level data */
export interface SiteAdMetrics {
  domain: string
  hits: number
  clicks: number
  impressions: number
  revenue: number // broker_income
  predictedRevenue: number
  ctr: number
  fillRate: number
  realCpm: number
  cpc: number
  spotCount: number
}

/** Per-format metrics from ad_type grouping */
export interface FormatAdMetrics {
  format: string  // Banner, Popunder, Slider, etc.
  hits: number
  clicks: number
  impressions: number
  revenue: number
  ctr: number
  fillRate: number
  realCpm: number
}

/** Per-country metrics */
export interface CountryAdMetrics {
  country: string
  iso: string
  hits: number
  clicks: number
  impressions: number
  revenue: number
  ctr: number
  fillRate: number
}

// ─── Mapping from AdOK ad_type names to our AdFormat enum ───

const AD_TYPE_TO_FORMAT: Record<string, string> = {
  'Popunder': 'POP',
  'Banner': 'BANNER',
  'Slider (VAST Link URL)': 'SLIDER',
  'Outstream (VAST Link URL)': 'OUTSTREAM',
  'In-Video (VAST Link URL)': 'IN_VIDEO',
  'In-Page Push': 'IN_PAGE_PUSH',
}

export function mapAdTypeToFormat(adType: string): string {
  return AD_TYPE_TO_FORMAT[adType] || 'OTHER'
}

// ─── Service ───

export class AdOkService {
  private apiUrl: string
  private authEmail: string
  private authToken: string

  constructor(apiUrl?: string, authEmail?: string, authToken?: string) {
    this.apiUrl = apiUrl || process.env.ADOK_API_URL || 'https://api.adok.ai'
    this.authEmail = authEmail || process.env.ADOK_AUTH_EMAIL || ''
    this.authToken = authToken || process.env.ADOK_AUTH_TOKEN || ''
  }

  private get headers(): Record<string, string> {
    return {
      'X-Asg-Auth-Email': this.authEmail,
      'X-Asg-Auth-Token': this.authToken,
      'Accept': 'application/json',
    }
  }

  get isConfigured(): boolean {
    return Boolean(this.authEmail && this.authToken)
  }

  // ─── Raw API call ───

  async fetchReport(params: AdOkReportParams): Promise<AdOkReportRow[]> {
    if (!this.isConfigured) {
      throw new Error('AdOK API not configured. Set ADOK_AUTH_EMAIL and ADOK_AUTH_TOKEN.')
    }

    const url = new URL('/api/report', this.apiUrl)
    url.searchParams.set('from', params.from)
    url.searchParams.set('to', params.to)
    if (params.group_by) {
      url.searchParams.set('group_by', params.group_by)
    }

    const response = await fetch(url.toString(), {
      headers: this.headers,
      signal: AbortSignal.timeout(30_000),
    })

    if (!response.ok) {
      const text = await response.text().catch(() => '')
      throw new Error(`AdOK API error ${response.status}: ${text.slice(0, 200)}`)
    }

    const data = await response.json()

    if (data && typeof data === 'object' && 'error' in data) {
      throw new Error(`AdOK API returned error: ${JSON.stringify(data.error)}`)
    }

    return data as AdOkReportRow[]
  }

  // ─── High-level methods ───

  /** Get daily aggregate totals for a date range */
  async fetchDailyTotals(from: string, to: string): Promise<AdOkReportRow[]> {
    return this.fetchReport({ from, to, group_by: 'date' })
  }

  /**
   * Get per-site metrics by aggregating spot data.
   * Each spot name contains the domain: "123456. SpotName (domain.com)"
   */
  async fetchSiteMetrics(from: string, to: string): Promise<SiteAdMetrics[]> {
    const rows = await this.fetchReport({ from, to, group_by: 'spot' })
    return this.aggregateSpotsByDomain(rows)
  }

  /**
   * Get per-site metrics for a specific date range, grouped by date.
   * Returns a Map of date → SiteAdMetrics[].
   * Requires two calls: date-level and spot-level.
   */
  async fetchDailySiteMetrics(from: string, to: string): Promise<Map<string, SiteAdMetrics[]>> {
    // The API doesn't support combined group_by, so we fetch spot-level data
    // for each date separately, or fetch all spots and parse dates from names
    // For efficiency, we'll fetch spot data for the entire range and then
    // make individual date calls to get per-day breakdown

    const result = new Map<string, SiteAdMetrics[]>()

    // Get the date list first
    const dailyRows = await this.fetchReport({ from, to, group_by: 'date' })

    // For each date, fetch spot data
    for (const row of dailyRows) {
      const dateStr = row.name
      if (!dateStr) continue

      const spotRows = await this.fetchReport({ from: dateStr, to: dateStr, group_by: 'spot' })
      const siteMetrics = this.aggregateSpotsByDomain(spotRows)
      result.set(dateStr, siteMetrics)
    }

    return result
  }

  /** Get metrics broken down by ad format */
  async fetchFormatMetrics(from: string, to: string): Promise<FormatAdMetrics[]> {
    const rows = await this.fetchReport({ from, to, group_by: 'ad_type' })
    return rows
      .filter(r => r.name && r.impressions > 0)
      .map(r => ({
        format: r.name!,
        hits: r.hits,
        clicks: r.clicks,
        impressions: r.impressions,
        revenue: r.broker_income,
        ctr: r.ctr,
        fillRate: r.fill_rate,
        realCpm: r.real_cpm,
      }))
  }

  /** Get metrics broken down by country (for tier classification) */
  async fetchCountryMetrics(from: string, to: string): Promise<CountryAdMetrics[]> {
    const rows = await this.fetchReport({ from, to, group_by: 'country' })
    return rows
      .filter(r => r.name && r.iso)
      .map(r => ({
        country: r.name!,
        iso: (r.iso || '').toUpperCase(),
        hits: r.hits,
        clicks: r.clicks,
        impressions: r.impressions,
        revenue: r.broker_income,
        ctr: r.ctr,
        fillRate: r.fill_rate,
      }))
  }

  /** Test API connection */
  async testConnection(): Promise<boolean> {
    if (!this.isConfigured) return false
    try {
      const today = new Date().toISOString().slice(0, 10)
      await this.fetchReport({ from: today, to: today })
      return true
    } catch {
      return false
    }
  }

  // ─── Helpers ───

  private aggregateSpotsByDomain(rows: AdOkReportRow[]): SiteAdMetrics[] {
    const sites = new Map<string, SiteAdMetrics>()

    for (const row of rows) {
      const domain = this.extractDomainFromSpotName(row.name || '')
      if (!domain) continue

      const existing = sites.get(domain)
      if (existing) {
        existing.hits += row.hits
        existing.clicks += row.clicks
        existing.impressions += row.impressions
        existing.revenue += row.broker_income
        existing.predictedRevenue += row.predicted_income
        existing.spotCount++
      } else {
        sites.set(domain, {
          domain,
          hits: row.hits,
          clicks: row.clicks,
          impressions: row.impressions,
          revenue: row.broker_income,
          predictedRevenue: row.predicted_income,
          ctr: 0,
          fillRate: 0,
          realCpm: 0,
          cpc: 0,
          spotCount: 1,
        })
      }
    }

    // Calculate derived rates
    for (const site of sites.values()) {
      site.ctr = site.impressions > 0 ? (site.clicks / site.impressions) * 100 : 0
      site.fillRate = site.hits > 0 ? (site.impressions / site.hits) * 100 : 0
      site.realCpm = site.hits > 0 ? (site.revenue / site.hits) * 1000 : 0
      site.cpc = site.clicks > 0 ? site.revenue / site.clicks : 0
    }

    return Array.from(sites.values()).sort((a, b) => b.revenue - a.revenue)
  }

  /** Extract domain from spot name like "486099. JW_POP_hard (japan-whores.com)" */
  private extractDomainFromSpotName(name: string): string | null {
    const match = name.match(/\(([^)]+)\)\s*$/)
    if (!match) return null
    return match[1]
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/\/$/, '')
  }
}

// ─── Singleton ───

export const adok = new AdOkService()

// Backward-compatible alias
export const adspyglass = adok
