// Tremor SparkAreaChart [v1.0.0]
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import React from "react"
import {
  Area,
  AreaChart as RechartsAreaChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts"
import type { AxisDomain } from "recharts/types/util/types"

import {
  AvailableChartColors,
  constructCategoryColors,
  getColorClassName,
  getYAxisDomain,
  type AvailableChartColorsKeys,
} from "@/lib/chartUtils"
import { cn } from "@/lib/utils"

interface SparkAreaChartProps extends React.HTMLAttributes<HTMLDivElement> {
  data: Record<string, any>[]
  categories: string[]
  index: string
  colors?: AvailableChartColorsKeys[]
  autoMinValue?: boolean
  minValue?: number
  maxValue?: number
  connectNulls?: boolean
  type?: "default" | "stacked" | "percent"
  fill?: "gradient" | "solid" | "none"
}

const SparkAreaChart = React.forwardRef<HTMLDivElement, SparkAreaChartProps>(
  (props, forwardedRef) => {
    const {
      data = [],
      categories = [],
      index,
      colors = AvailableChartColors,
      autoMinValue = false,
      minValue,
      maxValue,
      connectNulls = false,
      type = "default",
      className,
      fill = "gradient",
      ...other
    } = props

    const categoryColors = constructCategoryColors(categories, colors)
    const yAxisDomain = getYAxisDomain(autoMinValue, minValue, maxValue)
    const stacked = type === "stacked" || type === "percent"
    const areaId = React.useId()

    const getFillContent = (fillType: SparkAreaChartProps["fill"]) => {
      switch (fillType) {
        case "none":
          return <stop stopColor="currentColor" stopOpacity={0} />
        case "gradient":
          return (
            <>
              <stop offset="5%" stopColor="currentColor" stopOpacity={0.4} />
              <stop offset="95%" stopColor="currentColor" stopOpacity={0} />
            </>
          )
        case "solid":
          return <stop stopColor="currentColor" stopOpacity={0.3} />
        default:
          return <stop stopColor="currentColor" stopOpacity={0.3} />
      }
    }

    return (
      <div
        ref={forwardedRef}
        className={cn("h-12 w-full", className)}
        {...other}
      >
        <ResponsiveContainer>
          <RechartsAreaChart
            data={data}
            margin={{ bottom: 1, left: 1, right: 1, top: 1 }}
            stackOffset={type === "percent" ? "expand" : undefined}
          >
            <XAxis hide dataKey={index} />
            <YAxis hide={true} domain={yAxisDomain as AxisDomain} />

            {categories.map((category) => {
              const categoryId = `${areaId}-${category.replace(/[^a-zA-Z0-9]/g, "")}`
              return (
                <React.Fragment key={category}>
                  <defs>
                    <linearGradient
                      className={cn(
                        getColorClassName(
                          categoryColors.get(category) as AvailableChartColorsKeys,
                          "text",
                        ),
                      )}
                      id={categoryId}
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      {getFillContent(fill)}
                    </linearGradient>
                  </defs>
                  <Area
                    className={cn(
                      getColorClassName(
                        categoryColors.get(category) as AvailableChartColorsKeys,
                        "stroke",
                      ),
                    )}
                    dot={false}
                    strokeOpacity={1}
                    name={category}
                    type="monotone"
                    dataKey={category}
                    stroke=""
                    strokeWidth={2}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    isAnimationActive={true}
                    animationDuration={500}
                    connectNulls={connectNulls}
                    stackId={stacked ? "stack" : undefined}
                    fill={`url(#${categoryId})`}
                  />
                </React.Fragment>
              )
            })}
          </RechartsAreaChart>
        </ResponsiveContainer>
      </div>
    )
  },
)

SparkAreaChart.displayName = "SparkAreaChart"

export { SparkAreaChart }
