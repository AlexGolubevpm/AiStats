# Архитектура данных AiStats

Техническая документация по архитектуре данных, потокам синхронизации и внутренней логике платформы AiStats.

---

## Содержание

1. [Общая архитектура данных](#1-общая-архитектура-данных)
2. [Data Flow](#2-data-flow)
3. [Локальное хранилище](#3-локальное-хранилище)
4. [Period Logic](#4-period-logic)
5. [Freshness / Completeness](#5-freshness--completeness)
6. [Merge / Normalization Rules](#6-merge--normalization-rules)
7. [KPI Dependencies](#7-kpi-dependencies)
8. [Caching Strategy](#8-caching-strategy)
9. [Failure Modes](#9-failure-modes)
10. [Dashboard Response Contract](#10-dashboard-response-contract)

---

## 1. Общая архитектура данных

### Источники данных

Система агрегирует данные из четырёх независимых источников:

| Источник | Что предоставляет | Чего НЕ предоставляет |
|---|---|---|
| **AdOK (AdSpyglass)** | Ad requests (hits), impressions, clicks, ad revenue (`broker_income`/`predicted_income`), fill rate, CTR, eCPM, данные по форматам (ad_type) и гео (country) | Реальных уникальных посетителей (users). Поле `hits` -- это загрузки рекламного скрипта, а не посещения |
| **Yandex Metrica** | Уникальные посетители (`ym:s:users`) в разбивке по дням для каждого счётчика | Рекламных метрик, доходов, расходов. Только трафик |
| **Google Sheets (Costs)** | Расходы по сайтам и датам из публичной Google-таблицы | Доходов, трафика. Только затраты (source: `google_sheets`) |
| **Google Sheets (Affiliate)** | Партнёрский доход по сайтам и датам из публичной Google-таблицы | Рекламного дохода, трафика. Только affiliate revenue |

### Source-of-truth правила

- **Трафик (users)**: единственный источник истины -- **Yandex Metrica**. AdOK `hits` используются как proxy трафика только для пропорционального распределения format/tier данных, но никогда не подставляются в поле `users` таблицы `DailyMetric`.
- **Рекламный доход**: единственный источник -- **AdOK**. Используется `predicted_income` (или fallback на `broker_income`) на уровне website.
- **Партнёрский доход**: единственный источник -- **Google Sheets Affiliate**. Хранится в таблице `AffiliateRevenue`, агрегируется в `DailyMetric.affiliateRevenue`.
- **Расходы**: единственный источник -- **Google Sheets Costs**. Хранится в таблице `Cost`, агрегируется в `DailyMetric.costs`.
- **Производные метрики** (totalRevenue, profit, ROMI, RPM): вычисляются системой из данных выше.

### Слой состояния синхронизации

Каждая синхронизация записывает свой статус в таблицу `SyncLog`:

| Состояние | Описание |
|---|---|
| **running** | Синхронизация запущена, данные загружаются |
| **completed** | Успешно завершена, `recordsProcessed` содержит количество обработанных записей |
| **failed** | Ошибка, поле `error` содержит текст ошибки |

Возможные проблемы данных:

- **fresh** -- данные синхронизированы менее 6 часов назад
- **partial** -- часть источников синхронизирована, часть нет (например, AdOK загружен, но Yandex Metrica ещё нет -- `users=0`)
- **stale** -- последняя синхронизация более 6 часов назад (порог в `isResyncNeeded`)
- **failed** -- последняя синхронизация завершилась ошибкой
- **mapping issues** -- часть доменов из AdOK или строк из Google Sheets не удалось сопоставить с сайтами (логируется через `job.log`)
- **missing rows** -- для запрошенных дат нет записей в `daily_metrics` (определяется через `ensureDataCoverage`)

---

## 2. Data Flow

### Полный pipeline синхронизации

```
Cron/Manual Trigger
       |
       v
  BullMQ Queue (Redis)
       |
       v
  Worker Process
       |
       v
  External API / Google Sheets
       |
       v
  Normalization + Site Matching
       |
       v
  PostgreSQL (upsert)
       |
       v
  API Request (GET /api/dashboard)
       |
       v
  aggregateNetworkMetrics() → SQL aggregate
       |
       v
  JSON Response → Frontend (React Query)
```

### Порядок обработки данных в sync pipeline

Порядок критически важен, так как каждый последующий шаг дополняет данные предыдущего:

**Шаг 1: AdOK создаёт DailyMetric с `users=0`**

Файл: `src/workers/sync-adspyglass.ts`

Worker AdOK первым создаёт записи `DailyMetric` через `upsert`. При создании:
- `users: 0` -- посетители ещё неизвестны
- `hits`, `impressions`, `clicks` -- из AdOK API (`group_by=website`)
- `adRevenue` = `predicted_income || broker_income`
- `totalRevenue` = `adRevenue` (временно, без affiliate)
- `rpm: 0` -- невозможно рассчитать без users

Также создаёт `FormatMetric` (из `group_by=ad_type`) и `TierMetric` (из `group_by=country`), распределённые пропорционально доле `hits` каждого сайта.

**Шаг 2: Yandex Metrica заполняет users и пересчитывает RPM**

Файл: `src/workers/sync-yandex-metrica.ts`

Для каждого сайта с настроенным `metrikaCounterId`:
- Запрашивает `ym:s:users` по дням из Yandex Metrica API
- Обновляет `DailyMetric.users` на реальное количество посетителей
- Пересчитывает `rpm = (totalRevenue / users) * 1000`
- Если запись `DailyMetric` ещё не существует (AdOK не дошёл), создаёт skeleton-запись только с `users`

**Шаг 3: Costs worker пересчитывает costs/profit/ROMI**

Файл: `src/workers/sync-costs.ts`

- Загружает CSV из Google Sheets целиком (без фильтрации по датам)
- Сопоставляет строки с сайтами (см. раздел 6)
- Upsert-ит записи в таблицу `Cost`
- Вызывает `recalcDailyMetricsCosts()`: группирует расходы по `(siteId, date)`, обновляет в `DailyMetric`:
  - `costs` = сумма расходов за день
  - `profit` = `totalRevenue - costs`
  - `romi` = `(totalRevenue - costs) / costs * 100`

**Шаг 4: Affiliate worker пересчитывает affiliateRevenue/totalRevenue/profit/ROMI**

Файл: `src/workers/sync-affiliate.ts`

- Загружает CSV из Google Sheets (affiliate sheet)
- Upsert-ит записи в таблицу `AffiliateRevenue`
- Вызывает `recalcDailyMetricsAffiliate()`: группирует партнёрский доход по `(siteId, date)`, обновляет в `DailyMetric`:
  - `affiliateRevenue` = сумма affiliate за день
  - `totalRevenue` = `adRevenue + affiliateRevenue`
  - `profit` = `totalRevenue - costs`
  - `romi` = `(totalRevenue - costs) / costs * 100`

**Шаг 5: Calculate Metrics worker (финальная консолидация)**

Файл: `src/workers/calculate-metrics.ts`

Для каждого активного сайта:
1. Пересчитывает все производные поля `DailyMetric` из первичных таблиц (`Cost`, `AffiliateRevenue`):
   - `affiliateRevenue`, `totalRevenue`, `costs`, `profit`, `romi`, `rpm`, `ctr`, `ecpm`
2. Рассчитывает `HealthScore` (8 взвешенных компонент)
3. Запускает `detectAnomalies()` (5 правил)

### Расписание cron (из `src/workers/index.ts`)

| Worker | Cron-выражение | Частота |
|---|---|---|
| AdOK (sync-adspyglass) | `0 */4 * * *` | Каждые 4 часа |
| Yandex Metrica | `0 1,7,13,19 * * *` | Каждые 6 часов |
| Costs (Google Sheets) | `0 3,15 * * *` | Каждые 12 часов |
| Affiliate (Google Sheets) | `0 4,16 * * *` | Каждые 12 часов |
| Calculate Metrics | `30 */4 * * *` | Каждые 4 часа (смещение 30 мин после AdOK) |

---

## 3. Локальное хранилище

### PostgreSQL (Prisma ORM)

Схема: `prisma/schema.prisma`

#### Основные сущности

| Таблица | Назначение | Ключевые поля |
|---|---|---|
| `Bundle` (`bundles`) | Группа сайтов (бандл) | `name`, `slug`, `color` |
| `Site` (`sites`) | Отдельный сайт | `domain` (unique), `slug` (unique), `bundleId`, `metrikaCounterId`, `sheetName`, `externalId` |

#### Метрики

| Таблица | Назначение | Уникальный ключ |
|---|---|---|
| `DailyMetric` (`daily_metrics`) | Основная таблица с дневными метриками | `(siteId, date)` |
| `FormatMetric` (`format_metrics`) | Метрики по рекламным форматам (POP, PUSH, BANNER и т.д.) | `(siteId, date, format)` |
| `TierMetric` (`tier_metrics`) | Метрики по гео-тирам (TIER_1..TIER_4) | `(siteId, date, tier)` |

**DailyMetric** -- центральная таблица, содержит:
- Трафик: `users` (Yandex), `hits` (AdOK), `impressions`, `clicks`
- Доходы: `adRevenue`, `affiliateRevenue`, `totalRevenue`
- Расходы: `costs`
- Производные: `profit`, `romi`, `rpm`, `ctr`, `fillRate`, `ecpm`

#### Расходы и партнёрский доход

| Таблица | Назначение | Уникальный ключ |
|---|---|---|
| `Cost` (`costs`) | Расходы из Google Sheets | `(siteId, date, source)` |
| `AffiliateRevenue` (`affiliate_revenues`) | Партнёрский доход из Google Sheets | `(siteId, date, source)` |

#### Аналитика

| Таблица | Назначение | Уникальный ключ |
|---|---|---|
| `HealthScore` (`health_scores`) | Оценка здоровья сайта (8 компонент) | `(siteId, date)` |
| `Anomaly` (`anomalies`) | Обнаруженные аномалии | нет (создаётся новая каждый раз) |
| `AiAnalysis` (`ai_analyses`) | AI-анализ на основе метрик | `(date, scope)` |

#### Системные

| Таблица | Назначение |
|---|---|
| `SyncLog` (`sync_logs`) | Лог всех синхронизаций (source, status, timing, error) |
| `Setting` (`settings`) | Хранилище настроек (ключи API, sheet IDs и т.д.) |

### Redis (BullMQ)

Файл: `src/lib/queue.ts`, `src/lib/redis.ts`

Redis используется **исключительно** для BullMQ очередей задач:

```
sync-adspyglass      — очередь синхронизации AdOK
sync-yandex-metrica  — очередь синхронизации Yandex Metrica
sync-costs           — очередь синхронизации расходов
sync-affiliate       — очередь синхронизации партнёрского дохода
calculate-metrics    — очередь расчёта производных метрик
run-analysis         — очередь AI-анализа
```

Каждая очередь имеет scheduler для cron-задач (через `upsertJobScheduler`) и принимает ad-hoc задачи (backfill, resync).

### Чего НЕТ в хранилище

- **Нет долгоживущего кэша**: система не хранит кэшированные ответы API. Каждый запрос к dashboard выполняет SQL-агрегацию напрямую из PostgreSQL.
- **Нет кэша внешних API**: ответы от AdOK и Yandex Metrica не кэшируются -- данные сразу нормализуются и записываются в БД.
- **Нет файлового хранилища**: CSV из Google Sheets парсится в памяти и не сохраняется на диск.

---

## 4. Period Logic

### Серверная сторона (UTC)

Файл: `src/services/metrics.ts` (функция `getDateRange`)

Все даты обрабатываются в UTC. Функция `getDateRange` принимает строковый период и возвращает `{ from: Date, to: Date }`:

| Период | from | to |
|---|---|---|
| `today` | `startOfDay(now)` | `endOfDay(now)` |
| `yesterday` | `startOfDay(now - 1d)` | `endOfDay(now - 1d)` |
| `7d` | `startOfDay(now - 6d)` | `endOfDay(now)` |
| `30d` | `startOfDay(now - 29d)` | `endOfDay(now)` |
| `90d` | `startOfDay(now - 89d)` | `endOfDay(now)` |
| `Nd` (произвольное) | `startOfDay(now - (N-1)d)` | `endOfDay(now)` |
| `custom` | `startOfDay(from)` | `endOfDay(to)` |

Fallback при нераспознанном периоде: `yesterday`.

### Три режима сравнения

Файл: `src/app/api/dashboard/route.ts` (функция `getComparisonRange`)

| Режим | Описание | Пример (7d: Jan 1-7) |
|---|---|---|
| `prev_period` (default) | Аналогичный по длительности период непосредственно перед текущим | Dec 25-31 |
| `prev_7d` | 7 дней до начала текущего периода | Dec 25-31 |
| `prev_day` | Один день перед началом текущего периода | Dec 31 |

Реализация `prev_period` через `getPreviousDateRange`:
```
days = differenceInDays(to, from) + 1
prevFrom = startOfDay(subDays(from, days))
prevTo = endOfDay(subDays(to, days))
```

### Правила частичного дня

Для периода `today`:
- `from` = начало сегодняшнего дня (00:00 UTC)
- `to` = конец сегодняшнего дня (23:59:59 UTC)
- Данные за сегодня могут быть неполными, так как AdOK/Yandex Metrica ещё не отдали финальные цифры

### Правила валидности сравнения

Функция `calculateDelta` (`src/services/metrics.ts`):
- Если `previous == 0` и `current > 0`: delta = 100%
- Если `previous == 0` и `current == 0`: delta = 0%
- Иначе: `((current - previous) / |previous|) * 100`

### Уровни уверенности (confidence)

Используются в модуле прогнозирования (`src/services/forecast-engine.ts`):

| Уровень | Коэффициент вариации (CV) | Описание |
|---|---|---|
| `high` | CV < 0.15 | Стабильные данные, прогноз надёжен |
| `medium` | CV < 0.35 | Умеренная волатильность |
| `low` | CV >= 0.35 | Высокая волатильность, прогноз ненадёжен |

Также неявный уровень `none` -- когда точек данных меньше 2 (trend < 2 days), прогноз просто дублирует текущие значения.

### Sparkline для трендов

Файл: `src/app/api/dashboard/route.ts`:
```typescript
const periodDays = differenceInDays(to, from) + 1
const trendFrom = periodDays < 7 ? startOfDay(subDays(to, 6)) : from
```

Для периодов короче 7 дней (today, yesterday) тренд всегда возвращает минимум 7 дней данных для осмысленных sparkline-графиков.

---

## 5. Freshness / Completeness

### Per-source freshness

Каждый источник имеет свою частоту обновления:

| Источник | Интервал синхронизации | Задержка данных |
|---|---|---|
| AdOK | 4 часа | Данные за предыдущий день доступны ~утром, текущий день -- в реальном времени с задержкой |
| Yandex Metrica | 6 часов | Данные могут задерживаться на 1-2 дня |
| Costs (Sheets) | 12 часов | Зависит от ручного ввода оператором |
| Affiliate (Sheets) | 12 часов | Зависит от ручного ввода оператором |

### ensureDataCoverage на каждый запрос dashboard

Файл: `src/services/data-coverage.ts`

При каждом запросе `GET /api/dashboard` вызывается `ensureDataCoverage(from, to)`:

1. **Проверка покрытия**: SQL-запрос `groupBy(['date'])` определяет, для каких дат есть хотя бы одна строка в `daily_metrics`
2. **Генерация полного диапазона**: `generateDateRange(from, to)` создаёт список всех дат YYYY-MM-DD
3. **Определение пропусков**: разница между полным диапазоном и существующими датами
4. **Backfill**: если есть пропуски -- группирует пропущенные даты в непрерывные диапазоны (`findContiguousRanges`) и ставит задачи в очередь:
   - `syncAdspyglassQueue.add('backfill', { from, to })`
   - `syncYandexMetricaQueue.add('backfill', { from, to })`
   - `syncCostsQueue.add('backfill', {})` -- полная загрузка листа
   - `syncAffiliateQueue.add('backfill', {})` -- полная загрузка листа

**Важно**: backfill неблокирующий -- dashboard возвращает данные, которые есть, а синхронизация работает в фоне.

### Resync недавних дат (late-arriving data)

Константа `RESYNC_STALE_DAYS = 3` -- последние 3 дня всегда кандидаты на повторную синхронизацию.

Условие resync:
1. Запрошенный диапазон пересекается с окном `[now - 3d, now]`
2. **И** последняя успешная синхронизация (`SyncLog` с `status='completed'` для `adspyglass` или `yandex_metrica`) была более 6 часов назад

Функция `isResyncNeeded` (`src/services/data-coverage.ts`, строка 147):
```typescript
const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000)
const lastSync = await prisma.syncLog.findFirst({
  where: { source: { in: ['adspyglass', 'yandex_metrica'] }, status: 'completed' },
  orderBy: { completedAt: 'desc' },
})
return !lastSync?.completedAt || lastSync.completedAt < sixHoursAgo
```

При resync ставятся задачи `resync-recent` для AdOK и Yandex Metrica на диапазон `[now - 3d, now]`.

### Принудительный resync

Через `POST /api/sync/ensure-coverage` с `forceResync: true` или через `POST /api/sync` с `forceResync: true` -- пропускает проверку 6-часового порога.

---

## 6. Merge / Normalization Rules

### Стратегии сопоставления сайтов

Данные из AdOK и Google Sheets приходят с произвольными названиями сайтов. Система использует многоуровневое сопоставление:

#### AdOK worker (`src/workers/sync-adspyglass.ts`)

Построение карты сопоставления (Map по нескольким ключам):

```typescript
// Primary: чистый домен (cleanDomain)
siteByDomain.set(cleanDomain(site.domain), site)
// Fallback: домен без TLD ("mysite" из "mysite.com")
siteByDomain.set(cleanDomain(site.domain).replace(/\.[^.]+$/, ''), site)
// Fallback: slug, name, sheetName (lowercase)
siteByDomain.set(site.slug.toLowerCase(), site)
siteByDomain.set(site.name.toLowerCase(), site)
siteByDomain.set(cleanDomain(site.sheetName), site)
```

При поиске совпадения для домена из AdOK:

```typescript
const site = siteByDomain.get(domain)                                  // точный домен
  || siteByDomain.get(domain.replace(/\.[^.]+$/, ''))                  // домен без TLD
  || siteByDomain.get(row.name.toLowerCase())                          // сырое имя из AdOK
```

Функция `cleanDomain` (`src/services/adspyglass.ts`):
- Удаляет числовой префикс AdOK (`"137648. domain.com"` -> `"domain.com"`)
- Удаляет протокол (`https://`)
- Удаляет `www.`
- Удаляет trailing slash
- Приводит к lowercase

#### Costs/Affiliate workers (`src/workers/sync-costs.ts`, `src/workers/sync-affiliate.ts`)

Используют более широкий набор стратегий с substring-matching:

```typescript
const site = sitesWithNorm.find(s =>
  (s.normSheet && s.normSheet === rawName) ||   // sheetName == rawName
  s.normName === rawName ||                      // name == rawName
  s.norm === normInput ||                        // domain == cleanDomain(rawName)
  s.normSlug === rawName ||                      // slug == rawName
  s.norm.includes(normInput) ||                  // domain содержит rawName
  normInput.includes(s.norm)                     // rawName содержит domain
)
```

Порядок приоритета:
1. `sheetName` (точное совпадение) -- специально для пользовательских имён в Google Sheets
2. `name` (точное совпадение)
3. `domain` (нормализованный, точное совпадение)
4. `slug` (точное совпадение)
5. `domain` содержит входную строку (substring)
6. Входная строка содержит `domain` (substring)

### Bundle mapping

Каждый сайт (`Site`) принадлежит одному бандлу (`Bundle`) через `site.bundleId`. Агрегация метрик на уровне бандла выполняется SQL-фильтром `site: { bundleId }` в функциях `aggregateBundleMetrics` и `getBundleTrend`.

### Пропорциональное распределение format/tier данных

AdOK API возвращает format (`group_by=ad_type`) и country (`group_by=country`) данные на уровне всей сети, без разбивки по сайтам. Система распределяет их пропорционально доле `hits` каждого сайта за конкретный день:

```typescript
// src/workers/sync-adspyglass.ts
const totalHitsForDay = formatRows.reduce((sum, r) => sum + r.hits, 0)
const siteShare = dailyMetric.hits / totalHitsForDay

const siteImpressions = Math.round(fRow.impressions * siteShare)
const siteClicks = Math.round(fRow.clicks * siteShare)
const siteRevenue = fRow.broker_income * siteShare
```

Аналогичный подход для tier-данных (country -> GeoTier):
- Страны агрегируются в тиры (TIER_1..TIER_4) по ISO-кодам
- Тир-данные распределяются по сайтам пропорционально `hits`

Классификация гео-тиров (`src/workers/sync-adspyglass.ts`):

| Тир | Страны |
|---|---|
| TIER_1 | US, GB, CA, AU, DE, FR, NL, SE, NO, DK, FI, CH, AT, BE, IE, NZ, LU |
| TIER_2 | ES, IT, PT, PL, CZ, RO, HU, GR, JP, KR, SG, HK, TW, IL, AE, SA, BR, MX, AR, CL, CO |
| TIER_3 | RU, UA, TR, TH, VN, PH, ID, MY, IN, ZA, NG, EG, KE, PE, EC |
| TIER_4 | Все остальные |

### Маппинг форматов рекламы

AdOK использует текстовые названия форматов, которые маппятся в enum `AdFormat` (`src/services/adspyglass.ts`):

```typescript
'Popunder' | 'Pop'              → POP
'Push Notification' | 'Push'    → PUSH
'Banner' | 'Display'            → BANNER
'Slider'                        → SLIDER
'Outstream'                     → OUTSTREAM
'VAST' | 'VAST Link URL'       → VAST
'In-Video'                      → IN_VIDEO
'In-Page Push' | 'InPage Push' → IN_PAGE_PUSH
(всё остальное)                 → OTHER
```

### Выравнивание данных по датам

Все источники используют формат `YYYY-MM-DD` и UTC timezone. При создании дат из строк всегда используется suffix `T00:00:00.000Z`:

```typescript
const date = new Date(dateStr + 'T00:00:00.000Z')
```

Google Sheets парсер (`src/services/google-sheets.ts`) распознаёт несколько форматов дат:
- `YYYY-MM-DD`
- `DD.MM.YYYY` / `DD/MM/YYYY`
- `MM/DD/YYYY` (если первое число <= 12)
- Fallback: `Date.parse()`

---

## 7. KPI Dependencies

### Карта зависимостей метрик от источников

```
Visitors (users)
  └── Yandex Metrica (ym:s:users)

Ad Requests (hits)
  └── AdOK (group_by=website → hits)

Ad Revenue (adRevenue)
  └── AdOK (predicted_income || broker_income)

Affiliate Revenue (affiliateRevenue)
  └── Google Sheets (affiliate sheet) → AffiliateRevenue table → DailyMetric

Total Revenue (totalRevenue)
  └── adRevenue + affiliateRevenue
      └── AdOK + Google Sheets Affiliate

Costs (costs)
  └── Google Sheets (costs sheet) → Cost table → DailyMetric

Profit (profit)
  └── totalRevenue - costs
      └── AdOK + Google Sheets Affiliate + Google Sheets Costs

ROMI (romi)
  └── (totalRevenue - costs) / costs * 100
      └── AdOK + Google Sheets Affiliate + Google Sheets Costs

RPM (rpm)
  └── totalRevenue / users * 1000
      └── AdOK + Google Sheets Affiliate + Yandex Metrica

CTR (ctr)
  └── clicks / impressions * 100
      └── AdOK

Fill Rate (fillRate)
  └── impressions / hits * 100
      └── AdOK

eCPM (ecpm)
  └── adRevenue / impressions * 1000
      └── AdOK

Network Health (healthScore)
  └── Средневзвешенное 8 компонент (см. раздел 10)
      └── DailyMetric + FormatMetric + TierMetric + Anomaly
```

### Формулы расчёта (из `src/services/metrics.ts` и workers)

```
totalRevenue = adRevenue + affiliateRevenue
profit       = totalRevenue - costs
romi         = costs > 0 ? ((totalRevenue - costs) / costs) * 100 : 0
rpm          = users > 0 ? (totalRevenue / users) * 1000 : 0
ctr          = impressions > 0 ? (clicks / impressions) * 100 : 0
fillRate     = hits > 0 ? (impressions / hits) * 100 : 0
ecpm         = impressions > 0 ? (adRevenue / impressions) * 1000 : 0
```

---

## 8. Caching Strategy

### Отсутствие долгоживущего кэша

Система **не использует** серверный кэш ответов. Каждый запрос к API выполняет:
1. `ensureDataCoverage(from, to)` -- проверка покрытия, неблокирующий backfill
2. `aggregateNetworkMetrics(from, to)` -- прямой SQL `aggregate()` по `daily_metrics`
3. `getNetworkTrend(trendFrom, to)` -- прямой SQL `groupBy(['date'])` по `daily_metrics`

Это гарантирует, что dashboard всегда показывает самые актуальные данные из PostgreSQL.

### PostgreSQL как единственный "кэш"

Данные из внешних API (AdOK, Yandex Metrica, Google Sheets) загружаются воркерами и записываются в PostgreSQL через `upsert`. Повторный запрос к dashboard не обращается к внешним API -- только к локальной БД.

### React Query на фронтенде

Файл: `src/hooks/use-api.ts`

Клиентское кэширование реализовано через `@tanstack/react-query`:

```typescript
useQuery({
  queryKey: ['dashboard', qs],
  queryFn: () => fetchApi(`/api/dashboard?${qs}`),
})
```

React Query кэширует ответы по `queryKey` и автоматически инвалидирует их при смене параметров (period, compare). Время жизни определяется настройками React Query по умолчанию (staleTime, gcTime).

### Интервалы cron-синхронизации

Файл: `src/workers/index.ts`

| Worker | Cron | Смысл |
|---|---|---|
| `sync-adspyglass` | `0 */4 * * *` | Каждые 4 часа (00:00, 04:00, 08:00, ...) |
| `sync-yandex-metrica` | `0 1,7,13,19 * * *` | Каждые 6 часов (01:00, 07:00, 13:00, 19:00) |
| `sync-costs` | `0 3,15 * * *` | Каждые 12 часов (03:00, 15:00) |
| `sync-affiliate` | `0 4,16 * * *` | Каждые 12 часов (04:00, 16:00) |
| `calculate-metrics` | `30 */4 * * *` | Каждые 4 часа со смещением 30 мин (00:30, 04:30, 08:30, ...) |

Смещение calculate-metrics на 30 минут обеспечивает, что к моменту расчёта производных метрик AdOK-данные уже загружены.

---

## 9. Failure Modes

### 1. Источник недоступен (Source unavailable)

**Ситуация**: AdOK API или Yandex Metrica возвращает ошибку или timeout.

**Обработка**:
- Worker ловит ошибку в `try/catch`
- SyncLog записывается со `status: 'failed'` и текстом ошибки
- BullMQ автоматически ретраит задачу (если настроены retry policies)
- Dashboard продолжает работать на основе ранее загруженных данных
- Timeout запросов к API: 30 секунд (`AbortSignal.timeout(30_000)`)

**Для Yandex Metrica**: ошибка одного счётчика не останавливает синхронизацию остальных:
```typescript
// src/workers/sync-yandex-metrica.ts
try { ... } catch (siteError) {
  await job.log(`Error for ${site.name}: ${message}`)
  // Continue with other sites
}
```

### 2. Частичные данные (Partial data)

**Ситуация**: AdOK загрузился, но Yandex Metrica ещё нет. В `DailyMetric` поле `users=0`, `rpm=0`.

**Обработка**:
- Dashboard показывает данные как есть. KPI "Visitors" будет 0 для этих дат.
- При следующей синхронизации Yandex Metrica данные дополнятся.
- `ensureDataCoverage` при запросе dashboard может инициировать resync недавних дат.

### 3. Устаревшие данные (Stale data)

**Ситуация**: Последняя успешная синхронизация была более 6 часов назад.

**Обработка**:
- `isResyncNeeded()` возвращает `true`
- `ensureDataCoverage` автоматически ставит задачи `resync-recent` для последних 3 дней
- Dashboard возвращает `coverage.resyncTriggered: true` в ответе

### 4. Проблемы маппинга (Mapping issues)

**Ситуация**: Домен из AdOK или название сайта из Google Sheets не найдено в таблице `sites`.

**Обработка для AdOK**:
- Несопоставленные домены логируются: `job.log('Unmatched domains: ...')`
- Данные этих доменов пропускаются, но остальные обрабатываются нормально

**Обработка для Google Sheets (Costs/Affiliate)**:
- Несопоставленные строки пропускаются с предупреждением (первые 5 строк логируются)
- Счётчик `skipped` возвращается в результате: `{ recordsProcessed, skipped }`
- Решение: добавить `sheetName` в настройках сайта, совпадающее с именем в Google Sheet

### 5. Отсутствующие строки (Missing rows)

**Ситуация**: Для запрошенного периода нет записей в `daily_metrics`.

**Обработка**:
- `ensureDataCoverage` определяет пропущенные даты
- Группирует их в непрерывные диапазоны для минимизации API-вызовов
- Ставит backfill-задачи во все 4 очереди
- Dashboard возвращает:
  ```json
  {
    "coverage": {
      "complete": false,
      "missingDates": 5,
      "syncTriggered": true,
      "resyncTriggered": false
    }
  }
  ```
- Агрегация метрик (`aggregateNetworkMetrics`) корректно обрабатывает отсутствие данных -- SQL `aggregate` возвращает `null`, который приводится к 0

### 6. Ошибка Google Sheets

**Ситуации и обработка** (`src/services/google-sheets.ts`):
- **404 (Sheet not found)**: `Sheet not found. Check that the sheet ID is correct`
- **403 (Not public)**: `Sheet is not publicly accessible. Go to Share -> "Anyone with the link" -> Viewer`
- **Отсутствуют обязательные колонки**: `Cannot find site/name column in sheet. Headers: ...`
- **Пустой лист**: `Sheet is empty or has only headers`

---

## 10. Dashboard Response Contract

### Структура ответа GET /api/dashboard

Файл: `src/app/api/dashboard/route.ts`

```typescript
{
  kpis: KPICard[],        // 9 карточек с метриками
  bundles: BundleCard[],  // метрики по каждому бандлу
  insights: InsightCard[],// до 10 нерешённых аномалий
  trend: TrendPoint[],    // временной ряд для графиков
  compareMode: string,    // 'prev_period' | 'prev_7d' | 'prev_day'
  coverage: {
    complete: boolean,        // все даты покрыты?
    missingDates: number,     // количество пропущенных дат
    syncTriggered: boolean,   // были ли поставлены задачи backfill?
    resyncTriggered: boolean, // был ли запущен resync недавних дат?
  }
}
```

#### KPI Cards (9 штук)

| Label | Format | Trend |
|---|---|---|
| Visitors | `number` | sparkline users[] |
| Ad Requests | `number` | sparkline hits[] |
| Ad Revenue | `currency` | sparkline adRevenue[] |
| Affiliate Revenue | `currency` | sparkline affiliateRevenue[] |
| Total Revenue | `currency` | sparkline totalRevenue[] |
| Costs | `currency` | sparkline costs[] |
| Profit | `currency` | sparkline profit[] |
| ROMI | `percent` | (пустой массив) |
| RPM | `currency` | (пустой массив) |

Каждая KPI-карточка:
```typescript
{
  label: string,
  value: number,      // текущий период
  delta: number,      // % изменения vs сравнительный период
  format: string,     // 'number' | 'currency' | 'percent'
  trend: number[],    // массив значений для sparkline
}
```

#### Bundle Cards

```typescript
{
  id: string,
  name: string,
  slug: string,
  color: string | null,
  sitesCount: number,
  users: number,
  hits: number,
  impressions: number,
  clicks: number,
  adRevenue: number,
  affiliateRevenue: number,
  totalRevenue: number,
  costs: number,
  profit: number,
  romi: number,
  rpm: number,
  delta: number,       // % изменения totalRevenue vs prev period
}
```

#### Insight Cards (из Anomaly)

```typescript
{
  entity: string,       // имя сайта
  entitySlug: string,
  entityType: 'site',
  metric: string,       // 'hits' | 'adRevenue' | 'costs' | 'fillRate' | 'romi'
  value: string,        // actual value (formatted)
  delta: number,        // % отклонения
  reason: string,       // описание аномалии
  action: string,       // рекомендуемое действие
  severity: string,     // 'low' | 'medium' | 'high' | 'critical'
  type: 'risk' | 'info',
}
```

#### Trend Points

```typescript
{
  date: string,          // 'YYYY-MM-DD'
  hits: number,
  users: number,
  adRevenue: number,
  affiliateRevenue: number,
  totalRevenue: number,
  costs: number,
  profit: number,
}
```

### Health Score: 8 взвешенных компонент

Файл: `src/services/health-score.ts`

Каждый компонент оценивается от 0 до 100, итоговый score -- взвешенная сумма:

| Компонент | Вес | Логика расчёта |
|---|---|---|
| `profitQuality` | **0.20** | Прибыльность: `profit > 0 ? 60 + (profit/totalRevenue)*100 : 20`. Зажато [0, 100] |
| `romiQuality` | **0.15** | Возврат инвестиций: `romi > 150 ? 80 + (romi-150)/5 : romi*0.5`. Зажато [0, 100] |
| `revenueTrend` | **0.15** | Тренд выручки: сравнение среднего первых 3 дней vs последних 3 дней за 7-дневное окно |
| `costPressure` | **0.10** | Давление расходов: `100 - (costs/totalRevenue)*100`. Ниже = больше расходов |
| `formatQuality` | **0.10** | Разнообразие форматов: `min(100, количество_форматов * 20)`. 5+ форматов = 100 |
| `tierQuality` | **0.10** | Качество гео: `30 + tier1_share * 100`. Выше доля TIER_1 = лучше |
| `anomalyPressure` | **0.10** | Давление аномалий: `100 - penalty`. Penalty: critical=25, high=15, другие=10 за каждую нерешённую аномалию за 7 дней |
| `stability` | **0.10** | Стабильность: `100 - CV*200`, где CV -- коэффициент вариации дневного дохода за 7 дней |

**Сумма весов: 0.20 + 0.15 + 0.15 + 0.10 + 0.10 + 0.10 + 0.10 + 0.10 = 1.00**

Итоговый статус:
- `score >= 80` -> `healthy`
- `score >= 60` -> `warning`
- `score < 60` -> `critical`

### Anomaly Detection: 5 правил

Файл: `src/services/anomaly-detector.ts`

Все правила сравнивают текущий день с 7-дневным средним (по `daily_metrics` за `[date-7d, date)`):

| # | Правило | Порог | Severity | Тип |
|---|---|---|---|---|
| 1 | **Traffic drop** | Hits (requests) упали >20% vs 7d avg | `critical` | `traffic_drop` |
| 2 | **Revenue change** | Ad Revenue изменился >15% (в любую сторону) vs 7d avg | `high` | `revenue_spike` / `revenue_drop` |
| 3 | **Cost spike** | Costs выросли >25% vs 7d avg | `high` | `cost_spike` |
| 4 | **Fill rate drop** | Fill Rate упал >10% vs 7d avg | `medium` | `fill_rate_drop` |
| 5 | **ROMI below breakeven** | ROMI < 100% (убыточность) | `critical` | `romi_critical` |

Защитные проверки:
- Если нет данных за сегодня (`today == null`) -- аномалии не генерируются
- Если среднее `hits` за 7 дней равно 0 -- аномалии не генерируются
- Если `hits == 0` и `impressions == 0` -- данные скорее всего не синхронизированы, пропуск
- Для revenue/costs/fillRate -- проверка `avg > 0` перед расчётом delta

---

*Документ сгенерирован на основе исходного кода проекта AiStats. Все ссылки на файлы относительно корня проекта.*
