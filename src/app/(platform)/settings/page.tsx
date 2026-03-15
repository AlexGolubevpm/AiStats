'use client'

import { Suspense, useState } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { TopContextBar } from '@/components/layout/topbar'
import { ChartCard } from '@/components/shared/chart-card'
import { ChartSkeleton } from '@/components/shared/loading-skeleton'
import { useSettings, useSaveSettings } from '@/hooks/use-api'

function SettingsContent() {
  const { data: settings, isLoading } = useSettings()
  const saveSettings = useSaveSettings()
  const [formData, setFormData] = useState<Record<string, string>>({})

  if (isLoading) {
    return <div className="space-y-6"><ChartSkeleton /><ChartSkeleton /></div>
  }

  const getValue = (key: string) => formData[key] ?? settings?.[key] ?? ''

  const handleSave = async (keys: string[]) => {
    for (const key of keys) {
      const value = formData[key] ?? settings?.[key] ?? ''
      saveSettings.mutate({ key, value })
    }
  }

  return (
    <Tabs defaultValue="api">
      <TabsList className="h-11 gap-1 rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-secondary)] p-1">
        <TabsTrigger value="api" className="rounded-[var(--radius-control)] px-4 py-2 text-[13px] font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm">API Config</TabsTrigger>
        <TabsTrigger value="sheets" className="rounded-[var(--radius-control)] px-4 py-2 text-[13px] font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm">Google Sheets</TabsTrigger>
        <TabsTrigger value="sync" className="rounded-[var(--radius-control)] px-4 py-2 text-[13px] font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm">Sync</TabsTrigger>
        <TabsTrigger value="thresholds" className="rounded-[var(--radius-control)] px-4 py-2 text-[13px] font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm">Thresholds</TabsTrigger>
        <TabsTrigger value="health" className="rounded-[var(--radius-control)] px-4 py-2 text-[13px] font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm">Health Score</TabsTrigger>
        <TabsTrigger value="yandex" className="rounded-[var(--radius-control)] px-4 py-2 text-[13px] font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm">Yandex Metrica</TabsTrigger>
        <TabsTrigger value="ai" className="rounded-[var(--radius-control)] px-4 py-2 text-[13px] font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm">AI Settings</TabsTrigger>
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
        <ChartCard title="Google Sheets Configuration" description="Costs and affiliate data sources">
          <div className="space-y-4">
            <div>
              <Label>Costs Sheet ID</Label>
              <Input type="text" value={getValue('costs_sheet_id')} onChange={(e) => setFormData({ ...formData, costs_sheet_id: e.target.value })} placeholder="Enter Google Sheet ID" className="mt-1.5" />
            </div>
            <div>
              <Label>Affiliate Sheet ID</Label>
              <Input type="text" value={getValue('affiliate_sheet_id')} onChange={(e) => setFormData({ ...formData, affiliate_sheet_id: e.target.value })} placeholder="Enter Google Sheet ID" className="mt-1.5" />
            </div>
            <Button onClick={() => handleSave(['costs_sheet_id', 'affiliate_sheet_id'])} className="rounded-[var(--radius-control)]">Save Configuration</Button>
          </div>
        </ChartCard>
      </TabsContent>

      <TabsContent value="sync" className="mt-6">
        <ChartCard title="Sync Status" description="Last synchronization results">
          <div className="space-y-2">
            {['AdSpyglass', 'Google Sheets (Costs)', 'Google Sheets (Affiliate)'].map((source) => (
              <div key={source} className="flex items-center justify-between rounded-[var(--radius-control)] bg-[var(--color-surface-secondary)] px-4 py-3.5">
                <span className="text-[13px] font-semibold">{source}</span>
                <div className="flex items-center gap-3">
                  <span className="text-meta">
                    {settings?.lastSync?.[source] || 'Never synced'}
                  </span>
                  <span className="rounded-[var(--radius-pill)] bg-[var(--color-warning-bg)] px-2.5 py-1 text-[11px] font-semibold text-[var(--color-warning-dark)]">
                    {settings?.syncStatus?.[source] || 'Pending'}
                  </span>
                </div>
              </div>
            ))}
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

      <TabsContent value="yandex" className="mt-6">
        <ChartCard title="Yandex Metrica" description="Connect Yandex Metrica for real visitor stats, pageviews, and country data">
          <div className="space-y-4">
            <div>
              <Label>OAuth Token</Label>
              <Input type="password" value={getValue('yandex.oauth_token')} onChange={(e) => setFormData({ ...formData, 'yandex.oauth_token': e.target.value })} placeholder="Paste your Yandex OAuth token" className="mt-1.5" />
              <p className="mt-1 text-meta">
                Get a token: open{' '}
                <a href={`https://oauth.yandex.com/authorize?response_type=token&client_id=${getValue('yandex_client_id') || '46a4535051fb4ebd86dc4d7b32c3d585'}`} target="_blank" rel="noopener noreferrer" className="text-[var(--color-primary-600)] underline">
                  Yandex OAuth
                </a>
                , authorize, and paste the token above.
              </p>
            </div>
            <div className="flex gap-3">
              <Button onClick={() => handleSave(['yandex.oauth_token'])} className="rounded-[var(--radius-control)]">Save Token</Button>
              <Button
                variant="outline"
                onClick={async () => {
                  const res = await fetch('/api/yandex', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'auto_map' }) })
                  const data = await res.json()
                  alert(data.message || 'Auto-map completed')
                }}
                className="rounded-[var(--radius-control)]"
              >
                Auto-Map Counters to Sites
              </Button>
            </div>
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
      <div className="px-6 py-8">
        <Suspense fallback={<ChartSkeleton />}>
          <SettingsContent />
        </Suspense>
      </div>
    </div>
  )
}
