/**
 * Canonical Period Resolver
 *
 * Resolves requested period into canonical date windows
 * using a single business timezone. All source dates
 * must be normalized to this timezone.
 */

import { format, subDays, differenceInCalendarDays } from 'date-fns'
import type { PeriodType, CompareMode, ResolvedPeriod } from './types'

/** Canonical business timezone. All dates bucketed in this zone. */
const CANONICAL_TZ = 'Europe/Moscow'

/** Get "now" in canonical timezone using native Intl (no date-fns-tz needed). */
function nowInTz(): Date {
  const now = new Date()
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: CANONICAL_TZ,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  }).formatToParts(now)

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parseInt(parts.find(p => p.type === type)!.value, 10)

  return new Date(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'))
}

/** Format a Date as YYYY-MM-DD */
function fmt(d: Date): string {
  return format(d, 'yyyy-MM-dd')
}

/** Today in canonical timezone (in-progress business day) */
function today(): Date {
  return nowInTz()
}

/** Yesterday = last fully closed business day */
function yesterday(): Date {
  return subDays(today(), 1)
}

/**
 * Resolve a period query into canonical date ranges.
 *
 * Period rules from spec §7:
 *  - today: current in-progress day (partial)
 *  - yesterday: previous fully closed day
 *  - 7d: last 7 full closed days, excluding today
 *  - 30d: last 30 full closed days, excluding today
 *  - custom: from/to as provided
 *
 * Compare range: same duration, immediately preceding current period.
 */
export function resolvePeriod(
  periodType: PeriodType,
  compare: CompareMode = 'prev_period',
  customFrom?: string,
  customTo?: string,
): ResolvedPeriod {
  const t = today()
  const y = yesterday()
  let from: Date
  let to: Date
  let includesToday = false

  switch (periodType) {
    case 'today':
      from = t
      to = t
      includesToday = true
      break
    case 'yesterday':
      from = y
      to = y
      break
    case '7d':
      to = y
      from = subDays(y, 6) // 7 full closed days
      break
    case '30d':
      to = y
      from = subDays(y, 29) // 30 full closed days
      break
    case 'custom': {
      if (!customFrom || !customTo) {
        // fallback to yesterday
        from = y
        to = y
        break
      }
      from = new Date(customFrom)
      to = new Date(customTo)
      // Check if custom range includes today
      const todayStr = fmt(t)
      if (fmt(to) >= todayStr) {
        includesToday = true
      }
      break
    }
    default: {
      // Try Nd pattern
      const match = String(periodType).match(/^(\d+)d$/)
      if (match) {
        const days = parseInt(match[1], 10)
        to = y
        from = subDays(y, days - 1)
      } else {
        from = y
        to = y
      }
      break
    }
  }

  const periodDays = differenceInCalendarDays(to, from) + 1

  // Resolve compare range
  const compareRange = resolveCompare(from, to, periodDays, compare)

  return {
    current: { from: fmt(from), to: fmt(to) },
    compare: compareRange,
    includesToday,
    periodDays,
    periodType,
  }
}

function resolveCompare(
  from: Date,
  to: Date,
  periodDays: number,
  compare: CompareMode,
): { from: string; to: string } {
  switch (compare) {
    case 'prev_7d': {
      const prevTo = subDays(from, 1)
      const prevFrom = subDays(from, 7)
      return { from: fmt(prevFrom), to: fmt(prevTo) }
    }
    case 'prev_day': {
      const prevDay = subDays(from, 1)
      return { from: fmt(prevDay), to: fmt(prevDay) }
    }
    case 'prev_period':
    default: {
      // Same duration, immediately before
      const prevTo = subDays(from, 1)
      const prevFrom = subDays(from, periodDays)
      return { from: fmt(prevFrom), to: fmt(prevTo) }
    }
  }
}

/**
 * Parse period type from query string.
 * Supports: today, yesterday, 7d, 30d, custom, and Nd patterns.
 */
export function parsePeriodType(raw: string | null): PeriodType {
  if (!raw) return '7d'
  const lower = raw.toLowerCase().trim()
  if (['today', 'yesterday', '7d', '30d', 'custom'].includes(lower)) {
    return lower as PeriodType
  }
  // Accept Nd patterns as custom-like but resolve through default
  if (/^\d+d$/.test(lower)) return lower as PeriodType
  return '7d'
}

export function parseCompareMode(raw: string | null): CompareMode {
  if (!raw) return 'prev_period'
  const lower = raw.toLowerCase().trim()
  if (['prev_period', 'prev_7d', 'prev_day'].includes(lower)) {
    return lower as CompareMode
  }
  return 'prev_period'
}

/**
 * Generate an array of YYYY-MM-DD strings for a date range (inclusive).
 */
export function generateDateRange(from: string, to: string): string[] {
  const dates: string[] = []
  let current = new Date(from)
  const end = new Date(to)
  while (current <= end) {
    dates.push(fmt(current))
    current = subDays(current, -1) // add 1 day
  }
  return dates
}

export { CANONICAL_TZ }
