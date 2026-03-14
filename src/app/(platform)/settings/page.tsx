import { Topbar } from '@/components/layout/topbar'
import { ChartCard } from '@/components/shared/chart-card'

export default function SettingsPage() {
  return (
    <div>
      <Topbar title="Settings" description="Platform configuration" />

      <div className="space-y-6 p-8">
        {/* Tabs */}
        <div className="flex gap-1 border-b border-[var(--color-border)]">
          {['General', 'API Config', 'Google Sheets', 'Site Mappings', 'Sync', 'Thresholds', 'Health Score', 'AI Settings'].map((tab, i) => (
            <button
              key={tab}
              className={`px-4 py-2.5 text-sm font-medium transition-colors ${i === 0 ? 'border-b-2 border-[var(--color-accent)] text-[var(--color-accent)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'}`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* General Settings */}
        <ChartCard title="API Configuration" description="AdSpyglass and AdOK connection settings">
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-[var(--color-text-muted)]">AdSpyglass API URL</label>
              <input
                type="text"
                defaultValue="https://api.adspyglass.com"
                className="mt-1 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)]"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--color-text-muted)]">API Key</label>
              <input
                type="password"
                defaultValue="••••••••••••"
                className="mt-1 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)]"
              />
            </div>
            <button className="rounded-[var(--radius-md)] bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90">
              Save Configuration
            </button>
          </div>
        </ChartCard>

        <ChartCard title="Google Sheets Configuration" description="Costs and affiliate data sources">
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-[var(--color-text-muted)]">Costs Sheet ID</label>
              <input
                type="text"
                placeholder="Enter Google Sheet ID"
                className="mt-1 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)]"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--color-text-muted)]">Affiliate Sheet ID</label>
              <input
                type="text"
                placeholder="Enter Google Sheet ID"
                className="mt-1 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)]"
              />
            </div>
            <button className="rounded-[var(--radius-md)] bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90">
              Save Configuration
            </button>
          </div>
        </ChartCard>

        <ChartCard title="Sync Status" description="Last synchronization results">
          <div className="space-y-2">
            {['AdSpyglass', 'Google Sheets (Costs)', 'Google Sheets (Affiliate)'].map((source) => (
              <div key={source} className="flex items-center justify-between rounded-[var(--radius-md)] bg-[var(--color-background)] px-4 py-3">
                <span className="text-sm font-medium">{source}</span>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-[var(--color-text-muted)]">Never synced</span>
                  <span className="rounded-full bg-[var(--color-warning-bg)] px-2 py-0.5 text-xs text-[var(--color-warning)]">Pending</span>
                </div>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>
    </div>
  )
}
