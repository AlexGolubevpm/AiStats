import { aggregateNetworkMetrics } from '@/services/metrics'

// ─── TYPES ───

export interface ForecastBaseValues {
  revenue: number
  affiliate: number
  costs: number
  traffic: number
}

// ─── MAIN ───

/**
 * Returns current actual values for the given date range to serve as a
 * baseline for forecasting.  The caller (e.g. a forecast UI or AI
 * analysis) can apply growth/decay rates on top of these actuals.
 */
export async function getForecastBaseValues(
  from: Date,
  to: Date
): Promise<ForecastBaseValues> {
  const metrics = await aggregateNetworkMetrics(from, to)

  return {
    revenue: metrics.adRevenue,
    affiliate: metrics.affiliateRevenue,
    costs: metrics.costs,
    traffic: metrics.hits,
  }
}
