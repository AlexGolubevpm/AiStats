/**
 * DashboardSignalEngine
 *
 * Computes: signals, insights, anomalies, action hints.
 * Produces prescriptive, decision-oriented output.
 */

import type {
  NormalizedData,
  DashboardBundle,
  DashboardSignal,
  DashboardInsight,
  CompletenessStatus,
  BusinessTargets,
} from './types'
import { DEFAULT_TARGETS } from './types'
import { aggregateRows, type AggregatedPeriod } from './metrics-engine'

// ─── Signals ───

export function computeSignals(
  bundles: DashboardBundle[],
  currentData: NormalizedData,
  compareData: NormalizedData,
  targets: BusinessTargets = DEFAULT_TARGETS,
): DashboardSignal[] {
  const signals: DashboardSignal[] = []

  // 1. Strongest bundle
  const sorted = [...bundles].filter(b => b.totalRevenue != null)
    .sort((a, b) => (b.totalRevenue ?? 0) - (a.totalRevenue ?? 0))

  if (sorted.length > 0 && sorted[0].totalRevenue != null) {
    signals.push({
      type: 'winner',
      entityType: 'bundle',
      entityName: sorted[0].name,
      metric: 'totalRevenue',
      value: sorted[0].totalRevenue,
      delta: sorted[0].delta,
      reason: `Highest revenue bundle at $${sorted[0].totalRevenue!.toFixed(2)}`,
      actionHint: 'Scale traffic to this bundle for maximum impact',
      completeness: sorted[0].completeness,
    })
  }

  // 2. Biggest revenue drop
  const byDelta = [...bundles].filter(b => b.delta != null)
    .sort((a, b) => (a.delta ?? 0) - (b.delta ?? 0))

  if (byDelta.length > 0 && byDelta[0].delta != null && byDelta[0].delta < -5) {
    signals.push({
      type: 'drop',
      entityType: 'bundle',
      entityName: byDelta[0].name,
      metric: 'totalRevenue',
      value: byDelta[0].totalRevenue,
      delta: byDelta[0].delta,
      reason: `Revenue dropped ${Math.abs(byDelta[0].delta!).toFixed(1)}% vs previous period`,
      actionHint: 'Investigate traffic sources and monetization changes',
      completeness: byDelta[0].completeness,
    })
  }

  // 3. Highest operational risk
  const highRisk = bundles.filter(b => b.riskLevel === 'high')
  if (highRisk.length > 0) {
    const worst = highRisk.sort((a, b) => (a.profit ?? 0) - (b.profit ?? 0))[0]
    signals.push({
      type: 'risk',
      entityType: 'bundle',
      entityName: worst.name,
      metric: 'profit',
      value: worst.profit,
      delta: worst.delta,
      reason: worst.profit != null && worst.profit < 0
        ? `Bundle is unprofitable: $${worst.profit.toFixed(2)}`
        : `Bundle has high risk indicators`,
      actionHint: 'Review cost structure and consider traffic reallocation',
      completeness: worst.completeness,
    })
  }

  // 4. Best recovery
  if (byDelta.length > 0) {
    const best = byDelta[byDelta.length - 1]
    if (best.delta != null && best.delta > 10) {
      signals.push({
        type: 'recovery',
        entityType: 'bundle',
        entityName: best.name,
        metric: 'totalRevenue',
        value: best.totalRevenue,
        delta: best.delta,
        reason: `Revenue grew ${best.delta.toFixed(1)}% vs previous period`,
        actionHint: 'Capitalize on momentum — consider increasing investment',
        completeness: best.completeness,
      })
    }
  }

  // 5. Source-level anomalies
  for (const [source, status] of Object.entries(currentData.sourceStatuses)) {
    if (status.status === 'stale' || status.status === 'failed') {
      signals.push({
        type: 'risk',
        entityType: 'network',
        entityName: source,
        metric: 'sourceHealth',
        value: null,
        delta: null,
        reason: `${source} source is ${status.status}: ${status.notes.join('; ') || 'check configuration'}`,
        actionHint: `Verify ${source} API credentials and connectivity`,
        completeness: 'incomplete',
      })
    }
  }

  return signals
}

// ─── Insights ───

export function computeInsights(
  bundles: DashboardBundle[],
  currentData: NormalizedData,
  compareData: NormalizedData,
  targets: BusinessTargets = DEFAULT_TARGETS,
): DashboardInsight[] {
  const insights: DashboardInsight[] = []

  for (const bundle of bundles) {
    // Winner: strong positive performance
    if (bundle.delta != null && bundle.delta > 15 && bundle.totalRevenue != null) {
      insights.push({
        type: 'winner',
        entityType: 'bundle',
        entityName: bundle.name,
        metric: 'totalRevenue',
        value: bundle.totalRevenue,
        delta: bundle.delta,
        reason: `Revenue increased ${bundle.delta.toFixed(1)}% — strong growth momentum`,
        action: 'Increase traffic allocation and monitor monetization efficiency',
        severity: 'info',
        completeness: bundle.completeness,
      })
    }

    // Loser: significant decline
    if (bundle.delta != null && bundle.delta < -15 && bundle.totalRevenue != null) {
      insights.push({
        type: 'loser',
        entityType: 'bundle',
        entityName: bundle.name,
        metric: 'totalRevenue',
        value: bundle.totalRevenue,
        delta: bundle.delta,
        reason: `Revenue dropped ${Math.abs(bundle.delta).toFixed(1)}% — investigate cause`,
        action: 'Check traffic quality, ad fill rates, and partner performance',
        severity: bundle.delta < -30 ? 'critical' : 'warning',
        completeness: bundle.completeness,
      })
    }

    // Risk: below target ROMI
    if (bundle.romi != null && bundle.romi < targets.targetRomi * 0.7) {
      insights.push({
        type: 'risk',
        entityType: 'bundle',
        entityName: bundle.name,
        metric: 'romi',
        value: bundle.romi,
        delta: null,
        reason: `ROMI at ${bundle.romi.toFixed(1)}% — well below target of ${targets.targetRomi}%`,
        action: 'Reduce costs or improve monetization to reach target ROMI',
        severity: bundle.romi < 100 ? 'critical' : 'warning',
        completeness: bundle.completeness,
      })
    }

    // Opportunity: high ROMI room to scale
    if (bundle.romi != null && bundle.romi > targets.targetRomi * 1.5 && bundle.totalRevenue != null) {
      insights.push({
        type: 'opportunity',
        entityType: 'bundle',
        entityName: bundle.name,
        metric: 'romi',
        value: bundle.romi,
        delta: null,
        reason: `ROMI at ${bundle.romi.toFixed(1)}% — significantly above target, room to scale`,
        action: 'Consider increasing traffic spend to capture more revenue at favorable ROMI',
        severity: 'info',
        completeness: bundle.completeness,
      })
    }

    // Cost pressure
    if (bundle.costs != null && bundle.totalRevenue != null && bundle.totalRevenue > 0) {
      const costRatio = bundle.costs / bundle.totalRevenue
      if (costRatio > 0.8) {
        insights.push({
          type: 'risk',
          entityType: 'bundle',
          entityName: bundle.name,
          metric: 'costPressure',
          value: costRatio * 100,
          delta: null,
          reason: `Cost-to-revenue ratio at ${(costRatio * 100).toFixed(1)}% — very high cost pressure`,
          action: 'Urgently review and optimize cost structure',
          severity: costRatio > 0.95 ? 'critical' : 'warning',
          completeness: bundle.completeness,
        })
      }
    }
  }

  // Network-level insights
  const networkCurrent = aggregateRows(currentData.sites)
  const networkPrevious = aggregateRows(compareData.sites)

  // Traffic/revenue divergence
  if (networkCurrent.visits != null && networkPrevious.visits != null &&
      networkCurrent.totalRevenue != null && networkPrevious.totalRevenue != null) {
    const trafficDelta = networkPrevious.visits > 0
      ? ((networkCurrent.visits - networkPrevious.visits) / networkPrevious.visits) * 100
      : null
    const revenueDelta = networkPrevious.totalRevenue > 0
      ? ((networkCurrent.totalRevenue - networkPrevious.totalRevenue) / networkPrevious.totalRevenue) * 100
      : null

    if (trafficDelta != null && revenueDelta != null) {
      const divergence = Math.abs(trafficDelta - revenueDelta)
      if (divergence > 20) {
        insights.push({
          type: trafficDelta > revenueDelta ? 'risk' : 'opportunity',
          entityType: 'network',
          entityName: 'Network',
          metric: 'trafficRevenueDivergence',
          value: divergence,
          delta: null,
          reason: trafficDelta > revenueDelta
            ? `Traffic up ${trafficDelta.toFixed(1)}% but revenue only ${revenueDelta.toFixed(1)}% — monetization declining`
            : `Revenue up ${revenueDelta.toFixed(1)}% while traffic only ${trafficDelta.toFixed(1)}% — monetization improving`,
          action: trafficDelta > revenueDelta
            ? 'Investigate eCPM drops, fill rate issues, or traffic quality changes'
            : 'Document and replicate the monetization improvements across other bundles',
          severity: divergence > 40 ? 'warning' : 'info',
          completeness: 'complete',
        })
      }
    }
  }

  // Source completeness insights
  const failedSources = Object.values(currentData.sourceStatuses).filter(s => s.status === 'failed')
  if (failedSources.length > 0) {
    insights.push({
      type: 'risk',
      entityType: 'network',
      entityName: 'Data Quality',
      metric: 'sourceCompleteness',
      value: failedSources.length,
      delta: null,
      reason: `${failedSources.length} data source(s) unavailable — metrics are incomplete`,
      action: `Check ${failedSources.map(s => s.source).join(', ')} configuration and connectivity`,
      severity: failedSources.length >= 2 ? 'critical' : 'warning',
      completeness: 'incomplete',
    })
  }

  // Sort by severity priority
  const severityOrder = { critical: 0, warning: 1, info: 2 }
  insights.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])

  return insights.slice(0, 12) // Cap at 12 insights
}

// ─── Warnings ───

export function computeWarnings(
  currentData: NormalizedData,
  includesToday: boolean,
): string[] {
  const warnings: string[] = []

  if (includesToday) {
    warnings.push('Current period includes today — data is partial and still updating')
  }

  for (const [source, status] of Object.entries(currentData.sourceStatuses)) {
    if (status.status === 'failed') {
      warnings.push(`${source} source failed: ${status.notes[0] || 'unavailable'}`)
    } else if (status.status === 'stale') {
      warnings.push(`${source} data may be stale (last updated ${status.freshnessMinutes?.toFixed(0) ?? '?'}min ago)`)
    }
  }

  const overall = Object.values(currentData.sourceStatuses)
  const incompleteCount = overall.filter(s => s.completeness === 'incomplete').length
  if (incompleteCount > 0) {
    warnings.push(`${incompleteCount} source(s) returned incomplete data — some metrics are estimated`)
  }

  return warnings
}
