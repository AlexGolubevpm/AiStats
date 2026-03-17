import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { jsonResponse, errorResponse } from '@/lib/api-utils'
import {
  syncAdspyglassQueue,
  syncCostsQueue,
  syncAffiliateQueue,
} from '@/lib/queue'

export async function GET() {
  try {
    const logs = await prisma.syncLog.findMany({
      orderBy: { startedAt: 'desc' },
      take: 50,
    })

    const result = logs.map((log) => ({
      id: log.id,
      source: log.source,
      status: log.status,
      startedAt: log.startedAt,
      completedAt: log.completedAt,
      recordsProcessed: log.recordsProcessed,
      error: log.error,
    }))

    return jsonResponse(result)
  } catch (error) {
    console.error('Sync API error:', error)
    return errorResponse('Failed to load sync logs')
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const source = body.source || 'all'
    const from = body.from
    const to = body.to

    const jobs: string[] = []

    if (source === 'all' || source === 'adspyglass') {
      await syncAdspyglassQueue.add('sync', { from, to })
      jobs.push('adspyglass')
    }

    if (source === 'all' || source === 'costs' || source === 'google_sheets_costs') {
      await syncCostsQueue.add('sync', { from, to })
      jobs.push('costs')
    }

    if (source === 'all' || source === 'affiliate' || source === 'google_sheets_affiliate') {
      await syncAffiliateQueue.add('sync', { from, to })
      jobs.push('affiliate')
    }

    return jsonResponse({
      message: `Sync triggered for: ${jobs.join(', ')}`,
      jobs,
    })
  } catch (error) {
    console.error('Sync trigger error:', error)
    return errorResponse('Failed to trigger sync')
  }
}
