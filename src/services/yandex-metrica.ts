/**
 * Yandex Metrica API Client
 *
 * API: https://api-metrika.yandex.net
 * Auth: OAuth2 bearer token
 *
 * Endpoints:
 *   GET /management/v1/counters — list all counters
 *   GET /stat/v1/data — get statistics
 *
 * Metrics: ym:s:visits, ym:s:users, ym:s:pageviews, ym:s:bounceRate
 * Dimensions: ym:s:date, ym:s:regionCountry, ym:s:regionCountryName
 */

// ─── Types ───

export interface YandexCounter {
  id: number
  name: string
  site: string  // domain like "example.com"
  status: string
  owner_login: string
}

export interface YandexCountersResponse {
  rows: number
  counters: YandexCounter[]
}

export interface YandexStatRow {
  dimensions: Array<{ name?: string; id?: string }>
  metrics: number[]
}

export interface YandexStatResponse {
  query: Record<string, unknown>
  data: YandexStatRow[]
  total_rows: number
  totals: number[]
}

/** Daily stats per counter */
export interface DailyVisitorStats {
  date: string       // YYYY-MM-DD
  users: number
  visits: number
  pageviews: number
  bounceRate: number
}

/** Country stats per counter */
export interface CountryVisitorStats {
  countryId: string
  countryName: string
  users: number
  visits: number
  pageviews: number
}

// ─── GEO tier classification ───

const TIER_1_COUNTRIES = new Set([
  'US', 'GB', 'CA', 'AU', 'DE', 'FR', 'NL', 'SE', 'NO', 'DK', 'FI', 'CH', 'AT', 'BE', 'IE', 'NZ', 'LU',
  // Yandex uses full names, so we also need these
  'United States', 'United Kingdom', 'Canada', 'Australia', 'Germany', 'France',
  'Netherlands', 'Sweden', 'Norway', 'Denmark', 'Finland', 'Switzerland',
  'Austria', 'Belgium', 'Ireland', 'New Zealand', 'Luxembourg',
])
const TIER_2_COUNTRIES = new Set([
  'ES', 'IT', 'PT', 'PL', 'CZ', 'RO', 'HU', 'GR', 'JP', 'KR', 'SG', 'HK', 'TW', 'IL', 'AE', 'SA',
  'BR', 'MX', 'AR', 'CL', 'CO',
  'Spain', 'Italy', 'Portugal', 'Poland', 'Czech Republic', 'Czechia', 'Romania', 'Hungary',
  'Greece', 'Japan', 'South Korea', 'Singapore', 'Hong Kong', 'Taiwan',
  'Israel', 'United Arab Emirates', 'Saudi Arabia',
  'Brazil', 'Mexico', 'Argentina', 'Chile', 'Colombia',
])
const TIER_3_COUNTRIES = new Set([
  'RU', 'UA', 'TR', 'TH', 'VN', 'PH', 'ID', 'MY', 'IN', 'ZA', 'NG', 'EG', 'KE', 'PE', 'EC',
  'Russia', 'Ukraine', 'Turkey', 'Türkiye', 'Thailand', 'Vietnam', 'Philippines',
  'Indonesia', 'Malaysia', 'India', 'South Africa', 'Nigeria', 'Egypt', 'Kenya', 'Peru', 'Ecuador',
])

// Yandex region IDs for countries (from Yandex geobase)
// These are the most common ones — we'll use country name matching as fallback
const YANDEX_REGION_TO_ISO: Record<string, string> = {
  '225': 'RU', '187': 'UA', '159': 'KZ', '149': 'BY',
  '84': 'US', '102': 'GB', '95': 'CA', '211': 'AU',
  '96': 'DE', '124': 'FR', '118': 'NL', '127': 'SE',
  '119': 'NO', '203': 'DK', '123': 'FI', '126': 'CH',
  '113': 'AT', '114': 'BE', '120': 'IE', '208': 'NZ',
  '204': 'LU',
  '125': 'ES', '205': 'IT', '110': 'PT',
  '117': 'PL', '116': 'CZ', '206': 'RO', '121': 'HU',
  '246': 'GR', '137': 'JP', '135': 'KR', '196': 'SG',
  '132': 'HK', '128': 'TW', '181': 'IL', '170': 'AE',
  '210': 'SA', '72': 'BR', '139': 'MX', '94': 'AR',
  '227': 'CL', '161': 'CO',
  '983': 'TR', '995': 'TH', '123456': 'VN', '241': 'PH',
  '179': 'ID', '190': 'MY', '994': 'IN', '209': 'ZA',
  '247': 'NG', '171': 'EG', '216': 'KE', '168': 'PE', '215': 'EC',
}

export function getGeoTierByCountryName(countryName: string): 'TIER_1' | 'TIER_2' | 'TIER_3' | 'TIER_4' {
  if (TIER_1_COUNTRIES.has(countryName)) return 'TIER_1'
  if (TIER_2_COUNTRIES.has(countryName)) return 'TIER_2'
  if (TIER_3_COUNTRIES.has(countryName)) return 'TIER_3'
  return 'TIER_4'
}

export function getGeoTierByRegionId(regionId: string): 'TIER_1' | 'TIER_2' | 'TIER_3' | 'TIER_4' {
  const iso = YANDEX_REGION_TO_ISO[regionId]
  if (!iso) return 'TIER_4'
  if (TIER_1_COUNTRIES.has(iso)) return 'TIER_1'
  if (TIER_2_COUNTRIES.has(iso)) return 'TIER_2'
  if (TIER_3_COUNTRIES.has(iso)) return 'TIER_3'
  return 'TIER_4'
}

// ─── Service ───

export class YandexMetricaService {
  private oauthToken: string
  private apiUrl = 'https://api-metrika.yandex.net'

  constructor(oauthToken?: string) {
    this.oauthToken = oauthToken || process.env.YANDEX_OAUTH_TOKEN || ''
  }

  get isConfigured(): boolean {
    return Boolean(this.oauthToken)
  }

  private get headers(): Record<string, string> {
    return {
      'Authorization': `OAuth ${this.oauthToken}`,
      'Accept': 'application/json',
    }
  }

  // ─── OAuth helpers ───

  /** Get the URL to redirect the user to for OAuth authorization */
  static getAuthUrl(clientId?: string): string {
    const id = clientId || process.env.YANDEX_CLIENT_ID || ''
    return `https://oauth.yandex.com/authorize?response_type=code&client_id=${id}`
  }

  /** Exchange authorization code for OAuth token */
  static async exchangeCode(code: string, clientId?: string, clientSecret?: string): Promise<{
    access_token: string
    refresh_token: string
    token_type: string
    expires_in: number
  }> {
    const id = clientId || process.env.YANDEX_CLIENT_ID || ''
    const secret = clientSecret || process.env.YANDEX_CLIENT_SECRET || ''

    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: id,
      client_secret: secret,
    })

    const response = await fetch('https://oauth.yandex.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    })

    if (!response.ok) {
      const text = await response.text().catch(() => '')
      throw new Error(`Yandex OAuth error ${response.status}: ${text.slice(0, 300)}`)
    }

    return response.json()
  }

  // ─── Management API ───

  /** List all counters available for this account */
  async getCounters(): Promise<YandexCounter[]> {
    const response = await fetch(`${this.apiUrl}/management/v1/counters?per_page=100`, {
      headers: this.headers,
      signal: AbortSignal.timeout(15_000),
    })

    if (!response.ok) {
      const text = await response.text().catch(() => '')
      throw new Error(`Yandex Metrica API error ${response.status}: ${text.slice(0, 300)}`)
    }

    const data: YandexCountersResponse = await response.json()
    return data.counters || []
  }

  /** Find counter ID by site domain */
  async findCounterByDomain(domain: string): Promise<YandexCounter | null> {
    const counters = await this.getCounters()
    const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '')

    return counters.find(c => {
      const counterDomain = c.site.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '')
      return counterDomain === cleanDomain || counterDomain.includes(cleanDomain) || cleanDomain.includes(counterDomain)
    }) || null
  }

  // ─── Statistics API ───

  /** Fetch raw stat data from Yandex Metrica */
  private async fetchStat(params: {
    counterId: number
    metrics: string
    dimensions?: string
    date1: string  // YYYY-MM-DD
    date2: string  // YYYY-MM-DD
    limit?: number
  }): Promise<YandexStatResponse> {
    const url = new URL(`${this.apiUrl}/stat/v1/data`)
    url.searchParams.set('ids', String(params.counterId))
    url.searchParams.set('metrics', params.metrics)
    if (params.dimensions) {
      url.searchParams.set('dimensions', params.dimensions)
    }
    url.searchParams.set('date1', params.date1)
    url.searchParams.set('date2', params.date2)
    url.searchParams.set('limit', String(params.limit || 10000))
    url.searchParams.set('accuracy', 'full')

    const response = await fetch(url.toString(), {
      headers: this.headers,
      signal: AbortSignal.timeout(30_000),
    })

    if (!response.ok) {
      const text = await response.text().catch(() => '')
      throw new Error(`Yandex Metrica stat error ${response.status}: ${text.slice(0, 300)}`)
    }

    return response.json()
  }

  /** Get daily visitor stats for a counter */
  async getDailyStats(counterId: number, from: string, to: string): Promise<DailyVisitorStats[]> {
    const data = await this.fetchStat({
      counterId,
      metrics: 'ym:s:users,ym:s:visits,ym:s:pageviews,ym:s:bounceRate',
      dimensions: 'ym:s:date',
      date1: from,
      date2: to,
    })

    return data.data.map(row => ({
      date: row.dimensions[0]?.name || '',
      users: Math.round(row.metrics[0] || 0),
      visits: Math.round(row.metrics[1] || 0),
      pageviews: Math.round(row.metrics[2] || 0),
      bounceRate: row.metrics[3] || 0,
    }))
  }

  /** Get country breakdown for a counter (for tier classification) */
  async getCountryStats(counterId: number, from: string, to: string): Promise<CountryVisitorStats[]> {
    const data = await this.fetchStat({
      counterId,
      metrics: 'ym:s:users,ym:s:visits,ym:s:pageviews',
      dimensions: 'ym:s:regionCountry',
      date1: from,
      date2: to,
      limit: 250,
    })

    return data.data
      .filter(row => row.dimensions[0]?.name)
      .map(row => ({
        countryId: row.dimensions[0]?.id || '',
        countryName: row.dimensions[0]?.name || '',
        users: Math.round(row.metrics[0] || 0),
        visits: Math.round(row.metrics[1] || 0),
        pageviews: Math.round(row.metrics[2] || 0),
      }))
  }

  /** Get daily country breakdown (date × country) */
  async getDailyCountryStats(counterId: number, date: string): Promise<CountryVisitorStats[]> {
    return this.getCountryStats(counterId, date, date)
  }

  /** Test API connection */
  async testConnection(): Promise<boolean> {
    if (!this.isConfigured) return false
    try {
      await this.getCounters()
      return true
    } catch {
      return false
    }
  }
}

// ─── Singleton ───

export const yandexMetrica = new YandexMetricaService()
