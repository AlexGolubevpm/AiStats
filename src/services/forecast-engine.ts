import { aggregateNetworkMetrics, getNetworkTrend } from '@/services/metrics'

// ─── TYPES ───

export interface ForecastBaseValues {
  revenue: number
  affiliate: number
  costs: number
  traffic: number
}

export interface ForecastResult {
  base: ForecastBaseValues
  projected: ForecastBaseValues
  confidence: 'high' | 'medium' | 'low'
}

// ─── LINEAR REGRESSION HELPERS ───

/**
 * Compute the slope of a simple linear regression (y vs index).
 * Returns the daily change (slope) for the given values.
 */
function linearSlope(values: number[]): number {
  const n = values.length
  if (n < 2) return 0

  const meanX = (n - 1) / 2
  const meanY = values.reduce((s, v) => s + v, 0) / n

  let numerator = 0
  let denominator = 0
  for (let i = 0; i < n; i++) {
    numerator += (i - meanX) * (values[i] - meanY)
    denominator += (i - meanX) ** 2
  }

  return denominator === 0 ? 0 : numerator / denominator
}

/**
 * Coefficient of variation: stddev / mean.
 * Used to determine forecast confidence.
 */
function coefficientOfVariation(values: number[]): number {
  const n = values.length
  if (n < 2) return 0
  const mean = values.reduce((s, v) => s + v, 0) / n
  if (mean === 0) return 0
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / n
  return Math.sqrt(variance) / Math.abs(mean)
}

function determineConfidence(cv: number): 'high' | 'medium' | 'low' {
  if (cv < 0.15) return 'high'
  if (cv < 0.35) return 'medium'
  return 'low'
}

// ─── MAIN ───

/**
 * Returns current actual values as a baseline plus projected values
 * adjusted by a linear trend from the last 7 days of data.
 */
export async function getForecastBaseValues(
  from: Date,
  to: Date
): Promise<ForecastResult> {
  const metrics = await aggregateNetworkMetrics(from, to)

  const base: ForecastBaseValues = {
    revenue: metrics.adRevenue,
    affiliate: metrics.affiliateRevenue,
    costs: metrics.costs,
    traffic: metrics.hits,
  }

  // Get daily trend data for the period to compute linear projections
  const trend = await getNetworkTrend(from, to)

  if (trend.length < 2) {
    return {
      base,
      projected: { ...base },
      confidence: 'low',
    }
  }

  // Use last 7 data points (or all if fewer) for trend calculation
  const recentTrend = trend.slice(-7)

  const revenueValues = recentTrend.map((t) => t.adRevenue)
  const affiliateValues = recentTrend.map((t) => t.affiliateRevenue)
  const costValues = recentTrend.map((t) => t.costs)
  const trafficValues = recentTrend.map((t) => t.hits)

  // Calculate daily slopes
  const revenueSlope = linearSlope(revenueValues)
  const affiliateSlope = linearSlope(affiliateValues)
  const costSlope = linearSlope(costValues)
  const trafficSlope = linearSlope(trafficValues)

  // Project forward by the number of days in the period
  const daysInPeriod = trend.length
  const lastRevenue = revenueValues[revenueValues.length - 1]
  const lastAffiliate = affiliateValues[affiliateValues.length - 1]
  const lastCosts = costValues[costValues.length - 1]
  const lastTraffic = trafficValues[trafficValues.length - 1]

  // Projected = last value + slope * days, scaled to period total
  // Ensure projected values don't go negative
  const projected: ForecastBaseValues = {
    revenue: Math.max(0, (lastRevenue + revenueSlope * daysInPeriod) * daysInPeriod),
    affiliate: Math.max(0, (lastAffiliate + affiliateSlope * daysInPeriod) * daysInPeriod),
    costs: Math.max(0, (lastCosts + costSlope * daysInPeriod) * daysInPeriod),
    traffic: Math.max(0, Math.round((lastTraffic + trafficSlope * daysInPeriod) * daysInPeriod)),
  }

  // Confidence based on coefficient of variation of revenue (primary metric)
  const cv = coefficientOfVariation(revenueValues)
  const confidence = determineConfidence(cv)

  return { base, projected, confidence }
}
