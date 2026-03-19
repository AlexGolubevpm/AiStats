/**
 * Dashboard API — Reactive Federated Architecture
 *
 * GET /api/dashboard
 *
 * Query params:
 *   period    — today | yesterday | 7d | 30d | 90d | custom  (default: 7d)
 *   compare   — prev_period | prev_7d | prev_day             (default: prev_period)
 *   from, to  — YYYY-MM-DD (for custom period)
 *   refresh   — 1 to force cache bypass
 *
 * Architecture:
 *   1. Resolve canonical period
 *   2. Check short-lived cache
 *   3. Fetch all sources in parallel (Yandex, AdOK, Costs Sheet, Affiliate Sheet)
 *   4. Normalize & merge into unified structure
 *   5. Compute: KPIs, trends, bundles, health, signals, insights
 *   6. Cache result
 *   7. Return unified response
 */

import { NextRequest } from 'next/server'
import { executeDashboardQuery } from '@/services/dashboard'
import { jsonResponse, errorResponse } from '@/lib/api-utils'

/** Maximum time the dashboard query may run before we return an error. */
const REQUEST_TIMEOUT_MS = 30_000

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl

    const queryPromise = executeDashboardQuery({
      period: searchParams.get('period'),
      compare: searchParams.get('compare'),
      from: searchParams.get('from'),
      to: searchParams.get('to'),
      forceRefresh: searchParams.get('refresh') === '1',
    })

    const response = await Promise.race([
      queryPromise,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Dashboard query timed out')), REQUEST_TIMEOUT_MS),
      ),
    ])

    return jsonResponse(response)
  } catch (error) {
    console.error('Dashboard API error:', error)
    const message = error instanceof Error && error.message.includes('timed out')
      ? 'Dashboard query timed out — one or more data sources may be unreachable. Cached data may still appear on retry.'
      : 'Failed to load dashboard data'
    return errorResponse(message)
  }
}
