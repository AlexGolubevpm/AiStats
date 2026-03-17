'use client'

import { Suspense, useState } from 'react'
import { motion } from 'framer-motion'
import { fadeInUp } from '@/lib/motion'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { TopContextBar } from '@/components/layout/topbar'
import { ChartCard } from '@/components/shared/chart-card'
import { ChartSkeleton } from '@/components/shared/loading-skeleton'
import { useSettings, useSaveSettings } from '@/hooks/use-api'
import { useSyncStatus } from '@/hooks/use-sync-status'
import { useToast } from '@/components/ui/toast'

const SYNC_SOURCE_MAP: Record<string, string> = {
  'AdSpyglass': 'adspyglass',
  'Google Sheets (Costs)': 'google_sheets_costs',
  'Google Sheets (Affiliate)': 'google_sheets_affiliate',
}

function formatSyncTime(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function SyncStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    completed: 'bg-[var(--color-success-bg)] text-[var(--color-success-dark)]',
    running: 'bg-[var(--color-primary-50)] text-[var(--color-primary-600)]',
    failed: 'bg-[var(--color-danger-bg)] text-[var(--color-danger-dark)]',
  }
  const labels: Record<string, string> = {
    completed: 'Completed',
    running: 'Running…',
    failed: 'Failed',
  }
  return (
    <span className={`rounded-[var(--radius-pill)] px-2.5 py-1 text-[11px] font-semibold ${styles[status] || 'bg-[var(--color-warning-bg)] text-[var(--color-warning-dark)]'}`}>
      {labels[status] || 'Pending'}
    </span>
  )
}

function SettingsContent() {
  const { data: settings, isLoading } = useSettings()
  const saveSettings = useSaveSettings()
  const { latestBySource, triggerSync, isSyncing } = useSyncStatus()
  const { toast } = useToast()
  const [formData, setFormData] = useState<Record<string, string>>({})

  if (isLoading) {
    return <div className="space-y-6"><ChartSkeleton /><ChartSkeleton /></div>
  }

  const getValue = (key: string) => formData[key] ?? settings?.[key] ?? ''

  const handleSave = async (keys: string[]) => {
    try {
      for (const k of keys) {
        const value = formData[k] ?? settings?.[k] ?? ''
        await saveSettings.mutateAsync({ key: k, value })
      }
      toast('Settings saved successfully')
    } catch {
      toast('Failed to save settings', 'error')
    }
  }

  return (
    <Tabs defaultValue="api">
      <TabsList className="flex h-auto w-full gap-1 overflow-x-auto rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-secondary)] p-1 sm:h-11 sm:w-auto sm:overflow-visible">
        <TabsTrigger value="api" className="shrink-0 rounded-[var(--radius-control)] px-3 py-2 text-[12px] font-medium sm:px-4 sm:text-[13px] data-[state=active]:bg-white data-[state=active]:shadow-sm">API Config</TabsTrigger>
        <TabsTrigger value="sheets" className="shrink-0 rounded-[var(--radius-control)] px-3 py-2 text-[12px] font-medium sm:px-4 sm:text-[13px] data-[state=active]:bg-white data-[state=active]:shadow-sm">Google Sheets</TabsTrigger>
        <TabsTrigger value="sync" className="shrink-0 rounded-[var(--radius-control)] px-3 py-2 text-[12px] font-medium sm:px-4 sm:text-[13px] data-[state=active]:bg-white data-[state=active]:shadow-sm">Sync</TabsTrigger>
        <TabsTrigger value="thresholds" className="shrink-0 rounded-[var(--radius-control)] px-3 py-2 text-[12px] font-medium sm:px-4 sm:text-[13px] data-[state=active]:bg-white data-[state=active]:shadow-sm">Thresholds</TabsTrigger>
        <TabsTrigger value="health" className="shrink-0 rounded-[var(--radius-control)] px-3 py-2 text-[12px] font-medium sm:px-4 sm:text-[13px] data-[state=active]:bg-white data-[state=active]:shadow-sm">Health Score</TabsTrigger>
        <TabsTrigger value="ai" className="shrink-0 rounded-[var(--radius-control)] px-3 py-2 text-[12px] font-medium sm:px-4 sm:text-[13px] data-[state=active]:bg-white data-[state=active]:shadow-sm">AI Settings</TabsTrigger>
      </TabsList>

      <TabsContent value="api" className="mt-6">
        <ChartCard title="API Configuration" description="AdSpyglass and AdOK connection settings">
          <div className="space-y-4">
            <div>
              <Label>AdSpyglass API URL</Label>
              <Input type="text" value={getValue('adspyglass_url')} onChange={(e) => setFormData({ ...formData, adspyglass_url: e.target.value })} className="mt-1.5" />
            </div>
            <div>
              <Label>API Key</Label>
              <Input type="password" value={getValue('adspyglass_api_key')} onChange={(e) => setFormData({ ...formData, adspyglass_api_key: e.target.value })} className="mt-1.5" />
            </div>
            <Button onClick={() => handleSave(['adspyglass_url', 'adspyglass_api_key'])} className="rounded-[var(--radius-control)]">Save Configuration</Button>
          </div>
        </ChartCard>
      </TabsContent>

      <TabsContent value="sheets" className="mt-6">
        <ChartCard title="Google Sheets Configuration" description="Paste the full Google Sheets URL or just the sheet ID. The sheet must be publicly accessible (Share → Anyone with the link).">
          <div className="space-y-4">
            <div>
              <Label>Costs Sheet URL or ID</Label>
              <Input type="text" value={getValue('costs_sheet_id')} onChange={(e) => {
                const raw = e.target.value
                const match = raw.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/)
                setFormData({ ...formData, costs_sheet_id: match ? match[1] : raw })
              }} placeholder="https://docs.google.com/spreadsheets/d/... or sheet ID" className="mt-1.5" />
              {getValue('costs_sheet_id') && <p className="mt-1 text-[11px] text-[var(--color-text-muted)]">Sheet ID: {getValue('costs_sheet_id')}</p>}
            </div>
            <div>
              <Label>Affiliate Sheet URL or ID</Label>
              <Input type="text" value={getValue('affiliate_sheet_id')} onChange={(e) => {
                const raw = e.target.value
                const match = raw.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/)
                setFormData({ ...formData, affiliate_sheet_id: match ? match[1] : raw })
              }} placeholder="https://docs.google.com/spreadsheets/d/... or sheet ID" className="mt-1.5" />
              {getValue('affiliate_sheet_id') && <p className="mt-1 text-[11px] text-[var(--color-text-muted)]">Sheet ID: {getValue('affiliate_sheet_id')}</p>}
            </div>
            <Button onClick={() => handleSave(['costs_sheet_id', 'affiliate_sheet_id'])} className="rounded-[var(--radius-control)]">Save Configuration</Button>
          </div>
        </ChartCard>
      </TabsContent>

      <TabsContent value="sync" className="mt-6">
        <ChartCard title="Sync Status" description="Last synchronization results">
          <div className="space-y-2">
            {Object.entries(SYNC_SOURCE_MAP).map(([label, sourceKey]) => {
              const log = latestBySource(sourceKey)
              return (
                <div key={label} className="flex items-center justify-between rounded-[var(--radius-control)] bg-[var(--color-surface-secondary)] px-4 py-3.5">
                  <span className="text-[13px] font-semibold">{label}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-meta">
                      {log?.completedAt ? formatSyncTime(log.completedAt) : log?.startedAt ? formatSyncTime(log.startedAt) : 'Never synced'}
                    </span>
                    {log?.recordsProcessed ? (
                      <span className="text-meta">{log.recordsProcessed} records</span>
                    ) : null}
                    <SyncStatusBadge status={log?.status || 'pending'} />
                  </div>
                </div>
              )
            })}
          </div>
          <div className="mt-4">
            <Button onClick={() => triggerSync('all')} disabled={isSyncing} className="rounded-[var(--radius-control)]">
              {isSyncing ? 'Syncing…' : 'Sync All Now'}
            </Button>
          </div>
        </ChartCard>
      </TabsContent>

      <TabsContent value="thresholds" className="mt-6">
        <ChartCard title="Anomaly Detection Thresholds" description="Configure sensitivity for anomaly detection">
          <div className="space-y-4">
            {[
              { key: 'threshold_traffic_drop', label: 'Traffic Drop Threshold (%)', def: '20' },
              { key: 'threshold_revenue_change', label: 'Revenue Change Threshold (%)', def: '15' },
              { key: 'threshold_cost_spike', label: 'Cost Spike Threshold (%)', def: '25' },
              { key: 'threshold_fill_rate_drop', label: 'Fill Rate Drop Threshold (%)', def: '10' },
            ].map(({ key, label, def }) => (
              <div key={key}>
                <Label>{label}</Label>
                <Input type="number" value={getValue(key) || def} onChange={(e) => setFormData({ ...formData, [key]: e.target.value })} className="mt-1.5" />
              </div>
            ))}
            <Button onClick={() => handleSave(['threshold_traffic_drop', 'threshold_revenue_change', 'threshold_cost_spike', 'threshold_fill_rate_drop'])} className="rounded-[var(--radius-control)]">Save Thresholds</Button>
          </div>
        </ChartCard>
      </TabsContent>

      <TabsContent value="health" className="mt-6">
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
                <Label className="w-40 text-[13px]">{label}</Label>
                <input type="range" min="0" max="30" value={getValue(key) || def} onChange={(e) => setFormData({ ...formData, [key]: e.target.value })} className="flex-1" />
                <span className="w-12 text-right text-[13px] font-semibold tabular-nums">{getValue(key) || def}%</span>
              </div>
            ))}
            <Button onClick={() => handleSave(['weight_profit_quality', 'weight_romi_quality', 'weight_revenue_trend', 'weight_cost_pressure', 'weight_format_quality', 'weight_tier_quality', 'weight_anomaly_pressure', 'weight_stability'])} className="rounded-[var(--radius-control)]">Save Weights</Button>
          </div>
        </ChartCard>
      </TabsContent>

      <TabsContent value="ai" className="mt-6">
        <ChartCard title="AI Configuration" description="Claude API settings for analysis">
          <div className="space-y-4">
            <div>
              <Label>Anthropic API Key</Label>
              <Input type="password" value={getValue('anthropic_api_key')} onChange={(e) => setFormData({ ...formData, anthropic_api_key: e.target.value })} placeholder="sk-ant-..." className="mt-1.5" />
            </div>
            <Button onClick={() => handleSave(['anthropic_api_key'])} className="rounded-[var(--radius-control)]">Save AI Settings</Button>
          </div>
        </ChartCard>
      </TabsContent>
    </Tabs>
  )
}

export default function SettingsPage() {
  return (
    <div>
      <TopContextBar title="Settings" subtitle="Platform configuration" showPeriod={false} showSync={false} />
      <motion.div className="px-6 py-8" initial="hidden" animate="visible" variants={fadeInUp} custom={0}>
        <Suspense fallback={<ChartSkeleton />}>
          <SettingsContent />
        </Suspense>
      </motion.div>
    </div>
  )
}
