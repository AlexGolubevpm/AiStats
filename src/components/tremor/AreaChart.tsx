// Tremor AreaChart [v1.0.0]
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import React from "react"
import { RiArrowLeftSLine, RiArrowRightSLine } from "@remixicon/react"
import {
  Area,
  CartesianGrid,
  Dot,
  Label,
  Line,
  AreaChart as RechartsAreaChart,
  Legend as RechartsLegend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import type { AxisDomain } from "recharts/types/util/types"

import {
  AvailableChartColors,
  constructCategoryColors,
  getColorClassName,
  getYAxisDomain,
  hasOnlyOneValueForKey,
  type AvailableChartColorsKeys,
} from "@/lib/chartUtils"
import { useOnWindowResize } from "@/lib/useOnWindowResize"
import { cn } from "@/lib/utils"

/* ── Legend ── */

interface LegendItemProps {
  name: string
  color: AvailableChartColorsKeys
  onClick?: (name: string, color: AvailableChartColorsKeys) => void
  activeLegend?: string
}

const LegendItem = ({ name, color, onClick, activeLegend }: LegendItemProps) => {
  const hasOnValueChange = !!onClick
  return (
    <li
      className={cn(
        "group inline-flex flex-nowrap items-center gap-1.5 rounded-sm px-2 py-1 whitespace-nowrap transition",
        hasOnValueChange ? "cursor-pointer hover:bg-gray-100" : "cursor-default",
      )}
      onClick={(e) => { e.stopPropagation(); onClick?.(name, color) }}
    >
      <span
        className={cn(
          "h-[3px] w-3.5 shrink-0 rounded-full",
          getColorClassName(color, "bg"),
          activeLegend && activeLegend !== name ? "opacity-40" : "opacity-100",
        )}
        aria-hidden={true}
      />
      <p
        className={cn(
          "truncate text-xs whitespace-nowrap text-gray-700",
          hasOnValueChange && "group-hover:text-gray-900",
          activeLegend && activeLegend !== name ? "opacity-40" : "opacity-100",
        )}
      >
        {name}
      </p>
    </li>
  )
}

interface ScrollButtonProps {
  icon: React.ElementType
  onClick?: () => void
  disabled?: boolean
}

const ScrollButton = ({ icon, onClick, disabled }: ScrollButtonProps) => {
  const Icon = icon
  const [isPressed, setIsPressed] = React.useState(false)
  const intervalRef = React.useRef<NodeJS.Timeout | null>(null)

  React.useEffect(() => {
    if (isPressed) {
      intervalRef.current = setInterval(() => { onClick?.() }, 300)
    } else {
      clearInterval(intervalRef.current as NodeJS.Timeout)
    }
    return () => clearInterval(intervalRef.current as NodeJS.Timeout)
  }, [isPressed, onClick])

  React.useEffect(() => {
    if (disabled) {
      clearInterval(intervalRef.current as NodeJS.Timeout)
      setIsPressed(false)
    }
  }, [disabled])

  return (
    <button
      type="button"
      className={cn(
        "group inline-flex size-5 items-center truncate rounded-sm transition",
        disabled
          ? "cursor-not-allowed text-gray-400"
          : "cursor-pointer text-gray-700 hover:bg-gray-100 hover:text-gray-900",
      )}
      disabled={disabled}
      onClick={(e) => { e.stopPropagation(); onClick?.() }}
      onMouseDown={(e) => { e.stopPropagation(); setIsPressed(true) }}
      onMouseUp={(e) => { e.stopPropagation(); setIsPressed(false) }}
    >
      <Icon className="size-full" aria-hidden="true" />
    </button>
  )
}

interface LegendProps extends React.OlHTMLAttributes<HTMLOListElement> {
  categories: string[]
  colors?: AvailableChartColorsKeys[]
  onClickLegendItem?: (category: string, color: string) => void
  activeLegend?: string
  enableLegendSlider?: boolean
}

type HasScrollProps = { left: boolean; right: boolean }

const Legend = React.forwardRef<HTMLOListElement, LegendProps>((props, ref) => {
  const {
    categories, colors = AvailableChartColors, className,
    onClickLegendItem, activeLegend, enableLegendSlider = false, ...other
  } = props

  const scrollableRef = React.useRef<HTMLInputElement>(null)
  const scrollButtonsRef = React.useRef<HTMLDivElement>(null)
  const [hasScroll, setHasScroll] = React.useState<HasScrollProps | null>(null)
  const [isKeyDowned, setIsKeyDowned] = React.useState<string | null>(null)
  const intervalRef = React.useRef<NodeJS.Timeout | null>(null)

  const checkScroll = React.useCallback(() => {
    const el = scrollableRef?.current
    if (!el) return
    setHasScroll({
      left: el.scrollLeft > 0,
      right: el.scrollWidth - el.clientWidth > el.scrollLeft,
    })
  }, [])

  const scrollToDir = React.useCallback(
    (direction: "left" | "right") => {
      const el = scrollableRef?.current
      const btns = scrollButtonsRef?.current
      const btnsW = btns?.clientWidth ?? 0
      const w = el?.clientWidth ?? 0
      if (el && enableLegendSlider) {
        el.scrollTo({
          left: direction === "left"
            ? el.scrollLeft - w + btnsW
            : el.scrollLeft + w - btnsW,
          behavior: "smooth",
        })
        setTimeout(checkScroll, 400)
      }
    },
    [enableLegendSlider, checkScroll],
  )

  React.useEffect(() => {
    const handler = (key: string) => {
      if (key === "ArrowLeft") scrollToDir("left")
      else if (key === "ArrowRight") scrollToDir("right")
    }
    if (isKeyDowned) {
      handler(isKeyDowned)
      intervalRef.current = setInterval(() => handler(isKeyDowned), 300)
    } else {
      clearInterval(intervalRef.current as NodeJS.Timeout)
    }
    return () => clearInterval(intervalRef.current as NodeJS.Timeout)
  }, [isKeyDowned, scrollToDir])

  React.useEffect(() => {
    const el = scrollableRef?.current
    const keyDown = (e: KeyboardEvent) => {
      e.stopPropagation()
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault()
        setIsKeyDowned(e.key)
      }
    }
    const keyUp = (e: KeyboardEvent) => { e.stopPropagation(); setIsKeyDowned(null) }
    if (enableLegendSlider) {
      checkScroll()
      el?.addEventListener("keydown", keyDown)
      el?.addEventListener("keyup", keyUp)
    }
    return () => { el?.removeEventListener("keydown", keyDown); el?.removeEventListener("keyup", keyUp) }
  }, [checkScroll, enableLegendSlider])

  return (
    <ol ref={ref} className={cn("relative overflow-hidden", className)} {...other}>
      <div
        ref={scrollableRef as any}
        tabIndex={0}
        className={cn(
          "flex h-full",
          enableLegendSlider
            ? hasScroll?.right || hasScroll?.left
              ? "snap-mandatory items-center overflow-auto pr-12 pl-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              : ""
            : "flex-wrap",
        )}
      >
        {categories.map((category, i) => (
          <LegendItem
            key={`item-${i}`}
            name={category}
            color={colors[i] as AvailableChartColorsKeys}
            onClick={onClickLegendItem}
            activeLegend={activeLegend}
          />
        ))}
      </div>
      {enableLegendSlider && (hasScroll?.right || hasScroll?.left) ? (
        <div
          ref={scrollButtonsRef}
          className="absolute top-0 right-0 bottom-0 flex h-full items-center justify-center pr-1 bg-white"
        >
          <ScrollButton icon={RiArrowLeftSLine} onClick={() => { setIsKeyDowned(null); scrollToDir("left") }} disabled={!hasScroll?.left} />
          <ScrollButton icon={RiArrowRightSLine} onClick={() => { setIsKeyDowned(null); scrollToDir("right") }} disabled={!hasScroll?.right} />
        </div>
      ) : null}
    </ol>
  )
})
Legend.displayName = "Legend"

/* ── Tooltip ── */

type PayloadItem = {
  category: string
  value: number
  index: string
  color: AvailableChartColorsKeys
  type?: string
  payload: any
}

type TooltipProps = {
  active: boolean | undefined
  payload: PayloadItem[]
  label: string | number | undefined
}

interface ChartTooltipProps {
  active: boolean | undefined
  payload: PayloadItem[]
  label: string | number | undefined
  valueFormatter: (value: number) => string
}

const ChartTooltip = ({ active, payload, label, valueFormatter }: ChartTooltipProps) => {
  if (active && payload?.length) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white text-sm shadow-lg">
        <div className="border-b border-gray-100 px-4 py-2">
          <p className="font-medium text-gray-900">{label}</p>
        </div>
        <div className="space-y-1 px-4 py-2">
          {payload.map(({ value, category, color }, i) => (
            <div key={i} className="flex items-center justify-between space-x-8">
              <div className="flex items-center space-x-2">
                <span aria-hidden="true" className={cn("h-[3px] w-3.5 shrink-0 rounded-full", getColorClassName(color, "bg"))} />
                <p className="text-right whitespace-nowrap text-gray-700">{category}</p>
              </div>
              <p className="text-right font-medium whitespace-nowrap tabular-nums text-gray-900">
                {valueFormatter(value)}
              </p>
            </div>
          ))}
        </div>
      </div>
    )
  }
  return null
}

/* ── Main AreaChart ── */

interface ActiveDot { index?: number; dataKey?: string }

type BaseEventProps = { eventType: "dot" | "category"; categoryClicked: string; [key: string]: number | string }
type AreaChartEventProps = BaseEventProps | null | undefined

interface AreaChartProps extends React.HTMLAttributes<HTMLDivElement> {
  data: Record<string, any>[]
  index: string
  categories: string[]
  colors?: AvailableChartColorsKeys[]
  valueFormatter?: (value: number) => string
  startEndOnly?: boolean
  showXAxis?: boolean
  showYAxis?: boolean
  showGridLines?: boolean
  yAxisWidth?: number
  intervalType?: "preserveStartEnd" | "equidistantPreserveStart"
  showTooltip?: boolean
  showLegend?: boolean
  autoMinValue?: boolean
  minValue?: number
  maxValue?: number
  allowDecimals?: boolean
  onValueChange?: (value: AreaChartEventProps) => void
  enableLegendSlider?: boolean
  tickGap?: number
  connectNulls?: boolean
  xAxisLabel?: string
  yAxisLabel?: string
  type?: "default" | "stacked" | "percent"
  legendPosition?: "left" | "center" | "right"
  fill?: "gradient" | "solid" | "none"
  tooltipCallback?: (content: TooltipProps) => void
  customTooltip?: React.ComponentType<TooltipProps>
}

const AreaChart = React.forwardRef<HTMLDivElement, AreaChartProps>((props, ref) => {
  const {
    data = [], categories = [], index, colors = AvailableChartColors,
    valueFormatter = (v: number) => v.toString(),
    startEndOnly = false, showXAxis = true, showYAxis = true,
    showGridLines = true, yAxisWidth = 56,
    intervalType = "equidistantPreserveStart",
    showTooltip = true, showLegend = true,
    autoMinValue = false, minValue, maxValue,
    allowDecimals = true, connectNulls = false,
    className, onValueChange, enableLegendSlider = false,
    tickGap = 5, xAxisLabel, yAxisLabel,
    type = "default", legendPosition = "right",
    fill = "gradient", tooltipCallback, customTooltip,
    ...other
  } = props

  const CustomTooltip = customTooltip
  const paddingValue = (!showXAxis && !showYAxis) || (startEndOnly && !showYAxis) ? 0 : 20
  const [legendHeight, setLegendHeight] = React.useState(60)
  const [activeDot, setActiveDot] = React.useState<ActiveDot | undefined>(undefined)
  const [activeLegend, setActiveLegend] = React.useState<string | undefined>(undefined)
  const categoryColors = constructCategoryColors(categories, colors)
  const yAxisDomain = getYAxisDomain(autoMinValue, minValue, maxValue)
  const hasOnValueChange = !!onValueChange
  const stacked = type === "stacked" || type === "percent"
  const areaId = React.useId()

  const prevActiveRef = React.useRef<boolean | undefined>(undefined)
  const prevLabelRef = React.useRef<string | number | undefined>(undefined)

  const getFillContent = ({
    fillType, activeDot: ad, activeLegend: al, category,
  }: { fillType: AreaChartProps["fill"]; activeDot: ActiveDot | undefined; activeLegend: string | undefined; category: string }) => {
    const stopOpacity = ad || (al && al !== category) ? 0.1 : 0.3
    switch (fillType) {
      case "none": return <stop stopColor="currentColor" stopOpacity={0} />
      case "gradient": return (<><stop offset="5%" stopColor="currentColor" stopOpacity={stopOpacity} /><stop offset="95%" stopColor="currentColor" stopOpacity={0} /></>)
      case "solid": default: return <stop stopColor="currentColor" stopOpacity={stopOpacity} />
    }
  }

  function valueToPercent(value: number) { return `${(value * 100).toFixed(0)}%` }

  function onDotClick(itemData: any, event: React.MouseEvent) {
    event.stopPropagation()
    if (!hasOnValueChange) return
    if ((itemData.index === activeDot?.index && itemData.dataKey === activeDot?.dataKey) ||
        (hasOnlyOneValueForKey(data, itemData.dataKey) && activeLegend && activeLegend === itemData.dataKey)) {
      setActiveLegend(undefined); setActiveDot(undefined); onValueChange?.(null)
    } else {
      setActiveLegend(itemData.dataKey)
      setActiveDot({ index: itemData.index, dataKey: itemData.dataKey })
      onValueChange?.({ eventType: "dot", categoryClicked: itemData.dataKey, ...itemData.payload })
    }
  }

  function onCategoryClick(dataKey: string) {
    if (!hasOnValueChange) return
    if ((dataKey === activeLegend && !activeDot) ||
        (hasOnlyOneValueForKey(data, dataKey) && activeDot && activeDot.dataKey === dataKey)) {
      setActiveLegend(undefined); onValueChange?.(null)
    } else {
      setActiveLegend(dataKey); onValueChange?.({ eventType: "category", categoryClicked: dataKey })
    }
    setActiveDot(undefined)
  }

  const ChartLegend = (
    { payload }: any,
    catColors: Map<string, AvailableChartColorsKeys>,
    setLH: React.Dispatch<React.SetStateAction<number>>,
    aLegend: string | undefined,
    onClick?: (cat: string, color: string) => void,
    enableSlider?: boolean,
    legPos?: "left" | "center" | "right",
    yW?: number,
  ) => {
    const legendRef = React.useRef<HTMLDivElement>(null)
    useOnWindowResize(() => {
      const h = legendRef.current?.clientHeight
      setLH(h ? Number(h) + 15 : 60)
    })
    const legendPayload = payload.filter((item: any) => item.type !== "none")
    const paddingLeft = legPos === "left" && yW ? yW - 8 : 0

    return (
      <div
        ref={legendRef}
        style={{ paddingLeft }}
        className={cn(
          "flex items-center",
          legPos === "center" && "justify-center",
          legPos === "left" && "justify-start",
          legPos === "right" && "justify-end",
        )}
      >
        <Legend
          categories={legendPayload.map((e: any) => e.value)}
          colors={legendPayload.map((e: any) => catColors.get(e.value))}
          onClickLegendItem={onClick}
          activeLegend={aLegend}
          enableLegendSlider={enableSlider}
        />
      </div>
    )
  }

  return (
    <div ref={ref} className={cn("h-80 w-full", className)} {...other}>
      <ResponsiveContainer>
        <RechartsAreaChart
          data={data}
          onClick={
            hasOnValueChange && (activeLegend || activeDot)
              ? () => { setActiveDot(undefined); setActiveLegend(undefined); onValueChange?.(null) }
              : undefined
          }
          margin={{
            bottom: xAxisLabel ? 30 : undefined,
            left: yAxisLabel ? 20 : undefined,
            right: yAxisLabel ? 5 : undefined,
            top: 5,
          }}
          stackOffset={type === "percent" ? "expand" : undefined}
        >
          {showGridLines && (
            <CartesianGrid className="stroke-gray-200 stroke-1" horizontal={true} vertical={false} />
          )}
          <XAxis
            padding={{ left: paddingValue, right: paddingValue }}
            hide={!showXAxis}
            dataKey={index}
            interval={startEndOnly ? "preserveStartEnd" : intervalType}
            tick={{ transform: "translate(0, 6)" }}
            ticks={startEndOnly ? [data[0][index], data[data.length - 1][index]] : undefined}
            fill=""
            stroke=""
            className="text-xs fill-gray-500"
            tickLine={false}
            axisLine={false}
            minTickGap={tickGap}
          >
            {xAxisLabel && (
              <Label position="insideBottom" offset={-20} className="fill-gray-800 text-sm font-medium">
                {xAxisLabel}
              </Label>
            )}
          </XAxis>
          <YAxis
            width={yAxisWidth}
            hide={!showYAxis}
            axisLine={false}
            tickLine={false}
            type="number"
            domain={yAxisDomain as AxisDomain}
            tick={{ transform: "translate(-3, 0)" }}
            fill=""
            stroke=""
            className="text-xs fill-gray-500"
            tickFormatter={type === "percent" ? valueToPercent : valueFormatter}
            allowDecimals={allowDecimals}
          >
            {yAxisLabel && (
              <Label position="insideLeft" style={{ textAnchor: "middle" }} angle={-90} offset={-15} className="fill-gray-800 text-sm font-medium">
                {yAxisLabel}
              </Label>
            )}
          </YAxis>
          <Tooltip
            wrapperStyle={{ outline: "none" }}
            isAnimationActive={true}
            animationDuration={100}
            cursor={{ stroke: "#d1d5db", strokeWidth: 1 }}
            offset={20}
            position={{ y: 0 }}
            content={({ active, payload, label }) => {
              const cleanPayload: TooltipProps["payload"] = payload
                ? payload.map((item: any) => ({
                    category: item.dataKey,
                    value: item.value,
                    index: item.payload[index],
                    color: categoryColors.get(item.dataKey) as AvailableChartColorsKeys,
                    type: item.type,
                    payload: item.payload,
                  }))
                : []

              if (tooltipCallback && (active !== prevActiveRef.current || label !== prevLabelRef.current)) {
                tooltipCallback({ active, payload: cleanPayload, label: label as string })
                prevActiveRef.current = active
                prevLabelRef.current = label
              }

              return showTooltip && active ? (
                CustomTooltip
                  ? <CustomTooltip active={active} payload={cleanPayload} label={label} />
                  : <ChartTooltip active={active} payload={cleanPayload} label={label} valueFormatter={valueFormatter} />
              ) : null
            }}
          />

          {showLegend && (
            <RechartsLegend
              verticalAlign="top"
              height={legendHeight}
              content={({ payload }) =>
                ChartLegend(
                  { payload },
                  categoryColors,
                  setLegendHeight,
                  activeLegend,
                  hasOnValueChange ? (item: string) => onCategoryClick(item) : undefined,
                  enableLegendSlider,
                  legendPosition,
                  yAxisWidth,
                )
              }
            />
          )}

          {categories.map((category) => {
            const categoryId = `${areaId}-${category.replace(/[^a-zA-Z0-9]/g, "")}`
            return (
              <React.Fragment key={category}>
                <defs>
                  <linearGradient
                    className={cn(getColorClassName(categoryColors.get(category) as AvailableChartColorsKeys, "text"))}
                    id={categoryId} x1="0" y1="0" x2="0" y2="1"
                  >
                    {getFillContent({ fillType: fill, activeDot, activeLegend, category })}
                  </linearGradient>
                </defs>
                <Area
                  className={cn(getColorClassName(categoryColors.get(category) as AvailableChartColorsKeys, "stroke"))}
                  strokeOpacity={activeDot || (activeLegend && activeLegend !== category) ? 0.3 : 1}
                  activeDot={(dotProps: any) => {
                    const { cx: cxC, cy: cyC, stroke, strokeLinecap, strokeLinejoin, strokeWidth, dataKey } = dotProps
                    return (
                      <Dot
                        className={cn(
                          "stroke-white",
                          onValueChange ? "cursor-pointer" : "",
                          getColorClassName(categoryColors.get(dataKey) as AvailableChartColorsKeys, "fill"),
                        )}
                        cx={cxC} cy={cyC} r={5} fill="" stroke={stroke}
                        strokeLinecap={strokeLinecap} strokeLinejoin={strokeLinejoin} strokeWidth={strokeWidth}
                        onClick={(_, event) => onDotClick(dotProps, event)}
                      />
                    )
                  }}
                  dot={(dotProps: any) => {
                    const { stroke, strokeLinecap, strokeLinejoin, strokeWidth, cx: cxC, cy: cyC, dataKey, index: idx } = dotProps
                    if ((hasOnlyOneValueForKey(data, category) && !(activeDot || (activeLegend && activeLegend !== category))) ||
                        (activeDot?.index === idx && activeDot?.dataKey === category)) {
                      return (
                        <Dot
                          key={idx} cx={cxC} cy={cyC} r={5} stroke={stroke} fill=""
                          strokeLinecap={strokeLinecap} strokeLinejoin={strokeLinejoin} strokeWidth={strokeWidth}
                          className={cn("stroke-white", onValueChange ? "cursor-pointer" : "", getColorClassName(categoryColors.get(dataKey) as AvailableChartColorsKeys, "fill"))}
                        />
                      )
                    }
                    return <React.Fragment key={idx} />
                  }}
                  name={category}
                  type="monotone"
                  dataKey={category}
                  stroke=""
                  strokeWidth={2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  isAnimationActive={true}
                  animationDuration={600}
                  connectNulls={connectNulls}
                  stackId={stacked ? "stack" : undefined}
                  fill={`url(#${categoryId})`}
                />
              </React.Fragment>
            )
          })}

          {onValueChange
            ? categories.map((category) => (
                <Line
                  className="cursor-pointer"
                  strokeOpacity={0}
                  key={category}
                  name={category}
                  type="monotone"
                  dataKey={category}
                  stroke="transparent"
                  fill="transparent"
                  legendType="none"
                  tooltipType="none"
                  strokeWidth={12}
                  connectNulls={connectNulls}
                  onClick={(lineProps: any, event) => { event.stopPropagation(); onCategoryClick(lineProps.name) }}
                />
              ))
            : null}
        </RechartsAreaChart>
      </ResponsiveContainer>
    </div>
  )
})

AreaChart.displayName = "AreaChart"

export { AreaChart, type AreaChartEventProps, type TooltipProps }
