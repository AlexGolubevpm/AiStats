'use client'

import { Suspense, useState } from 'react'
import { Box, Stack, Group, Text, Tabs, Button, TextInput, Slider, Anchor } from '@mantine/core'
import { motion } from 'framer-motion'
import { fadeInUp } from '@/lib/motion'
import { TopContextBar } from '@/components/layout/topbar'
import { ChartCard } from '@/components/shared/chart-card'
import { ChartSkeleton } from '@/components/shared/loading-skeleton'
import { useSettings, useSaveSettings } from '@/hooks/use-api'
import { useSyncStatus } from '@/hooks/use-sync-status'
import { notifications } from '@mantine/notifications'

const SYNC_SOURCE_MAP: Record<string, string> = {
  'AdSpyglass': 'adspyglass',
  'Yandex Metrica': 'yandex_metrica',
  'Google Sheets (Costs)': 'google_sheets_costs',
  'Google Sheets (Affiliate)': 'google_sheets_affiliate',
}

function formatSyncTime(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function SyncStatusBadge({ status }: { status: string }) {
  const styleMap: Record<string, { bg: string; color: string }> = {
    completed: { bg: 'var(--color-success-bg)', color: 'var(--color-success-dark)' },
    running: { bg: 'var(--color-primary-50)', color: 'var(--color-primary-600)' },
    failed: { bg: 'var(--color-danger-bg)', color: 'var(--color-danger-dark)' },
  }
  const labels: Record<string, string> = {
    completed: 'Completed',
    running: 'Running\u2026',
    failed: 'Failed',
  }
  const s = styleMap[status] || { bg: 'var(--color-warning-bg)', color: 'var(--color-warning-dark)' }
  return (
    <Box
      component="span"
      style={{
        borderRadius: 'var(--radius-pill)',
        padding: '4px 10px',
        fontSize: 11,
        fontWeight: 600,
        backgroundColor: s.bg,
        color: s.color,
      }}
    >
      {labels[status] || 'Pending'}
    </Box>
  )
}

function SettingsContent() {
  const { data: settings, isLoading } = useSettings()
  const saveSettings = useSaveSettings()
  const { latestBySource, triggerSync, isSyncing } = useSyncStatus()
  const [formData, setFormData] = useState<Record<string, string>>({})

  if (isLoading) {
    return <Stack gap="lg"><ChartSkeleton /><ChartSkeleton /></Stack>
  }

  const getValue = (key: string) => formData[key] ?? settings?.[key] ?? ''

  const handleSave = async (keys: string[]) => {
    try {
      for (const k of keys) {
        const value = formData[k] ?? settings?.[k] ?? ''
        await saveSettings.mutateAsync({ key: k, value })
      }
      notifications.show({ message: 'Settings saved successfully', color: 'green' })
    } catch {
      notifications.show({ message: 'Failed to save settings', color: 'red' })
    }
  }

  return (
    <Tabs defaultValue="api">
      <Tabs.List
        style={{
          display: 'flex',
          gap: 4,
          overflowX: 'auto',
          borderRadius: 'var(--radius-card)',
          border: '1px solid var(--color-border-subtle)',
          backgroundColor: 'var(--color-surface-secondary)',
          padding: 4,
        }}
      >
        <Tabs.Tab value="api" style={{ flexShrink: 0, borderRadius: 'var(--radius-control)', padding: '8px 16px', fontSize: 13, fontWeight: 500 }}>API Config</Tabs.Tab>
        <Tabs.Tab value="sheets" style={{ flexShrink: 0, borderRadius: 'var(--radius-control)', padding: '8px 16px', fontSize: 13, fontWeight: 500 }}>Google Sheets</Tabs.Tab>
        <Tabs.Tab value="sync" style={{ flexShrink: 0, borderRadius: 'var(--radius-control)', padding: '8px 16px', fontSize: 13, fontWeight: 500 }}>Sync</Tabs.Tab>
        <Tabs.Tab value="thresholds" style={{ flexShrink: 0, borderRadius: 'var(--radius-control)', padding: '8px 16px', fontSize: 13, fontWeight: 500 }}>Thresholds</Tabs.Tab>
        <Tabs.Tab value="health" style={{ flexShrink: 0, borderRadius: 'var(--radius-control)', padding: '8px 16px', fontSize: 13, fontWeight: 500 }}>Health Score</Tabs.Tab>
        <Tabs.Tab value="ai" style={{ flexShrink: 0, borderRadius: 'var(--radius-control)', padding: '8px 16px', fontSize: 13, fontWeight: 500 }}>AI Settings</Tabs.Tab>
      </Tabs.List>

      <Tabs.Panel value="api" pt="lg">
        <ChartCard title="AdOK / AdSpyglass" description="API credentials for fetching ad revenue data. Get them from your AdSpyglass dashboard.">
          <Stack gap="md">
            <TextInput label="API URL" value={getValue('adspyglass_url') || 'https://api.adok.ai'} onChange={(e) => setFormData({ ...formData, adspyglass_url: e.currentTarget.value })} placeholder="https://api.adok.ai" />
            <TextInput label="Auth Email" type="email" value={getValue('adok_auth_email')} onChange={(e) => setFormData({ ...formData, adok_auth_email: e.currentTarget.value })} placeholder="your@email.com" />
            <TextInput label="Auth Token" type="password" value={getValue('adok_auth_token')} onChange={(e) => setFormData({ ...formData, adok_auth_token: e.currentTarget.value })} placeholder="YctjS1JB..." />
            <Button onClick={() => handleSave(['adspyglass_url', 'adok_auth_email', 'adok_auth_token'])} radius="md">Save Configuration</Button>
          </Stack>
        </ChartCard>

        <Box mt="lg">
          <ChartCard title="Yandex Metrica" description="OAuth token for fetching visitor data. Counter IDs are set per-site on the Sites page.">
            <Stack gap="md">
              <Box>
                <TextInput label="OAuth Token" type="password" value={getValue('yandex_metrika_oauth_token')} onChange={(e) => setFormData({ ...formData, yandex_metrika_oauth_token: e.currentTarget.value })} placeholder="y0_AgAAAA..." />
                <Text size="xs" c="var(--color-text-muted)" mt={4} style={{ fontSize: 11 }}>Get token at <Anchor href="https://oauth.yandex.ru" target="_blank" rel="noopener noreferrer" size="xs" style={{ fontSize: 11 }}>oauth.yandex.ru</Anchor> with metrika:read scope</Text>
              </Box>
              <Button onClick={() => handleSave(['yandex_metrika_oauth_token'])} radius="md">Save Token</Button>
            </Stack>
          </ChartCard>
        </Box>
      </Tabs.Panel>

      <Tabs.Panel value="sheets" pt="lg">
        <ChartCard title="Google Sheets Configuration" description="Paste the full Google Sheets URL or just the sheet ID. The sheet must be publicly accessible (Share &rarr; Anyone with the link).">
          <Stack gap="md">
            <Box>
              <TextInput label="Costs Sheet URL or ID" value={getValue('costs_sheet_id')} onChange={(e) => {
                const raw = e.currentTarget.value
                const match = raw.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/)
                setFormData({ ...formData, costs_sheet_id: match ? match[1] : raw })
              }} placeholder="https://docs.google.com/spreadsheets/d/... or sheet ID" />
              {getValue('costs_sheet_id') && <Text size="xs" c="var(--color-text-muted)" mt={4} style={{ fontSize: 11 }}>Sheet ID: {getValue('costs_sheet_id')}</Text>}
            </Box>
            <Box>
              <TextInput label="Affiliate Sheet URL or ID" value={getValue('affiliate_sheet_id')} onChange={(e) => {
                const raw = e.currentTarget.value
                const match = raw.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/)
                setFormData({ ...formData, affiliate_sheet_id: match ? match[1] : raw })
              }} placeholder="https://docs.google.com/spreadsheets/d/... or sheet ID" />
              {getValue('affiliate_sheet_id') && <Text size="xs" c="var(--color-text-muted)" mt={4} style={{ fontSize: 11 }}>Sheet ID: {getValue('affiliate_sheet_id')}</Text>}
            </Box>
            <Button onClick={() => handleSave(['costs_sheet_id', 'affiliate_sheet_id'])} radius="md">Save Configuration</Button>
          </Stack>
        </ChartCard>
      </Tabs.Panel>

      <Tabs.Panel value="sync" pt="lg">
        <ChartCard title="Sync Status" description="Last synchronization results">
          <Stack gap="xs">
            {Object.entries(SYNC_SOURCE_MAP).map(([label, sourceKey]) => {
              const log = latestBySource(sourceKey)
              return (
                <Group
                  key={label}
                  justify="space-between"
                  px="md"
                  py="sm"
                  style={{
                    borderRadius: 'var(--radius-control)',
                    backgroundColor: 'var(--color-surface-secondary)',
                  }}
                >
                  <Text size="sm" fw={600}>{label}</Text>
                  <Group gap="sm">
                    <Text size="xs" fw={500} c="#6B7280">
                      {log?.completedAt ? formatSyncTime(log.completedAt) : log?.startedAt ? formatSyncTime(log.startedAt) : 'Never synced'}
                    </Text>
                    {log?.recordsProcessed ? (
                      <Text size="xs" fw={500} c="#6B7280">{log.recordsProcessed} records</Text>
                    ) : null}
                    <SyncStatusBadge status={log?.status || 'pending'} />
                  </Group>
                </Group>
              )
            })}
          </Stack>
          <Box mt="md">
            <Button onClick={() => triggerSync('all')} disabled={isSyncing} radius="md">
              {isSyncing ? 'Syncing\u2026' : 'Sync All Now'}
            </Button>
          </Box>
        </ChartCard>
      </Tabs.Panel>

      <Tabs.Panel value="thresholds" pt="lg">
        <ChartCard title="Anomaly Detection Thresholds" description="Configure sensitivity for anomaly detection">
          <Stack gap="md">
            {[
              { key: 'threshold_traffic_drop', label: 'Traffic Drop Threshold (%)', def: '20' },
              { key: 'threshold_revenue_change', label: 'Revenue Change Threshold (%)', def: '15' },
              { key: 'threshold_cost_spike', label: 'Cost Spike Threshold (%)', def: '25' },
              { key: 'threshold_fill_rate_drop', label: 'Fill Rate Drop Threshold (%)', def: '10' },
            ].map(({ key, label, def }) => (
              <TextInput key={key} label={label} type="number" value={getValue(key) || def} onChange={(e) => setFormData({ ...formData, [key]: e.currentTarget.value })} />
            ))}
            <Button onClick={() => handleSave(['threshold_traffic_drop', 'threshold_revenue_change', 'threshold_cost_spike', 'threshold_fill_rate_drop'])} radius="md">Save Thresholds</Button>
          </Stack>
        </ChartCard>
      </Tabs.Panel>

      <Tabs.Panel value="health" pt="lg">
        <ChartCard title="Health Score Weights" description="Configure component weights (must sum to 100%)">
          <Stack gap="md">
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
              <Group key={key} gap="md" align="center">
                <Text size="sm" fw={500} style={{ width: 160, fontSize: 13 }}>{label}</Text>
                <Slider
                  min={0}
                  max={30}
                  value={Number(getValue(key) || def)}
                  onChange={(v) => setFormData({ ...formData, [key]: String(v) })}
                  style={{ flex: 1 }}
                />
                <Text size="sm" fw={600} style={{ width: 48, textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontSize: 13 }}>{getValue(key) || def}%</Text>
              </Group>
            ))}
            <Button onClick={() => handleSave(['weight_profit_quality', 'weight_romi_quality', 'weight_revenue_trend', 'weight_cost_pressure', 'weight_format_quality', 'weight_tier_quality', 'weight_anomaly_pressure', 'weight_stability'])} radius="md">Save Weights</Button>
          </Stack>
        </ChartCard>
      </Tabs.Panel>

      <Tabs.Panel value="ai" pt="lg">
        <ChartCard title="AI Configuration" description="Claude API settings for analysis">
          <Stack gap="md">
            <TextInput label="Anthropic API Key" type="password" value={getValue('anthropic_api_key')} onChange={(e) => setFormData({ ...formData, anthropic_api_key: e.currentTarget.value })} placeholder="sk-ant-..." />
            <Button onClick={() => handleSave(['anthropic_api_key'])} radius="md">Save AI Settings</Button>
          </Stack>
        </ChartCard>
      </Tabs.Panel>
    </Tabs>
  )
}

export default function SettingsPage() {
  return (
    <Box>
      <TopContextBar title="Settings" subtitle="Platform configuration" showPeriod={false} showSync={false} />
      <motion.div initial="hidden" animate="visible" variants={fadeInUp} custom={0}>
        <Box px="xl" py="xl">
          <Suspense fallback={<ChartSkeleton />}>
            <SettingsContent />
          </Suspense>
        </Box>
      </motion.div>
    </Box>
  )
}
