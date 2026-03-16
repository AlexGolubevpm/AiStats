import { aggregateNetworkMetrics } from '@/services/metrics'

// ─── TYPES ───

export interface ForecastBaseValues {
  revenue: number
  affiliate: number
  costs: number
  traffic: number
}

export interface ForecastInput {
  trafficChange: number    // percentage, e.g. 10 = +10%
  rpmChange: number        // percentage
  costChange: number       // percentage
  affiliateChange: number  // percentage
}

export interface ForecastScenario {
  label: string
  revenue: number
  affiliate: number
  costs: number
  totalRevenue: number
  profit: number
  romi: number
  traffic: number
}

export interface ForecastResult {
  baseline: ForecastBaseValues
  scenarios: {
    best: ForecastScenario
    base: ForecastScenario
    worst: ForecastScenario
  }
}

// ─── MAIN ───

export async function getForecastBaseValues(
  from: Date,
  to: Date
): Promise<ForecastBaseValues> {
  const metrics = await aggregateNetworkMetrics(from, to)

  return {
    revenue: metrics.adRevenue,
    affiliate: metrics.affiliateRevenue,
    costs: metrics.costs,
    traffic: metrics.users,
  }
}

function applyScenario(
  baseline: ForecastBaseValues,
  input: ForecastInput,
  label: string
): ForecastScenario {
  const trafficMultiplier = 1 + input.trafficChange / 100
  const rpmMultiplier = 1 + input.rpmChange / 100
  const costMultiplier = 1 + input.costChange / 100
  const affiliateMultiplier = 1 + input.affiliateChange / 100

  const traffic = Math.round(baseline.traffic * trafficMultiplier)
  // Revenue scales with both traffic and RPM changes
  const revenue = baseline.revenue * trafficMultiplier * rpmMultiplier
  const affiliate = baseline.affiliate * affiliateMultiplier
  const costs = baseline.costs * costMultiplier
  const totalRevenue = revenue + affiliate
  const profit = totalRevenue - costs
  const romi = costs > 0 ? ((totalRevenue - costs) / costs) * 100 : 0

  return { label, revenue, affiliate, costs, totalRevenue, profit, romi, traffic }
}

export async function generateForecast(
  from: Date,
  to: Date,
  input?: ForecastInput
): Promise<ForecastResult> {
  const baseline = await getForecastBaseValues(from, to)

  // Default input: user-provided or sensible defaults
  const userInput = input || { trafficChange: 0, rpmChange: 0, costChange: 0, affiliateChange: 0 }

  // Best scenario: user inputs + optimistic buffer
  const best = applyScenario(baseline, {
    trafficChange: userInput.trafficChange + 15,
    rpmChange: userInput.rpmChange + 10,
    costChange: userInput.costChange - 5,
    affiliateChange: userInput.affiliateChange + 10,
  }, 'Best Case')

  // Base scenario: user inputs as-is
  const base = applyScenario(baseline, userInput, 'Base Case')

  // Worst scenario: user inputs + pessimistic buffer
  const worst = applyScenario(baseline, {
    trafficChange: userInput.trafficChange - 15,
    rpmChange: userInput.rpmChange - 10,
    costChange: userInput.costChange + 10,
    affiliateChange: userInput.affiliateChange - 10,
  }, 'Worst Case')

  return { baseline, scenarios: { best, base, worst } }
}
