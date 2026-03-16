import { prisma } from '@/lib/db'
import {
  startOfDay,
  endOfDay,
  subDays,
  differenceInDays,
  format,
} from 'date-fns'
import { Prisma } from '@prisma/client'

// ─── DATE HELPERS ───

export function getDateRange(period: string): { from: Date; to: Date } {
  const now = new Date()
  const today = startOfDay(now)

  switch (period) {
    case 'today':
      return { from: today, to: endOfDay(now) }
    case 'yesterday': {
      const yesterday = subDays(today, 1)
      return { from: startOfDay(yesterday), to: endOfDay(yesterday) }
    }
    case '7d':
      return { from: startOfDay(subDays(today, 6)), to: endOfDay(now) }
    case '30d':
      return { from: startOfDay(subDays(today, 29)), to: endOfDay(now) }
    case '90d':
      return { from: startOfDay(subDays(today, 89)), to: endOfDay(now) }
    default: {
      // Try to parse "Nd" pattern
      const match = period.match(/^(\d+)d$/)
      if (match) {
        const days = parseInt(match[1], 10)
        return { from: startOfDay(subDays(today, days - 1)), to: endOfDay(now) }
      }
      // Fallback to 7d
      return { from: startOfDay(subDays(today, 6)), to: endOfDay(now) }
    }
  }
}

export function getPreviousDateRange(
  from: Date,
  to: Date
): { from: Date; to: Date } {
  const days = differenceInDays(to, from) + 1
  return {
    from: startOfDay(subDays(from, days)),
    to: endOfDay(subDays(to, days)),
  }
}

// ─── DECIMAL HELPERS ───

function toNum(val: Prisma.Decimal | number | null | undefined): number {
  if (val == null) return 0
  if (typeof val === 'number') return val
  return Number(val)
}

function sumNum(val: Prisma.Decimal | number | null | undefined): number {
  return toNum(val)
}

// ─── AGGREGATE METRICS ───

interface AggregatedMetrics {
  users: number
  hits: number
  impressions: number
  clicks: number
  adRevenue: number
  affiliateRevenue: number
  totalRevenue: number
  costs: number
  profit: number
  romi: number
  rpm: number
}

function buildAggregateResult(raw: {
  _sum: {
    users: number | null
    hits: number | null
    impressions: number | null
    clicks: number | null
    adRevenue: Prisma.Decimal | null
    affiliateRevenue: Prisma.Decimal | null
    totalRevenue: Prisma.Decimal | null
    costs: Prisma.Decimal | null
    profit: Prisma.Decimal | null
  }
}): AggregatedMetrics {
  const users = raw._sum.users ?? 0
  const hits = raw._sum.hits ?? 0
  const impressions = raw._sum.impressions ?? 0
  const clicks = raw._sum.clicks ?? 0
  const adRevenue = sumNum(raw._sum.adRevenue)
  const affiliateRevenue = sumNum(raw._sum.affiliateRevenue)
  const totalRevenue = sumNum(raw._sum.totalRevenue)
  const costs = sumNum(raw._sum.costs)
  const profit = sumNum(raw._sum.profit)
  const romi = costs > 0 ? ((totalRevenue - costs) / costs) * 100 : 0
  const rpm = users > 0 ? (totalRevenue / users) * 1000 : 0

  return {
    users,
    hits,
    impressions,
    clicks,
    adRevenue,
    affiliateRevenue,
    totalRevenue,
    costs,
    profit,
    romi,
    rpm,
  }
}

export async function aggregateNetworkMetrics(
  from: Date,
  to: Date
): Promise<AggregatedMetrics> {
  const result = await prisma.dailyMetric.aggregate({
    where: {
      date: { gte: from, lte: to },
    },
    _sum: {
      users: true,
      hits: true,
      impressions: true,
      clicks: true,
      adRevenue: true,
      affiliateRevenue: true,
      totalRevenue: true,
      costs: true,
      profit: true,
    },
  })

  return buildAggregateResult(result)
}

export async function aggregateBundleMetrics(
  bundleId: string,
  from: Date,
  to: Date
): Promise<AggregatedMetrics> {
  const result = await prisma.dailyMetric.aggregate({
    where: {
      date: { gte: from, lte: to },
      site: { bundleId },
    },
    _sum: {
      users: true,
      hits: true,
      impressions: true,
      clicks: true,
      adRevenue: true,
      affiliateRevenue: true,
      totalRevenue: true,
      costs: true,
      profit: true,
    },
  })

  return buildAggregateResult(result)
}

export async function aggregateSiteMetrics(
  siteId: string,
  from: Date,
  to: Date
): Promise<AggregatedMetrics> {
  const result = await prisma.dailyMetric.aggregate({
    where: {
      siteId,
      date: { gte: from, lte: to },
    },
    _sum: {
      users: true,
      hits: true,
      impressions: true,
      clicks: true,
      adRevenue: true,
      affiliateRevenue: true,
      totalRevenue: true,
      costs: true,
      profit: true,
    },
  })

  return buildAggregateResult(result)
}

// ─── TREND DATA ───

interface TrendPoint {
  date: string
  hits: number      // ad requests from AdOK
  users: number     // real users from Yandex Metrica (0 until connected)
  adRevenue: number
  affiliateRevenue: number
  totalRevenue: number
  costs: number
  profit: number
}

async function buildTrend(
  where: Prisma.DailyMetricWhereInput
): Promise<TrendPoint[]> {
  const rows = await prisma.dailyMetric.groupBy({
    by: ['date'],
    where,
    _sum: {
      hits: true,
      users: true,
      adRevenue: true,
      affiliateRevenue: true,
      totalRevenue: true,
      costs: true,
      profit: true,
    },
    orderBy: { date: 'asc' },
  })

  return rows.map((row) => ({
    date: format(row.date, 'yyyy-MM-dd'),
    hits: row._sum.hits ?? 0,
    users: row._sum.users ?? 0,
    adRevenue: sumNum(row._sum.adRevenue),
    affiliateRevenue: sumNum(row._sum.affiliateRevenue),
    totalRevenue: sumNum(row._sum.totalRevenue),
    costs: sumNum(row._sum.costs),
    profit: sumNum(row._sum.profit),
  }))
}

export async function getNetworkTrend(
  from: Date,
  to: Date
): Promise<TrendPoint[]> {
  return buildTrend({ date: { gte: from, lte: to } })
}

export async function getBundleTrend(
  bundleId: string,
  from: Date,
  to: Date
): Promise<TrendPoint[]> {
  return buildTrend({
    date: { gte: from, lte: to },
    site: { bundleId },
  })
}

export async function getSiteTrend(
  siteId: string,
  from: Date,
  to: Date
): Promise<TrendPoint[]> {
  return buildTrend({
    siteId,
    date: { gte: from, lte: to },
  })
}

// ─── FORMAT BREAKDOWN ───

interface FormatBreakdownItem {
  format: string
  impressions: number
  clicks: number
  revenue: number
  ctr: number
  fillRate: number
  ecpm: number
  rpm: number
}

export async function getFormatBreakdown(
  siteId: string,
  from: Date,
  to: Date
): Promise<FormatBreakdownItem[]> {
  const rows = await prisma.formatMetric.groupBy({
    by: ['format'],
    where: {
      siteId,
      date: { gte: from, lte: to },
    },
    _sum: {
      impressions: true,
      clicks: true,
      revenue: true,
    },
  })

  return rows.map((row) => {
    const impressions = row._sum.impressions ?? 0
    const clicks = row._sum.clicks ?? 0
    const revenue = sumNum(row._sum.revenue)
    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0
    const ecpm = impressions > 0 ? (revenue / impressions) * 1000 : 0

    return {
      format: row.format,
      impressions,
      clicks,
      revenue,
      ctr,
      fillRate: 0, // Fill rate needs total available impressions - not summable
      ecpm,
      rpm: ecpm, // RPM and eCPM are equivalent at format level
    }
  })
}

export async function getBundleFormatBreakdown(
  bundleId: string,
  from: Date,
  to: Date
): Promise<FormatBreakdownItem[]> {
  const rows = await prisma.formatMetric.groupBy({
    by: ['format'],
    where: {
      site: { bundleId },
      date: { gte: from, lte: to },
    },
    _sum: {
      impressions: true,
      clicks: true,
      revenue: true,
    },
  })

  return rows.map((row) => {
    const impressions = row._sum.impressions ?? 0
    const clicks = row._sum.clicks ?? 0
    const revenue = sumNum(row._sum.revenue)
    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0
    const ecpm = impressions > 0 ? (revenue / impressions) * 1000 : 0

    return {
      format: row.format,
      impressions,
      clicks,
      revenue,
      ctr,
      fillRate: 0,
      ecpm,
      rpm: ecpm,
    }
  })
}

// ─── TIER BREAKDOWN ───

interface TierBreakdownItem {
  tier: string
  users: number
  impressions: number
  clicks: number
  revenue: number
  ctr: number
  fillRate: number
  rpm: number
}

export async function getTierBreakdown(
  siteId: string,
  from: Date,
  to: Date
): Promise<TierBreakdownItem[]> {
  const rows = await prisma.tierMetric.groupBy({
    by: ['tier'],
    where: {
      siteId,
      date: { gte: from, lte: to },
    },
    _sum: {
      users: true,
      impressions: true,
      clicks: true,
      revenue: true,
    },
  })

  return rows.map((row) => {
    const users = row._sum.users ?? 0
    const impressions = row._sum.impressions ?? 0
    const clicks = row._sum.clicks ?? 0
    const revenue = sumNum(row._sum.revenue)
    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0
    const rpm = users > 0 ? (revenue / users) * 1000 : 0

    return {
      tier: row.tier,
      users,
      impressions,
      clicks,
      revenue,
      ctr,
      fillRate: 0,
      rpm,
    }
  })
}

// ─── DELTA CALCULATION ───

export function calculateDelta(current: number, previous: number): number {
  if (previous === 0) {
    return current > 0 ? 100 : 0
  }
  return ((current - previous) / Math.abs(previous)) * 100
}
