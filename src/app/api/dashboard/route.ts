/**
 * Dashboard API
 *
 * GET /api/dashboard
 *
 * Query params:
 *   period    — today | yesterday | 7d | 30d | 90d | custom  (default: 7d)
 *   compare   — prev_period | prev_7d | prev_day             (default: prev_period)
 *   from, to  — YYYY-MM-DD (for custom period)
 *   refresh   — 1 to force cache bypass
 *
 * Reads from the same dailyMetric table as Bundles/Sites/Costs tabs.
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
