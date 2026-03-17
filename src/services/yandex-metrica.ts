/**
 * Yandex Metrica API Client
 *
 * API: https://api-metrika.yandex.net
 * Auth: OAuth token (header Authorization: OAuth <token>)
 *
 * Endpoint: GET /stat/v1/data
 *   Params: ids (counter_id), metrics, dimensions, date1, date2
 *
 * We fetch ym:s:users (unique visitors) per day for each counter.
 */

// ─── Types ───

export interface MetricaRow {
  dimensions: { name: string }[]
  metrics: number[]
}

export interface MetricaResponse {
  data: MetricaRow[]
  totals: number[]
  query: {
    ids: number[]
    date1: string
    date2: string
  }
}

export interface DailyVisitors {
  date: string  // YYYY-MM-DD
  users: number
}

// ─── Service ───

export class YandexMetricaService {
  private oauthToken: string
  private apiUrl: string

  constructor(oauthToken?: string) {
    this.oauthToken = oauthToken || process.env.YANDEX_METRIKA_OAUTH_TOKEN || ''
    this.apiUrl = 'https://api-metrika.yandex.net'
  }

  get isConfigured(): boolean {
    return Boolean(this.oauthToken)
  }

  private get headers(): Record<string, string> {
    return {
      Authorization: `OAuth ${this.oauthToken}`,
      Accept: 'application/json',
    }
  }

  /**
   * Fetch daily unique visitors for a counter.
   * Returns array of { date, users } sorted by date asc.
   */
  async fetchDailyVisitors(
    counterId: string,
    from: string,
    to: string
  ): Promise<DailyVisitors[]> {
    if (!this.isConfigured) {
      throw new Error('Yandex Metrica not configured. Set YANDEX_METRIKA_OAUTH_TOKEN.')
    }

    const url = new URL('/stat/v1/data', this.apiUrl)
    url.searchParams.set('ids', counterId)
    url.searchParams.set('metrics', 'ym:s:users')
    url.searchParams.set('dimensions', 'ym:s:date')
    url.searchParams.set('date1', from)
    url.searchParams.set('date2', to)
    url.searchParams.set('sort', 'ym:s:date')
    url.searchParams.set('limit', '10000')

    const response = await fetch(url.toString(), {
      headers: this.headers,
      signal: AbortSignal.timeout(30_000),
    })

    if (!response.ok) {
      const text = await response.text().catch(() => '')
      throw new Error(`Yandex Metrica API error ${response.status}: ${text.slice(0, 300)}`)
    }

    const data: MetricaResponse = await response.json()

    return data.data.map((row) => ({
      date: row.dimensions[0].name, // YYYY-MM-DD format from ym:s:date
      users: Math.round(row.metrics[0] || 0),
    }))
  }

  /**
   * Fetch total visitors for a date range (single number).
   */
  async fetchTotalVisitors(
    counterId: string,
    from: string,
    to: string
  ): Promise<number> {
    if (!this.isConfigured) {
      throw new Error('Yandex Metrica not configured. Set YANDEX_METRIKA_OAUTH_TOKEN.')
    }

    const url = new URL('/stat/v1/data', this.apiUrl)
    url.searchParams.set('ids', counterId)
    url.searchParams.set('metrics', 'ym:s:users')
    url.searchParams.set('date1', from)
    url.searchParams.set('date2', to)

    const response = await fetch(url.toString(), {
      headers: this.headers,
      signal: AbortSignal.timeout(30_000),
    })

    if (!response.ok) {
      const text = await response.text().catch(() => '')
      throw new Error(`Yandex Metrica API error ${response.status}: ${text.slice(0, 300)}`)
    }

    const data: MetricaResponse = await response.json()
    return Math.round(data.totals?.[0] || 0)
  }

  /**
   * Test API connection with any counter.
   */
  async testConnection(counterId: string): Promise<boolean> {
    if (!this.isConfigured) return false
    try {
      const today = new Date().toISOString().slice(0, 10)
      await this.fetchTotalVisitors(counterId, today, today)
      return true
    } catch {
      return false
    }
  }
}

// ─── Singleton ───

export const yandexMetrica = new YandexMetricaService()
