# AiStats — Design System & UI Documentation

## Table of Contents

1. [Design Philosophy](#design-philosophy)
2. [Design Tokens](#design-tokens)
3. [Typography](#typography)
4. [Layout System](#layout-system)
5. [Core Components](#core-components)
6. [Feature Components](#feature-components)
7. [Charts](#charts)
8. [Pages & Sections](#pages--sections)

---

## Design Philosophy

AiStats uses a **minimal corporate dashboard** aesthetic inspired by Linear/Vercel:

- **Light-only** theme with neutral gray backgrounds
- **Indigo accent** (#6366F1) as the primary brand color
- **Semantic colors** for health/status (green, amber, red)
- **Tabular numerals** everywhere numbers appear
- **Subtle shadows** and borders instead of heavy decoration
- **Inter** as the primary font family
- **Anti-aliased** rendering with `font-smoothing` enabled
- **Framer Motion** for skeleton pulse animations
- **Recharts** for all data visualizations

---

## Design Tokens

All tokens are defined as CSS custom properties in `globals.css` via `@theme` block (Tailwind v4 syntax).

### Colors

| Token | Value | Usage |
|---|---|---|
| `--color-background` | `#FAFAFA` | Page background |
| `--color-surface` | `#FFFFFF` | Cards, panels, table rows |
| `--color-surface-raised` | `#FFFFFF` | Elevated surfaces |
| `--color-border` | `#E4E4E7` | Primary borders |
| `--color-border-subtle` | `#F0F0F2` | Dividers, chart grids |
| `--color-text-primary` | `#18181B` | Headings, values |
| `--color-text-secondary` | `#52525B` | Body text, descriptions |
| `--color-text-muted` | `#A1A1AA` | Labels, captions |
| `--color-accent` | `#6366F1` | Links, active states, primary buttons |
| `--color-accent-light` | `#EEF2FF` | Accent backgrounds, hover states |

### Status Colors

| Token | Value | Usage |
|---|---|---|
| `--color-healthy` / `--color-healthy-bg` | `#059669` / `#ECFDF5` | Score >= 80 |
| `--color-warning` / `--color-warning-bg` | `#D97706` / `#FFFBEB` | Score 60-79 |
| `--color-critical` / `--color-critical-bg` | `#DC2626` / `#FEF2F2` | Score < 60 |

### Bundle Brand Colors

| Bundle | Color |
|---|---|
| Gays | `#3B82F6` (blue) |
| Trans | `#EC4899` (pink) |
| JAV | `#EF4444` (red) |
| Hentai | `#8B5CF6` (purple) |

### Spacing & Radius

| Token | Value |
|---|---|
| `--radius-sm` | `0.375rem` (6px) |
| `--radius-md` | `0.5rem` (8px) |
| `--radius-lg` | `0.75rem` (12px) |

### Shadows

| Token | Value |
|---|---|
| `--shadow-sm` | `0 1px 2px rgb(0 0 0 / 0.03)` |
| `--shadow-md` | `0 1px 3px rgb(0 0 0 / 0.04), 0 1px 2px -1px rgb(0 0 0 / 0.04)` |
| `--shadow-lg` | `0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.03)` |

---

## Typography

- **Font family**: Inter (via `--font-sans`)
- **Font features**: `'tnum' on, 'lnum' on` (tabular/lining figures globally)
- **Antialiasing**: `-webkit-font-smoothing: antialiased`

### Text Scale (used via Tailwind)

| Usage | Class | Example |
|---|---|---|
| Page title | `text-lg font-semibold` | "Dashboard" in topbar |
| Section title | `text-sm font-medium` | ChartCard title |
| KPI value | `text-2xl font-semibold tabular-nums` | "$12,450.00" |
| KPI label | `text-xs font-medium uppercase tracking-wider` | "AD REVENUE" |
| Table header | `text-xs font-medium uppercase tracking-wider` | Column headers |
| Body | `text-sm` | Table cells, descriptions |
| Caption | `text-xs text-[var(--color-text-muted)]` | Timestamps, hints |

---

## Layout System

### AppShell (`layout.tsx`)

```
┌──────────────────────────────────────────────────┐
│ QueryProvider                                     │
│  ┌────────────┬─────────────────────────────────┐ │
│  │  Sidebar   │  Content Area                   │ │
│  │  (260px)   │  ┌─────────────────────────┐    │ │
│  │  fixed     │  │  Topbar (h-16)          │    │ │
│  │            │  ├─────────────────────────┤    │ │
│  │            │  │  Page Content (p-8)     │    │ │
│  │            │  │                         │    │ │
│  │            │  │                         │    │ │
│  │            │  └─────────────────────────┘    │ │
│  └────────────┴─────────────────────────────────┘ │
└──────────────────────────────────────────────────┘
```

- **Sidebar**: 260px fixed, left-aligned, full height. Navigation with Lucide icons, active state uses `--color-sidebar-active` bg + accent icon color.
- **Topbar**: 64px (h-16), sticky, contains page title + PeriodSelector + Sync button.
- **Content area**: offset by sidebar width, scrollable. Standard padding `p-8` with `space-y-6` vertical rhythm.

### Grid Patterns

| Pattern | Usage |
|---|---|
| `grid-cols-5 gap-4` | KPI row (main 5 metrics) |
| `grid-cols-4 gap-4` | KPI row (secondary metrics), bundle detail stats |
| `grid-cols-3 gap-4` | Costs/Affiliate KPIs |
| `grid-cols-2 gap-5` | Charts side-by-side, bundle cards, insight cards |
| `grid-cols-4 gap-4` | Dashboard bundle cards |

---

## Core Components

### KPICard

**File**: `src/components/shared/kpi-card.tsx`

Displays a single metric with optional delta and sparkline.

```
┌─────────────────────────────────────┐
│  AD REVENUE           [sparkline]   │
│  $12,450.00                         │
│  ↑ +12.3% vs prev                  │
└─────────────────────────────────────┘
```

| Prop | Type | Description |
|---|---|---|
| `label` | `string` | Uppercase label text |
| `value` | `number` | Numeric value |
| `format` | `'currency' \| 'number' \| 'percent' \| 'score' \| 'compact'` | Value formatting |
| `delta` | `number?` | Percentage change vs previous period |
| `trend` | `number[]?` | Sparkline data points (last 7 values) |

**Styling**: `rounded-lg`, border, `shadow-sm` -> `shadow-md` on hover. Delta uses TrendingUp/TrendingDown/Minus icons with green/red/muted colors.

### ChartCard

**File**: `src/components/shared/chart-card.tsx`

Container wrapper for any chart or data section.

```
┌─────────────────────────────────────┐
│  Title                    [action]  │
│  Description                        │
├─────────────────────────────────────┤
│                                     │
│  {children}                         │
│                                     │
└─────────────────────────────────────┘
```

| Prop | Type | Description |
|---|---|---|
| `title` | `string` | Section title |
| `description` | `string?` | Subtitle in muted text |
| `action` | `ReactNode?` | Button or control in header |
| `children` | `ReactNode` | Content area |

**Styling**: `rounded-lg`, border, `shadow-sm`. Header separated by `border-b border-subtle`.

### HealthBadge

**File**: `src/components/shared/health-badge.tsx`

Pill-shaped status indicator.

| Score | Status | Background | Text |
|---|---|---|---|
| >= 80 | healthy | `#ECFDF5` | `#059669` |
| 60-79 | warning | `#FFFBEB` | `#D97706` |
| < 60 | critical | `#FEF2F2` | `#DC2626` |

**Rendering**: `[score] [status]` in a `rounded-full` pill. `showLabel={false}` hides the text, showing only the number.

### DeltaIndicator

**File**: `src/components/shared/delta-indicator.tsx`

Compact delta display with trend icon.

- Positive: green, TrendingUp icon, `+X.X%`
- Negative: red, TrendingDown icon, `-X.X%`
- Zero: muted, Minus icon, `+0.0%`

### InsightCard

**File**: `src/components/shared/insight-card.tsx`

Alert-style card for anomalies and recommendations.

```
┌────┬────────────────────────────────┐
│ ▌  │ ⚠ GayXHub  site               │
│ ▌  │ revenue: 45.20  +12.3%        │
│ ▌  │ Revenue grew 12.3% vs prev    │
│ ▌  │ Scale traffic to capitalize    │
└────┴────────────────────────────────┘
```

**Left border** color by severity:
- `low` → blue-400
- `medium` → amber-400
- `high` → orange-500
- `critical` → red-500

**Icon** by type: AlertTriangle (risk), TrendingUp (opportunity), Info (info)

### Sparkline

**File**: `src/components/shared/sparkline.tsx`

Minimal line chart (80x32px) rendered via Recharts. No axes, no tooltip, just a colored line. Used inside KPICard.

### Loading Skeletons

**File**: `src/components/shared/loading-skeleton.tsx`

Framer Motion animated pulse skeletons:

| Component | Description |
|---|---|
| `Skeleton` | Base block, animates opacity 0.5→1→0.5 |
| `KPICardSkeleton` | Card-shaped: label bar + value bar + delta bar |
| `ChartSkeleton` | Card with header bar + 200px content area |
| `TableSkeleton` | Header bar + N rows of column placeholders |

---

## Feature Components

### DataTable

**File**: `src/components/features/data-table.tsx`

Powered by **@tanstack/react-table**. Features:

- **Sorting**: Click column headers. ArrowUpDown → ArrowUp/ArrowDown icons.
- **Search**: Global filter via text input with Search icon.
- **Sticky first column**: `sticky left-0 z-10` for name/link columns.
- **Right-aligned numbers**: Columns after index 1 are right-aligned with `tabular-nums`.
- **Empty state**: "No data available" centered text.

**Styling**: `rounded-lg` border wrapper, alternating hover via `hover:bg-background`, dividers via `divide-y divide-border-subtle`.

### FilterBar

**File**: `src/components/features/filter-bar.tsx`

Row of Select dropdowns for filtering data:

| Filter | Options |
|---|---|
| Bundle | Gays, Trans, JAV, Hentai |
| Format | POP, PUSH, Banner, Slider, Outstream, VAST |
| Tier | Tier 1-4 |

Plus a "Clear" ghost button when any filter is active.

### PeriodSelector

Located in the Topbar. Selects time period: today, yesterday, 7d, 30d, 90d.

---

## Charts

All charts use **Recharts** with consistent styling:

- **Height**: 250px (200px for CostTrend)
- **Grid**: `strokeDasharray="3 3"`, `stroke="var(--color-border-subtle)"`
- **Axes**: `fontSize: 11`, no tick lines, no axis lines
- **Tooltip**: `fontSize: 12`, `borderRadius: 8`, border `var(--color-border)`
- **Bar radius**: `[4, 4, 0, 0]` (rounded top corners)

### RevenueTrendChart

**Type**: AreaChart (stacked areas)

| Series | Color | Fill |
|---|---|---|
| Ad Revenue | `var(--color-accent)` (indigo) | Linear gradient 15%→0% opacity |
| Affiliate | `#8B5CF6` (purple) | Linear gradient 15%→0% opacity |

### TrafficTrendChart

**Type**: AreaChart (single area)

| Series | Color |
|---|---|
| Users | `#06B6D4` (cyan) |

Y-axis formatted as `XK` (thousands).

### ProfitTrendChart

**Type**: AreaChart with ReferenceLine at y=0

| Series | Color |
|---|---|
| Profit | `#10B981` (emerald) |

### FormatBreakdownChart

**Type**: BarChart (vertical bars)

| Format | Color |
|---|---|
| POP | `#3B82F6` |
| PUSH | `#EF4444` |
| BANNER | `#10B981` |
| SLIDER | `#F59E0B` |
| OUTSTREAM | `#8B5CF6` |
| VAST | `#EC4899` |
| OTHER | `#6B7280` |

### TierBreakdownChart

**Type**: BarChart (dual Y-axis)

- Left Y-axis: Revenue ($)
- Right Y-axis: Users (XK)
- Revenue bars: `#3B82F6`, Users bars: `#10B981`

### CostTrendChart

**Type**: LineChart (no fill, dots disabled)

| Series | Color |
|---|---|
| Amount | `#EF4444` (red) |

### AffiliateComparisonChart

**Type**: BarChart (grouped bars)

| Series | Color |
|---|---|
| Ad Revenue | `var(--color-accent)` |
| Affiliate | `#8B5CF6` |

### ForecastChart

**Type**: BarChart (grouped bars)

| Series | Color |
|---|---|
| Current | `var(--color-accent)` |
| Projected | `#10B981` |

Categories: Ad Revenue, Affiliate, Costs, Profit.

---

## Pages & Sections

### 1. Dashboard (`/dashboard`)

The main overview page. Layout:

```
┌─────────────────────────────────────────────────────┐
│ Topbar: "Dashboard" | Network overview and key...   │
├─────────────────────────────────────────────────────┤
│                                                     │
│  [Users] [Ad Rev] [Affil Rev] [Total Rev] [Costs]  │  ← 5-col KPI row
│  [Profit] [ROMI] [RPM]                             │  ← 4-col KPI row (overflow)
│                                                     │
│  ┌─ Bundles Overview ─────────────────────────┐     │
│  │ [Bundle Card] [Bundle Card] [Bundle Card]  │     │  ← 4-col grid of link cards
│  │ [Bundle Card]                              │     │
│  └────────────────────────────────────────────┘     │
│                                                     │
│  [Revenue Trend Chart]   [Traffic Trend Chart]      │  ← 2-col chart grid
│                                                     │
│  Operational Insights                               │
│  [InsightCard] [InsightCard]                        │  ← 2-col grid of anomalies
│  [InsightCard] [InsightCard]                        │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Empty state**: Dashed border box with "No data available yet" + sync hint.

**Bundle cards** show: colored dot + name, sitesCount, traffic (K), revenue ($), profit ($), ROMI (%).

### 2. Bundles (`/bundles`)

2-column grid of large bundle cards. Each card:

```
┌──────────────────────────────────────────┐
│  ● Bundle Name        X sites   [Health] │
│                                          │
│  Traffic  | Ad Rev  | Affiliate | Total  │  ← 4-col stat grid
│  Costs    | Profit  | ROMI      | RPM    │  ← 4-col stat grid
│  ─────────────────────────────────────── │
│                           [DeltaIndicator]│
└──────────────────────────────────────────┘
```

Cards are `<Link>` elements to `/bundles/[slug]`. Hover: `shadow-sm` → `shadow-lg`.

### 3. Bundle Detail (`/bundles/[id]`)

```
┌─────────────────────────────────────────────────────┐
│ Topbar: "Bundle Detail"                             │
├─────────────────────────────────────────────────────┤
│                                                     │
│  [Users] [Ad Rev] [Affil Rev] [Total] [Costs]      │  ← 5-col KPI row
│  [Profit] [ROMI] [RPM]                             │
│                                                     │
│  ┌─ Sites in Bundle ─────────────────────────┐      │
│  │  DataTable: Site | Traffic | Revenue |     │      │
│  │                  Profit | ROMI             │      │
│  └────────────────────────────────────────────┘     │
│                                                     │
│  [Format Breakdown BarChart]                        │
│  [Revenue Trend AreaChart]                          │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 4. Sites (`/sites`)

```
┌─────────────────────────────────────────────────────┐
│ Topbar: "Sites"                                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│  [FilterBar: Bundle dropdown]                       │
│                                                     │
│  DataTable:                                         │
│  Site | Bundle | Health | Traffic | Ad Rev |         │
│  Affiliate | Costs | Profit | ROMI                  │
│                                                     │
└─────────────────────────────────────────────────────┘
```

Health column renders `HealthBadge` or dash "—" if null.

### 5. Site Detail (`/sites/[id]`)

```
┌─────────────────────────────────────────────────────┐
│ Topbar: "Site Detail"                               │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Site Name  [Bundle Badge]  [HealthBadge]           │
│                                                     │
│  [Users] [Ad Rev] [Affil Rev] [Total] [Costs]      │
│  [Profit] [ROMI] [RPM]                             │
│                                                     │
│  ┌ Tabs ─────────────────────────────────────┐      │
│  │ Overview | Formats | GEO/Tiers | Costs |  │      │
│  │ Trends                                    │      │
│  ├───────────────────────────────────────────┤      │
│  │                                           │      │
│  │  (tab content varies — see below)         │      │
│  │                                           │      │
│  └───────────────────────────────────────────┘      │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Tab contents**:

| Tab | Content |
|---|---|
| **Overview** | Revenue Trend + Traffic Trend (2-col chart grid) |
| **Formats** | FormatBreakdownChart + DataTable (format, impressions, clicks, CTR, revenue, fill rate, RPM) |
| **GEO/Tiers** | TierBreakdownChart + DataTable (tier, users, impressions, revenue, CTR, RPM) |
| **Costs** | CostTrendChart (line chart) |
| **Trends** | Revenue + Traffic + Profit charts (stacked vertically) |

### 6. Costs (`/costs`)

```
┌─────────────────────────────────────────────────────┐
│ Topbar: "Costs"                                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│  [Yesterday Total] [7-Day Avg] [30-Day Total]       │  ← 3-col KPIs
│                                                     │
│  ┌─ Cost Breakdown ──────────────────────────┐      │
│  │  DataTable: Site | Bundle | Yesterday |    │      │
│  │  7d Avg | 30d Total | Change | Status     │      │
│  └───────────────────────────────────────────┘      │
│                                                     │
│  [Cost Trend LineChart]                             │
│                                                     │
└─────────────────────────────────────────────────────┘
```

Status column: "Matched" (green pill) or "Unmatched" (amber pill).

### 7. Affiliate (`/affiliate`)

```
┌─────────────────────────────────────────────────────┐
│ Topbar: "Affiliate"                                 │
├─────────────────────────────────────────────────────┤
│                                                     │
│  [Affiliate Rev] [Ad Revenue] [Total Revenue]       │  ← 3-col KPIs
│                                                     │
│  ┌─ Affiliate Revenue by Site ───────────────┐      │
│  │  DataTable: Site | Bundle | Revenue | %    │      │
│  └───────────────────────────────────────────┘      │
│                                                     │
│  [Affiliate vs Ad Revenue BarChart]                 │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 8. Forecast (`/forecast`)

```
┌─────────────────────────────────────────────────────┐
│ Topbar: "Forecast"                                  │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌─ Scenario Parameters ─────────────────────┐      │
│  │  Traffic Change  [────●────]  +10%        │      │  ← 4-col sliders
│  │  Cost Change     [──●──────]  -5%         │      │
│  │  RPM Change      [────────●]  +20%        │      │
│  │  Affiliate Change[───●─────]  +5%         │      │
│  └───────────────────────────────────────────┘      │
│                                                     │
│  [Proj Ad Rev] [Proj Affiliate] [Proj Total]        │  ← 3-col KPIs with delta
│  [Proj Costs]  [Proj Profit]    [Proj ROMI]         │  ← 3-col KPIs
│                                                     │
│  [Current vs Projected BarChart]                    │
│                                                     │
└─────────────────────────────────────────────────────┘
```

Sliders: `input[type=range]` min=-50 max=50. All calculations are client-side.

### 9. Conclusions (`/conclusions`)

```
┌─────────────────────────────────────────────────────┐
│ Topbar: "Conclusions"                               │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ● Winners (emerald)                                │
│  [InsightCard] [InsightCard]                        │
│                                                     │
│  ● Losers (red)                                     │
│  [InsightCard] [InsightCard]                        │
│                                                     │
│  ● Risks (amber)                                    │
│  [InsightCard] [InsightCard]                        │
│                                                     │
│  ● Opportunities (blue)                             │
│  [InsightCard] [InsightCard]                        │
│                                                     │
└─────────────────────────────────────────────────────┘
```

4 sections, each with a colored dot header and 2-column InsightCard grid. Sections with no items are hidden.

### 10. Analysis (`/analysis`)

```
┌─────────────────────────────────────────────────────┐
│ Topbar: "Analysis"                                  │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌─ Executive Summary ────────── [Run Analysis] ┐   │
│  │  🧠  AI-generated text paragraphs             │   │
│  │      (indigo accent-light background)         │   │
│  └───────────────────────────────────────────────┘   │
│                                                     │
│  ┌─ Top Risks ─────────┐  ┌─ Top Opportunities ─┐  │  ← 2-col grid
│  │  1. Risk card (red)  │  │  1. Opp card (green)│  │
│  │  2. Risk card        │  │  2. Opp card        │  │
│  └──────────────────────┘  └─────────────────────┘  │
│                                                     │
└─────────────────────────────────────────────────────┘
```

Risks: red-50 bg, red-800 text. Opportunities: emerald-50 bg, emerald-800 text. "Run Analysis" button triggers AI re-analysis with loading spinner.

### 11. Settings (`/settings`)

Tabbed interface with 6 tabs:

| Tab | Content |
|---|---|
| **API Config** | AdSpyglass URL + API Key fields |
| **Google Sheets** | Costs Sheet ID + Affiliate Sheet ID fields |
| **Sync** | Status rows for each data source (AdSpyglass, Sheets) |
| **Thresholds** | Number inputs: traffic drop %, revenue change %, cost spike %, fill rate drop % |
| **Health Score** | Range sliders (0-30%) for 8 weight components |
| **AI Settings** | Anthropic API Key field |

Each tab wraps its content in a `ChartCard`. All inputs use the shared `Input`/`Label` components. Save buttons per section.

---

## UI Components (Primitives)

### Button (`src/components/ui/button.tsx`)

CVA-based button with variants:

| Variant | Style |
|---|---|
| `default` | Indigo bg, white text |
| `secondary` | White bg, border, accent-light hover |
| `destructive` | Red bg, white text |
| `ghost` | Transparent, accent-light hover |
| `outline` | Border, transparent bg |
| `link` | Underline on hover |

Sizes: `default` (h-9), `sm` (h-8), `lg` (h-11), `icon` (h-9 w-9).

### Tabs (`src/components/ui/tabs.tsx`)

Radix UI based. Underline style — active tab has `border-b-2 border-accent` + accent text color. Inactive tabs are muted with hover-to-primary transition.

### Input / Label / Select

Standard form primitives with border, rounded-md, focus ring in accent color.

---

## Empty States

All data pages display a consistent empty state when no data is available:

```
┌─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐
│                                       │
│     No data available yet             │    ← text-sm, muted
│     Data will appear after syncing    │    ← text-xs, muted
│     with AdSpyglass                   │
│                                       │
└─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘
```

Style: `rounded-lg`, `border-dashed border-[var(--color-border)]`, `py-16`, centered text.

---

## Scrollbar

Custom webkit scrollbar: 6px width, transparent track, `#D4D4D8` thumb with 3px radius, darker on hover.
