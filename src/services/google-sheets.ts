import { prisma } from '@/lib/db'

export interface SheetCostRow {
  siteName: string
  date: string  // YYYY-MM-DD
  amount: number
}

export interface SheetAffiliateRow {
  siteName: string
  date: string
  amount: number
  source?: string
}

/**
 * Extract sheet ID from a full Google Sheets URL or raw ID
 */
function extractSheetId(input: string): string {
  const match = input.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/)
  return match ? match[1] : input.trim()
}

/**
 * Fetch a public Google Sheet as CSV and parse into rows.
 * Uses the /export?format=csv endpoint (works for publicly shared sheets).
 * Optional gid parameter to select a specific tab.
 */
async function fetchSheetCsv(sheetId: string, gid = '0'): Promise<string[][]> {
  const id = extractSheetId(sheetId)
  const url = `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${gid}`

  const response = await fetch(url, {
    signal: AbortSignal.timeout(30_000),
    redirect: 'follow',
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    if (response.status === 404) {
      throw new Error(`Sheet not found. Check that the sheet ID is correct: ${id}`)
    }
    if (response.status === 403 || text.includes('Sign in')) {
      throw new Error(`Sheet is not publicly accessible. Go to Share → "Anyone with the link" → Viewer`)
    }
    throw new Error(`Failed to fetch sheet (${response.status}): ${text.slice(0, 200)}`)
  }

  const csv = await response.text()
  return parseCsv(csv)
}

/**
 * Simple CSV parser that handles quoted fields with commas and newlines
 */
function parseCsv(csv: string): string[][] {
  const rows: string[][] = []
  let current: string[] = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < csv.length; i++) {
    const ch = csv[i]

    if (inQuotes) {
      if (ch === '"' && csv[i + 1] === '"') {
        field += '"'
        i++
      } else if (ch === '"') {
        inQuotes = false
      } else {
        field += ch
      }
    } else {
      if (ch === '"') {
        inQuotes = true
      } else if (ch === ',') {
        current.push(field.trim())
        field = ''
      } else if (ch === '\n' || (ch === '\r' && csv[i + 1] === '\n')) {
        current.push(field.trim())
        field = ''
        if (ch === '\r') i++
        if (current.some(c => c !== '')) rows.push(current)
        current = []
      } else {
        field += ch
      }
    }
  }

  // Last field/row
  if (field || current.length > 0) {
    current.push(field.trim())
    if (current.some(c => c !== '')) rows.push(current)
  }

  return rows
}

/**
 * Find column index by checking header row for matching names (case-insensitive).
 */
function findColumn(headers: string[], ...candidates: string[]): number {
  const lower = headers.map(h => h.toLowerCase().trim())
  for (const c of candidates) {
    const idx = lower.indexOf(c.toLowerCase())
    if (idx !== -1) return idx
  }
  return -1
}

/**
 * Parse a date string in various formats to YYYY-MM-DD
 */
function parseDate(raw: string): string | null {
  // Try YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw

  // Try DD.MM.YYYY or DD/MM/YYYY
  const dmy = raw.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/)
  if (dmy) {
    return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`
  }

  // Try MM/DD/YYYY
  const mdy = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (mdy) {
    const m = parseInt(mdy[1])
    const d = parseInt(mdy[2])
    // If first number > 12, it's DD/MM/YYYY (already handled above)
    if (m <= 12) {
      return `${mdy[3]}-${mdy[1].padStart(2, '0')}-${mdy[2].padStart(2, '0')}`
    }
  }

  // Try Date.parse as fallback
  const ts = Date.parse(raw)
  if (!isNaN(ts)) {
    return new Date(ts).toISOString().slice(0, 10)
  }

  return null
}

/**
 * Parse a number string, handling various locale formats
 */
function parseAmount(raw: string): number {
  // Remove currency symbols and spaces
  const cleaned = raw.replace(/[$€£¥₽\s]/g, '').replace(/,/g, '.')
  // Handle cases like "1.234.56" → take last dot as decimal
  const parts = cleaned.split('.')
  if (parts.length > 2) {
    const decimal = parts.pop()!
    return parseFloat(parts.join('') + '.' + decimal)
  }
  return parseFloat(cleaned) || 0
}

export class GoogleSheetsService {
  private costsSheetId: string
  private affiliateSheetId: string

  constructor(costsSheetId?: string, affiliateSheetId?: string) {
    this.costsSheetId = costsSheetId || process.env.GOOGLE_COSTS_SHEET_ID || ''
    this.affiliateSheetId = affiliateSheetId || process.env.GOOGLE_AFFILIATE_SHEET_ID || ''
  }

  /**
   * Fetch costs from the Google Sheet.
   * Expected columns: site/name, date, amount/cost/spend
   */
  async fetchCosts(_from: Date, _to: Date): Promise<SheetCostRow[]> {
    if (!this.costsSheetId) {
      throw new Error('Google Sheets costs sheet not configured. Set it in Settings → Google Sheets.')
    }

    const rows = await fetchSheetCsv(this.costsSheetId)
    if (rows.length < 2) {
      throw new Error('Sheet is empty or has only headers')
    }

    const headers = rows[0]
    const siteCol = findColumn(headers, 'site', 'name', 'site name', 'sitename', 'domain', 'сайт')
    const dateCol = findColumn(headers, 'date', 'дата', 'day')
    const amountCol = findColumn(headers, 'amount', 'cost', 'costs', 'spend', 'расход', 'расходы', 'сумма')

    if (siteCol === -1) throw new Error(`Cannot find site/name column in sheet. Headers: ${headers.join(', ')}`)
    if (dateCol === -1) throw new Error(`Cannot find date column in sheet. Headers: ${headers.join(', ')}`)
    if (amountCol === -1) throw new Error(`Cannot find amount/cost column in sheet. Headers: ${headers.join(', ')}`)

    const result: SheetCostRow[] = []

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i]
      const siteName = row[siteCol]
      const dateRaw = row[dateCol]
      const amountRaw = row[amountCol]

      if (!siteName || !dateRaw) continue

      const date = parseDate(dateRaw)
      if (!date) continue

      const amount = parseAmount(amountRaw || '0')
      result.push({ siteName, date, amount })
    }

    return result
  }

  /**
   * Fetch affiliate revenue from the Google Sheet.
   * Expected columns: site/name, date, amount/revenue, source (optional)
   */
  async fetchAffiliateRevenue(_from: Date, _to: Date): Promise<SheetAffiliateRow[]> {
    if (!this.affiliateSheetId) {
      throw new Error('Google Sheets affiliate sheet not configured. Set it in Settings → Google Sheets.')
    }

    const rows = await fetchSheetCsv(this.affiliateSheetId)
    if (rows.length < 2) {
      throw new Error('Sheet is empty or has only headers')
    }

    const headers = rows[0]
    const siteCol = findColumn(headers, 'site', 'name', 'site name', 'sitename', 'domain', 'сайт')
    const dateCol = findColumn(headers, 'date', 'дата', 'day')
    const amountCol = findColumn(headers, 'amount', 'revenue', 'доход', 'сумма')
    const sourceCol = findColumn(headers, 'source', 'источник', 'partner', 'партнер')

    if (siteCol === -1) throw new Error(`Cannot find site/name column in sheet. Headers: ${headers.join(', ')}`)
    if (dateCol === -1) throw new Error(`Cannot find date column in sheet. Headers: ${headers.join(', ')}`)
    if (amountCol === -1) throw new Error(`Cannot find amount/revenue column in sheet. Headers: ${headers.join(', ')}`)

    const result: SheetAffiliateRow[] = []

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i]
      const siteName = row[siteCol]
      const dateRaw = row[dateCol]
      const amountRaw = row[amountCol]
      const source = sourceCol !== -1 ? row[sourceCol] : undefined

      if (!siteName || !dateRaw) continue

      const date = parseDate(dateRaw)
      if (!date) continue

      const amount = parseAmount(amountRaw || '0')
      result.push({ siteName, date, amount, source })
    }

    return result
  }

  /** Test access to the configured sheets */
  async testConnection(): Promise<{ costs: boolean; affiliate: boolean }> {
    const result = { costs: false, affiliate: false }

    if (this.costsSheetId) {
      try {
        await fetchSheetCsv(this.costsSheetId)
        result.costs = true
      } catch {
        // sheet not accessible
      }
    }

    if (this.affiliateSheetId) {
      try {
        await fetchSheetCsv(this.affiliateSheetId)
        result.affiliate = true
      } catch {
        // sheet not accessible
      }
    }

    return result
  }
}

export const googleSheets = new GoogleSheetsService()
