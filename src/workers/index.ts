import { syncAdspyglassWorker } from './sync-adspyglass'
import { syncCostsWorker } from './sync-costs'
import { syncAffiliateWorker } from './sync-affiliate'
import { syncYandexMetricaWorker } from './sync-yandex-metrica'
import { calculateMetricsWorker } from './calculate-metrics'
import { runAnalysisWorker } from './run-analysis'

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
