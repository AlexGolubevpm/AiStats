/**
 * Dashboard API — Reactive Federated Architecture
 *
 * GET /api/dashboard
 *
 * Query params:
 *   period    — today | yesterday | 7d | 30d | custom  (default: 7d)
 *   compare   — prev_period | prev_7d | prev_day       (default: prev_period)
 *   from, to  — YYYY-MM-DD (for custom period)
 *   refresh   — 1 to force cache bypass
 *
 * Response: DashboardResponse (see services/dashboard/types.ts)
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl

    const response = await executeDashboardQuery({
      period: searchParams.get('period'),
      compare: searchParams.get('compare'),
      from: searchParams.get('from'),
      to: searchParams.get('to'),
      forceRefresh: searchParams.get('refresh') === '1',
    })

    return jsonResponse(response)
  } catch (error) {
    console.error('Dashboard API error:', error)
    return errorResponse('Failed to load dashboard data')
  }
}
