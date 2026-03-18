'use client'

import { AreaChart } from '@/components/tremor/AreaChart'

interface TrafficTrendChartProps {
  data: { date: string; hits: number }[]
}

export function TrafficTrendChart({ data }: TrafficTrendChartProps) {
  if (!data?.length) {
    return (
      <div className="flex items-center justify-center h-72 text-sm text-gray-400">
        No traffic data available
      </div>
    )
  }

  return (
    <AreaChart
      data={data}
      index="date"
      categories={['hits']}
      colors={['cyan']}
      valueFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v.toString()}
      showLegend={true}
      showGridLines={true}
      className="h-72"
      fill="gradient"
      yAxisWidth={56}
    />
  )
}
