# Dashboard — UI/UX документация (Target State)

Целевое состояние страницы `/dashboard` как продуктового экрана: компоненты, размеры, дизайн-система, иерархия, адаптивность.

---

## Содержание

1. [Стек технологий и библиотеки](#1-стек-технологий-и-библиотеки)
2. [Дизайн-система и токены](#2-дизайн-система-и-токены)
3. [Общая структура страницы](#3-общая-структура-страницы)
4. [TopContextBar](#4-topcontextbar)
5. [DataFreshnessSummary](#5-datafreshnesssummary)
6. [KPI-карточки (Primary / Secondary)](#6-kpi-карточки)
7. [DeltaBadge](#7-deltabadge)
8. [MiniSparkline](#8-minisparkline)
9. [SignalStrip (Network Signals)](#9-signalstrip)
10. [Trend Charts](#10-trend-charts)
11. [BundleSummaryCard](#11-bundlesummarycard)
12. [NetworkHealthCard](#12-networkhealthcard)
13. [ChartCard](#13-chartcard)
14. [AreaChart](#14-areachart)
15. [InsightCard](#15-insightcard)
16. [Loading Skeletons](#16-loading-skeletons)
17. [Анимации](#17-анимации)
18. [Empty State / Error State / Partial State](#18-empty-state--error-state--partial-state)
19. [Адаптивность (Responsive)](#19-адаптивность)
20. [Дерево компонентов](#20-дерево-компонентов)

---

## 1. Стек технологий и библиотеки

### Принцип: один инструмент на задачу

| Слой | Библиотека | Роль | Заметки |
|---|---|---|---|
| **Framework** | Next.js 16 (App Router) | SSR, API Routes, маршрутизация | — |
| **UI Primitives** | Tailwind CSS v4 | Utility-first стили, `@theme` токены | Основа всего visual language |
| **Icons** | Lucide React | Единственная icon-система на Dashboard | Remixicon **не используется** на Dashboard; если встречается — заменять на Lucide |
| **Charts** | Recharts | KPI sparklines, trend area charts | Simple, lightweight; для сложных визуализаций в будущем — ECharts |
| **Animations** | Framer Motion | Stagger появления, page transitions | Минимальные, без bounce/overshoot |
| **Data Fetching** | TanStack React Query | `useDashboard()`, кеширование, refetch | — |
| **Utilities** | clsx + tailwind-merge | `cn()` для условных классов | — |

### Что НЕ является визуальной основой Dashboard

| Библиотека | Статус | Допустимое использование |
|---|---|---|
| **Mantine** | Utility-only | `Badge` (coverage indicator, sync status), `Tooltip` (HealthBadge), `ActionIcon` (toolbar buttons), `Menu` (compare mode). **Mantine не влияет на общий visual language Dashboard.** Все карточки, гриды, типографика — чистый Tailwind. |
| **Remixicon** | Запрещён на Dashboard | Заменяется на Lucide. Один icon language = чище продукт |

### Файловая структура

```
src/app/(platform)/dashboard/page.tsx           ← Главная страница
src/components/layout/topbar.tsx                ← TopContextBar
src/components/shared/data-freshness.tsx        ← DataFreshnessSummary (NEW)
src/components/shared/kpi-card.tsx              ← PrimaryKpiCard / SecondaryKpiCard
src/components/shared/delta-indicator.tsx        ← DeltaBadge
src/components/shared/mini-sparkline.tsx         ← MiniSparkline (REPLACES SparkAreaChart in KPI)
src/components/shared/signal-strip.tsx          ← SignalStrip
src/components/shared/bundle-summary-card.tsx   ← BundleSummaryCard (REPLACES BundleCard)
src/components/shared/network-health-card.tsx   ← NetworkHealthCard (NEW)
src/components/shared/insight-card.tsx          ← InsightCard (WinnerCard, LoserCard, RiskCard, OpportunityCard)
src/components/shared/chart-card.tsx            ← ChartCard
src/components/shared/health-badge.tsx          ← HealthBadge
src/components/shared/source-status-pill.tsx    ← SourceStatusPill (NEW)
src/components/shared/loading-skeleton.tsx      ← Все скелетоны
src/components/features/charts/revenue-trend-chart.tsx
src/components/features/charts/traffic-trend-chart.tsx
src/components/features/charts/profit-trend-chart.tsx
src/lib/chartUtils.ts                          ← Цвета графиков
src/lib/motion.ts                              ← Анимационные варианты
src/lib/utils.ts                               ← cn(), formatCurrency, formatCompact и др.
src/hooks/use-api.ts                           ← useDashboard()
src/hooks/use-period.ts                        ← usePeriod()
src/hooks/use-sync-status.ts                   ← useSyncStatus()
src/styles/globals.css                         ← Дизайн-токены
```

---

## 2. Дизайн-система и токены

Все токены — CSS custom properties в `src/styles/globals.css` через `@theme` (Tailwind v4).

### 2.1 Surfaces

| Токен | Значение | Применение |
|---|---|---|
| `--color-app-bg` | `#F4F6FB` | Фон страницы |
| `--color-surface` | `#FFFFFF` | Фон всех карточек |
| `--color-surface-secondary` | `#F9FAFB` | Вторичные поверхности, shimmer |
| `--color-surface-hover` | `#F1F5F9` | Hover-состояния |

### 2.2 Borders

| Токен | Значение | Применение |
|---|---|---|
| `--color-border-subtle` | `#E5E7EB` | Границы всех карточек |
| `--color-border-default` | `#D7DCE5` | Empty state dashed border |
| `--color-border-strong` | `#C6CDD8` | Усиленные границы |

### 2.3 Text

| Токен | Значение | Применение |
|---|---|---|
| `--color-text-primary` | `#111827` | Заголовки, KPI values, bundle names |
| `--color-text-secondary` | `#4B5563` | Descriptions, reason text |
| `--color-text-muted` | `#6B7280` | Labels, captions, section titles |
| `--color-text-disabled` | `#9CA3AF` | Chevrons, inactive elements |

### 2.4 Primary Accent (Indigo)

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

### 2.5 Semantic Business States

#### General status

| Группа | bg | main | dark |
|---|---|---|---|
| **Success** | `#ECFDF3` | `#12B76A` | `#039855` |
| **Warning** | `#FFFAEB` | `#F79009` | `#DC6803` |
| **Danger** | `#FEF3F2` | `#F04438` | `#D92D20` |

#### Health (отдельная группа, не совпадает с general status)

| Токен | Значение | Условие |
|---|---|---|
| `--color-health-healthy-bg` | `#ECFDF3` | score ≥ 80 |
| `--color-health-healthy-text` | `#039855` | |
| `--color-health-warning-bg` | `#FFFAEB` | score 60-79 |
| `--color-health-warning-text` | `#DC6803` | |
| `--color-health-critical-bg` | `#FEF3F2` | score < 60 |
| `--color-health-critical-text` | `#D92D20` | |

#### Source Freshness (NEW)

| Токен | Значение | Описание |
|---|---|---|
| `--color-source-fresh-bg` | `#ECFDF3` | Данные свежие (< 6h) |
| `--color-source-fresh-text` | `#039855` | |
| `--color-source-partial-bg` | `#FFFAEB` | Частичные данные |
| `--color-source-partial-text` | `#DC6803` | |
| `--color-source-stale-bg` | `#FEF3F2` | Данные устарели (> 24h) |
| `--color-source-stale-text` | `#D92D20` | |
| `--color-source-missing-bg` | `#F3F4F6` | Источник не подключён |
| `--color-source-missing-text` | `#6B7280` | |

### 2.6 Bundle Accents

| Bundle | Токен | Цвет |
|---|---|---|
| JAV | `--color-bundle-jav` | `#EF4444` |
| Gays | `--color-bundle-gays` | `#3B82F6` |
| Hentai | `--color-bundle-hentai` | `#8B5CF6` |
| Trans | `--color-bundle-trans` | `#EC4899` |

### 2.7 Chart Semantic Mapping (жёсткое правило)

Каждая метрика имеет фиксированный цвет. Не менять без причины.

| Метрика | Цвет | Tailwind |
|---|---|---|
| **Visits** | Cyan | `stroke-cyan-500` / `text-cyan-500` |
| **Ad Revenue** | Indigo | `stroke-indigo-500` / `text-indigo-500` |
| **Affiliate Revenue** | Pink | `stroke-pink-500` / `text-pink-500` |
| **Total Revenue** | Indigo | `stroke-indigo-500` |
| **Costs** | Amber | `stroke-amber-500` / `text-amber-500` |
| **Profit** | Emerald | `stroke-emerald-500` / `text-emerald-500` |
| **ROMI** | Violet | `stroke-violet-500` (только если sparkline используется) |
| **Health** | Amber/Lime | Только при необходимости |

### 2.8 Border Radius

| Токен | Значение | Применение |
|---|---|---|
| `--radius-sm` | `6px` | Мелкие элементы |
| `--radius-md` | `8px` | Средние элементы |
| `--radius-lg` | `12px` | Большие элементы |
| `--radius-card` | `16px` | Все карточки Dashboard |
| `--radius-control` | `10px` | Иконки-контейнеры, кнопки |
| `--radius-pill` | `999px` | DeltaBadge, HealthBadge, SourceStatusPill |

### 2.9 Shadows (строгий набор)

Dashboard карточки используют **только эти три уровня**:

| Токен | Значение | Когда |
|---|---|---|
| `--shadow-card` | `0 1px 3px rgba(16,24,40,0.06), 0 1px 2px rgba(16,24,40,0.04)` | Дефолтное состояние всех карточек |
| `--shadow-elevated` | `0 4px 10px rgba(16,24,40,0.08), 0 2px 4px rgba(16,24,40,0.04)` | Hover-состояние карточек |
| `none` | — | Встроенные элементы без собственной тени |

> **Правило**: никаких произвольных теней. Только `card`, `elevated`, `none`.

### 2.10 Transitions

| Токен | Значение | Применение |
|---|---|---|
| `--ease-out-expo` | `cubic-bezier(0.16, 1, 0.3, 1)` | Все transition-эффекты |
| `--duration-fast` | `150ms` | Быстрые переходы |
| `--duration-normal` | `200ms` | Hover карточек |
| `--duration-slow` | `300ms` | Медленные переходы |

### 2.11 Типографика

| Элемент | CSS | Размер |
|---|---|---|
| **Шрифт** | `'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif` | — |
| **Font features** | `font-feature-settings: 'tnum' on, 'lnum' on` | Tabular lining numerals |
| `.text-page-title` | `32px / 38px / 700` | Topbar title |
| `.text-card-title` | `12px / 16px / 600 / uppercase / tracking 0.04em` | Секции: «BUNDLES», «TRENDS», «INSIGHTS» |
| `.text-kpi-value` | `38px / 44px / 700 / tabular-nums` | — |
| `.text-body` | `14px / 20px / 500` | Body text |
| `.text-meta` | `12px / 16px / 500` | Meta labels |

---

## 3. Общая структура страницы

### Иерархия информации (от общего к частному)

```
TopContextBar
  ├── Page Identity (title, subtitle)
  ├── Data Context (freshness, period, compare)
  └── Actions (export, sync)

DataFreshnessSummary             ← NEW: статус источников данных

Primary KPI (5 cols)             ← Executive KPIs
  [Visits] [Total Revenue] [Profit] [ROMI] [Network Health]

Secondary KPI (4 cols)           ← Supporting KPIs
  [Ad Revenue] [Affiliate Revenue] [Costs] [Revenue per 1000 Visits]

Network Signals (3-4 cols)       ← Alerts / quick signals
  [Strongest Bundle] [Biggest Drop] [Highest Risk] [Best Recovery]

Trends (3 cols)                  ← Time-series charts
  [Revenue] [Traffic] [Profit]

Bundles (4-col grid)             ← Drill-down cards
  [JAV] [Gays] [Hentai] [Trans]

Operational Insights (2 cols)    ← Actionable recommendations
  [Winner] [Risk] [Loser] [Opportunity]
```

### Правило иерархии

**KPI > Trends > Bundles > Insights** по визуальному весу.

- KPI — самые заметные элементы (largest numbers, top of page)
- Trends — подтверждают KPI визуально (charts)
- Bundles — drill-down в детали (cards)
- Insights — actionable рекомендации (самые лёгкие визуально)

> **Изменение**: Bundles перемещены **ниже** Trends. Dashboard строится от общего к частному. Trends показывают общую картину, Bundles — детали.

### Контейнер страницы

| Свойство | Значение |
|---|---|
| `max-width` | `1440px` |
| `padding-x` | `16px` (mobile) / `24px` (sm+) |
| `padding-top` | `24px` |
| `padding-bottom` | `64px` |
| `gap` между секциями | `24px` (`gap-6`) |
| `overflow` | `hidden` |

---

## 4. TopContextBar

**Файл**: `src/components/layout/topbar.tsx`

### Layout: 3 группы

```
┌──────────────────────────────────────────────────────────────────────────┐
│  Group 1: Identity    │  Group 2: Data Context         │  Group 3: Actions│
│                       │                                │                  │
│  Dashboard            │  [SyncStatus] [Period] [Compare]│ [Export] [Sync] │
│  Network overview...  │                                │                  │
└──────────────────────────────────────────────────────────────────────────┘
```

| Группа | Содержимое | Spacing внутри |
|---|---|---|
| **Group 1 — Page Identity** | `title` (32px/700), `subtitle` (14px/500, muted) | — |
| **Group 2 — Data Context** | `SyncStatusBadge`, `PeriodSelector`, `CompareModeSelect` | `gap-12` (внутри группы `gap-8`) |
| **Group 3 — Actions** | Export button, Sync/Refresh button | `gap-8` |

### Правило visual grouping

> Spacing между группами **больше** spacing внутри группы. Группы визуально разделены, controls внутри группы сгруппированы плотно.

### Размеры

| Свойство | Значение |
|---|---|
| height | `72px` |
| position | `sticky top-0 z-100` |
| background | `rgba(255,255,255,0.82)` + `backdrop-filter: blur(10px)` |
| border-bottom | `1px solid #E7EAF0` |
| padding-x | `24px` |

### Компоненты TopContextBar

| Компонент | Описание | Размеры |
|---|---|---|
| **SyncStatusBadge** | `"Synced 5m ago"`, dot=green | height: `28px`, fontSize: `12px`, border: `#E7EAF0` |
| **PeriodSelector** | Dropdown: today/yesterday/7d/30d/90d/custom | height: `36px` |
| **CompareModeSelect** | Menu: vs Previous Period / 7 Days / Day | icon button `36×36px`, `GitCompare` icon (Lucide) |
| **Export** | Download icon button | `36×36px`, `Download` icon (Lucide) |
| **SyncButton** | Refresh icon button | `36×36px`, `RefreshCw` icon (Lucide), loading state |

---

## 5. DataFreshnessSummary

**Файл**: `src/components/shared/data-freshness.tsx` (NEW)

Компактный блок между TopContextBar и KPI. Показывает статус свежести каждого источника данных.

### Когда показывать

- Всегда показывать, если хотя бы один источник `partial`, `stale`, или `missing`
- Скрывать, если все источники `fresh`

### Layout

```
┌───────────────────────────────────────────────────────────────────────┐
│ [● Yandex Metrica: fresh] [● AdSpyglass: 2h ago] [● Costs: stale]  │
│ [● Affiliate: partial]                                               │
└───────────────────────────────────────────────────────────────────────┘
```

Горизонтальный `flex wrap`, каждый элемент — `SourceStatusPill`.

### SourceStatusPill

| Статус | Background | Text | Dot color | Пример |
|---|---|---|---|---|
| `fresh` | `--color-source-fresh-bg` | `--color-source-fresh-text` | `#12B76A` | `● Yandex Metrica: fresh` |
| `partial` | `--color-source-partial-bg` | `--color-source-partial-text` | `#F79009` | `● Costs: partial` |
| `stale` | `--color-source-stale-bg` | `--color-source-stale-text` | `#F04438` | `● AdSpyglass: stale (26h)` |
| `missing` | `--color-source-missing-bg` | `--color-source-missing-text` | `#9CA3AF` | `● Yandex Metrica: not connected` |

### Размеры SourceStatusPill

| Свойство | Значение |
|---|---|
| height | `24px` |
| padding | `px-2.5 py-0.5` (10px/2px) |
| border-radius | `9999px` (pill) |
| font-size | `11px` |
| font-weight | `500` |
| dot | `6×6px` rounded-full, `mr-1.5` |

### Источники для отслеживания

| Source | Что мониторим |
|---|---|
| **Yandex Metrica** | `users` data freshness |
| **AdSpyglass** | `adRevenue`, `hits`, `impressions` freshness |
| **Costs** | Google Sheets costs data |
| **Affiliate** | Google Sheets affiliate data |

---

## 6. KPI-карточки

### Принцип: Primary визуально сильнее Secondary

Primary KPI-карточки — executive-уровень. Они крупнее и заметнее.
Secondary KPI-карточки — supporting data. Визуально легче.

### Primary KPIs — 5 колонок

```
grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5
```

| # | Метрика | format | Sparkline | Описание |
|---|---|---|---|---|
| 1 | **Visits** | `number` | да (cyan) | Уникальные посетители (Yandex Metrica) |
| 2 | **Total Revenue** | `currency` | да (indigo) | Ad + Affiliate revenue |
| 3 | **Profit** | `currency` | да (emerald) | Revenue - Costs |
| 4 | **ROMI** | `percent` | нет | Return on Marketing Investment |
| 5 | **Network Health** | `score` | нет | Средний health score сети (0-100) |

> **Изменения**:
> - `Ad Revenue` перемещён в Secondary (не executive-уровень)
> - `Ad Requests` **удалён** из KPI-строки полностью (не executive метрика; перенести в monetization drill-down или tooltip)
> - `Network Health` **добавлен** как 5-й Primary KPI

### Secondary KPIs — 4 колонки

```
grid grid-cols-2 gap-4 lg:grid-cols-4
```

| # | Метрика | format | Sparkline | Описание |
|---|---|---|---|---|
| 1 | **Ad Revenue** | `currency` | опционально (indigo) | Доход от рекламы |
| 2 | **Affiliate Revenue** | `currency` | нет | Партнёрский доход (может быть нестабильным) |
| 3 | **Costs** | `currency` | да (amber) | Операционные расходы |
| 4 | **Revenue per 1000 Visits** | `currency` | нет | RPM = (totalRevenue / users) × 1000 |

### Анатомия PrimaryKpiCard

```
┌──────────────────────────────────────────────┐
│  TOTAL REVENUE                    [+12.3%] ▲ │  ← label 12px uppercase + DeltaBadge
│                                               │
│  $12,450.00                                   │  ← value 30px bold (primary)
│                                               │
│  ▁▂▃▅▇█▆▅                                    │  ← MiniSparkline h-[22px]
└──────────────────────────────────────────────┘
```

### Анатомия SecondaryKpiCard

Аналогичная, но визуально легче:

```
┌──────────────────────────────────────────────┐
│  COSTS                            [-3.2%] ▼  │  ← label 11px + DeltaBadge
│  $4,560.00                                    │  ← value 24px bold (secondary)
│  ▁▂▃▅▇                                       │  ← sparkline optional, h-[20px]
└──────────────────────────────────────────────┘
```

### Визуальное разделение Primary vs Secondary

| Свойство | PrimaryKpiCard | SecondaryKpiCard |
|---|---|---|
| **value font-size** | `30px` (`text-[30px]`) | `24px` (`text-2xl`) |
| **value font-weight** | `700` (bold) | `700` (bold) |
| **label font-size** | `12px` | `11px` |
| **padding** | `16px` (`p-4`) | `14px` (`p-3.5`) |
| **sparkline height** | `22px` | `20px` |

### Общие стили обоих типов KPI

| Свойство | Значение |
|---|---|
| border-radius | `var(--radius-card)` = `16px` |
| border | `1px solid var(--color-border-subtle)` |
| background | `var(--color-surface)` = `#FFFFFF` |
| shadow | `var(--shadow-card)` → `var(--shadow-elevated)` on hover |
| transition | `all 200ms ease-out-expo` |
| hover transform | `translateY(-1px)` (max 1px lift) |

### Удалённые элементы

- ~~`vs prev period` строка~~ — убрана. DeltaBadge — единственный compare indicator. Текстовая подпись добавляется **только** если compare mode нестандартный (не `prev_period`).
- ~~Мелкие служебные значения над value~~ — anti-pattern, не допускается.

---

## 7. DeltaBadge

**Файл**: `src/components/shared/delta-indicator.tsx`

### Размеры

| Размер | padding | font-size | icon size |
|---|---|---|---|
| `sm` | `px-2 py-0.5` (8px/2px) | `12px` | `14px` |
| `md` | `px-2.5 py-1` (10px/4px) | `14px` | `16px` |

### Состояния (6 штук)

| Состояние | Условие | background | text | Иконка | Текст |
|---|---|---|---|---|---|
| **positive** | `delta > 0`, данные полные | `bg-emerald-50` | `text-emerald-700` | `ArrowUpRight` (Lucide) | `+12.3%` |
| **negative** | `delta < 0`, данные полные | `bg-red-50` | `text-red-700` | `ArrowDownRight` (Lucide) | `-5.7%` |
| **neutral** | `delta === 0` | `bg-gray-100` | `text-gray-600` | — | `+0.0%` |
| **partial** | данные current или previous period неполные | `bg-amber-50` | `text-amber-600` | `AlertCircle` (Lucide, 10px) | `~+12.3%` (тильда перед значением) |
| **not-comparable** | previous = 0 и результат misleading, или источник missing | `bg-gray-100` | `text-gray-500` | — | `n/a` |
| **invalid** | NaN / Infinity | `bg-gray-100` | `text-gray-500` | `Minus` (Lucide) | `—` |

### Правила

- `partial`: показывается если coverage < 100% для одного из периодов сравнения, или один из источников `stale`
- `not-comparable`: показывается если previous value = 0 и delta = 100% (математически верно, но бизнес-смысла нет), или если источник missing entirely
- Формат: `formatPercent(value)` → `+12.3%` / `-5.7%` / `+0.0%`

---

## 8. MiniSparkline

**Файл**: `src/components/shared/mini-sparkline.tsx` (REPLACES SparkAreaChart in KPI)

### Принцип

Sparkline в KPI — **информационная подсказка**, а не декоративный элемент. Максимально минимальный.

### Спецификация

| Свойство | Значение |
|---|---|
| **height** | `20-22px` (Primary: `22px`, Secondary: `20px`) |
| **width** | `100%` |
| **stroke** | Line only, **без area fill** |
| **strokeWidth** | `1.75px` |
| **markers** | Нет |
| **tooltip** | Нет |
| **axes** | Нет |
| **grid** | Нет |
| **area fill** | **Нет** (удалён gradient fill) |
| **animation** | `300ms`, subtle |
| **type** | `monotone` |
| **connectNulls** | `true` |

### Где используется sparkline

| Метрика | Sparkline | Причина |
|---|---|---|
| Visits | ✅ | Стабильная метрика, хорошо читается |
| Total Revenue | ✅ | Ключевая метрика, тренд важен |
| Profit | ✅ | Может быть волатильным, но тренд критичен |
| Costs | ✅ (optional) | Показывает динамику расходов |
| Ad Revenue | ✅ (optional) | Полезно если данные стабильны |
| ROMI | ❌ | Ratio, шумный подневно |
| Network Health | ❌ | Композитный скор, sparkline неинформативен |
| Affiliate Revenue | ❌ | Часто нестабильный, sparkline misleading |
| Revenue per 1000 Visits | ❌ | Noisy metric |

### Правило

> Если sparkline визуально не дотягивает (< 3 точек, слишком шумный, или flat line) — не рендерить. Пустой placeholder (`h-[22px]`) вместо него. Лучше пустота, чем плохой sparkline.

---

## 9. SignalStrip

**Файл**: `src/components/shared/signal-strip.tsx`

### Layout

```
h2.text-card-title.mb-3    ← "NETWORK SIGNALS"
grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4
```

### 4 типа сигналов

| # | Тип | Иконка (Lucide) | Цвет | Описание |
|---|---|---|---|---|
| 1 | `strongest` | `Trophy` | `--color-primary-500` (indigo) | Бандл с лучшим ROMI |
| 2 | `drop` | `TrendingDown` | `--color-danger` (red) | Наибольшее падение revenue |
| 3 | `risk` | `AlertTriangle` | `--color-warning` (amber) | Главный риск (аномалия или worst health) |
| 4 | `recovery` | `TrendingUp` | `--color-success` (green) | Бандл с наибольшим ростом после падения (NEW) |

### Анатомия SignalCard

```
┌───┬──────────────────────────────────────────┐
│ ▌ │ [icon]  STRONGEST BUNDLE                  │  ← label 11px uppercase bold
│ ▌ │  16px   JAV  ROMI: 156.3%                │  ← entity 13px semibold + key metric
│ ▌ │  in     Best ROI with $890 profit         │  ← reason 12px medium (1 line)
│ ▌ │  28×28                                     │
└───┴──────────────────────────────────────────┘
  3px              padding: 12px
```

### Размеры (легче KPI и Insights)

| Свойство | Значение |
|---|---|
| padding | `12px` (`p-3`) — **меньше** чем KPI/Insight (16px) |
| border-radius | `var(--radius-card)` = `16px` |
| border-left | `3px` solid (цвет по типу) |
| **icon container** | `28×28px` (`h-7 w-7`) — **меньше** чем Insight (36px) |
| **icon** | `16×16px` |
| **label** | `11px bold uppercase tracking-wider` |
| **entity** | `13px semibold` |
| **reason** | `12px medium muted`, **1 строка** (line-clamp-1) |
| shadow | `var(--shadow-card)` |
| hover | нет lift, только `shadow-elevated` |

### Strict structure каждого signal

Каждый signal обязательно содержит:
1. `icon` — Lucide иконка по типу
2. `label` — тип сигнала (uppercase)
3. `entity` — имя бандла/сайта
4. `keyMetric` — одно ключевое число (ROMI, delta, health score)
5. `reason` — одна короткая строка объяснения
6. `actionHint` — опциональный текст действия ("View details")

---

## 10. Trend Charts

### Layout

```
h2.text-card-title.mb-3    ← "TRENDS"
grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3
```

3 обязательных графика + 1 опциональный:

### 10.1 Revenue Trend

| Параметр | Значение |
|---|---|
| **Primary series** | `totalRevenue` (indigo) — основная линия |
| **Optional split** | `adRevenue` (indigo) + `affiliateRevenue` (pink) |
| **Правило** | Если split визуально ухудшает читаемость → только `totalRevenue` |
| height | `288px` (`h-72`) |
| fill | `gradient` (subtle) |

### 10.2 Traffic Trend

| Параметр | Значение |
|---|---|
| **Series** | `users` (cyan) — **Yandex Metrica visits** |
| **Правило** | НЕ использовать `hits` (ad requests) как traffic на Dashboard |
| height | `288px` |
| Y formatter | `XK` (thousands) |

> **Важно**: source of truth для traffic = Yandex Metrica visits. `hits` — это ad script loads из AdSpyglass, **не** traffic metric.

### 10.3 Profit Trend

| Параметр | Значение |
|---|---|
| **Series** | `profit` (emerald) |
| **autoMinValue** | `true` (Y-axis может уходить в минус) |
| **Optional** | Costs overlay (amber, dashed line) — future |
| **Optional** | Volatility marker — future |
| height | `288px` |

### 10.4 Costs Trend (optional)

Не обязательно в текущем UI, но в документации зафиксирован как возможный 4-й chart:

| Параметр | Значение |
|---|---|
| **Series** | `costs` (amber) |
| **Type** | Line (no fill) |
| height | `288px` |

### Product constraints для всех чартов

1. Никаких избыточных decorative gradients
2. Grid — subtle only (`stroke-gray-200 stroke-1`)
3. Legend не должен доминировать (мелкий, compact)
4. Максимум 2-3 серии на одном графике
5. Если chart содержит partial data — UI **обязан** это показать:
   - Tooltip показывает `"(partial)"` для incomplete дней
   - Legend показывает indicator
   - Chart не должен создавать ощущение полной уверенности в данных

---

## 11. BundleSummaryCard

**Файл**: `src/components/shared/bundle-summary-card.tsx` (REPLACES BundleCard)

### Layout контейнер

```
h2.text-card-title.mb-3    ← "BUNDLES"

Desktop: grid grid-cols-4 gap-4
Tablet:  grid grid-cols-2 gap-4
Mobile:  grid grid-cols-1 gap-4
```

> **Изменение**: убран horizontal scroll как desktop-дефолт. Scroll допустим только на mobile как fallback.

### Анатомия

```
┌─────────────────────────────────────────────────┐
│▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀│ ← accent bar: 3px
│                                                  │
│  ● JAV                   [85] [+12.3%]      ▶  │ ← header
│                                                  │
│  VISITS         REVENUE        PROFIT     ROMI  │ ← metrics grid
│  12.5K          $1,234         $890       156.3% │
│  ──────────────────────────────────────────────  │
│  5 sites  Revenue share: 34%        View bundle  │ ← operational footer
└─────────────────────────────────────────────────┘
```

### Обязательные поля

| Поле | Формат | Описание |
|---|---|---|
| **Health** | `HealthBadge` (score/100) | Композитный health score |
| **Visits** | `formatCompact` | Уникальные посетители |
| **Total Revenue** | `formatCurrency` | Суммарный доход |
| **Profit** | `formatCurrency` (green/red) | Чистая прибыль |
| **ROMI** | `percent` | Return on investment |
| **Delta** | `DeltaBadge` | Изменение revenue vs prev period |
| **Revenue Share** или **Profit Share** | `percent` | Доля бандла в общей сети |

> **Изменение**: `Ad Requests` убран из bundle card. Заменён на `Visits`.

### Metrics grid

```
grid grid-cols-2 gap-x-4 gap-y-3
```

4 метрики: Visits, Revenue, Profit, ROMI.

| Элемент | Стиль |
|---|---|
| metric label | `11px semibold uppercase tracking-wider`, color: `--color-text-muted` |
| metric value | `18px bold tabular-nums`, color: `--color-text-primary` |
| profit value | green if > 0, red if ≤ 0 |

### Operational footer

Footer **обязательно** содержит:

| Элемент | Описание |
|---|---|
| Sites count | `"5 sites"` — 12px medium muted |
| Revenue/Profit Share | `"Revenue share: 34%"` — 12px medium muted |
| Delta | `DeltaBadge` (sm) |
| Action | `"View bundle"` text or chevron → link to `/bundles/{slug}` |

### Размеры

| Свойство | Значение |
|---|---|
| padding | `16px` (`p-4`) |
| border-radius | `16px` |
| accent bar | `3px` (bundle color) |
| color dot | `10×10px` (`h-2.5 w-2.5 rounded-full`) |
| min-width | нет (grid-based, не scroll) |

---

## 12. NetworkHealthCard

**Файл**: `src/components/shared/network-health-card.tsx` (NEW)

### Использование

Появляется как 5-й Primary KPI (`Network Health`).

### Визуал

```
┌──────────────────────────────────────────────┐
│  NETWORK HEALTH                               │
│                                               │
│  82 / 100                                     │  ← score, large text
│  ● healthy                                    │  ← status dot + label
│                                               │
│  confidence: high                              │  ← optional, if data complete
└──────────────────────────────────────────────┘
```

### Health с confidence

| Состояние | Описание | Визуал |
|---|---|---|
| **full confidence** | Все источники fresh, coverage 100% | Score отображается нормально |
| **low confidence** | Один или более источников stale/partial | Score с пониженной opacity + note `"~82 (partial data)"` |
| **no data** | Нет health scores | `"—"` с note `"Insufficient data"` |

### Где ещё используется Health

| Контекст | Компонент |
|---|---|
| KPI card | `NetworkHealthCard` (5-й Primary KPI) |
| Bundle card | `HealthBadge` (pill в header) |
| Signal strip | Худший health → `risk` signal |
| Trend/sparkline | Не используется (не подходит для sparkline) |

---

## 13. ChartCard

**Файл**: `src/components/shared/chart-card.tsx`

### Richer header structure

```
┌──────────────────────────────────────────────┐
│  ┌─header───────────────────────────────┐    │
│  │  Revenue              [DeltaBadge]    │    │  ← title 14px semibold + delta
│  │  30 days · vs prev period             │    │  ← subtitle 12px muted
│  │  ⚠ partial: costs data missing 3 days │    │  ← source completeness note (conditional)
│  └───────────────────────────────────────┘    │
│                                               │
│  ┌─body──────────────────────────────────┐   │
│  │  [AreaChart h-72 (288px)]             │   │
│  └────────────────────────────────────────┘   │
└──────────────────────────────────────────────┘
```

### Элементы header

| Элемент | Описание | Стиль |
|---|---|---|
| `title` | Название графика | `14px semibold`, `--color-text-primary` |
| `subtitle` | Период + compare label | `12px medium`, `--color-text-muted`, `mt-1` |
| `delta` | DeltaBadge (optional) | `sm` size |
| `sourceNote` | Completeness warning (optional) | `11px medium`, `--color-source-partial-text`, `mt-1` |
| `action` | Optional button/link | — |

### Размеры

| Свойство | Значение |
|---|---|
| border-radius | `16px` |
| border | `1px solid var(--color-border-subtle)` |
| shadow | `var(--shadow-card)` → `var(--shadow-elevated)` on hover |
| header padding | `px-5 pt-5 pb-3` (20px/20px/12px) |
| body padding | `px-5 pb-5` (20px/20px) |
| stronger header zone | header визуально отделён большим вертикальным spacing от body |
| legend placement | Inside body, below chart, compact |

### Правило

> ChartCard не должен быть "просто белой коробкой с графиком". Header zone должен быть stronger: содержать достаточно контекста (title + delta + source note) чтобы chart был понятен без hover.

---

## 14. AreaChart

**Файл**: `src/components/tremor/AreaChart.tsx`

### Product constraints (обязательные правила)

1. **Никаких excessive decorative gradients** — gradient fill subtle (5% → 0% opacity)
2. **Grid subtle only** — horizontal lines `stroke-gray-200 stroke-1`, no vertical lines
3. **Legend compact** — не доминирует, мелкий текст (`12px`)
4. **Series count ≤ 3** — на одном графике максимум 3 серии для readability
5. **Source-aware rendering**: если серия incomplete:
   - Tooltip показывает `"(partial data)"`
   - Legend отмечает серию как partial
   - Chart НЕ создаёт ощущение полной уверенности

### Размеры

| Свойство | Значение |
|---|---|
| default height | `320px` (`h-80`), на Dashboard: `288px` (`h-72`) |
| yAxisWidth | `56px` |
| strokeWidth | `2px` |
| animationDuration | `600ms` |
| XAxis | `text-xs fill-gray-500`, no tickLine, no axisLine |
| YAxis | `text-xs fill-gray-500`, no tickLine, no axisLine |
| Grid | horizontal only, `stroke-gray-200` |
| Tooltip | `rounded-lg`, border `gray-200`, bg white, `shadow-lg` |

---

## 15. InsightCard

**Файл**: `src/components/shared/insight-card.tsx`

### Layout секции

```
h2.text-card-title.mb-3    ← "OPERATIONAL INSIGHTS"
grid grid-cols-1 gap-4 md:grid-cols-2
```

### 4 архетипа (explicit exports)

| Тип | Компонент | Иконка (Lucide) | Лейбл | Border-left color |
|---|---|---|---|---|
| `winner` | `WinnerCard` | `Trophy` | `Winner` | `--color-success` |
| `loser` | `LoserCard` | `TrendingDown` | `Declining` | `--color-danger` |
| `risk` | `RiskCard` | `AlertTriangle` | `Risk` | `--color-warning` |
| `opportunity` | `OpportunityCard` | `TrendingUp` | `Opportunity` | `--color-primary-500` |

### Simplified archetype

```
┌───┬──────────────────────────────────────────────┐
│ ▌ │ [icon]  WINNER                                │  ← label 11px bold uppercase
│ ▌ │  18px   Revenue Growth — GayXHub  [+15.2%]   │  ← title: metric + entity + delta
│ ▌ │  in     Fastest growing bundle.               │  ← reason: MAX 2 short lines
│ ▌ │  36×36  Consider allocating more traffic.     │
│ ▌ │                                               │
│ ▌ │         View details →                        │  ← action: MAX 1 short line
└───┴──────────────────────────────────────────────┘
```

### Text limits (жёсткие)

| Элемент | Лимит |
|---|---|
| **label** | 1 слово (Winner / Declining / Risk / Opportunity) |
| **title** | metric + entity + delta — 1 строка |
| **reason** | Максимум 2 короткие строки (`line-clamp-2`) |
| **action** | Максимум 1 короткая строка |

### Severity (для Risk и Loser)

| Тип | Severity | Визуал |
|---|---|---|
| Risk | `critical` / `high` / `medium` / `low` | Border-left thickness: critical=4px, high=3px, medium=3px, low=2px |
| Loser | определяется по `delta` | `< -50%` → critical, `< -30%` → high, `< -15%` → medium, else low |

### Размеры

| Свойство | Значение |
|---|---|
| padding | `16px` (`p-4`) |
| border-radius | `16px` |
| border-left | `3px` (цвет по типу) |
| icon container | `36×36px`, radius: `10px` |
| icon | `18×18px` |
| label | `11px bold uppercase tracking-wider` |
| title metric | `14px semibold` |
| title entity | `12px medium muted` |
| reason | `13px leading-relaxed`, `--color-text-secondary` |
| action | `12px semibold`, `--color-primary-600`, underline on hover |

---

## 16. Loading Skeletons

**Файл**: `src/components/shared/loading-skeleton.tsx`

### Shimmer base

```css
.animate-shimmer {
  background: linear-gradient(90deg,
    var(--color-border-subtle) 25%,
    var(--color-surface-secondary) 50%,
    var(--color-border-subtle) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
}
```

### Скелетоны для всех секций Dashboard

| Компонент | Описание |
|---|---|
| `DataFreshnessSkeleton` | Horizontal row of 4 pill-shaped shimmers (`h-6 w-32` × 4) |
| `PrimaryKpiCardSkeleton` | label shimmer + value shimmer + sparkline shimmer |
| `SecondaryKpiCardSkeleton` | Аналогично, но меньше |
| `SignalCardSkeleton` | icon shimmer + label + entity + reason (1 line) |
| `BundleSummaryCardSkeleton` | accent bar + header + 2×2 grid + footer |
| `ChartSkeleton` | header (title + subtitle) + chart area `h-72` |
| `InsightCardSkeleton` | icon + label + title + reason (2 lines) + action |

### Sync-aware состояния (кроме skeleton)

| Состояние | Компонент | Визуал |
|---|---|---|
| **Partial data** | `PartialDataBanner` | Amber background strip: `"Some data sources are incomplete for this period"` |
| **Missing source** | `MissingSourceWarning` | Red/gray pill: `"Yandex Metrica not connected — Visits data unavailable"` |
| **Stale data** | `StaleDataIndicator` | Amber dot + `"Data may be outdated (last sync: 26h ago)"` |

---

## 17. Анимации

**Файл**: `src/lib/motion.ts`

### Правила (жёсткие)

- **No bounce** — никакого bounce-эффекта
- **No overshoot** — easing не выходит за пределы
- **No long dramatic transitions** — максимум 300ms
- **No flashy reveals** — никаких flashy scale/rotation
- Easing: `cubic-bezier(0.16, 1, 0.3, 1)` (expo-out) для всего

### Конкретные анимации

| Анимация | Применение | Параметры |
|---|---|---|
| **Page fade-in** | `DashboardContent` mount | `opacity: 0→1`, `y: 6→0`, `250ms` |
| **KPI stagger** | Primary KPIs → Secondary KPIs | `opacity: 0→1`, `y: 10→0`, `220ms`, stagger `40ms` |
| **Chart fade-in** | ChartCard appearance | `opacity: 0→1`, `220ms`, delay after KPI |
| **Hover lift** | Все карточки | `translateY(0 → -1px)`, `200ms` — **максимум 1px** |
| **Toolbar menu** | CompareModeSelect dropdown | `opacity: 0→1`, `scale: 0.96→1`, `200ms` |

### Порядок появления

| Секция | Delay (от начала) |
|---|---|
| DataFreshness | `0ms` |
| Primary KPIs (5 шт) | `0–200ms` (stagger 40ms) |
| Secondary KPIs (4 шт) | `200–360ms` |
| Signals (3-4 шт) | `360–520ms` |
| Trends (3 шт) | `520–640ms` |
| Bundles (4 шт) | `640–800ms` |
| Insights (2-4 шт) | `800–960ms` |

Общее время: ~`1000ms` до full visible.

---

## 18. Empty State / Error State / Partial State

### Стандартные состояния

#### EmptyState (нет данных)

```
┌─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┐
│         [Database icon 24px]             │
│         in circle 48px                   │
│                                          │
│    No data available yet                 │  ← 16px semibold
│    Start syncing from Settings           │  ← 14px muted
│                                          │
│    [Go to Settings]                      │  ← primary button
└─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┘
```

#### ErrorState (ошибка загрузки)

```
┌─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┐
│         [AlertTriangle icon 24px]        │
│         in circle 48px (danger bg)       │
│                                          │
│    Failed to load dashboard              │
│    {error.message}                       │
│                                          │
│    [Retry]                               │  ← danger button
└─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┘
```

### Специальные partial/error состояния (NEW)

| Состояние | Когда | Визуал |
|---|---|---|
| **Stale source** | Один из источников не синкался > 24h | Amber banner: `"AdSpyglass data is stale (last sync: 26h ago). Dashboard may not reflect latest data."` |
| **Incomplete compare** | Coverage < 100% для previous period | DeltaBadge показывает `partial` state; tooltip: `"Comparison may be inaccurate due to incomplete data"` |
| **Partial revenue** | affiliateRevenue или costs missing для части дней | ChartCard sourceNote: `"⚠ Costs data missing for 3 days"` |
| **Missing cost mapping** | Site не привязан к sheet cost row | На bundle card: costs = `"—"`, profit = `"—"`, note: `"Cost mapping incomplete"` |
| **Missing affiliate mapping** | Site не привязан к affiliate sheet | Affiliate Revenue KPI: `"—"`, note: `"Not configured"` |
| **No data for period** | Запрошен период, для которого нет записей | EmptyState с текстом: `"No data for selected period. Try a different date range."` |

---

## 19. Адаптивность

### Breakpoints

| Breakpoint | min-width |
|---|---|
| **base** (mobile) | `0px` |
| **sm** | `640px` |
| **md** | `768px` |
| **lg** | `1024px` |
| **xl** | `1280px` |

### Responsive grid

| Секция | mobile | sm | md | lg | xl |
|---|---|---|---|---|---|
| DataFreshness | wrap | wrap | 1 row | 1 row | 1 row |
| Primary KPIs | **1 col** | 2-3 cols | 3 cols | **5 cols** | 5 cols |
| Secondary KPIs | **1 col** | 2 cols | 2 cols | **4 cols** | 4 cols |
| Signals | 1 col | **2 cols** | 2 cols | 2 cols | **4 cols** |
| Trends | **1 col** | 1 col | **2 cols** | 2 cols | **3 cols** |
| Bundles | **1 col stack** | 2 cols | 2 cols | **4 cols grid** | 4 cols grid |
| Insights | 1 col | 1 col | **2 cols** | 2 cols | 2 cols |

> **Изменения**: Bundles на desktop = 4-col grid (не scroll). Mobile = 1-col stack (scroll допустим как fallback).

---

## 20. Дерево компонентов

```
DashboardPage
├── TopContextBar
│   ├── Group 1: Page Identity
│   │   ├── title ("Dashboard", 32px/700)
│   │   └── subtitle ("Network overview...", 14px/500)
│   ├── Group 2: Data Context
│   │   ├── SyncStatusBadge (Mantine Badge)
│   │   ├── PeriodSelector
│   │   └── CompareModeSelect (Lucide GitCompare)
│   └── Group 3: Actions
│       ├── ExportButton (Lucide Download)
│       └── SyncButton (Lucide RefreshCw)
│
└── Suspense (fallback=DashboardSkeleton)
    └── DashboardContent
        └── motion.div (staggerContainer)
            │
            ├── DataFreshnessSummary (NEW)
            │   └── SourceStatusPill × 4 (NEW)
            │       (Yandex Metrica / AdSpyglass / Costs / Affiliate)
            │
            ├── Primary KPIs (grid 5-col)
            │   ├── PrimaryKpiCard: Visits (sparkline: cyan)
            │   ├── PrimaryKpiCard: Total Revenue (sparkline: indigo)
            │   ├── PrimaryKpiCard: Profit (sparkline: emerald)
            │   ├── PrimaryKpiCard: ROMI (no sparkline)
            │   └── NetworkHealthCard: Network Health (NEW)
            │       ├── score (large)
            │       ├── status dot + label
            │       └── confidence indicator
            │
            ├── Secondary KPIs (grid 4-col)
            │   ├── SecondaryKpiCard: Ad Revenue
            │   ├── SecondaryKpiCard: Affiliate Revenue
            │   ├── SecondaryKpiCard: Costs (sparkline: amber)
            │   └── SecondaryKpiCard: Revenue per 1000 Visits
            │
            ├── SignalStrip (grid 4-col)
            │   ├── SignalCard: Strongest Bundle (Lucide Trophy)
            │   ├── SignalCard: Biggest Drop (Lucide TrendingDown)
            │   ├── SignalCard: Highest Risk (Lucide AlertTriangle)
            │   └── SignalCard: Best Recovery (Lucide TrendingUp)
            │
            ├── Trends (grid 3-col)
            │   ├── ChartCard "Revenue"
            │   │   └── RevenueTrendChart → AreaChart
            │   ├── ChartCard "Traffic"
            │   │   └── TrafficTrendChart → AreaChart
            │   └── ChartCard "Profit"
            │       └── ProfitTrendChart → AreaChart
            │
            ├── Bundles (grid 4-col)
            │   └── BundleSummaryCard × N (Link)
            │       ├── accent bar (3px)
            │       ├── header: dot + name + HealthBadge + DeltaBadge
            │       ├── metrics grid: Visits, Revenue, Profit, ROMI
            │       └── operational footer: sites + share + action
            │
            └── Operational Insights (grid 2-col)
                ├── WinnerCard (Lucide Trophy)
                ├── RiskCard (Lucide AlertTriangle)
                ├── LoserCard (Lucide TrendingDown)
                └── OpportunityCard (Lucide TrendingUp)
```
