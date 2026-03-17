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

/** Per-site metrics from website-level grouping */
export interface SiteAdMetrics {
  domain: string
  hits: number       // requests (ad script loads)
  clicks: number
  impressions: number
  revenue: number    // broker_income
  predictedRevenue: number
  ctr: number
  fillRate: number
  realCpm: number
  cpc: number
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
  'Pop': 'POP',
  'Push Notification': 'PUSH',
  'Push': 'PUSH',
  'Web Push': 'PUSH',
  'Banner': 'BANNER',
  'Display': 'BANNER',
  'Slider (VAST Link URL)': 'SLIDER',
  'Slider': 'SLIDER',
  'Outstream (VAST Link URL)': 'OUTSTREAM',
  'Outstream': 'OUTSTREAM',
  'VAST': 'VAST',
  'VAST Link URL': 'VAST',
  'In-Video (VAST Link URL)': 'IN_VIDEO',
  'In-Video': 'IN_VIDEO',
  'In-Page Push': 'IN_PAGE_PUSH',
  'InPage Push': 'IN_PAGE_PUSH',
}

export function mapAdTypeToFormat(adType: string): string {
  return AD_TYPE_TO_FORMAT[adType] || 'OTHER'
}

// ─── Helpers ───

/** Strip protocol, www prefix and trailing slash from a domain string */
export function cleanDomain(raw: string): string {
  return raw
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/$/, '')
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
   * Get per-site metrics using group_by=website.
   * Returns real per-website data directly from AdOK — no spot parsing.
   */
  async fetchSiteMetrics(from: string, to: string): Promise<SiteAdMetrics[]> {
    const rows = await this.fetchReport({ from, to, group_by: 'website' })
    return this.mapWebsiteRows(rows)
  }

  /**
   * Get per-site metrics for each day in a date range.
   * Returns a Map of date → SiteAdMetrics[].
   * Uses group_by=date to list days, then group_by=website per day.
   */
  async fetchDailySiteMetrics(from: string, to: string): Promise<Map<string, SiteAdMetrics[]>> {
    const result = new Map<string, SiteAdMetrics[]>()

    const dailyRows = await this.fetchReport({ from, to, group_by: 'date' })

    for (const row of dailyRows) {
      const dateStr = row.name
      if (!dateStr) continue

      const websiteRows = await this.fetchReport({ from: dateStr, to: dateStr, group_by: 'website' })
      result.set(dateStr, this.mapWebsiteRows(websiteRows))
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

  /**
   * Map website-grouped rows directly to SiteAdMetrics.
   * With group_by=website the `name` field is the domain — no regex needed.
   */
  private mapWebsiteRows(rows: AdOkReportRow[]): SiteAdMetrics[] {
    return rows
      .filter(r => r.name)
      .map(r => {
        const domain = cleanDomain(r.name!)
        const ctr = r.impressions > 0 ? (r.clicks / r.impressions) * 100 : 0
        const fillRate = r.hits > 0 ? (r.impressions / r.hits) * 100 : 0
        const realCpm = r.hits > 0 ? (r.broker_income / r.hits) * 1000 : 0
        const cpc = r.clicks > 0 ? r.broker_income / r.clicks : 0

        return {
          domain,
          hits: r.hits,
          clicks: r.clicks,
          impressions: r.impressions,
          revenue: r.broker_income,
          predictedRevenue: r.predicted_income,
          ctr,
          fillRate,
          realCpm,
          cpc,
        }
      })
      .sort((a, b) => b.revenue - a.revenue)
  }
}

// ─── Singleton ───

export const adok = new AdOkService()

// Backward-compatible alias
export const adspyglass = adok
