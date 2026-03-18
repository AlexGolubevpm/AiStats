# Dashboard — Аналитическая документация (Target State)

Данные, метрики, формулы расчёта, графики, спарклайны, периоды и source of truth для страницы `/dashboard`.

---

## Содержание

1. [Архитектура данных и Source of Truth](#1-архитектура-данных-и-source-of-truth)
2. [Периоды, сравнение и confidence](#2-периоды-сравнение-и-confidence)
3. [API Dashboard](#3-api-dashboard)
4. [KPI-метрики: полный список](#4-kpi-метрики)
5. [Формулы расчёта всех метрик](#5-формулы-расчёта)
6. [Delta (дельта) и confidence](#6-delta-и-confidence)
7. [Sparkline-данные](#7-sparkline-данные)
8. [Network Signals — логика вычисления](#8-network-signals)
9. [Bundle-метрики](#9-bundle-метрики)
10. [Trend Charts — данные графиков](#10-trend-charts)
11. [Insights — логика генерации](#11-insights)
12. [Coverage и Sync State](#12-coverage-и-sync-state)
13. [Health Score на Dashboard](#13-health-score)
14. [Anomaly Detection → Insights](#14-anomaly-detection)
15. [Полная схема API Response](#15-api-response-schema)
16. [Data Flow: от источника до UI](#16-data-flow)
17. [Глоссарий метрик](#17-глоссарий)

---

## 1. Архитектура данных и Source of Truth

### 1.1 Источники данных

| Источник | Канонические данные | **НЕ** использовать как |
|---|---|---|
| **Yandex Metrica** | Visits (users), Countries, GEO distribution, Tier distribution | Revenue source, ad metrics source |
| **AdSpyglass (AdOK) API** | Ad Revenue, Impressions, Clicks, CTR, Fill Rate, eCPM, RPM, Revenue by format, Hits (ad requests) | Visits/GEO source (hits ≠ visits) |
| **Google Sheets (Costs)** | Costs by site per day | Traffic source, revenue source |
| **Google Sheets (Affiliate)** | Affiliate revenue by site per day | Traffic source, ad revenue source |

### 1.2 Source of Truth Rules (жёсткие)

| Метрика / измерение | Source of Truth | Примечание |
|---|---|---|
| **Visits / Users** | Yandex Metrica | НЕ использовать `hits` из AdSpyglass |
| **Countries / GEO / Tiers** | Yandex Metrica | — |
| **Ad Revenue** | AdSpyglass API (`broker_income`) | — |
| **Impressions, Clicks, CTR, Fill Rate** | AdSpyglass API | — |
| **Costs** | Google Sheets (Costs) | — |
| **Affiliate Revenue** | Google Sheets (Affiliate) | — |
| **Total Revenue** | Computed: `adRevenue + affiliateRevenue` | Не из одного источника |
| **Profit** | Computed: `totalRevenue - costs` | — |
| **ROMI** | Computed: `((totalRevenue - costs) / costs) × 100` | — |
| **RPM** | Computed: `(totalRevenue / users) × 1000` | Зависит от Yandex Metrica |

> **Критично**: `hits` из AdSpyglass — это загрузки рекламного скрипта (ad requests), **НЕ** page views и **НЕ** users. На Dashboard в роли "Traffic" всегда используется `users` из Yandex Metrica.

### 1.3 Sync State Layer

Каждый источник данных имеет состояние свежести:

| Состояние | Условие | Влияние на Dashboard |
|---|---|---|
| `fresh` | Последний sync < 6 часов назад, все записи complete | Данные показываются нормально |
| `partial` | Данные есть, но не для всех дней в периоде, или один source incomplete | Delta помечается как `partial`, ChartCard показывает sourceNote |
| `stale` | Последний sync > 24 часов назад | Amber banner: "Data may be outdated", DeltaBadge = `partial` |
| `failed` | Последний sync завершился ошибкой | Red warning, данные могут быть неактуальны |
| `mapping_issue` | Site не привязан к sheet row (costs/affiliate) | Affected metrics = `"—"`, note: "Mapping incomplete" |
| `missing` | Источник не подключён (нет API key, нет sheet ID) | Affected metrics = `"—"`, note: "Not connected" |

### 1.4 Поток данных

```
Yandex Metrica API ─────────────► DailyMetric.users
                                        │
AdOK API (group_by=website) ────► DailyMetric (hits, impressions, clicks, adRevenue)
AdOK API (group_by=ad_type) ────► FormatMetric
AdOK API (group_by=country) ────► TierMetric
                                        │
Google Sheets (Costs) ──► Cost ─────────┤
Google Sheets (Affiliate) ──► AffiliateRevenue ──┤
                                        │
                                        ▼
                              calculate-metrics worker
                              (derived: totalRevenue, profit, ROMI, RPM, CTR, eCPM, fillRate)
                                        │
                                   ┌────┴────┐
                                   ▼         ▼
                             HealthScore  Anomaly
                                   │
                                   ▼
                        GET /api/dashboard → useDashboard() → React UI
```

---

## 2. Периоды, сравнение и confidence

### 2.1 Доступные периоды

| Значение | Диапазон | Описание |
|---|---|---|
| `today` | `startOfDay(now)` → `endOfDay(now)` | Текущий день |
| `yesterday` | вчера (по умолчанию) | Вчерашний день |
| `7d` | last 7 days | Последние 7 дней |
| `30d` | last 30 days | Последние 30 дней |
| `90d` | last 90 days | Последние 90 дней |
| `custom` | `from` → `to` из URL params | Произвольный диапазон |

### 2.2 Режимы сравнения

| Режим | Описание | Формула |
|---|---|---|
| `prev_period` (default) | Зеркальный предыдущий период | `from - periodDays` → `to - periodDays` |
| `prev_7d` | 7 дней до начала текущего | `from - 7d` → `from - 1d` |
| `prev_day` | Один день до начала | `from - 1d` → `from - 1d` |

### 2.3 Partial Day Rules

Если для текущего дня (`today`) один или более источников ещё не синхронизировались:

- Период помечается как `partial`
- DeltaBadge показывает `partial` state (`~+12.3%`)
- ChartCard получает `sourceNote`: "Today's data is incomplete"
- Dashboard **не скрывает** данные — показывает что есть, но с предупреждением

### 2.4 Compare Validity

Delta считается **valid** только если **оба** периода (current и compare) имеют достаточную полноту данных:

| Current coverage | Compare coverage | Delta state |
|---|---|---|
| ≥ 90% days | ≥ 90% days | `valid` — нормальный DeltaBadge |
| ≥ 50% days | ≥ 50% days | `partial` — DeltaBadge с тильдой `~+12.3%` |
| < 50% days | any | `not-comparable` — DeltaBadge показывает `n/a` |
| any | < 50% days | `not-comparable` — `n/a` |
| any | 0 days | `not-comparable` — `n/a` |

### 2.5 Confidence Levels

| Level | Условие | UI-эффект |
|---|---|---|
| `full` | Все источники `fresh`, coverage 100% для обоих периодов | Нормальное отображение |
| `partial` | Один или более источников `partial`/`stale`, coverage 50-90% | Delta = `partial`, sparkline показывается, values с note |
| `low` | Coverage < 50%, или ключевой источник `failed` | Delta = `not-comparable`, sparkline скрыт, values с strong warning |
| `none` | Нет данных для периода | EmptyState для конкретной секции |

---

## 3. API Dashboard

**Endpoint**: `GET /api/dashboard`

### Query Parameters

| Параметр | Тип | Default | Описание |
|---|---|---|---|
| `period` | string | `yesterday` | Период данных |
| `from` | string | — | Начало (для custom) |
| `to` | string | — | Конец (для custom) |
| `compare` | string | `prev_period` | Режим сравнения |

### Последовательность обработки

```
1. parsePeriodParam(searchParams) → { from, to }
2. getComparisonRange(from, to, compare) → { prevFrom, prevTo }
3. ensureDataCoverage(from, to) → coverage
4. checkSourceCompleteness(from, to) → sourceStatus (NEW)
5. aggregateNetworkMetrics(from, to) → current
6. aggregateNetworkMetrics(prevFrom, prevTo) → previous
7. calculateNetworkHealth(from, to) → networkHealthScore (NEW)
8. getNetworkTrend(trendFrom, to) → trend[]
9. aggregateBundleMetrics per bundle → bundles[]
10. prisma.anomaly.findMany → insights[]
11. Return JSON { kpis, bundles, insights, trend, compareMode, coverage, sourceStatus }
```

### Trend Period Logic

```typescript
const periodDays = differenceInDays(to, from) + 1
const trendFrom = periodDays < 7
  ? startOfDay(subDays(to, 6))  // минимум 7 дней для sparkline
  : from                         // полный период для длинных
```

---

## 4. KPI-метрики

### Primary KPIs (5 карточек, executive-уровень)

| # | Метрика | label | format | Sparkline | Source of Truth |
|---|---|---|---|---|---|
| 1 | **Visits** | `Visits` | `number` | да (cyan, line-only) | Yandex Metrica |
| 2 | **Total Revenue** | `Total Revenue` | `currency` | да (indigo, line-only) | Computed (Ad + Affiliate) |
| 3 | **Profit** | `Profit` | `currency` | да (emerald, line-only) | Computed (Revenue - Costs) |
| 4 | **ROMI** | `ROMI` | `percent` | нет | Computed |
| 5 | **Network Health** | `Network Health` | `score` | нет | Computed (weighted avg) |

### Secondary KPIs (4 карточки, supporting level)

| # | Метрика | label | format | Sparkline | Source of Truth |
|---|---|---|---|---|---|
| 1 | **Ad Revenue** | `Ad Revenue` | `currency` | опционально (indigo) | AdSpyglass |
| 2 | **Affiliate Revenue** | `Affiliate Revenue` | `currency` | нет | Google Sheets |
| 3 | **Costs** | `Costs` | `currency` | да (amber) | Google Sheets |
| 4 | **Revenue per 1000 Visits** | `Revenue per 1000 Visits` | `currency` | нет | Computed (RPM) |

### Удалённые KPI

| Метрика | Причина удаления | Куда перенести |
|---|---|---|
| ~~Ad Requests~~ | Не executive KPI. `hits` — технический показатель, не бизнес-метрика | Monetization drill-down или tooltip в site detail |

### Структура KPI-объекта

```typescript
{
  label: string         // "Visits"
  value: number         // 123456
  delta: number         // 12.3 (процент)
  deltaConfidence: 'full' | 'partial' | 'not-comparable'  // NEW
  format: string        // "currency" | "number" | "percent" | "score"
  trend: number[]       // данные для sparkline (пустой [] если нет sparkline)
  sourceStatus: 'fresh' | 'partial' | 'stale' | 'missing'  // NEW
}
```

---

## 5. Формулы расчёта

### 5.1 Базовые метрики (сырые данные)

| Метрика | Источник | Единица |
|---|---|---|
| `users` | Yandex Metrica API | число |
| `hits` | AdOK API | число |
| `impressions` | AdOK API | число |
| `clicks` | AdOK API | число |
| `adRevenue` | AdOK API (`broker_income`) | USD |
| `affiliateRevenue` | Google Sheets | USD |
| `costs` | Google Sheets | USD |

### 5.2 Вычисляемые метрики

```
totalRevenue = adRevenue + affiliateRevenue

profit = totalRevenue - costs

ROMI = costs > 0
     ? ((totalRevenue - costs) / costs) × 100
     : 0
     (%)

RPM (Revenue per 1000 Visits) = users > 0
    ? (totalRevenue / users) × 1000
    : 0
    ($)

CTR = impressions > 0
    ? (clicks / impressions) × 100
    : 0
    (%)

eCPM = impressions > 0
     ? (adRevenue / impressions) × 1000
     : 0
     ($)

fillRate = hits > 0
         ? (impressions / hits) × 100
         : 0
         (%)
```

### 5.3 Network Health (NEW)

```
networkHealth = weightedAverage(
  allSites.map(site => site.healthScore),
  weights = allSites.map(site => site.totalRevenue)  // взвешено по revenue
)
```

Каждый site health score = взвешенная сумма 8 компонентов (см. раздел 13).

Network Health для Dashboard — среднее всех site health scores, **взвешенное по totalRevenue** сайта. Крупные сайты влияют сильнее.

Если данные incomplete:
```
networkHealthConfidence = allSites.every(s => s.healthScore != null)
  ? 'full'
  : allSites.filter(s => s.healthScore != null).length / allSites.length >= 0.5
    ? 'partial'
    : 'low'
```

### 5.4 Агрегация

Для network/bundle/site:

```sql
SELECT
  SUM(users), SUM(hits), SUM(impressions), SUM(clicks),
  SUM(adRevenue), SUM(affiliateRevenue), SUM(totalRevenue),
  SUM(costs), SUM(profit)
FROM daily_metrics
WHERE date BETWEEN {from} AND {to}
```

ROMI и RPM **пересчитываются из агрегатов** (не суммируются):

```typescript
romi = costs > 0 ? ((totalRevenue - costs) / costs) * 100 : 0
rpm  = users > 0 ? (totalRevenue / users) * 1000 : 0
```

> **Важно**: ROMI и RPM — ratio metrics. Они вычисляются заново из суммарных показателей, а не суммируются из дневных значений. Иначе результат будет математически неверным.

---

## 6. Delta и Confidence

### 6.1 Формула delta

```typescript
function calculateDelta(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return ((current - previous) / Math.abs(previous)) * 100
}
```

### 6.2 Примеры

| current | previous | delta | Объяснение |
|---|---|---|---|
| 150 | 100 | `+50.0%` | `(150-100)/100 × 100` |
| 75 | 100 | `-25.0%` | `(75-100)/100 × 100` |
| 100 | 0 | `+100.0%` | Special case: was zero |
| 0 | 0 | `0.0%` | Both zero |

### 6.3 Delta Confidence (NEW)

| Confidence | Условие | UI |
|---|---|---|
| `full` | Both periods coverage ≥ 90%, all sources fresh | Нормальный DeltaBadge: `+12.3%` |
| `partial` | One period coverage 50-90%, or source stale | Subdued DeltaBadge: `~+12.3%` (тильда) |
| `not-comparable` | Coverage < 50%, previous = 0 (misleading), source missing | Gray pill: `n/a` |

### 6.4 Правила для partial delta

Partial delta показывается когда:
- Текущий или предыдущий период имеет coverage < 100%
- Один из источников (Yandex Metrica, AdSpyglass, Costs, Affiliate) в состоянии `stale` или `partial`
- Сравнение всё ещё показывается, но UI явно говорит что confidence низкий

### 6.5 Правила для not-comparable

Not-comparable показывается когда:
- previous value = 0 и delta = 100% (математически верно, но бизнес-смысла нет)
- Denominator приводит к misleading результату
- Источник missing entirely для одного из периодов
- Coverage < 50% для любого из периодов

---

## 7. Sparkline-данные

### 7.1 Источник

`getNetworkTrend(trendFrom, to)` → группировка DailyMetric по дате с SUM.

### 7.2 Trend period

| Период | Точек |
|---|---|
| today / yesterday | 7 (last 7 days minimum) |
| 7d | 7 |
| 30d | 30 |
| 90d | 90 |

На фронтенде: если > 14 точек → `trend.slice(-14)` (последние 14).

### 7.3 Маппинг метрик на sparkline data

| KPI | Sparkline data | Цвет | Показывать |
|---|---|---|---|
| Visits | `trend.map(d => d.users)` | cyan | ✅ Всегда |
| Total Revenue | `trend.map(d => d.totalRevenue)` | indigo | ✅ Всегда |
| Profit | `trend.map(d => d.profit)` | emerald | ✅ Всегда |
| Costs | `trend.map(d => d.costs)` | amber | ✅ Optional |
| Ad Revenue | `trend.map(d => d.adRevenue)` | indigo | ✅ Optional |
| ROMI | — | — | ❌ Ratio metric, шумный подневно |
| Network Health | — | — | ❌ Композитный скор, неинформативен |
| Affiliate Revenue | — | — | ❌ Часто нестабильный |
| Revenue per 1000 Visits | — | — | ❌ Noisy metric |

### 7.4 Sparkline rendering rules

- **Line-only** (никакого area fill)
- **strokeWidth**: `1.75px`
- **height**: `22px` (primary) / `20px` (secondary)
- Если < 3 точек данных → не рендерить sparkline, показать placeholder
- Если все значения одинаковые (flat line) → не рендерить
- Если source `stale` или `partial` → sparkline показывается с пониженной opacity (0.5)

---

## 8. Network Signals

### 8.1 Четыре типа сигналов

| # | Тип | Что показывает | Логика выбора |
|---|---|---|---|
| 1 | **Strongest Bundle** | Лучший бандл по ROMI | `bundles.sort((a,b) => b.romi - a.romi)[0]` if romi > 0 |
| 2 | **Biggest Revenue Drop** | Бандл с наибольшим падением | `bundles.filter(b => b.delta < 0).sort((a,b) => a.delta - b.delta)[0]` |
| 3 | **Highest Risk** | Главный risk из anomalies или worst health | Priority 1: insight type='risk', severity critical/high. Fallback: bundle with worst healthScore |
| 4 | **Best Recovery** | Бандл с наибольшим ростом после прошлого падения | `bundles.filter(b => b.delta > 0 && b.prevDelta < 0).sort(...)` (NEW) |

### 8.2 Signal 1: Strongest Bundle

```typescript
const best = bundles.sort((a, b) => b.romi - a.romi)[0]
if (best && best.romi > 0) → {
  type: 'strongest',
  entity: best.name,
  keyMetric: `ROMI: ${best.romi.toFixed(1)}%`,
  reason: `Best ROI with ${formatCurrency(best.profit)} profit`
}
```

### 8.3 Signal 2: Biggest Revenue Drop

```typescript
const worstDelta = bundles
  .filter(b => b.delta !== undefined && b.delta < 0)
  .sort((a, b) => a.delta - b.delta)[0]

if (worstDelta) → {
  type: 'drop',
  entity: worstDelta.name,
  keyMetric: `${worstDelta.delta.toFixed(1)}%`,
  reason: `Revenue dropped ${formatCurrency(absChange)} vs previous period`
}
```

### 8.4 Signal 3: Highest Risk

```typescript
// Priority 1: anomaly-based risk
const risks = insights.filter(i => i.type === 'risk' && ['critical','high'].includes(i.severity))
if (risks.length > 0) → signal from risks[0]

// Priority 2: health-based risk
const worstHealth = bundles.sort((a,b) => (a.healthScore ?? 100) - (b.healthScore ?? 100))[0]
if (worstHealth) → {
  type: 'risk',
  entity: worstHealth.name,
  keyMetric: `Health: ${worstHealth.healthScore}/100`,
  reason: `${name} needs attention — check traffic and ad performance`
}
```

### 8.5 Signal 4: Best Recovery (NEW)

```typescript
const recovering = bundles.filter(b =>
  b.delta !== undefined && b.delta > 0 &&
  b.prevPeriodDelta !== undefined && b.prevPeriodDelta < 0
).sort((a, b) => b.delta - a.delta)[0]

if (recovering) → {
  type: 'recovery',
  entity: recovering.name,
  keyMetric: `+${recovering.delta.toFixed(1)}%`,
  reason: `Recovered from ${recovering.prevPeriodDelta.toFixed(1)}% decline`
}
```

Если recovery signal нет (никто не восстановился) — показать 3 сигнала вместо 4.

---

## 9. Bundle-метрики

### 9.1 Данные для каждого бандла

```typescript
{
  id: string,
  name: string,            // "JAV"
  slug: string,            // "jav"
  color: string,           // "#EF4444"
  sitesCount: number,      // 5

  // Metrics:
  users: number,           // Visits (Yandex Metrica)
  totalRevenue: number,    // Ad + Affiliate
  profit: number,
  romi: number,
  healthScore: number,     // 0-100

  // Comparison:
  delta: number,           // % change totalRevenue vs prev period
  deltaConfidence: string, // 'full' | 'partial' | 'not-comparable'

  // Share:
  revenueShare: number,    // % of network total revenue (NEW)
}
```

### 9.2 Метрики, отображаемые в BundleSummaryCard

| Метрика | Формат | Источник |
|---|---|---|
| **Visits** | `formatCompact(users)` → `"12.5K"` | Yandex Metrica |
| **Revenue** | `formatCurrency(totalRevenue)` → `"$1,234.00"` | Computed |
| **Profit** | `formatCurrency(profit)` → `"$890.00"` (green/red) | Computed |
| **ROMI** | `${romi.toFixed(1)}%` → `"156.3%"` | Computed |

> **Изменение**: `Ad Requests (hits)` убран из bundle card. Заменён на `Visits (users)`.

### 9.3 Revenue Share

```typescript
revenueShare = (bundle.totalRevenue / networkTotal.totalRevenue) * 100
```

Показывается в footer: `"Revenue share: 34%"`.

### 9.4 Health в bundle

HealthBadge (pill) в header карточки. Значение = среднее арифметическое healthScore всех сайтов бандла.

---

## 10. Trend Charts

### 10.1 Общее

Все графики используют `data.trend[]` из API.

### 10.2 TrendPoint structure

```typescript
{
  date: string,            // "2025-01-15"
  users: number,           // visitors (Yandex Metrica) — source of truth for traffic
  hits: number,            // ad requests (AdSpyglass) — NOT used on Dashboard charts
  adRevenue: number,
  affiliateRevenue: number,
  totalRevenue: number,
  costs: number,
  profit: number,
}
```

### 10.3 Revenue Trend Chart

| Параметр | Значение |
|---|---|
| **Primary series** | `totalRevenue` (indigo) |
| **Optional split** | `adRevenue` (indigo) + `affiliateRevenue` (pink) |
| **Rule** | Если split ухудшает readability → только `totalRevenue` |
| **Y formatter** | `$X.XX` / `$X.XK` |
| **Height** | `288px` |

### 10.4 Traffic Trend Chart

| Параметр | Значение |
|---|---|
| **Series** | `users` (cyan) — **Yandex Metrica visits** |
| **Rule** | **НЕ** использовать `hits` (ad requests) |
| **Y formatter** | `XK` / plain number |

> **Критично**: Traffic на Dashboard = `users` из Yandex Metrica. Это реальные уникальные посетители. `hits` — загрузки рекламного скрипта, это другая метрика.

### 10.5 Profit Trend Chart

| Параметр | Значение |
|---|---|
| **Series** | `profit` (emerald) |
| **autoMinValue** | `true` (может быть отрицательным) |
| **Optional (future)** | Costs overlay (amber dashed line) |
| **Optional (future)** | Volatility marker |

### 10.6 Costs Trend (optional, future)

| Параметр | Значение |
|---|---|
| **Series** | `costs` (amber) |
| **Type** | Line only, no fill |

### 10.7 Source-aware rendering

Если данные для серии incomplete (not all days have data):

1. **Tooltip**: показывает `"(partial)"` для дней с неполными данными
2. **Legend**: отмечает серию как partial (subdued color)
3. **Gap handling**: `connectNulls=true` для непрерывной линии, но missing days отмечаются визуально
4. **ChartCard header**: `sourceNote` предупреждает о неполноте

---

## 11. Insights

### 11.1 Серверные insights (anomalies)

```sql
SELECT * FROM anomalies
WHERE date BETWEEN {from} AND {to}
  AND resolved = false
ORDER BY date DESC
LIMIT 10
```

Маппинг: `spike`/`drop` → `type: 'risk'`, остальное → `type: 'info'`.

### 11.2 Клиентские insights (computeInsights)

4 архетипа, каждый с явным экспортом:

#### WinnerCard — лучший по ROMI

```typescript
const bestRomi = bundles.sort((a, b) => b.romi - a.romi)[0]
if (bestRomi && bestRomi.romi > 0) → {
  type: 'winner',
  metric: 'ROMI',
  entity: bestRomi.name,
  value: `${romi.toFixed(1)}%`,
  delta: bestRomi.delta,
  reason: `Best return on investment: ${profit} profit from ${totalRevenue} revenue.`,
  // MAX 2 short lines
  action: `View ${name} performance`,  // MAX 1 short line
  severity: 'low'
}
```

#### LoserCard — наибольшее падение revenue

```typescript
const worstDrop = bundles
  .filter(b => b.delta < 0)
  .sort((a, b) => a.delta - b.delta)[0]

severity = delta < -50 ? 'critical' : delta < -30 ? 'high' : delta < -15 ? 'medium' : 'low'

→ { type: 'loser', reason: MAX 2 lines, action: MAX 1 line }
```

#### RiskCard — главный risk

```typescript
const topRisk = rawInsights
  .filter(i => i.type === 'risk')
  .sort(by severity weight: critical=4, high=3, medium=2, low=1)[0]

→ { type: 'risk', severity: from anomaly }
```

#### OpportunityCard — наибольший рост

```typescript
const bestGain = bundles
  .filter(b => b.delta > 0)
  .sort((a, b) => b.delta - a.delta)[0]

→ { type: 'opportunity', reason: MAX 2 lines, action: MAX 1 line }
```

### 11.3 Text limits (жёсткие)

| Элемент | Лимит |
|---|---|
| label | 1 слово |
| title | metric + entity + delta — 1 строка |
| reason | Максимум 2 короткие строки |
| action | Максимум 1 строка |

### 11.4 Severity rules

| Тип | Как определяется severity |
|---|---|
| **Winner** | Всегда `low` |
| **Opportunity** | Всегда `low` |
| **Loser** | `delta < -50%` → critical, `< -30%` → high, `< -15%` → medium, else low |
| **Risk** | Из anomaly severity (critical/high/medium/low) |

---

## 12. Coverage и Sync State

### 12.1 Data Coverage

При каждом запросе к Dashboard API:

```typescript
const coverage = await ensureDataCoverage(from, to)
```

1. **Проверка**: записи в `daily_metrics` за каждый день диапазона
2. **Бэкфилл**: пропущены дни → BullMQ задачи
3. **Ресинк**: период пересекается с last 3 days и last sync > 6h → resync

### 12.2 Source Completeness (NEW)

```typescript
const sourceStatus = await checkSourceCompleteness(from, to)
// Returns:
{
  yandexMetrica: 'fresh' | 'partial' | 'stale' | 'missing',
  adspyglass:    'fresh' | 'partial' | 'stale' | 'missing',
  costs:         'fresh' | 'partial' | 'stale' | 'missing' | 'mapping_issue',
  affiliate:     'fresh' | 'partial' | 'stale' | 'missing' | 'mapping_issue',
  overall:       'fresh' | 'partial' | 'stale',
  lastSyncBySource: {
    yandexMetrica: '2025-01-15T12:00:00Z',
    adspyglass:    '2025-01-15T14:30:00Z',
    costs:         '2025-01-14T08:00:00Z',
    affiliate:     '2025-01-14T08:00:00Z',
  }
}
```

### 12.3 Coverage API response

```json
{
  "coverage": {
    "complete": false,
    "missingDates": 5,
    "syncTriggered": true,
    "resyncTriggered": true,
    "coveragePercent": 78
  },
  "sourceStatus": {
    "yandexMetrica": "fresh",
    "adspyglass": "fresh",
    "costs": "stale",
    "affiliate": "partial",
    "overall": "partial"
  }
}
```

### 12.4 UI реакция на coverage

| Состояние | UI |
|---|---|
| `coverage.complete = true`, all sources fresh | Нормальное отображение, DataFreshnessSummary скрыт |
| `coverage.complete = false`, sync triggered | Badge: `"Loading historical data for X missing days..."` |
| One source stale | DataFreshnessSummary показывает stale pill, DeltaBadge = partial |
| Source missing | DataFreshnessSummary показывает missing pill, affected KPIs = `"—"` |

---

## 13. Health Score

### 13.1 Компоненты (per site)

| Компонент | Вес | Формула |
|---|---|---|
| `profitQuality` | 20% | `clamp(0, 100, profit > 0 ? 60 + (profit/totalRevenue)×100 : 20)` |
| `romiQuality` | 15% | `clamp(0, 100, romi > 150 ? 80 + (romi-150)/5 : romi×0.5)` |
| `revenueTrend` | 15% | `clamp(0, 100, 50 + ((avgLast3 - avgFirst3)/avgFirst3)×200)` |
| `costPressure` | 10% | `clamp(0, 100, 100 - (costs/totalRevenue)×100)` |
| `formatQuality` | 10% | `min(100, numFormats × 20)` |
| `tierQuality` | 10% | `clamp(0, 100, 30 + tier1Share × 100)` |
| `anomalyPressure` | 10% | `max(0, 100 - numAnomalies × 15)` |
| `stability` | 10% | `clamp(0, 100, 100 - CV×200)` |

### 13.2 Network Health

```
networkHealth = Σ(siteHealth[i] × siteRevenue[i]) / Σ(siteRevenue[i])
```

Взвешенное среднее, где вес = totalRevenue сайта.

### 13.3 Статусы

| Балл | Статус | Цвет |
|---|---|---|
| ≥ 80 | `healthy` | green |
| 60-79 | `warning` | yellow/amber |
| < 60 | `critical` | red |

---

## 14. Anomaly Detection → Insights

### 14.1 Типы аномалий

| Тип | Метрика | Порог | Severity |
|---|---|---|---|
| `traffic_drop` | `users` | > 20% падение от 7d avg | `critical` |
| `revenue_spike` | `adRevenue` | > 15% рост | `high` |
| `revenue_drop` | `adRevenue` | > 15% падение | `high` |
| `cost_spike` | `costs` | > 25% рост | `high` |
| `fill_rate_drop` | `fillRate` | > 10% падение | `medium` |
| `romi_critical` | `romi` | < 100% | `critical` |

### 14.2 Формула

```
delta = ((actual - avg_7d) / avg_7d) × 100
```

### 14.3 Маппинг в Insights

```
anomaly type = 'spike' | 'drop' → insight type = 'risk'
anomaly type = other → insight type = 'info'
```

---

## 15. API Response Schema

### Полная структура `GET /api/dashboard`

```typescript
{
  kpis: Array<{
    label: string                         // "Visits", "Total Revenue", ...
    value: number
    delta: number                         // процент изменения
    deltaConfidence: 'full' | 'partial' | 'not-comparable'  // NEW
    format: 'currency' | 'number' | 'percent' | 'score'
    trend: number[]                       // для sparkline (пустой если нет)
    sourceStatus: 'fresh' | 'partial' | 'stale' | 'missing'  // NEW
  }>

  bundles: Array<{
    id: string
    name: string
    slug: string
    color: string
    sitesCount: number
    users: number                         // Visits (Yandex Metrica)
    totalRevenue: number
    profit: number
    romi: number
    healthScore: number | null            // 0-100
    delta: number                         // по totalRevenue
    deltaConfidence: string               // NEW
    revenueShare: number                  // % от network total, NEW
  }>

  insights: Array<{
    entity: string
    entitySlug: string
    entityType: 'site'
    metric: string
    value: string
    delta: number
    reason: string                        // MAX 2 short lines
    action: string                        // MAX 1 line
    severity: 'critical' | 'high' | 'medium' | 'low'
    type: 'risk' | 'info'
  }>

  trend: Array<{
    date: string                          // "YYYY-MM-DD"
    users: number                         // visits (Yandex Metrica)
    hits: number                          // ad requests (NOT for dashboard charts)
    adRevenue: number
    affiliateRevenue: number
    totalRevenue: number
    costs: number
    profit: number
  }>

  compareMode: 'prev_period' | 'prev_7d' | 'prev_day'

  coverage: {
    complete: boolean
    missingDates: number
    coveragePercent: number               // NEW
    syncTriggered: boolean
    resyncTriggered: boolean
  }

  sourceStatus: {                         // NEW section
    yandexMetrica: 'fresh' | 'partial' | 'stale' | 'missing'
    adspyglass: 'fresh' | 'partial' | 'stale' | 'missing'
    costs: 'fresh' | 'partial' | 'stale' | 'missing' | 'mapping_issue'
    affiliate: 'fresh' | 'partial' | 'stale' | 'missing' | 'mapping_issue'
    overall: 'fresh' | 'partial' | 'stale'
  }

  networkHealth: {                        // NEW section
    score: number                         // 0-100
    status: 'healthy' | 'warning' | 'critical'
    confidence: 'full' | 'partial' | 'low'
  }
}
```

---

## 16. Data Flow

### Полная цепочка для "Visits" KPI

```
1. Yandex Metrica API (cron sync)
   → users = 5,420 для gayxhub.com за 2025-01-15

2. sync-yandex-metrica worker
   → UPSERT daily_metrics SET users = 5420
     WHERE siteId = 'xxx' AND date = '2025-01-15'

3. GET /api/dashboard?period=7d
   → aggregateNetworkMetrics(Jan 8, Jan 14)
     → SUM(users) = 38,450 (current)
   → aggregateNetworkMetrics(Jan 1, Jan 7)
     → SUM(users) = 35,200 (previous)
   → calculateDelta(38450, 35200) = +9.2%
   → checkSourceCompleteness → yandexMetrica: 'fresh'
   → deltaConfidence = 'full'

4. Response:
   kpis[0] = {
     label: "Visits",
     value: 38450,
     delta: 9.2,
     deltaConfidence: "full",
     format: "number",
     trend: [5100, 5300, 5600, 5420, 5550, 5680, 5800],
     sourceStatus: "fresh"
   }

5. PrimaryKpiCard renders:
   ┌──────────────────────────────┐
   │  VISITS             [+9.2%]  │  ← DeltaBadge (emerald, full confidence)
   │  38,450                      │  ← formatNumber
   │  ▁▂▃▅▇█▆▅                   │  ← MiniSparkline (cyan, line-only, h-22px)
   └──────────────────────────────┘
```

### Полная цепочка для "Network Health" KPI

```
1. calculate-metrics worker (every 4h)
   → Per site: healthScore = weighted_sum(8 components)
   → gayxhub.com: 85, translove.com: 72, javhub.com: 91, ...

2. GET /api/dashboard?period=7d
   → All sites with healthScore + totalRevenue
   → networkHealth = Σ(score × revenue) / Σ(revenue)
     = (85×1200 + 72×800 + 91×1500 + ...) / (1200+800+1500+...)
     = 84.2
   → confidence = all sites have score → 'full'

3. Response:
   networkHealth = { score: 84, status: 'healthy', confidence: 'full' }
   kpis[4] = { label: "Network Health", value: 84, format: "score", ... }

4. NetworkHealthCard renders:
   ┌──────────────────────────────┐
   │  NETWORK HEALTH              │
   │  84 / 100                    │
   │  ● healthy                   │
   └──────────────────────────────┘
```

### Partial data scenario

```
1. Costs sheet not synced for 2 days (Jan 13, Jan 14)
   → sourceStatus.costs = 'partial'
   → sourceStatus.overall = 'partial'

2. Dashboard renders:
   - DataFreshnessSummary: [● Metrica: fresh] [● AdSpyglass: fresh] [● Costs: partial] [● Affiliate: fresh]
   - Profit KPI: delta shows `~+8.1%` (partial confidence)
   - ROMI KPI: delta shows `~+12.3%` (partial confidence)
   - ChartCard "Profit": sourceNote = "⚠ Costs data missing for 2 days"
   - BundleCards: profit/ROMI values normal but deltaConfidence = 'partial'
```

---

## 17. Глоссарий

| Метрика | Описание | Единица | Формула | Source of Truth |
|---|---|---|---|---|
| **Visits** | Уникальные посетители | число | — | Yandex Metrica |
| **Ad Requests** | Загрузки рекламного скрипта | число | — | AdSpyglass (НЕ для Dashboard) |
| **Impressions** | Показы рекламы | число | — | AdSpyglass |
| **Clicks** | Клики по рекламе | число | — | AdSpyglass |
| **Ad Revenue** | Доход от рекламы | USD | `broker_income` | AdSpyglass |
| **Affiliate Revenue** | Партнёрский доход | USD | — | Google Sheets |
| **Total Revenue** | Суммарный доход | USD | `adRevenue + affiliateRevenue` | Computed |
| **Costs** | Операционные расходы | USD | — | Google Sheets |
| **Profit** | Чистая прибыль | USD | `totalRevenue - costs` | Computed |
| **ROMI** | Return on Marketing Investment | % | `((totalRevenue - costs) / costs) × 100` | Computed |
| **RPM** | Revenue per 1000 Visits | USD | `(totalRevenue / users) × 1000` | Computed |
| **CTR** | Click-Through Rate | % | `(clicks / impressions) × 100` | Computed |
| **eCPM** | Effective Cost Per Mille | USD | `(adRevenue / impressions) × 1000` | Computed |
| **Fill Rate** | Процент заполнения | % | `(impressions / hits) × 100` | Computed |
| **Network Health** | Взвешенный health score сети | 0-100 | `Σ(siteHealth × siteRevenue) / Σ(siteRevenue)` | Computed |
| **Health Score** (site) | Композитный health сайта | 0-100 | Взвешенная сумма 8 компонентов | Computed |
| **Delta** | Процент изменения | % | `((current - previous) / \|previous\|) × 100` | Computed |
| **Revenue Share** | Доля бандла в сети | % | `(bundle.totalRevenue / network.totalRevenue) × 100` | Computed |
