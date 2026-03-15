'use client'

import { Suspense, useState } from 'react'
import * as Tabs from '@radix-ui/react-tabs'
import { Topbar } from '@/components/layout/topbar'
import { ChartCard } from '@/components/shared/chart-card'
import { ChartSkeleton } from '@/components/shared/loading-skeleton'
import { useSettings, useSaveSettings } from '@/hooks/use-api'

const tabTriggerClass = 'px-4 py-2.5 text-sm font-medium transition-colors text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] data-[state=active]:border-b-2 data-[state=active]:border-[var(--color-accent)] data-[state=active]:text-[var(--color-accent)]'
const inputClass = 'mt-1 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)]'
const btnClass = 'rounded-[var(--radius-md)] bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90'

function SettingsContent() {
  const { data: settings, isLoading } = useSettings()
  const saveSettings = useSaveSettings()
  const [formData, setFormData] = useState<Record<string, string>>({})

  if (isLoading) {
    return <div className="space-y-6 p-8"><ChartSkeleton /><ChartSkeleton /></div>
  }

  const getValue = (key: string) => formData[key] ?? settings?.[key] ?? ''

  const handleSave = (keys: string[]) => {
    const data: Record<string, unknown> = {}
    keys.forEach((k) => { data[k] = formData[k] ?? settings?.[k] ?? '' })
    saveSettings.mutate(data)
  }

  return (
    <Tabs.Root defaultValue="api">
      <Tabs.List className="flex gap-1 border-b border-[var(--color-border)]">
        <Tabs.Trigger value="api" className={tabTriggerClass}>API Config</Tabs.Trigger>
        <Tabs.Trigger value="sheets" className={tabTriggerClass}>Google Sheets</Tabs.Trigger>
        <Tabs.Trigger value="sync" className={tabTriggerClass}>Sync</Tabs.Trigger>
        <Tabs.Trigger value="thresholds" className={tabTriggerClass}>Thresholds</Tabs.Trigger>
        <Tabs.Trigger value="health" className={tabTriggerClass}>Health Score</Tabs.Trigger>
        <Tabs.Trigger value="ai" className={tabTriggerClass}>AI Settings</Tabs.Trigger>
      </Tabs.List>

      <Tabs.Content value="api" className="mt-5">
        <ChartCard title="API Configuration" description="AdSpyglass and AdOK connection settings">
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-[var(--color-text-muted)]">AdSpyglass API URL</label>
              <input type="text" value={getValue('adspyglass_url')} onChange={(e) => setFormData({ ...formData, adspyglass_url: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--color-text-muted)]">API Key</label>
              <input type="password" value={getValue('adspyglass_api_key')} onChange={(e) => setFormData({ ...formData, adspyglass_api_key: e.target.value })} className={inputClass} />
            </div>
            <button onClick={() => handleSave(['adspyglass_url', 'adspyglass_api_key'])} className={btnClass}>Save Configuration</button>
          </div>
        </ChartCard>
      </Tabs.Content>

      <Tabs.Content value="sheets" className="mt-5">
        <ChartCard title="Google Sheets Configuration" description="Costs and affiliate data sources">
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-[var(--color-text-muted)]">Costs Sheet ID</label>
              <input type="text" value={getValue('costs_sheet_id')} onChange={(e) => setFormData({ ...formData, costs_sheet_id: e.target.value })} placeholder="Enter Google Sheet ID" className={inputClass} />
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--color-text-muted)]">Affiliate Sheet ID</label>
              <input type="text" value={getValue('affiliate_sheet_id')} onChange={(e) => setFormData({ ...formData, affiliate_sheet_id: e.target.value })} placeholder="Enter Google Sheet ID" className={inputClass} />
            </div>
            <button onClick={() => handleSave(['costs_sheet_id', 'affiliate_sheet_id'])} className={btnClass}>Save Configuration</button>
          </div>
        </ChartCard>
      </Tabs.Content>

      <Tabs.Content value="sync" className="mt-5">
        <ChartCard title="Sync Status" description="Last synchronization results">
          <div className="space-y-2">
            {['AdSpyglass', 'Google Sheets (Costs)', 'Google Sheets (Affiliate)'].map((source) => (
              <div key={source} className="flex items-center justify-between rounded-[var(--radius-md)] bg-[var(--color-background)] px-4 py-3">
                <span className="text-sm font-medium">{source}</span>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-[var(--color-text-muted)]">
                    {settings?.lastSync?.[source] || 'Never synced'}
                  </span>
                  <span className="rounded-full bg-[var(--color-warning-bg)] px-2 py-0.5 text-xs text-[var(--color-warning)]">
                    {settings?.syncStatus?.[source] || 'Pending'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </ChartCard>
      </Tabs.Content>

      <Tabs.Content value="thresholds" className="mt-5">
        <ChartCard title="Anomaly Detection Thresholds" description="Configure sensitivity for anomaly detection">
          <div className="space-y-4">
            {[
              { key: 'threshold_traffic_drop', label: 'Traffic Drop Threshold (%)', def: '20' },
              { key: 'threshold_revenue_change', label: 'Revenue Change Threshold (%)', def: '15' },
              { key: 'threshold_cost_spike', label: 'Cost Spike Threshold (%)', def: '25' },
              { key: 'threshold_fill_rate_drop', label: 'Fill Rate Drop Threshold (%)', def: '10' },
            ].map(({ key, label, def }) => (
              <div key={key}>
                <label className="text-xs font-medium text-[var(--color-text-muted)]">{label}</label>
                <input type="number" value={getValue(key) || def} onChange={(e) => setFormData({ ...formData, [key]: e.target.value })} className={inputClass} />
              </div>
            ))}
            <button onClick={() => handleSave(['threshold_traffic_drop', 'threshold_revenue_change', 'threshold_cost_spike', 'threshold_fill_rate_drop'])} className={btnClass}>Save Thresholds</button>
          </div>
        </ChartCard>
      </Tabs.Content>

      <Tabs.Content value="health" className="mt-5">
        <ChartCard title="Health Score Weights" description="Configure component weights (must sum to 100%)">
          <div className="space-y-4">
            {[
              { key: 'weight_profit_quality', label: 'Profit Quality', def: '20' },
              { key: 'weight_romi_quality', label: 'ROMI Quality', def: '15' },
              { key: 'weight_revenue_trend', label: 'Revenue Trend', def: '15' },
              { key: 'weight_cost_pressure', label: 'Cost Pressure', def: '10' },
              { key: 'weight_format_quality', label: 'Format Quality', def: '10' },
              { key: 'weight_tier_quality', label: 'Tier Quality', def: '10' },
              { key: 'weight_anomaly_pressure', label: 'Anomaly Pressure', def: '10' },
              { key: 'weight_stability', label: 'Stability', def: '10' },
            ].map(({ key, label, def }) => (
              <div key={key} className="flex items-center gap-4">
                <label className="w-40 text-xs font-medium text-[var(--color-text-muted)]">{label}</label>
                <input type="range" min="0" max="30" value={getValue(key) || def} onChange={(e) => setFormData({ ...formData, [key]: e.target.value })} className="flex-1" />
                <span className="w-10 text-right text-sm tabular-nums">{getValue(key) || def}%</span>
              </div>
            ))}
            <button onClick={() => handleSave(['weight_profit_quality', 'weight_romi_quality', 'weight_revenue_trend', 'weight_cost_pressure', 'weight_format_quality', 'weight_tier_quality', 'weight_anomaly_pressure', 'weight_stability'])} className={btnClass}>Save Weights</button>
          </div>
        </ChartCard>
      </Tabs.Content>

      <Tabs.Content value="ai" className="mt-5">
        <ChartCard title="AI Configuration" description="Claude API settings for analysis">
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-[var(--color-text-muted)]">Anthropic API Key</label>
              <input type="password" value={getValue('anthropic_api_key')} onChange={(e) => setFormData({ ...formData, anthropic_api_key: e.target.value })} placeholder="sk-ant-..." className={inputClass} />
            </div>
            <button onClick={() => handleSave(['anthropic_api_key'])} className={btnClass}>Save AI Settings</button>
          </div>
        </ChartCard>
      </Tabs.Content>
    </Tabs.Root>
  )
}

export default function SettingsPage() {
  return (
    <div>
      <Topbar title="Settings" description="Platform configuration" />
      <div className="p-8">
        <Suspense fallback={<ChartSkeleton />}>
          <SettingsContent />
        </Suspense>
      </div>
    </div>
  )
}
