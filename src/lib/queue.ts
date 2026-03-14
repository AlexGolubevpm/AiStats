import { Queue } from 'bullmq'

const redisConnection = {
  host: process.env.REDIS_URL ? new URL(process.env.REDIS_URL).hostname : 'localhost',
  port: process.env.REDIS_URL ? Number(new URL(process.env.REDIS_URL).port) || 6379 : 6379,
}

const opts = { connection: redisConnection }

export const syncAdspyglassQueue = new Queue('sync-adspyglass', opts)
export const syncCostsQueue = new Queue('sync-costs', opts)
export const syncAffiliateQueue = new Queue('sync-affiliate', opts)
export const calculateMetricsQueue = new Queue('calculate-metrics', opts)
export const runAnalysisQueue = new Queue('run-analysis', opts)
