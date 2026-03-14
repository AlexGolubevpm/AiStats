'use client'

import { useState } from 'react'
import { Topbar } from '@/components/layout/topbar'
import { KPICard } from '@/components/shared/kpi-card'
import { ChartCard } from '@/components/shared/chart-card'

export default function ForecastPage() {
  const [trafficChange, setTrafficChange] = useState(0)
  const [costChange, setCostChange] = useState(0)
  const [rpmChange, setRpmChange] = useState(0)
  const [affiliateChange, setAffiliateChange] = useState(0)

  // Simple forecast calculation
  const baseRevenue = 18750
  const baseAffiliate = 4320
  const baseCosts = 8500
  const baseTraffic = 2450000

  const projTraffic = baseTraffic * (1 + trafficChange / 100)
  const projAdRevenue = baseRevenue * (1 + rpmChange / 100) * (1 + trafficChange / 100)
  const projAffiliate = baseAffiliate * (1 + affiliateChange / 100)
  const projCosts = baseCosts * (1 + costChange / 100)
  const projTotalRevenue = projAdRevenue + projAffiliate
  const projProfit = projTotalRevenue - projCosts
  const projRomi = projCosts > 0 ? ((projTotalRevenue - projCosts) / projCosts) * 100 : 0

  return (
    <div>
      <Topbar title="Forecast" description="Scenario modeling and projections" />

      <div className="space-y-6 p-8">
        {/* Input Controls */}
        <ChartCard title="Scenario Parameters" description="Adjust parameters to model outcomes">
          <div className="grid grid-cols-4 gap-6">
            {[
              { label: 'Traffic Change', value: trafficChange, setter: setTrafficChange },
              { label: 'Cost Change', value: costChange, setter: setCostChange },
              { label: 'RPM Change', value: rpmChange, setter: setRpmChange },
              { label: 'Affiliate Change', value: affiliateChange, setter: setAffiliateChange },
            ].map(({ label, value, setter }) => (
              <div key={label}>
                <label className="text-xs font-medium text-[var(--color-text-muted)]">{label}</label>
                <div className="mt-2 flex items-center gap-3">
                  <input
                    type="range"
                    min={-50}
                    max={50}
                    value={value}
                    onChange={(e) => setter(Number(e.target.value))}
                    className="flex-1"
                  />
                  <span className="w-14 text-right text-sm font-medium tabular-nums">
                    {value >= 0 ? '+' : ''}{value}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </ChartCard>

        {/* Projected Results */}
        <div className="grid grid-cols-3 gap-4">
          <KPICard label="Projected Ad Revenue" value={projAdRevenue} format="currency" delta={((projAdRevenue - baseRevenue) / baseRevenue) * 100} />
          <KPICard label="Projected Affiliate" value={projAffiliate} format="currency" delta={((projAffiliate - baseAffiliate) / baseAffiliate) * 100} />
          <KPICard label="Projected Total Revenue" value={projTotalRevenue} format="currency" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <KPICard label="Projected Costs" value={projCosts} format="currency" delta={((projCosts - baseCosts) / baseCosts) * 100} />
          <KPICard label="Projected Profit" value={projProfit} format="currency" delta={((projProfit - (baseRevenue + baseAffiliate - baseCosts)) / (baseRevenue + baseAffiliate - baseCosts)) * 100} />
          <KPICard label="Projected ROMI" value={projRomi} format="percent" />
        </div>

        <ChartCard title="Projection Chart" description="Current vs Projected">
          <div className="flex h-[250px] items-center justify-center text-sm text-[var(--color-text-muted)]">
            Projection comparison chart will render here
          </div>
        </ChartCard>
      </div>
    </div>
  )
}
