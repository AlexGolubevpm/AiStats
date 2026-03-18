'use client'

import { AreaChart } from '@/components/tremor/AreaChart'

interface ProfitTrendChartProps {
  data: { date: string; profit: number }[]
}

export function ProfitTrendChart({ data }: ProfitTrendChartProps) {
  if (!data?.length) {
    return (
      <div className="flex items-center justify-center h-72 text-sm text-gray-400">
        No profit data available
      </div>
    )
  }

  return (
    <AreaChart
      data={data}
      index="date"
      categories={['profit']}
      colors={['emerald']}
      valueFormatter={(v: number) => `$${v >= 1000 ? `${(v / 1000).toFixed(1)}K` : v.toFixed(2)}`}
      showLegend={true}
      showGridLines={true}
      className="h-72"
      fill="gradient"
      autoMinValue={true}
      yAxisWidth={56}
    />
  )
}
