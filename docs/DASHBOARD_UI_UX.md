# Dashboard — UI/UX документация

Исчерпывающий гайд по странице `/dashboard`: каждый компонент, его размеры в px, используемые библиотеки, дизайн-токены и архитектура.

---

## Содержание

1. [Стек технологий и библиотеки](#1-стек-технологий-и-библиотеки)
2. [Дизайн-система и токены](#2-дизайн-система-и-токены)
3. [Общая структура страницы](#3-общая-структура-страницы)
4. [TopContextBar](#4-topcontextbar)
5. [KPI-карточки (Primary / Secondary)](#5-kpi-карточки)
6. [DeltaBadge](#6-deltabadge)
7. [SparkAreaChart (спарклайны в KPI)](#7-sparkareachart)
8. [SignalStrip (Network Signals)](#8-signalstrip)
9. [BundleCard](#9-bundlecard)
10. [HealthBadge](#10-healthbadge)
11. [ChartCard](#11-chartcard)
12. [AreaChart (Tremor)](#12-areachart-tremor)
13. [Trend Charts (Revenue / Traffic / Profit)](#13-trend-charts)
14. [InsightCard](#14-insightcard)
15. [Loading Skeletons](#15-loading-skeletons)
16. [Анимации (Framer Motion)](#16-анимации)
17. [Empty State / Error State](#17-empty-state--error-state)
18. [Адаптивность (Responsive)](#18-адаптивность)
19. [Дерево компонентов](#19-дерево-компонентов)

---

## 1. Стек технологий и библиотеки

| Библиотека | Версия | Роль на Dashboard |
|---|---|---|
| **Next.js 16** | 16.1.6 | App Router, SSR, API Routes |
| **React 19** | 19.x | Компонентный фреймворк |
| **Tailwind CSS v4** | 4.x | Utility-first стили, `@theme` блок для дизайн-токенов |
| **Mantine** | 8.3.x | `Badge` (coverage indicator), `Tooltip` (HealthBadge) |
| **Recharts** | 2.x | Все графики: `AreaChart`, `Area`, `XAxis`, `YAxis`, `CartesianGrid`, `Tooltip`, `ResponsiveContainer` |
| **Framer Motion** | 11.x | Анимации появления (`fadeInUp`, `staggerContainer`) |
| **@remixicon/react** | 4.9.x | Иконки: `RiArrowRightSLine`, `RiRefreshLine`, `RiDatabase2Line`, `RiErrorWarningLine`, `RiArrowUpSFill`, `RiArrowDownSFill`, `RiSubtractLine`, `RiArrowDownLine`, `RiAlertLine`, `RiTrophyLine`, `RiArrowUpLine`, `RiLightbulbLine`, `RiArrowRightLine`, `RiArrowLeftSLine` |
| **@tanstack/react-query** | 5.x | Data fetching, caching (`useDashboard` hook) |
| **clsx + tailwind-merge** | — | Утилита `cn()` для условных классов |
| **date-fns** | — | Работа с датами (серверная часть) |
| **Lucide React** | — | Иконки в TopContextBar (`RefreshCw`, `Download`, `GitCompare`) |

### Файловая структура Dashboard

```
src/app/(platform)/dashboard/page.tsx          ← Главная страница
src/components/layout/topbar.tsx               ← TopContextBar
src/components/shared/kpi-card.tsx             ← KPICard
src/components/shared/delta-indicator.tsx       ← DeltaBadge
src/components/shared/signal-strip.tsx         ← SignalStrip + SignalCard
src/components/shared/insight-card.tsx         ← InsightCard
src/components/shared/chart-card.tsx           ← ChartCard
src/components/shared/health-badge.tsx         ← HealthBadge
src/components/shared/loading-skeleton.tsx     ← Все скелетоны
src/components/tremor/AreaChart.tsx            ← Основной AreaChart (636 строк)
src/components/tremor/SparkAreaChart.tsx        ← SparkAreaChart для KPI
src/components/features/charts/revenue-trend-chart.tsx
src/components/features/charts/traffic-trend-chart.tsx
src/components/features/charts/profit-trend-chart.tsx
src/lib/chartUtils.ts                         ← Цвета и утилиты графиков
src/lib/motion.ts                             ← Анимационные варианты
src/lib/utils.ts                              ← cn(), formatCurrency, formatCompact и др.
src/hooks/use-api.ts                          ← useDashboard() hook
src/hooks/use-period.ts                       ← usePeriod() hook
src/styles/globals.css                        ← Дизайн-токены и глобальные стили
```

---

## 2. Дизайн-система и токены

Все токены определены в `src/styles/globals.css` через директиву `@theme` (Tailwind CSS v4).

### 2.1 Цветовая палитра

#### Фоны и поверхности

| Токен | Значение | Применение |
|---|---|---|
| `--color-app-bg` | `#F4F6FB` | Фон всей страницы (`body`, `min-h-screen`) |
| `--color-surface` | `#FFFFFF` | Фон карточек (KPI, Chart, Signal, Bundle, Insight) |
| `--color-surface-secondary` | `#F9FAFB` | Вторичные поверхности, shimmer-анимация |
| `--color-surface-hover` | `#F1F5F9` | Hover-состояния поверхностей |

#### Границы

| Токен | Значение | Применение |
|---|---|---|
| `--color-border-subtle` | `#E5E7EB` | Основная граница всех карточек (`border`) |
| `--color-border-default` | `#D7DCE5` | Граница пустого состояния (`border-dashed`) |
| `--color-border-strong` | `#C6CDD8` | Усиленная граница |

#### Текст

| Токен | Значение | Применение |
|---|---|---|
| `--color-text-primary` | `#111827` | Заголовки, значения KPI, названия бандлов |
| `--color-text-secondary` | `#4B5563` | Описания в InsightCard |
| `--color-text-muted` | `#6B7280` | Лейблы KPI, подписи, метки секций |
| `--color-text-disabled` | `#9CA3AF` | Шевроны, неактивные элементы |

#### Primary accent (Indigo)

| Токен | Значение |
|---|---|
| `--color-primary-50` | `#EEF2FF` |
| `--color-primary-100` | `#E0E7FF` |
| `--color-primary-200` | `#C7D2FE` |
| `--color-primary-300` | `#A5B4FC` |
| `--color-primary-400` | `#818CF8` |
| `--color-primary-500` | `#6366F1` |
| `--color-primary-600` | `#4F46E5` |
| `--color-primary-700` | `#4338CA` |

#### Semantic colors

| Группа | bg | main | dark |
|---|---|---|---|
| **Success** | `#ECFDF3` | `#12B76A` | `#039855` |
| **Warning** | `#FFFAEB` | `#F79009` | `#DC6803` |
| **Danger** | `#FEF3F2` | `#F04438` | `#D92D20` |

#### Bundle accents

| Bundle | Токен | Цвет |
|---|---|---|
| JAV | `--color-bundle-jav` | `#EF4444` (red) |
| Gays | `--color-bundle-gays` | `#3B82F6` (blue) |
| Hentai | `--color-bundle-hentai` | `#8B5CF6` (purple) |
| Trans | `--color-bundle-trans` | `#EC4899` (pink) |

### 2.2 Скругления (border-radius)

| Токен | Значение | Применение |
|---|---|---|
| `--radius-sm` | `6px` | Мелкие элементы |
| `--radius-md` | `8px` | Средние элементы |
| `--radius-lg` | `12px` | Большие элементы |
| `--radius-card` | `16px` | **ВСЕ карточки** на Dashboard (KPI, Chart, Signal, Bundle, Insight) |
| `--radius-control` | `10px` | Иконки-контейнеры в SignalCard/InsightCard, кнопки |
| `--radius-pill` | `999px` | Pill-бейджи (DeltaBadge, HealthBadge) |

### 2.3 Тени

| Токен | Значение | Применение |
|---|---|---|
| `--shadow-xs` | `0 1px 2px rgba(16,24,40,0.04)` | Минимальная тень |
| `--shadow-card` | `0 1px 3px rgba(16,24,40,0.06), 0 1px 2px rgba(16,24,40,0.04)` | Дефолтная тень всех карточек |
| `--shadow-elevated` | `0 4px 10px rgba(16,24,40,0.08), 0 2px 4px rgba(16,24,40,0.04)` | Тень при hover на карточках |
| `--shadow-modal` | `0 8px 24px rgba(16,24,40,0.12), 0 4px 8px rgba(16,24,40,0.06)` | Модальные окна |
| `--shadow-glow-primary` | `0 0 0 3px rgba(99,102,241,0.12)` | Focus-ring glow |

### 2.4 Анимации (transitions)

| Токен | Значение | Применение |
|---|---|---|
| `--ease-out-expo` | `cubic-bezier(0.16, 1, 0.3, 1)` | Easing всех transition-эффектов на карточках |
| `--duration-fast` | `150ms` | Быстрые переходы |
| `--duration-normal` | `200ms` | Стандартный hover-переход карточек |
| `--duration-slow` | `300ms` | Медленные переходы |

### 2.5 Типографика

| Элемент | CSS | Размер |
|---|---|---|
| **Шрифт** | `'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif` | — |
| **Font features** | `font-feature-settings: 'tnum' on, 'lnum' on` | Tabular lining numerals |
| **Antialiasing** | `-webkit-font-smoothing: antialiased` | — |
| `.text-page-title` | `font-size: 32px; line-height: 38px; font-weight: 700` | Заголовок страницы |
| `.text-section-title` | `font-size: 20px; line-height: 28px; font-weight: 600` | Заголовок секции |
| `.text-card-title` | `font-size: 12px; line-height: 16px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase` | «BUNDLES», «TRENDS», «INSIGHTS», «NETWORK SIGNALS» |
| `.text-kpi-value` | `font-size: 38px; line-height: 44px; font-weight: 700; tabular-nums` | Большие KPI значения (не используется на Dashboard, см. KPICard) |
| `.text-body` | `font-size: 14px; line-height: 20px; font-weight: 500` | Текст тела |
| `.text-meta` | `font-size: 12px; line-height: 16px; font-weight: 500` | Мета-информация |

### 2.6 Глобальные утилиты

| Класс | Описание |
|---|---|
| `.tabular-nums` | `font-variant-numeric: tabular-nums` |
| `.animate-shimmer` | Скелетон-анимация: `linear-gradient(90deg, border-subtle 25%, surface-secondary 50%, border-subtle 75%)`, `background-size: 200% 100%`, `animation: shimmer 1.5s ease-in-out infinite` |
| `.focus-ring` | `outline: none` + `:focus-visible { box-shadow: 0 0 0 2px surface, 0 0 0 4px primary-500 }` |
| `.hide-scrollbar` | Скрытие scrollbar (webkit + ms + firefox) |
| `::-webkit-scrollbar` | `width: 6px; height: 6px`, thumb: `#D4D4D8`, thumb:hover: `#A1A1AA`, `border-radius: 3px` |

---

## 3. Общая структура страницы

**Файл**: `src/app/(platform)/dashboard/page.tsx`

```
┌──────────────────────────────────────────────────────────────────┐
│ DashboardPage                                                     │
│ div.min-h-screen.bg-[var(--color-app-bg)]                        │
│                                                                   │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ TopContextBar                                                 │ │
│ │ title="Dashboard" subtitle="Network overview and key metrics" │ │
│ │ showExport showCompare                                        │ │
│ └──────────────────────────────────────────────────────────────┘ │
│                                                                   │
│ <Suspense fallback={<DashboardSkeleton />}>                      │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ DashboardContent                                              │ │
│ │ motion.div (staggerContainer)                                 │ │
│ │ div.mx-auto.max-w-[1440px].px-4.py-6.pb-16.sm:px-6          │ │
│ │ div.flex.flex-col.gap-6                                       │ │
│ │                                                               │ │
│ │ ┌─── Coverage Badge (conditional) ────────────────────────┐  │ │
│ │ │ Mantine Badge variant="light" color="indigo" size="lg"  │  │ │
│ │ └─────────────────────────────────────────────────────────┘  │ │
│ │                                                               │ │
│ │ ┌─── Primary KPIs (5 cols) ───────────────────────────────┐  │ │
│ │ │ [Visitors] [Ad Revenue] [Total Revenue] [Profit] [ROMI] │  │ │
│ │ └─────────────────────────────────────────────────────────┘  │ │
│ │                                                               │ │
│ │ ┌─── Secondary KPIs (4 cols) ─────────────────────────────┐  │ │
│ │ │ [Ad Requests] [Affiliate Revenue] [Costs] [RPM]         │  │ │
│ │ └─────────────────────────────────────────────────────────┘  │ │
│ │                                                               │ │
│ │ ┌─── Network Signals (3 cols) ────────────────────────────┐  │ │
│ │ │ [Biggest Drop] [Main Risk] [Top Performer]              │  │ │
│ │ └─────────────────────────────────────────────────────────┘  │ │
│ │                                                               │ │
│ │ ┌─── Bundles (horizontal scroll) ─────────────────────────┐  │ │
│ │ │ [JAV] [Gays] [Hentai] [Trans]                           │  │ │
│ │ └─────────────────────────────────────────────────────────┘  │ │
│ │                                                               │ │
│ │ ┌─── Trends (3 cols) ────────────────────────────────────┐   │ │
│ │ │ [Revenue] [Traffic] [Profit]                            │   │ │
│ │ └─────────────────────────────────────────────────────────┘  │ │
│ │                                                               │ │
│ │ ┌─── Insights (2 cols) ──────────────────────────────────┐   │ │
│ │ │ [InsightCard] [InsightCard]                             │   │ │
│ │ │ [InsightCard] [InsightCard]                             │   │ │
│ │ └─────────────────────────────────────────────────────────┘  │ │
│ └──────────────────────────────────────────────────────────────┘ │
│ </Suspense>                                                      │
└──────────────────────────────────────────────────────────────────┘
```

### Контейнер страницы

| Свойство | Значение | Описание |
|---|---|---|
| `max-width` | `1440px` | Максимальная ширина контента |
| `padding-x` | `16px` (mobile) / `24px` (sm+) | Горизонтальные отступы |
| `padding-y` | `24px` сверху, `64px` снизу | Вертикальные отступы |
| `gap` | `24px` (`gap-6`) | Расстояние между секциями |
| `overflow` | `hidden` | Предотвращение горизонтального скролла |

---

## 4. TopContextBar

**Файл**: `src/components/layout/topbar.tsx`

Верхняя панель с заголовком, периодом и действиями.

| Элемент | Описание |
|---|---|
| `title` | `"Dashboard"` |
| `subtitle` | `"Network overview and key metrics"` |
| `showExport` | Показывает кнопку экспорта |
| `showCompare` | Показывает переключатель режима сравнения |
| **PeriodSelector** | Выбор периода (today / yesterday / 7d / 30d / 90d / custom) |
| **SyncStatusBadge** | Mantine Badge — `"Synced Xm ago"`, dot=green, `height: 28px`, `fontSize: 12px`, border: `#E7EAF0` |

---

## 5. KPI-карточки

**Файл**: `src/components/shared/kpi-card.tsx`

### Разделение на группы

#### Primary KPIs — 5 колонок

```
grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5
```

| # | Метрика | format | Цвет спарклайна |
|---|---------|--------|----------------|
| 1 | Visitors | `number` | `blue` |
| 2 | Ad Revenue | `currency` | `violet` |
| 3 | Total Revenue | `currency` | `blue` |
| 4 | Profit | `currency` | `emerald` |
| 5 | ROMI | `percent` | `amber` |

#### Secondary KPIs — 4 колонки

```
grid grid-cols-2 gap-4 lg:grid-cols-4
```

| # | Метрика | format | Цвет спарклайна |
|---|---------|--------|----------------|
| 1 | Ad Requests | `number` | `cyan` |
| 2 | Affiliate Revenue | `currency` | `pink` |
| 3 | Costs | `currency` | `amber` |
| 4 | RPM | `currency` | `cyan` |

### Анатомия KPICard

```
┌─────────────────────────────────────────────┐
│ ┌─header─────────────────────────────────┐  │
│ │  AD REVENUE                [+12.3%] ▲  │  │  ← 12px uppercase semibold + DeltaBadge
│ └────────────────────────────────────────┘  │
│                                              │
│  $12,450.00                                  │  ← 28px/30px bold tabular-nums
│                                              │
│  vs prev period                              │  ← 12px medium muted
│                                              │
│  ┌─sparkline────────────────────────────┐   │
│  │  ▁▂▃▅▇█▆▅▃▂▁▃▅                      │   │  ← h-10 (40px) SparkAreaChart
│  └──────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

### Размеры и стили

| Свойство | Значение |
|---|---|
| **padding** | `16px` (`p-4`) |
| **border-radius** | `var(--radius-card)` = `16px` |
| **border** | `1px solid var(--color-border-subtle)` = `#E5E7EB` |
| **background** | `var(--color-surface)` = `#FFFFFF` |
| **shadow** | `var(--shadow-card)` по умолчанию |
| **shadow:hover** | `var(--shadow-elevated)` |
| **transition** | `all 200ms cubic-bezier(0.16, 1, 0.3, 1)` |
| **hover transform** | `translateY(-2px)` (`-translate-y-0.5`) |

#### Лейбл метрики

| Свойство | Значение |
|---|---|
| font-size | `12px` (`text-xs`) |
| font-weight | `600` (`font-semibold`) |
| text-transform | `uppercase` |
| letter-spacing | `0.04em` (`tracking-[0.04em]`) |
| color | `var(--color-text-muted)` = `#6B7280` |

#### Значение метрики

| Свойство | Значение |
|---|---|
| font-size | `28px` (mobile) / `30px` (`sm:text-3xl`) |
| line-height | `tight` (~1.25) |
| font-weight | `700` (`font-bold`) |
| letter-spacing | `tight` (~-0.025em) |
| color | `var(--color-text-primary)` = `#111827` |
| font-variant-numeric | `tabular-nums` |
| margin-top | `8px` (`mt-2`) |

#### Текст сравнения

| Свойство | Значение |
|---|---|
| font-size | `12px` (`text-xs`) |
| font-weight | `500` (`font-medium`) |
| color | `var(--color-text-muted)` = `#6B7280` |
| margin-top | `4px` (`mt-1`) |
| текст | `"vs prev period"` |

#### Спарклайн контейнер

| Свойство | Значение |
|---|---|
| height | `40px` (`h-10`) |
| width | `100%` (`w-full`) |
| margin-top | `12px` (`mt-3`) |

### Форматирование значений

| format | Функция | Пример |
|---|---|---|
| `currency` | `formatCurrency(value)` → `Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', min/maxFractionDigits: 2 })` | `$12,450.00` |
| `number` | `formatNumber(value)` → `Intl.NumberFormat('en-US')` | `123,456` |
| `percent` | `${value.toFixed(1)}%` | `156.3%` |
| `compact` | `formatCompact(value)` → `≥1M: "1.2M"`, `≥1K: "12.5K"`, else `"999"` | `12.5K` |
| `score` | `value.toString()` | `85` |

---

## 6. DeltaBadge

**Файл**: `src/components/shared/delta-indicator.tsx`

Pill-shaped индикатор изменения (дельты) в процентах.

### Анатомия

```
┌──────────┐
│ ▲ +12.3% │  ← pill-badge с иконкой направления
└──────────┘
```

### Размеры

| Размер | padding | font-size | icon size |
|---|---|---|---|
| `sm` | `px-2 py-0.5` (8px/2px) | `12px` (`text-xs`) | `14px` (`size-3.5`) |
| `md` | `px-2.5 py-1` (10px/4px) | `14px` (`text-sm`) | `16px` (`size-4`) |

### Цветовые состояния

| Состояние | background | text | Иконка |
|---|---|---|---|
| **Positive** (>0) | `bg-emerald-50` | `text-emerald-700` | `RiArrowUpSFill` |
| **Negative** (<0) | `bg-red-50` | `text-red-700` | `RiArrowDownSFill` |
| **Neutral** (=0) | `bg-gray-100` | `text-gray-600` | *(нет иконки)* |
| **Invalid** (NaN/Inf) | `bg-gray-100` | `text-gray-500` | `RiSubtractLine` + `—` |

### Стили

| Свойство | Значение |
|---|---|
| border-radius | `9999px` (`rounded-full`) |
| font-weight | `600` (`font-semibold`) |
| font-variant-numeric | `tabular-nums` |
| display | `inline-flex items-center gap-0.5` (gap 2px) |

### Формат вывода

```typescript
formatPercent(value) → `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`
// +12.3%, -5.7%, +0.0%
```

---

## 7. SparkAreaChart

**Файл**: `src/components/tremor/SparkAreaChart.tsx`

Миниатюрный area-график, используемый внутри KPICard.

### Параметры на Dashboard

| Параметр | Значение |
|---|---|
| `data` | Последние 14 точек из `trend[]` (обрезается: `trend.slice(-14)`) |
| `index` | `"idx"` (числовой индекс) |
| `categories` | `['value']` |
| `colors` | По метрике: blue/violet/emerald/amber/cyan/pink |
| `fill` | `"gradient"` |
| `className` | `"h-10 w-full"` (40px × 100%) |

### Размеры

| Свойство | Значение |
|---|---|
| height | `40px` (`h-10`), по умолчанию `48px` (`h-12`) |
| width | `100%` |
| margin (recharts) | `{ bottom: 1, left: 1, right: 1, top: 1 }` |
| strokeWidth | `2px` |
| strokeLinejoin | `round` |
| strokeLinecap | `round` |

### Gradient fill

```
offset="5%"  → stopOpacity: 0.4
offset="95%" → stopOpacity: 0
```

### Цвета по метрике (METRIC_CHART_COLOR)

| Метрика | Цвет Tremor | Tailwind class |
|---|---|---|
| Visitors | `blue` | `stroke-blue-500`, `text-blue-500` |
| Ad Revenue | `violet` | `stroke-violet-500`, `text-violet-500` |
| Total Revenue | `blue` | `stroke-blue-500` |
| Profit | `emerald` | `stroke-emerald-500` |
| ROMI | `amber` | `stroke-amber-500` |
| Ad Requests | `cyan` | `stroke-cyan-500` |
| Affiliate Revenue | `pink` | `stroke-pink-500` |
| Costs | `amber` | `stroke-amber-500` |
| RPM | `cyan` | `stroke-cyan-500` |

### Tooltip

Минимальный tooltip при hover:
- `rounded-md`, border `gray-200`, bg `white`
- padding: `px-2.5 py-1.5` (10px/6px)
- font: `12px semibold tabular-nums`, color `gray-900`
- shadow: `shadow-md`

---

## 8. SignalStrip

**Файл**: `src/components/shared/signal-strip.tsx`

Секция «Network Signals» — до 3 карточек предупреждений.

### Layout

```
h2.text-card-title.mb-3    ← "NETWORK SIGNALS" (12px uppercase semibold)
grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3
```

### Типы сигналов

| Тип | Иконка | Лейбл | Цвет текста | Фон иконки | Border-left |
|---|---|---|---|---|---|
| `drop` | `RiArrowDownLine` | `Biggest Drop` | `var(--color-danger)` = `#F04438` | `var(--color-danger-bg)` = `#FEF3F2` | `var(--color-danger)` |
| `risk` | `RiAlertLine` | `Main Risk` | `var(--color-warning)` = `#F79009` | `var(--color-warning-bg)` = `#FFFAEB` | `var(--color-warning)` |
| `winner` | `RiTrophyLine` | `Top Performer` | `var(--color-primary-500)` = `#6366F1` | `var(--color-primary-50)` = `#EEF2FF` | `var(--color-primary-500)` |

### Анатомия SignalCard

```
┌───┬────────────────────────────────────────────────┐
│ ▌ │ ┌──────┐                                        │
│ ▌ │ │ icon │  BIGGEST DROP                          │  ← 11px uppercase bold
│ ▌ │ │ 18px │  GayXHub   [-12.3%]                   │  ← 14px semibold + DeltaBadge
│ ▌ │ │ 36×36│  Revenue dropped $1,234 vs prev period │  ← 12px medium muted (line-clamp-2)
│ ▌ │ └──────┘                                        │
└───┴────────────────────────────────────────────────┘
  3px                    padding: 16px
```

### Размеры SignalCard

| Свойство | Значение |
|---|---|
| padding | `16px` (`p-4`) |
| border-radius | `var(--radius-card)` = `16px` |
| border | `1px solid var(--color-border-subtle)` |
| border-left | `3px` solid (цвет по типу сигнала) |
| shadow | `var(--shadow-card)` → `var(--shadow-elevated)` on hover |
| transition | `all 200ms ease-out-expo` |
| hover | `translateY(-2px)` |
| **icon container** | `36×36px` (`h-9 w-9`), `border-radius: var(--radius-control)` = `10px` |
| **icon** | `18×18px` (`size-[18px]`) |
| **label** | `11px` (`text-[11px]`), `font-weight: 700`, `uppercase`, `tracking-wider` |
| **entity name** | `14px` (`text-sm`), `font-weight: 600`, truncate |
| **reason text** | `12px` (`text-xs`), `font-weight: 500`, `line-clamp-2` |
| gap (icon → content) | `12px` (`gap-3`) |
| gap (label → entity) | `6px` (`mt-1.5`) |
| gap (entity → reason) | `6px` (`mt-1.5`) |

### Логика вычисления сигналов

1. **Biggest Drop**: Бандл с наименьшей `delta` (< 0). `reason`: `"Revenue dropped ${абсолютное_изменение} vs previous period"`
2. **Main Risk**: Первый insight с `type === 'risk'` и `severity` high/critical. Fallback: бандл с наихудшим `healthScore`
3. **Top Performer**: Бандл с наибольшим `romi`. `reason`: `"Best ROI with ${profit} profit"`

---

## 9. BundleCard

**Файл**: `src/app/(platform)/dashboard/page.tsx` (inline компонент)

### Layout контейнер

```
h2.text-card-title.mb-3    ← "BUNDLES"
div.flex.gap-4.overflow-x-auto.pb-1.hide-scrollbar    ← горизонтальный скролл
```

### Анатомия

```
┌─────────────────────────────────────────────────┐
│▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀│ ← accent bar: h-[3px]
│                                                  │
│  ● JAV                   [85/100] [+12.3%] ▶    │ ← header: dot + name + HealthBadge + DeltaBadge + chevron
│                                                  │
│  AD REQUESTS    REVENUE                          │ ← 2×2 metrics grid
│  12.5K          $1,234.00                        │
│                                                  │
│  PROFIT         ROMI                             │
│  $890.00        156.3%                           │
│  ──────────────────────────────────────────────  │ ← border-t divider
│  5 sites                        [+12.3%]         │ ← footer
│                                                  │
└─────────────────────────────────────────────────┘
```

### Размеры

| Свойство | Значение |
|---|---|
| `min-width` | `260px` (mobile) / `280px` (sm+) |
| `flex` | `none` (не растягивается) |
| padding | `16px` (`p-4`) |
| border-radius | `var(--radius-card)` = `16px` |
| accent bar height | `3px` |
| **color dot** | `10×10px` (`h-2.5 w-2.5 rounded-full`) |
| **bundle name** | `14px semibold` (`text-sm font-semibold`) |
| **metric label** | `11px semibold uppercase tracking-wider`, color: `--color-text-muted` |
| **metric value** | `18px bold tabular-nums` (`text-lg font-bold`) |
| **grid** | `grid-cols-2 gap-x-4 gap-y-3` (16px × 12px) |
| **footer divider** | `border-t border-[--color-border-subtle]`, margin-top: `12px`, padding-top: `12px` |
| **footer text** | `12px medium muted` (`text-xs font-medium`) |
| **chevron icon** | `16×16px` (`size-4`), color: `--color-text-disabled` |

### Цветовое кодирование значений

| Условие | Цвет |
|---|---|
| `profit > 0` | `var(--color-success-dark)` = `#039855` |
| `profit <= 0` | `var(--color-danger-dark)` = `#D92D20` |
| Остальные метрики | `var(--color-text-primary)` = `#111827` |

### Взаимодействие

- Вся карточка — `<Link href={/bundles/${slug}}>` (клик → переход на детальную страницу бандла)
- Hover: `shadow-card` → `shadow-elevated`, `translateY(-2px)`
- `text-decoration: none`, `color: inherit`
- `focus-ring` при фокусе клавиатурой

---

## 10. HealthBadge

**Файл**: `src/components/shared/health-badge.tsx`

Использует **Mantine Badge** и **Mantine Tooltip**.

### Визуал

```
[85/100]     ← pill badge
```

### Размеры

| Размер | Mantine size | padding | font |
|---|---|---|---|
| `sm` | `xs` | авто | авто |
| `md` | `sm` | авто | авто |

### Стили

| Свойство | Значение |
|---|---|
| variant | `light` |
| radius | `xl` (pill) |
| textTransform | `none` |
| fontWeight | `600` |
| cursor | `default` |
| fontVariantNumeric | `tabular-nums` |

### Цвета по статусу

| Статус | Условие | Mantine color |
|---|---|---|
| `healthy` | score ≥ 80 | `green` |
| `warning` | score 60-79 | `yellow` |
| `critical` | score < 60 | `red` |

### Tooltip

`"Health Score: 85/100 (healthy)"` — Mantine Tooltip с `withArrow`.

---

## 11. ChartCard

**Файл**: `src/components/shared/chart-card.tsx`

Контейнер-обёртка для каждого графика.

### Анатомия

```
┌──────────────────────────────────────────────┐
│  ┌─header───────────────────────────────┐    │
│  │  Revenue              [DeltaBadge]    │    │  ← 14px semibold + optional delta
│  │  30 days · vs prev period             │    │  ← 12px medium muted
│  └───────────────────────────────────────┘    │
│                                               │
│  ┌─body──────────────────────────────────┐   │
│  │                                        │   │
│  │  [AreaChart h-72 (288px)]             │   │
│  │                                        │   │
│  └────────────────────────────────────────┘   │
└──────────────────────────────────────────────┘
```

### Размеры

| Свойство | Значение |
|---|---|
| border-radius | `var(--radius-card)` = `16px` |
| border | `1px solid var(--color-border-subtle)` |
| shadow | `var(--shadow-card)` → `var(--shadow-elevated)` on hover |
| transition | `shadow 200ms ease-[--duration-normal]` |
| **header padding** | `px-5 pt-5 pb-3` (20px top/sides, 12px bottom) |
| **body padding** | `px-5 pb-5` (20px sides/bottom) |
| **title** | `14px semibold` (`text-sm font-semibold`), color: `--color-text-primary` |
| **description** | `12px medium` (`text-xs font-medium`), color: `--color-text-muted`, margin-top: `4px` |

### Описание на Dashboard

Формат: `"{trend.length} days · {compareLabel}"`, где `compareLabel`:
- `prev_7d` → `"vs 7d ago"`
- `prev_day` → `"vs yesterday"`
- default → `"vs prev period"`

---

## 12. AreaChart (Tremor)

**Файл**: `src/components/tremor/AreaChart.tsx`

Полнофункциональный area-chart, построенный поверх Recharts. **636 строк** кода.

### Архитектура

```
AreaChart (Tremor wrapper)
├── ResponsiveContainer
│   └── RechartsAreaChart
│       ├── CartesianGrid
│       ├── XAxis
│       ├── YAxis
│       ├── Tooltip → ChartTooltip
│       ├── RechartsLegend → Legend → LegendItem[]
│       ├── defs → linearGradient (для каждой category)
│       └── Area (для каждой category)
└── Legend (scrollable, keyboard-navigable)
    ├── LegendItem[]
    └── ScrollButton[] (RiArrowLeftSLine / RiArrowRightSLine)
```

### Размеры по умолчанию

| Свойство | Значение |
|---|---|
| height | `320px` (`h-80`), на Dashboard: `288px` (`h-72`) |
| width | `100%` |
| yAxisWidth | `56px` |
| strokeWidth | `2px` |
| tickGap | `5px` |
| animationDuration | `600ms` |

### Grid

```
CartesianGrid: className="stroke-gray-200 stroke-1", horizontal=true, vertical=false
```

### Оси

| Ось | Стили |
|---|---|
| XAxis | `text-xs fill-gray-500`, tickLine=false, axisLine=false, transform="translate(0, 6)" |
| YAxis | `text-xs fill-gray-500`, tickLine=false, axisLine=false, transform="translate(-3, 0)" |

### Tooltip (ChartTooltip)

```
┌────────────────────────────────────┐
│ 2025-01-15                          │  ← header: 14px medium gray-900
├────────────────────────────────────┤
│ ● adRevenue         $12,450.00     │  ← color dot + name + value
│ ● affiliateRevenue  $2,340.00      │
└────────────────────────────────────┘
```

| Свойство | Значение |
|---|---|
| border-radius | `8px` (`rounded-lg`) |
| border | `1px solid gray-200` |
| background | `white` |
| shadow | `shadow-lg` |
| font-size | `14px` (`text-sm`) |
| header padding | `px-4 py-2` (16px/8px) |
| header border-bottom | `gray-100` |
| body padding | `px-4 py-2` |
| color dot | `h-[3px] w-3.5 rounded-full` (3px высота, 14px ширина) |

### Legend

| Свойство | Значение |
|---|---|
| layout | горизонтальный `flex`, поддержка slider при overflow |
| item padding | `px-2 py-1` (8px/4px) |
| font-size | `12px` (`text-xs`), color: `gray-700` |
| color indicator | `h-[3px] w-3.5 rounded-full` |
| scroll buttons | `20×20px` (`size-5`), `RiArrowLeftSLine` / `RiArrowRightSLine` |

### Gradient fill

```
gradient mode:
  offset="5%"  → stopOpacity: 0.3 (active) / 0.1 (dimmed)
  offset="95%" → stopOpacity: 0
```

### Dot (active)

```
r=5, fill=category color, stroke=white (stroke-white), className="cursor-pointer" (if onValueChange)
```

---

## 13. Trend Charts

### RevenueTrendChart

**Файл**: `src/components/features/charts/revenue-trend-chart.tsx`

| Параметр | Значение |
|---|---|
| data index | `"date"` |
| categories | `['adRevenue', 'affiliateRevenue']` |
| colors | `['violet', 'fuchsia']` → `stroke-violet-500`, `stroke-fuchsia-500` |
| valueFormatter | `$X.XX` или `$X.XK` (≥1000) |
| height | `288px` (`h-72`) |
| fill | `gradient` |
| showLegend | `true` |
| showGridLines | `true` |
| yAxisWidth | `56px` |

### TrafficTrendChart

**Файл**: `src/components/features/charts/traffic-trend-chart.tsx`

| Параметр | Значение |
|---|---|
| categories | `['hits']` |
| colors | `['cyan']` → `stroke-cyan-500` |
| valueFormatter | `XK` (≥1000) или plain number |

### ProfitTrendChart

**Файл**: `src/components/features/charts/profit-trend-chart.tsx`

| Параметр | Значение |
|---|---|
| categories | `['profit']` |
| colors | `['emerald']` → `stroke-emerald-500` |
| valueFormatter | `$X.XX` или `$X.XK` |
| **autoMinValue** | `true` (Y-axis может уходить в минус) |

### Layout графиков

```
grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3
```

- 1 колонка на мобильном
- 2 колонки на md (768px+)
- 3 колонки на xl (1280px+)

---

## 14. InsightCard

**Файл**: `src/components/shared/insight-card.tsx`

### Layout секции

```
h2.text-card-title.mb-3    ← "INSIGHTS"
grid grid-cols-1 gap-4 md:grid-cols-2
```

### Типы и конфигурация

| Тип | Иконка | Лейбл | Цвет текста | Фон иконки | Border-left |
|---|---|---|---|---|---|
| `winner` | `RiTrophyLine` | `Winner` | `var(--color-success-dark)` | `var(--color-success-bg)` | `var(--color-success)` |
| `loser` | `RiArrowDownLine` | `Declining` | `var(--color-danger-dark)` | `var(--color-danger-bg)` | `var(--color-danger)` |
| `risk` | `RiAlertLine` | `Risk` | `var(--color-warning-dark)` | `var(--color-warning-bg)` | `var(--color-warning)` |
| `opportunity` | `RiArrowUpLine` | `Opportunity` | `var(--color-primary-600)` | `var(--color-primary-50)` | `var(--color-primary-500)` |
| `info` | `RiLightbulbLine` | `Info` | `text-blue-600` | `bg-blue-50` | `border-l-blue-500` |

### Анатомия

```
┌───┬──────────────────────────────────────────────────────┐
│ ▌ │ ┌──────┐                                              │
│ ▌ │ │ icon │  OPPORTUNITY                                 │  ← 11px bold uppercase
│ ▌ │ │ 18px │  Revenue Growth  GayXHub  [+15.2%]          │  ← metric + entity + DeltaBadge
│ ▌ │ │ 36×36│                                              │
│ ▌ │ └──────┘  GayXHub is the fastest growing bundle.     │  ← 13px leading-relaxed
│ ▌ │            Consider allocating more traffic.          │
│ ▌ │                                                       │
│ ▌ │            View GayXHub details →                     │  ← 12px semibold primary-600
│ ▌ │                                                       │            ▶
└───┴──────────────────────────────────────────────────────┘
 3px   16px padding                                     chevron 16×16
```

### Размеры

| Свойство | Значение |
|---|---|
| padding | `16px` (`p-4`) |
| border-radius | `var(--radius-card)` = `16px` |
| border | `1px solid var(--color-border-subtle)` |
| border-left | `3px` (цвет по типу) |
| shadow | `var(--shadow-card)` |
| **icon container** | `36×36px` (`h-9 w-9`), radius: `var(--radius-control)` = `10px` |
| **icon** | `18×18px` (`size-[18px]`) |
| **label** | `11px` (`text-[11px]`), `font-weight: 700`, `uppercase`, `tracking-wider` |
| **metric name** | `14px semibold` (`text-sm font-semibold`) |
| **entity name** | `12px medium muted` (`text-xs font-medium`) |
| **reason text** | `13px` (`text-[13px]`), `leading-relaxed`, color: `--color-text-secondary` |
| **action link** | `12px semibold`, color: `--color-primary-600`, `underline-offset-2`, hover: underline |
| **action icon** | `RiArrowRightLine` `12×12px` (`size-3`) |
| **chevron** | `RiArrowRightSLine` `16×16px` (`size-4`), `--color-text-disabled`, `mt-0.5` |

### Взаимодействие

- Если есть `actionHref` → вся карточка = `<Link>`, hover: `shadow-elevated` + `translateY(-2px)` + `focus-ring`
- Если нет href → обычный `<div>`, без hover-эффекта подъёма

### Логика computeInsights

Функция `computeInsights(bundles, rawInsights)` генерирует до 4 инсайтов:

1. **Opportunity**: Бандл с наибольшим положительным `delta` (рост revenue)
2. **Risk**: Первый `rawInsight` с `type === 'risk'`, отсортированный по severity (critical > high > medium > low)
3. **Loser**: Бандл с наибольшим отрицательным `delta`. Severity: `delta < -20%` → `high`, иначе `medium`
4. **Winner**: Бандл с наибольшим `romi` (>0). Показывает profit и revenue

---

## 15. Loading Skeletons

**Файл**: `src/components/shared/loading-skeleton.tsx`

### Shimmer-базис

```css
.animate-shimmer {
  background: linear-gradient(90deg,
    var(--color-border-subtle) 25%,    /* #E5E7EB */
    var(--color-surface-secondary) 50%, /* #F9FAFB */
    var(--color-border-subtle) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
}
```

### KPICardSkeleton

```
┌──────────────────────────────────┐
│ [▓▓▓ 16×3]       [▓▓▓▓ 14×5]   │  ← label shimmer + delta shimmer (rounded-full)
│ [▓▓▓▓▓▓ 24×7]                   │  ← value shimmer
│ [▓▓▓ 16×3]                      │  ← comparison text shimmer
│ [▓▓▓▓▓▓▓▓▓▓▓▓▓ 100%×10]        │  ← sparkline shimmer
└──────────────────────────────────┘
```

| Элемент | Размеры (w × h px) |
|---|---|
| label | `64×12` (`w-16 h-3`) |
| delta | `56×20` (`w-14 h-5 rounded-full`) |
| value | `96×28` (`w-24 h-7`) |
| comparison | `64×12` (`w-16 h-3`) |
| sparkline | `100%×40` (`w-full h-10`) |

### ChartSkeleton

| Элемент | Размеры |
|---|---|
| header title | `96×16` (`w-24 h-4`) |
| header desc | `80×12` (`w-20 h-3`) |
| chart area | `100%×288` (`w-full h-72 rounded-lg`) |
| header padding | `px-5 pt-5 pb-3` |
| body padding | `px-5 pb-5` |

### SignalCardSkeleton

| Элемент | Размеры |
|---|---|
| icon | `36×36` (`h-9 w-9 rounded-[--radius-control]`) |
| label | `64×12` |
| entity | `112×16` |
| reason | `100%×12` |
| border-left | `3px gray-200` |

### BundleCardSkeleton

| Элемент | Размеры |
|---|---|
| accent bar | `100%×3` |
| color dot | `10×10 rounded-full` |
| name | `64×16` |
| delta | `56×20 rounded-full` |
| metric labels (×4) | `56×10` |
| metric values (×4) | `64×20` |
| footer | `48×12` |
| min-width | `260px` / `280px` (sm+) |

### InsightCardSkeleton

| Элемент | Размеры |
|---|---|
| icon | `36×36` |
| label | `64×12` |
| header | `144×16` |
| reason | `100%×40` |
| action | `112×12` |

---

## 16. Анимации

**Файл**: `src/lib/motion.ts`

### fadeInUp (основная анимация карточек)

```typescript
hidden:  { opacity: 0, y: 10 }   // 10px ниже, прозрачный
visible: { opacity: 1, y: 0 }    // на месте, видимый
  duration: 220ms
  delay: i * 40ms                 // STAGGER_DELAY = 0.04s
  ease: [0.16, 1, 0.3, 1]        // expo-out
```

### staggerContainer

```typescript
visible: { transition: { staggerChildren: 0.04 } }  // 40ms между дочерними элементами
```

### Порядок появления (custom index)

| Секция | Индексы | Задержка первого элемента |
|---|---|---|
| Primary KPIs (5 шт) | `0..4` | `0ms` |
| Secondary KPIs (4 шт) | `5..8` | `200ms` |
| SignalStrip | `9` | `360ms` |
| Bundle cards | `10..13` | `400ms` |
| Chart cards | `14..16` | `560ms` |
| Insight cards | `17..20` | `680ms` |

Общее время анимации появления: ~`800ms` (последний элемент: `20 × 40ms = 800ms` задержка + `220ms` анимация ≈ `1020ms`).

---

## 17. Empty State / Error State

### EmptyState

Показывается когда нет KPI, бандлов и трендов (`!hasKpis && !hasBundles && !hasTrend`).

```
┌─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┐
│                                               │
│         ┌──────┐                              │
│         │  DB  │  ← RiDatabase2Line 24×24px   │
│         │      │    в круге 48×48px            │
│         └──────┘    bg: primary-50             │
│                     icon: primary-500          │
│                                               │
│    No data available yet                      │  ← 16px semibold
│    Data will appear after syncing             │  ← 14px muted
│    with AdSpyglass.                           │
│                                               │
│    ┌──────────────────────┐                   │
│    │ ↻ Go to Settings     │                   │  ← primary button
│    └──────────────────────┘                   │
│                                               │
└─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┘
```

| Свойство | Значение |
|---|---|
| container | `rounded-[--radius-card]`, `border-2 border-dashed border-[--color-border-default]`, `bg-[--color-surface]` |
| padding | `px-6 py-16` (24px × 64px) |
| icon circle | `48×48px`, `rounded-full`, bg: `--color-primary-50` |
| icon | `24×24px`, color: `--color-primary-500` |
| button | `px-4 py-2`, `rounded-[--radius-control]` = `10px`, bg: `--color-primary-500`, `font-semibold`, hover: `--color-primary-600`, `focus-ring`, `shadow-sm` |

### ErrorState

Аналогичная структура, но в красных тонах:

| Элемент | Цвет |
|---|---|
| border | `var(--color-danger)` |
| background | `var(--color-danger-bg)` |
| icon circle bg | `white` |
| icon | `RiErrorWarningLine`, color: `var(--color-danger)` |
| button | bg: `var(--color-danger)`, hover: `var(--color-danger-dark)` |
| action | `window.location.reload()` |

---

## 18. Адаптивность

### Breakpoints (Tailwind defaults)

| Breakpoint | min-width | Применение на Dashboard |
|---|---|---|
| **base** (mobile) | `0px` | 1-2 колонки |
| **sm** | `640px` | `px-6`, KPI 3 cols, Signals 2 cols, BundleCard 280px min-width |
| **md** | `768px` | Charts 2 cols, Insights 2 cols |
| **lg** | `1024px` | Primary KPI 5 cols, Secondary KPI 4 cols |
| **xl** | `1280px` | Charts 3 cols, Signals 3 cols |

### Responsive grid-таблица

| Секция | mobile | sm | md | lg | xl |
|---|---|---|---|---|---|
| Primary KPIs | 2 cols | 3 cols | 3 cols | **5 cols** | 5 cols |
| Secondary KPIs | 2 cols | 2 cols | 2 cols | **4 cols** | 4 cols |
| Network Signals | 1 col | **2 cols** | 2 cols | 2 cols | **3 cols** |
| Bundles | scroll | scroll | scroll | scroll | scroll |
| Trend Charts | 1 col | 1 col | **2 cols** | 2 cols | **3 cols** |
| Insights | 1 col | 1 col | **2 cols** | 2 cols | 2 cols |

---

## 19. Дерево компонентов

```
DashboardPage
├── TopContextBar (title, subtitle, showExport, showCompare)
│   ├── PeriodSelector
│   ├── SyncStatusBadge (Mantine Badge)
│   └── ActionButtons (RefreshCw, Download, GitCompare)
│
└── Suspense (fallback=DashboardSkeleton)
    └── DashboardContent
        └── motion.div (staggerContainer)
            │
            ├── [Coverage] Mantine Badge (conditional)
            │
            ├── [Primary KPIs] grid 5-col
            │   └── KPICard × 5
            │       ├── label (text-xs uppercase)
            │       ├── DeltaBadge (sm)
            │       ├── value (text-[28px])
            │       ├── comparison text
            │       └── SparkAreaChart (h-10, gradient fill)
            │
            ├── [Secondary KPIs] grid 4-col
            │   └── KPICard × 4
            │
            ├── [Network Signals] SignalStrip
            │   └── grid 3-col
            │       └── SignalCard × 3
            │           ├── icon (RiArrowDownLine / RiAlertLine / RiTrophyLine)
            │           ├── label (11px uppercase bold)
            │           ├── entity + DeltaBadge
            │           └── reason (line-clamp-2)
            │
            ├── [Bundles] horizontal scroll
            │   └── BundleCard × N (Link)
            │       ├── accent bar (3px, bundle color)
            │       ├── header: dot + name + HealthBadge + DeltaBadge + chevron
            │       ├── metrics grid 2×2
            │       └── footer: sites count + DeltaBadge
            │
            ├── [Trends] grid 3-col
            │   ├── ChartCard "Revenue"
            │   │   └── RevenueTrendChart → AreaChart (violet + fuchsia)
            │   ├── ChartCard "Traffic"
            │   │   └── TrafficTrendChart → AreaChart (cyan)
            │   └── ChartCard "Profit"
            │       └── ProfitTrendChart → AreaChart (emerald, autoMinValue)
            │
            └── [Insights] grid 2-col
                └── InsightCard × N
                    ├── left border (3px, type color)
                    ├── icon (type-specific, 18px in 36×36 container)
                    ├── label (type name, 11px uppercase)
                    ├── metric + entity + DeltaBadge
                    ├── reason (13px)
                    └── action link + chevron (conditional)
```
