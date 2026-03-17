import { syncAdspyglassWorker } from './sync-adspyglass'
import { syncCostsWorker } from './sync-costs'
import { syncAffiliateWorker } from './sync-affiliate'
import { syncYandexMetricaWorker } from './sync-yandex-metrica'
import { calculateMetricsWorker } from './calculate-metrics'
import { runAnalysisWorker } from './run-analysis'
import {
  syncAdspyglassQueue,
  syncCostsQueue,
  syncAffiliateQueue,
  syncYandexMetricaQueue,
  calculateMetricsQueue,
} from '../lib/queue'

const workers = [
  syncAdspyglassWorker,
  syncCostsWorker,
  syncAffiliateWorker,
  syncYandexMetricaWorker,
  calculateMetricsWorker,
  runAnalysisWorker,
]

console.log(`[workers] Starting ${workers.length} workers...`)
console.log('[workers] sync-adspyglass      - ready')
console.log('[workers] sync-costs           - ready')
console.log('[workers] sync-affiliate       - ready')
console.log('[workers] sync-yandex-metrica  - ready')
console.log('[workers] calculate-metrics    - ready')
console.log('[workers] run-analysis         - ready')
console.log('[workers] All workers running. Waiting for jobs...')

// ── Auto-sync schedule ──
// Register repeatable jobs so data syncs automatically.
// BullMQ deduplicates by jobId+repeat pattern, so re-registering on restart is safe.

async function setupScheduledSync() {
  try {
    // AdOK sync: every 4 hours
    await syncAdspyglassQueue.upsertJobScheduler(
      'scheduled-adspyglass',
      { pattern: '0 */4 * * *' },
      { name: 'sync', data: {} },
    )
    console.log('[scheduler] AdOK sync: every 4 hours')

    // Yandex Metrica sync: every 6 hours
    await syncYandexMetricaQueue.upsertJobScheduler(
      'scheduled-yandex-metrica',
      { pattern: '0 1,7,13,19 * * *' },
      { name: 'sync', data: {} },
    )
    console.log('[scheduler] Yandex Metrica sync: every 6 hours')

    // Costs sync: every 12 hours
    await syncCostsQueue.upsertJobScheduler(
      'scheduled-costs',
      { pattern: '0 3,15 * * *' },
      { name: 'sync', data: {} },
    )
    console.log('[scheduler] Costs sync: every 12 hours')

    // Affiliate sync: every 12 hours
    await syncAffiliateQueue.upsertJobScheduler(
      'scheduled-affiliate',
      { pattern: '0 4,16 * * *' },
      { name: 'sync', data: {} },
    )
    console.log('[scheduler] Affiliate sync: every 12 hours')

    // Metrics calculation: every 4 hours (after AdOK sync)
    await calculateMetricsQueue.upsertJobScheduler(
      'scheduled-calculate-metrics',
      { pattern: '30 */4 * * *' },
      { name: 'calculate', data: {} },
    )
    console.log('[scheduler] Metrics calculation: every 4 hours (offset 30min)')

    console.log('[scheduler] All scheduled syncs registered')
  } catch (error) {
    console.error('[scheduler] Failed to setup scheduled sync:', error)
  }
}

setupScheduledSync()

async function shutdown(signal: string) {
  console.log(`\n[workers] Received ${signal}. Shutting down gracefully...`)

  const shutdownPromises = workers.map(async (worker) => {
    try {
      await worker.close()
      console.log(`[workers] ${worker.name} stopped`)
    } catch (error) {
      console.error(`[workers] Error stopping ${worker.name}:`, error)
    }
  })

  await Promise.allSettled(shutdownPromises)
  console.log('[workers] All workers stopped. Exiting.')
  process.exit(0)
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))

// Keep the process alive
process.on('uncaughtException', (error) => {
  console.error('[workers] Uncaught exception:', error)
  // Don't exit - let workers continue processing
})

process.on('unhandledRejection', (reason) => {
  console.error('[workers] Unhandled rejection:', reason)
  // Don't exit - let workers continue processing
})
