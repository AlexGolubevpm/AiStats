/**
 * Dashboard API
 *
 * GET /api/dashboard
 *
 * Reads from dailyMetric DB — same data source as /api/bundles, /api/sites, /api/forecast.
 * Sync workers populate the DB, all pages read from it.
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
