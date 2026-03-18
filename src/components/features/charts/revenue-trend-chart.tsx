'use client'

import { AreaChart } from '@/components/tremor/AreaChart'

interface RevenueTrendChartProps {
  data: { date: string; adRevenue: number; affiliateRevenue: number; totalRevenue: number }[]
}

export function RevenueTrendChart({ data }: RevenueTrendChartProps) {
  if (!data?.length) {
    return (
      <div className="flex items-center justify-center h-72 text-sm text-gray-400">
        No revenue data available
      </div>
    )
  }

  return (
    <AreaChart
      data={data}
      index="date"
      categories={['adRevenue', 'affiliateRevenue']}
      colors={['violet', 'fuchsia']}
      valueFormatter={(v: number) => `$${v >= 1000 ? `${(v / 1000).toFixed(1)}K` : v.toFixed(2)}`}
      showLegend={true}
      showGridLines={true}
      className="h-72"
      fill="gradient"
      yAxisWidth={56}
    />
  )
}
