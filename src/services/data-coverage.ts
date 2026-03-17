import { prisma } from '@/lib/db'
import {
  syncAdspyglassQueue,
  syncCostsQueue,
  syncAffiliateQueue,
  syncYandexMetricaQueue,
} from '@/lib/queue'

/**
 * How many days of "staleness" to tolerate before triggering a resync
 * for sources where data can arrive late.
 */
const RESYNC_STALE_DAYS = 3

interface CoverageResult {
  /** True if all requested dates are covered */
  covered: boolean
  /** Dates missing from daily_metrics */
  missingDates: string[]
  /** Jobs that were enqueued to fill gaps */
  enqueuedJobs: string[]
  /** Whether a resync was triggered for recent dates (late-arriving data) */
  resyncTriggered: boolean
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/**
 * Generate all dates between from and to (inclusive) as YYYY-MM-DD strings.
 */
function generateDateRange(from: Date, to: Date): string[] {
  const dates: string[] = []
  const current = new Date(from)
  current.setUTCHours(0, 0, 0, 0)
  const end = new Date(to)
  end.setUTCHours(0, 0, 0, 0)

  while (current <= end) {
    dates.push(formatDate(current))
    current.setUTCDate(current.getUTCDate() + 1)
  }
  return dates
}

/**
 * Check whether daily_metrics covers the requested date range.
 * If gaps are found, enqueue sync jobs for the missing period.
 * Also handles resync for recent dates where data may have arrived late.
 */
export async function ensureDataCoverage(
  from: Date,
  to: Date,
  options?: { forceResync?: boolean },
): Promise<CoverageResult> {
  const result: CoverageResult = {
    covered: true,
    missingDates: [],
    enqueuedJobs: [],
    resyncTriggered: false,
  }

  // 1. Find which dates have at least one daily_metrics row
  const existingRows = await prisma.dailyMetric.groupBy({
    by: ['date'],
    where: {
      date: { gte: from, lte: to },
    },
  })

  const existingDates = new Set(existingRows.map((r) => formatDate(r.date)))
  const allDates = generateDateRange(from, to)
  const missingDates = allDates.filter((d) => !existingDates.has(d))

  result.missingDates = missingDates

  if (missingDates.length > 0) {
    result.covered = false

    // Find contiguous ranges of missing dates to minimize API calls
    const ranges = findContiguousRanges(missingDates)

    for (const range of ranges) {
      // Enqueue AdSpyglass sync for missing range
      await syncAdspyglassQueue.add('backfill', {
        from: range.from,
        to: range.to,
      })
      result.enqueuedJobs.push(`adspyglass: ${range.from} → ${range.to}`)

      // Enqueue Yandex Metrica sync for missing range
      await syncYandexMetricaQueue.add('backfill', {
        from: range.from,
        to: range.to,
      })
      result.enqueuedJobs.push(`yandex_metrica: ${range.from} → ${range.to}`)
    }

    // Google Sheets: trigger a full sync (CSV is fetched entirely anyway)
    await syncCostsQueue.add('backfill', {})
    result.enqueuedJobs.push('costs: full sheet')

    await syncAffiliateQueue.add('backfill', {})
    result.enqueuedJobs.push('affiliate: full sheet')
  }

  // 2. Resync recent dates for late-arriving data
  const now = new Date()
  const resyncFrom = new Date(now)
  resyncFrom.setUTCDate(resyncFrom.getUTCDate() - RESYNC_STALE_DAYS)
  resyncFrom.setUTCHours(0, 0, 0, 0)

  // Only resync if the requested range overlaps with the recent window
  const rangeOverlapsRecent = to >= resyncFrom

  if (rangeOverlapsRecent || options?.forceResync) {
    const shouldResync = options?.forceResync || await isResyncNeeded(resyncFrom, now)

    if (shouldResync) {
      const resyncFromStr = formatDate(resyncFrom)
      const resyncToStr = formatDate(now)

      await syncAdspyglassQueue.add('resync-recent', {
        from: resyncFromStr,
        to: resyncToStr,
      })
      result.enqueuedJobs.push(`adspyglass resync: ${resyncFromStr} → ${resyncToStr}`)

      await syncYandexMetricaQueue.add('resync-recent', {
        from: resyncFromStr,
        to: resyncToStr,
      })
      result.enqueuedJobs.push(`yandex_metrica resync: ${resyncFromStr} → ${resyncToStr}`)

      result.resyncTriggered = true
    }
  }

  return result
}

/**
 * Check if a resync is needed by looking at the last successful sync time.
 * If the last sync for adspyglass/yandex_metrica was more than 6 hours ago, resync.
 */
async function isResyncNeeded(from: Date, _to: Date): Promise<boolean> {
  const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000)

  const lastSync = await prisma.syncLog.findFirst({
    where: {
      source: { in: ['adspyglass', 'yandex_metrica'] },
      status: 'completed',
    },
    orderBy: { completedAt: 'desc' },
  })

  // No completed sync ever, or last sync was >6h ago
  if (!lastSync?.completedAt || lastSync.completedAt < sixHoursAgo) {
    return true
  }

  return false
}

/**
 * Group an array of sorted date strings into contiguous ranges.
 * e.g. ["2025-01-01", "2025-01-02", "2025-01-05"] →
 *   [{ from: "2025-01-01", to: "2025-01-02" }, { from: "2025-01-05", to: "2025-01-05" }]
 */
function findContiguousRanges(dates: string[]): { from: string; to: string }[] {
  if (dates.length === 0) return []

  const sorted = [...dates].sort()
  const ranges: { from: string; to: string }[] = []
  let rangeStart = sorted[0]
  let prev = sorted[0]

  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i]
    const prevDate = new Date(prev + 'T00:00:00Z')
    const currDate = new Date(current + 'T00:00:00Z')
    const diffDays = (currDate.getTime() - prevDate.getTime()) / (24 * 60 * 60 * 1000)

    if (diffDays > 1) {
      ranges.push({ from: rangeStart, to: prev })
      rangeStart = current
    }
    prev = current
  }

  ranges.push({ from: rangeStart, to: prev })
  return ranges
}
