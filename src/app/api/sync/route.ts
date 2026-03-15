import { prisma } from '@/lib/db'
import { jsonResponse, errorResponse } from '@/lib/api-utils'

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
