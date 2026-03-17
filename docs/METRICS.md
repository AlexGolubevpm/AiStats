# Метрики дашбордов AiStats

Полная документация всех метрик, формул расчёта, источников данных и логики аналитики.

---

## 1. Источники данных

| Источник | Что даёт | Воркер синхронизации | Хранилище |
|----------|----------|---------------------|-----------|
| **AdOK API** (`AdOkService`) | hits (requests), impressions, clicks, broker_income (adRevenue), fill_rate + разбивки по сайтам (`website`), форматам (`ad_type`), странам (`country`) | `src/workers/sync-adspyglass.ts` | `DailyMetric`, `FormatMetric`, `TierMetric` |
| **Yandex Metrica** | users, pageviews (реальные данные посещаемости) | `src/workers/sync-metrika.ts` *(planned)* | `DailyMetric.users` |
| **Google Sheets (Costs)** | Операционные расходы по сайтам | `src/workers/sync-costs.ts` | `Cost` |
| **Google Sheets (Affiliate)** | Партнёрский доход по сайтам | `src/workers/sync-affiliate.ts` | `AffiliateRevenue` |

### Поток данных

```
AdOK API (group_by=website) ─────► DailyMetric (hits, impressions, clicks, adRevenue)
AdOK API (group_by=ad_type) ─────► FormatMetric (network-wide, proportional by hits)
AdOK API (group_by=country) ─────► TierMetric (network-wide, proportional by hits)
Yandex Metrica ──────────────────► DailyMetric.users (planned)
                                         │
Google Sheets (Costs) ──► Cost ──────────┤
Google Sheets (Affiliate) ──► AffiliateRevenue ──┤
                                         │
                                         ▼
                              calculate-metrics worker
                              (пересчитывает derived-поля)
                                         │
                                    ┌────┴────┐
                                    ▼         ▼
                              HealthScore  Anomaly
                                    │
                                    ▼
                              API Routes → Frontend
```

---

## 2. Базовые метрики (из AdOK API)

Источник: `sync-adspyglass.ts`, отчёт с `group_by: 'website'` — реальные per-site данные напрямую из AdOK.

| Поле | Источник из API | Описание |
|------|----------------|----------|
| `hits` | `hits` | Количество запросов (ad script loads) — **не** просмотры страниц |
| `impressions` | `impressions` | Показы рекламы |
| `clicks` | `clicks` | Клики по рекламе |
| `adRevenue` | `broker_income` | Доход от рекламной сети ($) |

> **Важно**: `hits` из AdOK — это requests (загрузки рекламного скрипта), а **не** page views и не users.

## 2.1 Users / Pageviews (из Яндекс Метрики)

| Поле | Источник | Описание |
|------|----------|----------|
| `users` | Yandex Metrica API | Уникальные посетители за день |

Маппинг сайтов на счётчики Метрики: поле `Site.metrikaCounterId` в БД.

> **Статус**: интеграция с Yandex Metrica запланирована. До подключения `users = 0` в DailyMetric.

---

## 3. Внешние метрики (из Google Sheets)

| Поле | Таблица | Маппинг на сайт |
|------|---------|-----------------|
| `costs` | `Cost` | По `site.sheetName` |
| `affiliateRevenue` | `AffiliateRevenue` | По `site.sheetName` |

> **Примечание**: Воркеры `sync-costs.ts` и `sync-affiliate.ts` загружают весь CSV из Google Sheets и импортируют все строки. При отсутствии явных параметров `from`/`to` фильтрация по датам не применяется — все данные из таблицы попадают в БД.

---

## 4. Вычисляемые метрики

### 4.1 Derived-поля в DailyMetric

Пересчитываются воркером `calculate-metrics.ts` (`src/workers/calculate-metrics.ts`):

```
totalRevenue = adRevenue + affiliateRevenue
profit       = totalRevenue - costs
CTR          = (clicks / impressions) × 100            (%)
eCPM         = (adRevenue / impressions) × 1000        ($)
RPM          = (totalRevenue / users) × 1000            ($)  ← users из Яндекс Метрики
ROMI         = ((totalRevenue - costs) / costs) × 100    (%)
fillRate     = (impressions / hits) × 100                (%)  ← hits = requests из AdOK
```

Источник: `src/workers/calculate-metrics.ts:68-74`

### 4.2 Агрегированные метрики

Источник: `src/services/metrics.ts`

При агрегации (network/bundle/site) все суммируемые поля берутся из `DailyMetric` через `prisma.aggregate({ _sum })`. ROMI и RPM пересчитываются из агрегатов:

```typescript
// src/services/metrics.ts:104-105
romi = costs > 0 ? ((totalRevenue - costs) / costs) * 100 : 0
rpm  = users > 0 ? (totalRevenue / users) * 1000 : 0
```

### 4.3 Delta (период-к-периоду)

```typescript
// src/services/metrics.ts:411-416
function calculateDelta(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return ((current - previous) / Math.abs(previous)) * 100
}
```

Предыдущий период рассчитывается зеркально:
- Если текущий = 7 дней, предыдущий = 7 дней до начала текущего.

---

## 5. Разбивки (Breakdowns)

### 5.1 По форматам рекламы (`FormatMetric`)

Источник: AdOK API с `group_by: 'ad_type'` → маппинг через `mapAdTypeToFormat()`.

Данные **сетевые** (не per-site) — распределяются на сайты **пропорционально доле трафика** (`site.hits / totalHitsForDay`).

Доступные форматы (`enum AdFormat`):

| Формат | Описание |
|--------|----------|
| `POP` | Pop-under окна |
| `PUSH` | Push-уведомления |
| `BANNER` | Баннеры |
| `SLIDER` | Слайдеры |
| `OUTSTREAM` | Outstream видео |
| `VAST` | VAST видео |
| `IN_VIDEO` | In-video реклама |
| `IN_PAGE_PUSH` | In-page push |
| `OTHER` | Прочее |

Метрики на уровне формата:
```
ctr  = (clicks / impressions) × 100
ecpm = (revenue / impressions) × 1000
rpm  = ecpm  (на уровне формата RPM ≡ eCPM)
```

### 5.2 По географическим тирам (`TierMetric`)

Источник: AdOK API с `group_by: 'country'` → ISO код → тир.

Распределение на сайты аналогично форматам — пропорционально доле трафика.

| Тир | Страны |
|-----|--------|
| **TIER_1** | US, GB, CA, AU, DE, FR, NL, SE, NO, DK, FI, CH, AT, BE, IE, NZ, LU |
| **TIER_2** | ES, IT, PT, PL, CZ, RO, HU, GR, JP, KR, SG, HK, TW, IL, AE, SA, BR, MX, AR, CL, CO |
| **TIER_3** | RU, UA, TR, TH, VN, PH, ID, MY, IN, ZA, NG, EG, KE, PE, EC |
| **TIER_4** | Все остальные |

Метрики на уровне тира:
```
ctr = (clicks / impressions) × 100
rpm = (revenue / users) × 1000
```

---

## 6. Уровни агрегации

| Уровень | Описание | API endpoint |
|---------|----------|-------------|
| **Network** | Все сайты суммарно | `GET /api/dashboard` |
| **Bundle** | Группа сайтов (напр. Gays, Trans, JAV, Hentai) | `GET /api/bundles/[id]` |
| **Site** | Отдельный сайт | `GET /api/sites/[id]` |
| **Format** | По формату рекламы (внутри site/bundle) | Часть ответа site/bundle API |
| **Tier** | По гео-тиру (внутри site) | Часть ответа site API |

---

## 7. Health Score

Источник: `src/services/health-score.ts`

Композитный балл **0–100** на уровне сайта, рассчитывается ежедневно воркером `calculate-metrics`.

### Компоненты

| Компонент | Вес | Формула | Описание |
|-----------|-----|---------|----------|
| `profitQuality` | 20% | `min(100, max(0, profit > 0 ? 60 + (profit/totalRevenue)*100 : 20))` | Качество маржинальности |
| `romiQuality` | 15% | `min(100, max(0, romi > 150 ? 80 + (romi-150)/5 : romi*0.5))` | Эффективность ROMI |
| `revenueTrend` | 15% | `min(100, max(0, 50 + ((avgLast3 - avgFirst3)/avgFirst3)*200))` | Тренд выручки: среднее последних 3 дней vs первых 3 дней из 7-дневного окна |
| `costPressure` | 10% | `min(100, max(0, 100 - (costs/totalRevenue)*100))` | Обратная доля расходов к выручке (ниже расходы = выше балл) |
| `formatQuality` | 10% | `min(100, кол-во_форматов × 20)` | Диверсификация: 5+ форматов = 100 |
| `tierQuality` | 10% | `min(100, max(0, 30 + tier1_revenue_share * 100))` | Доля TIER_1 в выручке |
| `anomalyPressure` | 10% | `max(0, 100 - кол-во_аномалий × 15)` | Давление нерешённых аномалий за 7 дней |
| `stability` | 10% | `min(100, max(0, 100 - CV*200))` | Стабильность: 100 минус коэффициент вариации daily revenue × 200 |

> **CV** = `sqrt(variance) / mean` дневной выручки за 7-дневное окно.

### Статусы

| Статус | Балл |
|--------|------|
| `healthy` | ≥ 80 |
| `warning` | 60–79 |
| `critical` | < 60 |

### Агрегация на уровне бандла

```typescript
// src/services/health-score.ts:91-98
// Среднее арифметическое score всех сайтов бандла за дату
```

---

## 8. Детекция аномалий

Источник: `src/services/anomaly-detector.ts`

Сравнивает текущие значения с **7-дневным средним** (`_avg` по DailyMetric за 7 дней до текущей даты, не включая текущий день).

| Тип аномалии | Метрика | Условие | Severity |
|--------------|---------|---------|----------|
| `traffic_drop` | `users` | Падение > 20% от 7д среднего | `critical` |
| `revenue_spike` / `revenue_drop` | `adRevenue` | Изменение > 15% (в любую сторону) | `high` |
| `cost_spike` | `costs` | Рост > 25% от 7д среднего | `high` |
| `fill_rate_drop` | `fillRate` | Падение > 10% от 7д среднего | `medium` |
| `romi_critical` | `romi` | ROMI < 100% (ниже окупаемости) | `critical` |

Формула delta:
```
delta = ((actual - average) / average) × 100
```

Аномалии сохраняются в таблицу `Anomaly` с полями `expected`, `actual`, `delta`, `description` и флагом `resolved`.

---

## 9. Conclusions Engine (автовыводы)

Источник: `src/services/conclusions-engine.ts`

Сравнивает текущий и предыдущий (зеркальный) периоды для всех бандлов и сайтов.

### Категории

| Категория | Логика отбора |
|-----------|--------------|
| **Winners** (до 3) | Сначала — top по `revenueDelta` (рост > 0), затем — top по абсолютному `romi` |
| **Losers** (до 3) | Bottom по `revenueDelta` (падение < 0), только если был доход в предыдущем периоде |
| **Risks** (до 3 + 5) | Сайты/бандлы с `profitDelta < -10%` + нерешённые аномалии severity `critical`/`high` |
| **Opportunities** (до 3 + 3) | Рост трафика > 10% при ROMI > 50% + улучшение ROMI > 15% |

### Severity маппинг

**Winners**: `revenueDelta > 50% → high`, `> 20% → medium`, иначе `low`
**Losers**: `revenueDelta < -50% → critical`, `< -30% → high`, `< -15% → medium`, иначе `low`
**Risks (profit)**: `profitDelta < -50% → critical`, `< -30% → high`, иначе `medium`

---

## 10. Forecast

Источник: `src/services/forecast-engine.ts`

Прогнозирование работает на основе **базовых значений** за выбранный период:

```typescript
{
  revenue:   adRevenue (сумма за период),
  affiliate: affiliateRevenue (сумма),
  costs:     costs (сумма),
  traffic:   users (сумма)
}
```

Фронтенд применяет сценарные коэффициенты (слайдеры) к базовым значениям.

---

## 11. Дашборд: KPI-карточки

Источник: `src/app/api/dashboard/route.ts`

| # | Метрика | Формат | Sparkline |
|---|---------|--------|-----------|
| 1 | Users | `number` | последние 7 дней users |
| 2 | Ad Revenue | `currency` | последние 7 дней adRevenue |
| 3 | Affiliate Revenue | `currency` | последние 7 дней affiliateRevenue |
| 4 | Total Revenue | `currency` | последние 7 дней totalRevenue |
| 5 | Costs | `currency` | последние 7 дней costs |
| 6 | Profit | `currency` | последние 7 дней profit |
| 7 | ROMI | `percent` | — |
| 8 | RPM | `currency` | — |

Каждая карточка показывает: текущее значение + delta vs предыдущий период + sparkline-тренд.

---

## 12. API-структуры ответов

### Dashboard (`GET /api/dashboard?period=7d`)

```json
{
  "kpis": [
    { "label": "Users", "value": 123456, "delta": 5.2, "format": "number", "trend": [100, 110, ...] }
  ],
  "bundles": [
    { "id": "...", "name": "Gays", "slug": "gays", "color": "#...", "sitesCount": 5,
      "users": 50000, "totalRevenue": 1200, "profit": 800, "romi": 150, "rpm": 24 }
  ],
  "insights": [
    { "entity": "site.com", "metric": "users", "value": "1234.00", "delta": -25.3,
      "reason": "Traffic dropped 25.3% below 7-day average", "severity": "critical", "type": "risk" }
  ],
  "trend": [
    { "date": "2025-01-01", "users": 5000, "adRevenue": 100, "affiliateRevenue": 20,
      "totalRevenue": 120, "costs": 50, "profit": 70 }
  ]
}
```

### Bundle Detail (`GET /api/bundles/[id]?period=7d`)

KPIs + sites + formatBreakdown + trend

### Site Detail (`GET /api/sites/[id]?period=7d`)

KPIs + formatBreakdown + tierBreakdown + trend + health + anomalies + costs + affiliateRevenue

---

## 13. Database Schema (ключевые таблицы)

| Таблица | Назначение | Ключевые поля |
|---------|-----------|---------------|
| `sites` | Сайты | domain, bundleId, sheetName, **metrikaCounterId**, isActive |
| `daily_metrics` | Ежедневные метрики по сайту | users (Metrica), hits (AdOK requests), impressions, clicks, adRevenue, affiliateRevenue, totalRevenue, costs, profit, romi, rpm, ctr, fillRate, ecpm |
| `format_metrics` | Разбивка по формату рекламы | format, impressions, clicks, revenue, ctr, fillRate, ecpm, rpm |
| `tier_metrics` | Разбивка по гео-тиру | tier, users, impressions, clicks, revenue, ctr, fillRate, rpm |
| `costs` | Расходы | amount, source, mappingStatus |
| `affiliate_revenues` | Партнёрский доход | amount, source |
| `health_scores` | Ежедневный health score | score, status, 8 компонентов |
| `anomalies` | Обнаруженные аномалии | type, severity, metric, expected, actual, delta, resolved |
| `ai_analyses` | AI-генерированные выводы | summary, risks, opportunities, recommendations |
| `sync_logs` | Лог синхронизаций | source, status, recordsProcessed, error |

---

## 14. Автоматический бэкфилл и ресинк

Источник: `src/services/data-coverage.ts`

### Как работает

При каждом запросе к Dashboard / Bundle / Site API система автоматически:

1. **Проверяет покрытие** — есть ли записи в `daily_metrics` за каждый день запрошенного периода
2. **Бэкфилл** — если найдены пропущенные даты, ставит в очередь BullMQ задачи:
   - `sync-adspyglass` и `sync-yandex-metrica` с конкретными `from`/`to` за пропущенные дни
   - `sync-costs` и `sync-affiliate` — полный импорт (CSV скачивается целиком)
3. **Ресинк** — если запрошенный период пересекается с последними 3 днями и последний синк был >6 часов назад, данные пересинкиваются (late-arriving data из AdSpyglass/Metrica)

### API

- `POST /api/sync/ensure-coverage` — явная проверка: `{ from: "YYYY-MM-DD", to: "YYYY-MM-DD", forceResync?: boolean }`
- `POST /api/sync` с `forceResync: true` — принудительный ресинк за указанный период

### Ответ API (поле `coverage`)

Все data-API возвращают объект `coverage`:
```json
{
  "coverage": {
    "complete": false,
    "missingDates": 5,
    "syncTriggered": true,
    "resyncTriggered": true
  }
}
```

Фронтенд может использовать `coverage.complete === false` для показа индикатора «загружаем исторические данные».
