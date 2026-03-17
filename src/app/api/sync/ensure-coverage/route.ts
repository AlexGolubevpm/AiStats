import { NextRequest } from 'next/server'
import { jsonResponse, errorResponse } from '@/lib/api-utils'
import { ensureDataCoverage } from '@/services/data-coverage'

/**
 * POST /api/sync/ensure-coverage
 * Body: { from: "YYYY-MM-DD", to: "YYYY-MM-DD", forceResync?: boolean }
 *
 * Checks if daily_metrics has data for the requested date range.
 * If gaps are found, automatically enqueues sync jobs for missing periods.
 * Also triggers resync for recent dates where data may arrive late.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))

    if (!body.from || !body.to) {
      return errorResponse('Missing required fields: from, to', 400)
    }

    const from = new Date(body.from + 'T00:00:00.000Z')
    const to = new Date(body.to + 'T23:59:59.999Z')

    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      return errorResponse('Invalid date format. Use YYYY-MM-DD.', 400)
    }

    const result = await ensureDataCoverage(from, to, {
      forceResync: body.forceResync === true,
    })

    return jsonResponse(result)
  } catch (error) {
    console.error('Ensure coverage error:', error)
    return errorResponse('Failed to check data coverage')
  }
}
