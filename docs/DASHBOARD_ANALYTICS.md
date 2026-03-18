# Dashboard — Аналитическая документация

Исчерпывающее описание данных, метрик, формул расчёта, графиков, спарклайнов и периодов на странице `/dashboard`.

---

## Содержание

1. [Архитектура данных](#1-архитектура-данных)
2. [Периоды и режимы сравнения](#2-периоды-и-режимы-сравнения)
3. [API Dashboard](#3-api-dashboard)
4. [KPI-метрики: полный список](#4-kpi-метрики)
5. [Формулы расчёта всех метрик](#5-формулы-расчёта)
6. [Delta (дельта изменения)](#6-delta)
7. [Sparkline-данные](#7-sparkline-данные)
8. [Network Signals — логика вычисления](#8-network-signals)
9. [Bundle-метрики](#9-bundle-метрики)
10. [Trend Charts — данные графиков](#10-trend-charts)
11. [Insights — логика генерации](#11-insights)
12. [Coverage — автобэкфилл](#12-coverage)
13. [Health Score на Dashboard](#13-health-score)
14. [Anomaly Detection → Insights](#14-anomaly-detection)
15. [Полная схема данных API Response](#15-api-response-schema)
16. [Data Flow: от источника до UI](#16-data-flow)

---

## 1. Архитектура данных

### Источники данных на Dashboard

| Источник | Данные | Воркер | Таблица БД |
|---|---|---|---|
| **AdOK API** | hits, impressions, clicks, adRevenue, fillRate | `sync-adspyglass.ts` | `DailyMetric` |
| **Yandex Metrica** | users (уникальные посетители) | `sync-yandex-metrica.ts` | `DailyMetric.users` |
| **Google Sheets (Costs)** | costs (расходы по сайтам) | `sync-costs.ts` | `Cost` → `DailyMetric.costs` |
| **Google Sheets (Affiliate)** | affiliateRevenue (партнёрский доход) | `sync-affiliate.ts` | `AffiliateRevenue` → `DailyMetric.affiliateRevenue` |

### Цепочка обработки

```
Внешние API/Sheets
       │
       ▼
Sync Workers (BullMQ)
       │
       ▼
DailyMetric (raw per-site per-day)
       │
       ▼
calculate-metrics worker
(пересчёт derived: totalRevenue, profit, ROMI, RPM, CTR, eCPM, fillRate)
       │
       ▼
Health Score Service + Anomaly Detector
       │
       ▼
GET /api/dashboard?period=X&compare=Y
       │
       ▼
aggregateNetworkMetrics() + aggregateBundleMetrics() + getNetworkTrend()
       │
       ▼
JSON Response → useDashboard() hook → React Components
```

---

## 2. Периоды и режимы сравнения

### Доступные периоды

**Источник**: `src/hooks/use-period.ts`

| Значение | Диапазон | Описание |
|---|---|---|
| `today` | `startOfDay(now)` → `endOfDay(now)` | Текущий день |
| `yesterday` | `startOfDay(now - 1d)` → `endOfDay(now - 1d)` | Вчерашний день (по умолчанию) |
| `7d` | `startOfDay(now - 6d)` → `endOfDay(now)` | Последние 7 дней |
| `30d` | `startOfDay(now - 29d)` → `endOfDay(now)` | Последние 30 дней |
| `90d` | `startOfDay(now - 89d)` → `endOfDay(now)` | Последние 90 дней |
| `custom` | `from` → `to` из URL params | Произвольный диапазон |

**URL параметры**: `?period=7d&from=2025-01-01&to=2025-01-07&compare=prev_period`

### Режимы сравнения

**Источник**: `src/app/api/dashboard/route.ts:20-39`

| Режим | Описание | Пример (для period=7d, Jan 8-14) |
|---|---|---|
| `prev_period` (по умолчанию) | Зеркальный предыдущий период той же длины | Jan 1-7 |
| `prev_7d` | 7 дней до начала текущего периода | Jan 1-7 |
| `prev_day` | Один день до начала текущего периода | Jan 7 |

### Формулы расчёта предыдущего периода

```typescript
// prev_period (default):
prevFrom = startOfDay(from - periodDays)
prevTo   = endOfDay(to - periodDays)
// где periodDays = differenceInDays(to, from) + 1

// prev_7d:
prevTo   = endOfDay(from - 1d)
prevFrom = startOfDay(from - 7d)

// prev_day:
prevFrom = startOfDay(from - 1d)
prevTo   = endOfDay(from - 1d)
```

### Подпись в UI

| compare | compareLabel (в ChartCard description) |
|---|---|
| `prev_7d` | `"vs 7d ago"` |
| `prev_day` | `"vs yesterday"` |
| default | `"vs prev period"` |

---

## 3. API Dashboard

**Endpoint**: `GET /api/dashboard`

**Файл**: `src/app/api/dashboard/route.ts`

### Query Parameters

| Параметр | Тип | Default | Описание |
|---|---|---|---|
| `period` | `string` | `yesterday` | Период данных |
| `from` | `string` (YYYY-MM-DD) | — | Начало (для custom) |
| `to` | `string` (YYYY-MM-DD) | — | Конец (для custom) |
| `compare` | `string` | `prev_period` | Режим сравнения |

### Последовательность обработки

```
1. parsePeriodParam(searchParams) → { from, to }
2. getComparisonRange(from, to, compare) → { prevFrom, prevTo }
3. ensureDataCoverage(from, to) → coverage (non-blocking backfill)
4. aggregateNetworkMetrics(from, to) → current
5. aggregateNetworkMetrics(prevFrom, prevTo) → previous
6. getNetworkTrend(trendFrom, to) → trend[]
7. prisma.bundle.findMany() → allBundles
8. aggregateBundleMetrics(bundleId, from, to) → per-bundle metrics
9. prisma.anomaly.findMany() → anomalies → insights
10. Return JSON { kpis, bundles, insights, trend, compareMode, coverage }
```

### Trend Period Logic

```typescript
const periodDays = differenceInDays(to, from) + 1
const trendFrom = periodDays < 7 ? startOfDay(subDays(to, 6)) : from
// Минимум 7 дней для спарклайнов, полный период для более длинных диапазонов
```

---

## 4. KPI-метрики

### Полный список (9 KPI-карточек)

| # | Группа | label | format | Данные для sparkline | Описание |
|---|---|---|---|---|---|
| 1 | Primary | `Visitors` | `number` | `trend.map(d => d.users)` | Уникальные посетители (Yandex Metrica) |
| 2 | Primary | `Ad Revenue` | `currency` | `trend.map(d => d.adRevenue)` | Доход от рекламы (AdOK broker_income) |
| 3 | Primary | `Total Revenue` | `currency` | `trend.map(d => d.totalRevenue)` | Суммарный доход = Ad + Affiliate |
| 4 | Primary | `Profit` | `currency` | `trend.map(d => d.profit)` | Чистая прибыль = Revenue - Costs |
| 5 | Primary | `ROMI` | `percent` | `[]` (нет sparkline) | Return on Marketing Investment |
| 6 | Secondary | `Ad Requests` | `number` | `trend.map(d => d.hits)` | Загрузки рекламного скрипта (AdOK hits) |
| 7 | Secondary | `Affiliate Revenue` | `currency` | `trend.map(d => d.affiliateRevenue)` | Партнёрский доход (Google Sheets) |
| 8 | Secondary | `Costs` | `currency` | `trend.map(d => d.costs)` | Операционные расходы (Google Sheets) |
| 9 | Secondary | `RPM` | `currency` | `[]` (нет sparkline) | Revenue Per Mille (доход на 1000 users) |

### Структура KPI-объекта в API

```typescript
{
  label: string       // "Ad Revenue"
  value: number       // 12450.00
  delta: number       // 12.3 (процент изменения)
  format: string      // "currency" | "number" | "percent"
  trend: number[]     // [100, 110, 105, ...] (данные для sparkline)
}
```

---

## 5. Формулы расчёта

### Базовые метрики (сырые данные)

| Метрика | Источник | Единица |
|---|---|---|
| `users` | Yandex Metrica API | число |
| `hits` | AdOK API (`hits`) | число |
| `impressions` | AdOK API (`impressions`) | число |
| `clicks` | AdOK API (`clicks`) | число |
| `adRevenue` | AdOK API (`broker_income`) | USD |
| `affiliateRevenue` | Google Sheets (Affiliate) | USD |
| `costs` | Google Sheets (Costs) | USD |

### Вычисляемые метрики (derived)

**Источник**: `src/workers/calculate-metrics.ts` + `src/services/metrics.ts:97-120`

```
totalRevenue = adRevenue + affiliateRevenue

profit = totalRevenue - costs

ROMI = costs > 0
     ? ((totalRevenue - costs) / costs) × 100
     : 0
     (%)

RPM = users > 0
    ? (totalRevenue / users) × 1000
    : 0
    ($ per 1000 users)

CTR = impressions > 0
    ? (clicks / impressions) × 100
    : 0
    (%)

eCPM = impressions > 0
     ? (adRevenue / impressions) × 1000
     : 0
     ($ per 1000 impressions)

fillRate = hits > 0
         ? (impressions / hits) × 100
         : 0
         (%)
```

### Агрегация

**Источник**: `src/services/metrics.ts:137-159`

Для network/bundle/site уровней:

```sql
-- Prisma aggregate
SELECT
  SUM(users)            AS users,
  SUM(hits)             AS hits,
  SUM(impressions)      AS impressions,
  SUM(clicks)           AS clicks,
  SUM(adRevenue)        AS adRevenue,
  SUM(affiliateRevenue) AS affiliateRevenue,
  SUM(totalRevenue)     AS totalRevenue,
  SUM(costs)            AS costs,
  SUM(profit)           AS profit
FROM daily_metrics
WHERE date BETWEEN {from} AND {to}
  [AND site.bundleId = {bundleId}]  -- для bundle level
  [AND siteId = {siteId}]           -- для site level
```

Затем ROMI и RPM **пересчитываются из агрегатов** (не суммируются):

```typescript
romi = costs > 0 ? ((totalRevenue - costs) / costs) * 100 : 0
rpm  = users > 0 ? (totalRevenue / users) * 1000 : 0
```

> **Важно**: ROMI и RPM не суммируются из дневных значений — они вычисляются заново из суммарных показателей за период. Это даёт корректное взвешенное значение.

---

## 6. Delta (дельта изменения)

### Формула

**Источник**: `src/services/metrics.ts:434-439`

```typescript
function calculateDelta(current: number, previous: number): number {
  if (previous === 0) {
    return current > 0 ? 100 : 0    // если было 0, а стало >0 → +100%
  }
  return ((current - previous) / Math.abs(previous)) * 100
}
```

### Примеры

| current | previous | delta | Объяснение |
|---|---|---|---|
| 150 | 100 | `+50.0%` | `(150-100)/100 × 100` |
| 75 | 100 | `-25.0%` | `(75-100)/100 × 100` |
| 100 | 0 | `+100.0%` | `previous === 0, current > 0` |
| 0 | 0 | `0.0%` | `previous === 0, current === 0` |
| -50 | -100 | `+50.0%` | `(-50-(-100))/|-100| × 100` |

### Применение delta на Dashboard

Каждая KPI-карточка получает delta:

```typescript
// В API route:
{
  label: 'Ad Revenue',
  value: current.adRevenue,          // сумма за текущий период
  delta: calculateDelta(
    current.adRevenue,               // текущий агрегат
    previous.adRevenue               // предыдущий агрегат
  ),
  format: 'currency',
  trend: trend.map(d => d.adRevenue) // дневные значения для sparkline
}
```

Для бандлов delta рассчитывается по `totalRevenue`:

```typescript
delta: calculateDelta(metrics.totalRevenue, prevMetrics.totalRevenue)
```

### Отображение delta

**Файл**: `src/components/shared/delta-indicator.tsx`

```
formatPercent(delta) → `${delta >= 0 ? '+' : ''}${delta.toFixed(1)}%`

Positive (>0): зелёный pill   ▲ +12.3%
Negative (<0): красный pill   ▼ -5.7%
Neutral (=0):  серый pill       +0.0%
Invalid:       серый pill       —
```

---

## 7. Sparkline-данные

### Источник данных

**Файл**: `src/services/metrics.ts:226-261` (функция `getNetworkTrend`)

```sql
-- Prisma groupBy
SELECT
  date,
  SUM(hits) AS hits,
  SUM(users) AS users,
  SUM(adRevenue) AS adRevenue,
  SUM(affiliateRevenue) AS affiliateRevenue,
  SUM(totalRevenue) AS totalRevenue,
  SUM(costs) AS costs,
  SUM(profit) AS profit
FROM daily_metrics
WHERE date BETWEEN {trendFrom} AND {to}
GROUP BY date
ORDER BY date ASC
```

### Определение trendFrom

```typescript
const periodDays = differenceInDays(to, from) + 1
const trendFrom = periodDays < 7
  ? startOfDay(subDays(to, 6))  // минимум 7 дней для спарклайна
  : from                         // полный период для длинных периодов
```

| Период | periodDays | trendFrom | trend points |
|---|---|---|---|
| today | 1 | 6 дней назад | 7 точек |
| yesterday | 1 | 6 дней назад | 7 точек |
| 7d | 7 | from (7 дней назад) | 7 точек |
| 30d | 30 | from (29 дней назад) | 30 точек |
| 90d | 90 | from (89 дней назад) | 90 точек |

### Обработка на фронтенде

**Файл**: `src/components/shared/kpi-card.tsx:46-48`

```typescript
const sparkData = trend && trend.length > 1
  ? (trend.length > 14 ? trend.slice(-14) : trend)  // максимум 14 точек
    .map((v, i) => ({ idx: i, value: v }))
  : null
```

| Условие | Результат |
|---|---|
| `trend` = null/undefined | Пустой placeholder `h-10` |
| `trend.length <= 1` | Пустой placeholder `h-10` |
| `trend.length <= 14` | Все точки отображаются |
| `trend.length > 14` | Последние 14 точек (`slice(-14)`) |

### Маппинг trend → sparkline по метрике

| KPI | Данные sparkline |
|---|---|
| Visitors | `trend.map(d => d.users)` |
| Ad Revenue | `trend.map(d => d.adRevenue)` |
| Affiliate Revenue | `trend.map(d => d.affiliateRevenue)` |
| Total Revenue | `trend.map(d => d.totalRevenue)` |
| Costs | `trend.map(d => d.costs)` |
| Profit | `trend.map(d => d.profit)` |
| Ad Requests | `trend.map(d => d.hits)` |
| ROMI | `[]` — нет sparkline (ratio, не суммируется подневно) |
| RPM | `[]` — нет sparkline (ratio, не суммируется подневно) |

---

## 8. Network Signals — логика вычисления

**Файл**: `src/components/shared/signal-strip.tsx:87-127`

Секция вычисляет до 3 сигналов из `bundles[]` и `insights[]`.

### Signal 1: Biggest Drop

```typescript
const sorted = bundles
  .filter(b => b.delta !== undefined)
  .sort((a, b) => (a.delta ?? 0) - (b.delta ?? 0))  // от минимального delta

if (sorted[0].delta < 0) {
  signal = {
    type: 'drop',
    entity: sorted[0].name,
    value: sorted[0].totalRevenue,
    delta: sorted[0].delta,
    reason: `Revenue dropped ${абс_изменение} vs previous period`
  }
}
```

**Формула абсолютного изменения**:
```
abs_change = totalRevenue × (|delta| / 100)
```

### Signal 2: Main Risk

```typescript
// Приоритет 1: insight с type='risk' и severity high/critical
const risks = insights.filter(i => i.type === 'risk' && (i.severity === 'high' || i.severity === 'critical'))

if (risks.length > 0) {
  signal = { type: 'risk', entity: risks[0].entity, ... }
}

// Приоритет 2 (fallback): бандл с наихудшим healthScore
else {
  const worst = bundles.sort((a, b) => (a.healthScore ?? 100) - (b.healthScore ?? 100))[0]
  signal = { type: 'risk', entity: worst.name, reason: `${name} needs attention — check traffic and ad performance` }
}
```

### Signal 3: Top Performer

```typescript
const best = bundles.sort((a, b) => b.romi - a.romi)[0]

if (best) {
  signal = {
    type: 'winner',
    entity: best.name,
    value: best.profit,
    delta: best.romi,        // показывает ROMI вместо revenue delta
    reason: `Best ROI with ${profit} profit`
  }
}
```

---

## 9. Bundle-метрики

### Данные для каждого бандла

**Источник**: `src/app/api/dashboard/route.ts:128-146`

```typescript
const bundle = {
  id: bundle.id,
  name: bundle.name,           // "JAV", "Gays", "Hentai", "Trans"
  slug: bundle.slug,           // "jav", "gays", "hentai", "trans"
  color: bundle.color,         // HEX цвет
  sitesCount: bundle.sites.length,  // количество сайтов в бандле

  // Из aggregateBundleMetrics(bundleId, from, to):
  users: number,
  hits: number,
  impressions: number,
  clicks: number,
  adRevenue: number,
  affiliateRevenue: number,
  totalRevenue: number,
  costs: number,
  profit: number,
  romi: number,                // ((totalRevenue - costs) / costs) × 100
  rpm: number,                 // (totalRevenue / users) × 1000

  // Delta:
  delta: calculateDelta(metrics.totalRevenue, prevMetrics.totalRevenue)
}
```

### Метрики, отображаемые в BundleCard

| Метрика | Формат | Функция |
|---|---|---|
| Ad Requests | compact | `formatCompact(bundle.hits)` → `"12.5K"` |
| Revenue | currency | `formatCurrency(bundle.totalRevenue)` → `"$1,234.00"` |
| Profit | currency | `formatCurrency(bundle.profit)` → `"$890.00"` (зелёный/красный) |
| ROMI | percent | `${bundle.romi.toFixed(1)}%` → `"156.3%"` |

### Health Score в BundleCard

Если у бандла есть `healthScore` (рассчитывается `calculate-metrics` worker → `health-score.ts`):

```
Healthy: ≥80 → зелёный badge "85/100"
Warning: 60-79 → жёлтый badge "72/100"
Critical: <60 → красный badge "45/100"
```

---

## 10. Trend Charts — данные графиков

### Общее

Все три графика используют один и тот же массив `data.trend[]` из API response.

### Структура TrendPoint

```typescript
interface TrendPoint {
  date: string           // "2025-01-15" (YYYY-MM-DD)
  hits: number           // ad requests
  users: number          // visitors
  adRevenue: number      // ad revenue (USD)
  affiliateRevenue: number // affiliate revenue (USD)
  totalRevenue: number   // total (USD)
  costs: number          // costs (USD)
  profit: number         // profit (USD)
}
```

### Revenue Trend Chart

**Файл**: `src/components/features/charts/revenue-trend-chart.tsx`

| Параметр | Значение |
|---|---|
| **X-axis** | `date` (YYYY-MM-DD) |
| **Y-axis** | USD |
| **Categories** | `adRevenue` (violet), `affiliateRevenue` (fuchsia) |
| **Тип** | Stacked area (два наложенных area) |
| **Fill** | Gradient (5% opacity → 0%) |
| **Y formatter** | `$X.XX` (<1000) или `$X.XK` (≥1000) |
| **Height** | 288px |
| **Legend** | Показана (adRevenue, affiliateRevenue) |
| **Grid** | Горизонтальные линии, stroke gray-200 |
| **Empty state** | `"No revenue data available"` (center, gray-400) |

### Traffic Trend Chart

**Файл**: `src/components/features/charts/traffic-trend-chart.tsx`

| Параметр | Значение |
|---|---|
| **Categories** | `hits` (cyan) |
| **Y formatter** | `XK` (≥1000) или plain number |
| **Тип** | Single area |

### Profit Trend Chart

**Файл**: `src/components/features/charts/profit-trend-chart.tsx`

| Параметр | Значение |
|---|---|
| **Categories** | `profit` (emerald) |
| **Y formatter** | `$X.XX` / `$X.XK` |
| **autoMinValue** | `true` — Y-axis может уходить в отрицательные значения |
| **Тип** | Single area |

### Tooltip на графиках

При наведении на точку отображается:
```
┌────────────────────────────────┐
│ 2025-01-15                      │
├────────────────────────────────┤
│ ● adRevenue         $1,234.00  │
│ ● affiliateRevenue  $456.00    │
└────────────────────────────────┘
```

---

## 11. Insights — логика генерации

### Серверные insights (anomalies)

**Источник**: `src/app/api/dashboard/route.ts:149-170`

```sql
SELECT * FROM anomalies
WHERE date BETWEEN {from} AND {to}
  AND resolved = false
ORDER BY date DESC
LIMIT 10
```

Каждая аномалия маппится в insight:

```typescript
{
  entity: anomaly.site.name,        // имя сайта
  entitySlug: anomaly.site.slug,
  entityType: 'site',
  metric: anomaly.metric,           // "users", "adRevenue", "costs", etc.
  value: anomaly.actual.toFixed(2),
  delta: anomaly.delta,             // процент отклонения
  reason: anomaly.description
    ?? `${type} detected: expected ${expected}, got ${actual}`,
  action: `Investigate ${type} anomaly on ${metric}`,
  severity: anomaly.severity,       // "critical" | "high" | "medium" | "low"
  type: anomaly.type === 'spike' || anomaly.type === 'drop'
    ? 'risk'
    : 'info'
}
```

### Клиентские insights (computeInsights)

**Источник**: `src/app/(platform)/dashboard/page.tsx:132-187`

Функция `computeInsights(bundles, rawInsights)` генерирует до 4 типизированных инсайтов:

#### 1. Opportunity (рост revenue)

```typescript
const bestGain = bundles
  .filter(b => b.delta !== undefined && b.delta > 0)
  .sort((a, b) => (b.delta ?? 0) - (a.delta ?? 0))[0]

if (bestGain) → {
  type: 'opportunity',
  entity: bestGain.name,
  metric: 'Revenue Growth',
  value: formatCurrency(bestGain.totalRevenue),
  delta: bestGain.delta,
  reason: `${name} is the fastest growing bundle. Consider allocating more traffic.`,
  action: `View ${name} details`,
  actionHref: `/bundles/${slug}`,
  severity: 'low'
}
```

#### 2. Risk (из rawInsights)

```typescript
const sortedRisks = rawInsights
  .filter(i => i.type === 'risk')
  .sort((a, b) => {
    const weights = { critical: 4, high: 3, medium: 2, low: 1 }
    return weights[b.severity] - weights[a.severity]
  })

if (sortedRisks[0]) → { ...sortedRisks[0], type: 'risk' }
```

#### 3. Loser (падение revenue)

```typescript
const worstDrop = bundles
  .filter(b => b.delta !== undefined && b.delta < 0)
  .sort((a, b) => (a.delta ?? 0) - (b.delta ?? 0))[0]

if (worstDrop) → {
  type: 'loser',
  severity: worstDrop.delta < -20 ? 'high' : 'medium',
  reason: `${name} revenue declined significantly. Check traffic sources and site health.`,
  action: `Investigate ${name}`,
  actionHref: `/bundles/${slug}`
}
```

#### 4. Winner (лучший ROMI)

```typescript
const bestRomi = bundles.sort((a, b) => b.romi - a.romi)[0]

if (bestRomi && bestRomi.romi > 0) → {
  type: 'winner',
  metric: 'ROMI',
  value: `${romi.toFixed(1)}%`,
  reason: `Best return on investment: ${profit} profit from ${totalRevenue} revenue.`,
  action: `View ${name} performance`,
  actionHref: `/bundles/${slug}`,
  severity: 'low'
}
```

---

## 12. Coverage — автобэкфилл

**Источник**: `src/services/data-coverage.ts`

### Как работает

При каждом запросе к `/api/dashboard`:

```typescript
const coverage = await ensureDataCoverage(from, to)
```

1. **Проверка покрытия**: есть ли записи в `daily_metrics` за каждый день запрошенного диапазона
2. **Бэкфилл**: если пропущены дни → BullMQ задачи на sync-adspyglass, sync-yandex-metrica, sync-costs, sync-affiliate
3. **Ресинк**: если период пересекается с последними 3 днями и последний sync >6 часов назад → данные пересинкиваются (late-arriving data)

### Отображение на Dashboard

```typescript
// Индикатор покрытия (Coverage Badge):
{data.coverage && !data.coverage.complete && data.coverage.syncTriggered && (
  <Badge variant="light" color="indigo" size="lg" radius="lg">
    Loading historical data for {data.coverage.missingDates} missing days...
  </Badge>
)}
```

### API response coverage

```json
{
  "coverage": {
    "complete": false,       // все ли дни покрыты данными
    "missingDates": 5,       // количество пропущенных дней
    "syncTriggered": true,   // запущен ли бэкфилл
    "resyncTriggered": true  // запущен ли ресинк свежих данных
  }
}
```

---

## 13. Health Score на Dashboard

**Используется в**: BundleCard → `HealthBadge`

Health Score — композитный балл 0-100, рассчитывается ежедневно воркером `calculate-metrics`.

### 8 компонентов

| Компонент | Вес | Формула |
|---|---|---|
| `profitQuality` | 20% | `min(100, max(0, profit > 0 ? 60 + (profit/totalRevenue)×100 : 20))` |
| `romiQuality` | 15% | `min(100, max(0, romi > 150 ? 80 + (romi-150)/5 : romi×0.5))` |
| `revenueTrend` | 15% | `min(100, max(0, 50 + ((avgLast3 - avgFirst3)/avgFirst3)×200))` |
| `costPressure` | 10% | `min(100, max(0, 100 - (costs/totalRevenue)×100))` |
| `formatQuality` | 10% | `min(100, numFormats × 20)` (5+ форматов = 100) |
| `tierQuality` | 10% | `min(100, max(0, 30 + tier1Share × 100))` |
| `anomalyPressure` | 10% | `max(0, 100 - numAnomalies × 15)` |
| `stability` | 10% | `min(100, max(0, 100 - CV×200))` |

### Статусы

| Балл | Статус | Цвет badge |
|---|---|---|
| ≥ 80 | `healthy` | green |
| 60-79 | `warning` | yellow |
| < 60 | `critical` | red |

### Агрегация на уровне бандла

Среднее арифметическое `healthScore` всех сайтов бандла за текущую дату.

---

## 14. Anomaly Detection → Insights

**Источник**: `src/services/anomaly-detector.ts`

Сравнивает значения текущего дня с **7-дневным скользящим средним** (не включая текущий день).

### Типы аномалий

| Тип | Метрика | Условие | Severity |
|---|---|---|---|
| `traffic_drop` | `users` | Падение > 20% от 7д среднего | `critical` |
| `revenue_spike` | `adRevenue` | Рост > 15% от 7д среднего | `high` |
| `revenue_drop` | `adRevenue` | Падение > 15% от 7д среднего | `high` |
| `cost_spike` | `costs` | Рост > 25% от 7д среднего | `high` |
| `fill_rate_drop` | `fillRate` | Падение > 10% от 7д среднего | `medium` |
| `romi_critical` | `romi` | ROMI < 100% (ниже окупаемости) | `critical` |

### Формула аномалии

```
delta = ((actual - average_7d) / average_7d) × 100
```

### Хранение

```sql
INSERT INTO anomalies (siteId, date, type, metric, severity, expected, actual, delta, description, resolved)
```

### Маппинг в Dashboard insights

```
anomaly.type = 'spike' или 'drop' → insight.type = 'risk'
anomaly.type = другое              → insight.type = 'info'
```

---

## 15. API Response Schema

### Полная структура `GET /api/dashboard?period=7d&compare=prev_period`

```typescript
{
  // KPI-карточки (9 штук)
  kpis: Array<{
    label: string                    // "Visitors", "Ad Revenue", ...
    value: number                    // 123456
    delta: number                    // +12.3 (процент)
    format: 'currency' | 'number' | 'percent'
    trend: number[]                  // [100, 110, 105, ...] до 90 точек
  }>

  // Бандлы (4 штуки: JAV, Gays, Hentai, Trans)
  bundles: Array<{
    id: string                       // UUID
    name: string                     // "JAV"
    slug: string                     // "jav"
    color: string                    // "#EF4444"
    sitesCount: number               // 5
    users: number                    // 50000
    hits: number                     // 120000
    impressions: number              // 95000
    clicks: number                   // 3200
    adRevenue: number                // 1200.00
    affiliateRevenue: number         // 340.00
    totalRevenue: number             // 1540.00
    costs: number                    // 650.00
    profit: number                   // 890.00
    romi: number                     // 136.9
    rpm: number                      // 30.80
    delta: number                    // +15.2 (по totalRevenue vs prev period)
    healthScore?: number             // 85 (0-100)
  }>

  // Аномалии → инсайты (до 10)
  insights: Array<{
    entity: string                   // "gayxhub.com"
    entitySlug: string               // "gayxhub-com"
    entityType: 'site'
    metric: string                   // "users", "adRevenue"
    value: string                    // "1234.00"
    delta: number                    // -25.3
    reason: string                   // "Traffic dropped 25.3% below 7-day average"
    action: string                   // "Investigate drop anomaly on users"
    severity: 'critical' | 'high' | 'medium' | 'low'
    type: 'risk' | 'info'
  }>

  // Тренд (дневные данные для графиков и спарклайнов)
  trend: Array<{
    date: string                     // "2025-01-15"
    hits: number
    users: number
    adRevenue: number
    affiliateRevenue: number
    totalRevenue: number
    costs: number
    profit: number
  }>

  // Режим сравнения
  compareMode: 'prev_period' | 'prev_7d' | 'prev_day'

  // Статус покрытия данных
  coverage: {
    complete: boolean                // true если все дни покрыты
    missingDates: number             // кол-во пропущенных дней
    syncTriggered: boolean           // запущен ли бэкфилл
    resyncTriggered: boolean         // запущен ли ресинк
  }
}
```

---

## 16. Data Flow: от источника до UI

### Полная цепочка для метрики "Ad Revenue"

```
1. AdOK API (cron every 6h)
   GET /api/statistics?group_by=website&date_from=...&date_to=...
   → broker_income = 45.20 (для сайта gayxhub.com за 2025-01-15)

2. sync-adspyglass worker
   → INSERT/UPSERT INTO daily_metrics SET adRevenue = 45.20
     WHERE siteId = 'xxx' AND date = '2025-01-15'

3. calculate-metrics worker (cron every 4h, offset 30min)
   → totalRevenue = adRevenue + affiliateRevenue = 45.20 + 12.30 = 57.50
   → profit = totalRevenue - costs = 57.50 - 25.00 = 32.50
   → UPDATE daily_metrics SET totalRevenue, profit, romi, rpm, ...

4. anomaly-detector (внутри calculate-metrics)
   → 7-day avg adRevenue = 38.00
   → delta = ((45.20 - 38.00) / 38.00) × 100 = +18.9%
   → 18.9% > 15% threshold → INSERT anomaly (revenue_spike, high)

5. health-score service
   → score = weighted_sum(profitQuality, romiQuality, ...) = 82
   → INSERT health_scores SET score = 82, status = 'healthy'

6. GET /api/dashboard?period=7d&compare=prev_period
   → aggregateNetworkMetrics(Jan 8, Jan 14)
     → SUM(adRevenue) = $1,234.50 (current)
   → aggregateNetworkMetrics(Jan 1, Jan 7)
     → SUM(adRevenue) = $1,100.00 (previous)
   → calculateDelta(1234.50, 1100.00) = +12.2%
   → getNetworkTrend(Jan 8, Jan 14)
     → [{date:"2025-01-08", adRevenue:160}, {date:"2025-01-09", adRevenue:175}, ...]

7. Frontend: useDashboard('7d', 'prev_period')
   → TanStack Query → fetch('/api/dashboard?period=7d&compare=prev_period')
   → data.kpis[1] = { label: "Ad Revenue", value: 1234.50, delta: 12.2, format: "currency", trend: [160,175,...] }

8. KPICard renders:
   ┌──────────────────────────────┐
   │  AD REVENUE       [+12.2%]  │  ← DeltaBadge (emerald pill)
   │  $1,234.50                   │  ← formatCurrency(1234.50)
   │  vs prev period              │
   │  ▁▂▃▅▇█▆▅▃▂▁▃▅              │  ← SparkAreaChart (violet, 7 points)
   └──────────────────────────────┘

9. RevenueTrendChart renders:
   AreaChart с 7 точками:
     X: ["2025-01-08", ..., "2025-01-14"]
     Y1 (violet): [160, 175, 190, 180, 172, 185, 173]  ← adRevenue
     Y2 (fuchsia): [22, 25, 18, 30, 28, 24, 19]        ← affiliateRevenue
```

### Полная цепочка для Network Signal "Biggest Drop"

```
1. Все бандлы получены с delta

   JAV:    totalRevenue = $1,540, delta = +15.2%
   Gays:   totalRevenue = $2,100, delta = -8.3%
   Hentai: totalRevenue = $890,   delta = -22.1%  ← наименьший delta
   Trans:  totalRevenue = $1,200, delta = +3.5%

2. SignalStrip.computeSignals():
   sorted = [Hentai(-22.1%), Gays(-8.3%), Trans(+3.5%), JAV(+15.2%)]
   sorted[0].delta = -22.1% < 0 → signal created

3. Signal:
   {
     type: 'drop',
     entity: 'Hentai',
     value: 890,
     delta: -22.1,
     reason: "Revenue dropped $196.57 vs previous period"
             // 890 × (22.1 / 100) = $196.69
   }

4. SignalCard renders:
   ┌───┬───────────────────────────────────────┐
   │ ▌ │ 🔻 BIGGEST DROP                        │
   │ ▌ │    Hentai  [-22.1%]                    │
   │ ▌ │    Revenue dropped $196.57 vs prev...  │
   └───┴───────────────────────────────────────┘
```

---

## Глоссарий метрик

| Метрика | Описание | Единица | Формула |
|---|---|---|---|
| **Users / Visitors** | Уникальные посетители | число | Yandex Metrica API |
| **Hits / Ad Requests** | Загрузки рекламного скрипта | число | AdOK API hits |
| **Impressions** | Показы рекламы | число | AdOK API impressions |
| **Clicks** | Клики по рекламе | число | AdOK API clicks |
| **Ad Revenue** | Доход от рекламной сети | USD | AdOK API broker_income |
| **Affiliate Revenue** | Партнёрский доход | USD | Google Sheets |
| **Total Revenue** | Суммарный доход | USD | `adRevenue + affiliateRevenue` |
| **Costs** | Операционные расходы | USD | Google Sheets |
| **Profit** | Чистая прибыль | USD | `totalRevenue - costs` |
| **ROMI** | Return on Marketing Investment | % | `((totalRevenue - costs) / costs) × 100` |
| **RPM** | Revenue Per Mille | USD | `(totalRevenue / users) × 1000` |
| **CTR** | Click-Through Rate | % | `(clicks / impressions) × 100` |
| **eCPM** | Effective Cost Per Mille | USD | `(adRevenue / impressions) × 1000` |
| **Fill Rate** | Процент заполнения | % | `(impressions / hits) × 100` |
| **Health Score** | Композитный балл здоровья | 0-100 | Взвешенная сумма 8 компонентов |
| **Delta** | Процент изменения | % | `((current - previous) / |previous|) × 100` |
