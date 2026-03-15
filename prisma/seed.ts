import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ─── Deterministic PRNG (Mulberry32) ───

function mulberry32(seed: number): () => number {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(42);

function randInt(min: number, max: number): number {
  return Math.floor(rand() * (max - min + 1)) + min;
}

function randFloat(min: number, max: number): number {
  return rand() * (max - min) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(rand() * arr.length)];
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function round(val: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(val * factor) / factor;
}

// ─── Constants ───

const BUNDLE_DEFS = [
  { name: 'Gays', slug: 'gays', color: '#3B82F6', adRevMin: 40, adRevMax: 80, usersMin: 6000, usersMax: 12000 },
  { name: 'Trans', slug: 'trans', color: '#EC4899', adRevMin: 30, adRevMax: 60, usersMin: 4000, usersMax: 9000 },
  { name: 'JAV', slug: 'jav', color: '#EF4444', adRevMin: 30, adRevMax: 55, usersMin: 4000, usersMax: 8000 },
  { name: 'Hentai', slug: 'hentai', color: '#8B5CF6', adRevMin: 25, adRevMax: 50, usersMin: 3000, usersMax: 6000 },
] as const;

const SITES_PER_BUNDLE = 10;
const DAYS = 30;

const ALL_FORMATS = ['POP', 'PUSH', 'BANNER', 'SLIDER', 'OUTSTREAM', 'VAST', 'OTHER'] as const;
const ALL_TIERS = ['TIER_1', 'TIER_2', 'TIER_3', 'TIER_4'] as const;

// Format impression share weights (POP and BANNER dominant)
const FORMAT_WEIGHTS: Record<string, number> = {
  POP: 0.25,
  BANNER: 0.22,
  PUSH: 0.15,
  SLIDER: 0.12,
  OUTSTREAM: 0.10,
  VAST: 0.09,
  OTHER: 0.07,
};

// Tier distribution: users% and revenue share
const TIER_CONFIG = [
  { tier: 'TIER_1' as const, userShare: 0.30, revenueShare: 0.50 },
  { tier: 'TIER_2' as const, userShare: 0.28, revenueShare: 0.27 },
  { tier: 'TIER_3' as const, userShare: 0.25, revenueShare: 0.15 },
  { tier: 'TIER_4' as const, userShare: 0.17, revenueShare: 0.08 },
];

const SITE_PREFIXES: Record<string, { prefix: string; domainBase: string }> = {
  gays: { prefix: 'gays-tube', domainBase: 'gaystube' },
  trans: { prefix: 'trans-tube', domainBase: 'transtube' },
  jav: { prefix: 'jav-tube', domainBase: 'javtube' },
  hentai: { prefix: 'hentai-tube', domainBase: 'hentaitube' },
};

// ─── Date helpers ───

function getDateRange(days: number): Date[] {
  const dates: Date[] = [];
  const today = new Date('2026-03-15');
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    d.setUTCHours(0, 0, 0, 0);
    dates.push(d);
  }
  return dates;
}

function isWeekend(date: Date): boolean {
  const day = date.getUTCDay();
  return day === 0 || day === 6;
}

// ─── Seed logic ───

async function main() {
  console.log('Seeding database...\n');

  // 1. Clear all data in FK-safe order
  console.log('Clearing existing data...');
  await prisma.anomaly.deleteMany();
  await prisma.healthScore.deleteMany();
  await prisma.formatMetric.deleteMany();
  await prisma.tierMetric.deleteMany();
  await prisma.cost.deleteMany();
  await prisma.affiliateRevenue.deleteMany();
  await prisma.dailyMetric.deleteMany();
  await prisma.site.deleteMany();
  await prisma.bundle.deleteMany();
  await prisma.aiAnalysis.deleteMany();
  await prisma.syncLog.deleteMany();
  await prisma.setting.deleteMany();
  console.log('All data cleared.\n');

  // 2. Create bundles
  console.log('Creating bundles...');
  const bundles = await Promise.all(
    BUNDLE_DEFS.map((def) =>
      prisma.bundle.create({
        data: {
          name: def.name,
          slug: def.slug,
          color: def.color,
        },
      })
    )
  );
  console.log(`Created ${bundles.length} bundles.`);

  // 3. Create sites
  console.log('Creating sites...');
  const siteRecords: Array<{
    id: string;
    bundleId: string;
    bundleSlug: string;
    siteIndex: number;
  }> = [];

  for (const bundle of bundles) {
    const def = BUNDLE_DEFS.find((b) => b.slug === bundle.slug)!;
    const sitePrefix = SITE_PREFIXES[def.slug];

    for (let i = 1; i <= SITES_PER_BUNDLE; i++) {
      const num = String(i).padStart(2, '0');
      const site = await prisma.site.create({
        data: {
          name: `${sitePrefix.prefix}-${num}`,
          slug: `${sitePrefix.prefix}-${num}`,
          domain: `${sitePrefix.domainBase}${num}.com`,
          bundleId: bundle.id,
          externalId: `ext-${def.slug}-${num}`,
          sheetName: `${def.name} ${num}`,
          isActive: true,
        },
      });
      siteRecords.push({
        id: site.id,
        bundleId: bundle.id,
        bundleSlug: def.slug,
        siteIndex: i,
      });
    }
  }
  console.log(`Created ${siteRecords.length} sites.\n`);

  // 4. Generate 30 days of metrics
  const dates = getDateRange(DAYS);
  console.log(`Generating metrics for ${DAYS} days across ${siteRecords.length} sites...`);

  const dailyMetricsBatch: Array<Record<string, unknown>> = [];
  const formatMetricsBatch: Array<Record<string, unknown>> = [];
  const tierMetricsBatch: Array<Record<string, unknown>> = [];
  const costsBatch: Array<Record<string, unknown>> = [];
  const affiliateRevBatch: Array<Record<string, unknown>> = [];
  const healthScoreBatch: Array<Record<string, unknown>> = [];

  for (const site of siteRecords) {
    const bundleDef = BUNDLE_DEFS.find((b) => b.slug === site.bundleSlug)!;

    // Per-site baseline variation (some sites perform better than others)
    const siteQuality = 0.8 + rand() * 0.4; // 0.8 - 1.2 multiplier

    for (const date of dates) {
      const weekend = isWeekend(date);
      const seasonality = weekend ? 1.15 : 1.0;

      // Base metrics
      const users = Math.round(
        randInt(bundleDef.usersMin, bundleDef.usersMax) * siteQuality * seasonality
      );
      const hitsPerUser = randFloat(2.5, 4.5);
      const hits = Math.round(users * hitsPerUser);
      const impressionsPerHit = randFloat(3.0, 5.0);
      const impressions = Math.round(hits * impressionsPerHit);
      const ctrBase = randFloat(0.015, 0.035);
      const clicks = Math.round(impressions * ctrBase);
      const ctr = round(clicks / impressions, 4);

      // Revenue
      const adRevenue = round(
        randFloat(bundleDef.adRevMin, bundleDef.adRevMax) * siteQuality * seasonality,
        4
      );
      const affiliateAmount = round(adRevenue * randFloat(0.08, 0.20), 4);
      const totalRevenue = round(adRevenue + affiliateAmount, 4);

      // Costs (main matched cost)
      const costRatio = randFloat(0.35, 0.65);
      const mainCost = round(adRevenue * costRatio, 4);
      const totalCosts = mainCost;

      // Derived
      const profit = round(totalRevenue - totalCosts, 4);
      const romi = totalCosts > 0 ? round(((totalRevenue - totalCosts) / totalCosts) * 100, 2) : 0;
      const rpm = users > 0 ? round((totalRevenue / users) * 1000, 4) : 0;
      const fillRate = round(randFloat(0.60, 0.85), 4);
      const ecpm = impressions > 0 ? round((adRevenue / impressions) * 1000, 4) : 0;

      // Daily metric
      (dailyMetricsBatch as any[]).push({
        siteId: site.id,
        date,
        users,
        hits,
        impressions,
        clicks,
        adRevenue,
        affiliateRevenue: affiliateAmount,
        totalRevenue,
        costs: totalCosts,
        profit,
        romi,
        rpm,
        ctr,
        fillRate,
        ecpm,
      });

      // Format metrics (4-5 of 7 formats)
      const formatCount = randInt(4, 5);
      const selectedFormats = shuffle([...ALL_FORMATS]).slice(0, formatCount);

      // Ensure POP and BANNER are likely included for dominance
      const mustHave = ['POP', 'BANNER'] as const;
      for (const fmt of mustHave) {
        if (!selectedFormats.includes(fmt) && selectedFormats.length < 6) {
          selectedFormats[selectedFormats.length - 1] = fmt;
        }
      }

      // Normalize weights for selected formats
      const totalWeight = selectedFormats.reduce((sum, f) => sum + (FORMAT_WEIGHTS[f] || 0.1), 0);

      for (const format of selectedFormats) {
        const weight = (FORMAT_WEIGHTS[format] || 0.1) / totalWeight;
        const fmtImpressions = Math.round(impressions * weight * randFloat(0.85, 1.15));
        const fmtCtr = randFloat(0.012, 0.04);
        const fmtClicks = Math.round(fmtImpressions * fmtCtr);
        const fmtRevenue = round(adRevenue * weight * randFloat(0.85, 1.15), 4);
        const fmtFillRate = round(randFloat(0.60, 0.85), 4);
        const fmtEcpm = fmtImpressions > 0 ? round((fmtRevenue / fmtImpressions) * 1000, 4) : 0;
        const fmtRpm = users > 0 ? round((fmtRevenue / users) * 1000, 4) : 0;

        (formatMetricsBatch as any[]).push({
          siteId: site.id,
          date,
          format,
          impressions: fmtImpressions,
          clicks: fmtClicks,
          revenue: fmtRevenue,
          ctr: round(fmtClicks / Math.max(fmtImpressions, 1), 4),
          fillRate: fmtFillRate,
          ecpm: fmtEcpm,
          rpm: fmtRpm,
        });
      }

      // Tier metrics (all 4 tiers)
      for (const tierCfg of TIER_CONFIG) {
        const tierUsers = Math.round(users * tierCfg.userShare * randFloat(0.9, 1.1));
        const tierImpressions = Math.round(impressions * tierCfg.userShare * randFloat(0.9, 1.1));
        const tierClicks = Math.round(tierImpressions * randFloat(0.015, 0.035));
        const tierRevenue = round(adRevenue * tierCfg.revenueShare * randFloat(0.9, 1.1), 4);
        const tierFillRate = round(randFloat(0.60, 0.85), 4);
        const tierRpm = tierUsers > 0 ? round((tierRevenue / tierUsers) * 1000, 4) : 0;
        const tierCtr = tierImpressions > 0 ? round(tierClicks / tierImpressions, 4) : 0;

        (tierMetricsBatch as any[]).push({
          siteId: site.id,
          date,
          tier: tierCfg.tier,
          users: tierUsers,
          impressions: tierImpressions,
          clicks: tierClicks,
          revenue: tierRevenue,
          ctr: tierCtr,
          fillRate: tierFillRate,
          rpm: tierRpm,
        });
      }

      // Cost record (matched)
      (costsBatch as any[]).push({
        siteId: site.id,
        date,
        amount: mainCost,
        source: 'google_sheets',
        mappingStatus: 'matched',
      });

      // Affiliate revenue record
      (affiliateRevBatch as any[]).push({
        siteId: site.id,
        date,
        amount: affiliateAmount,
        source: 'affiliate_network',
      });

      // Health score
      const isGoodRomi = romi > 80;
      const baseScore = isGoodRomi ? randInt(75, 95) : randInt(55, 70);
      const score = Math.min(100, Math.max(0, baseScore));
      const status = score >= 80 ? 'healthy' : score >= 60 ? 'warning' : 'critical';

      (healthScoreBatch as any[]).push({
        siteId: site.id,
        date,
        score,
        status,
        profitQuality: round(randFloat(50, 100), 2),
        romiQuality: round(randFloat(50, 100), 2),
        revenueTrend: round(randFloat(-10, 15), 2),
        costPressure: round(randFloat(10, 60), 2),
        formatQuality: round(randFloat(55, 95), 2),
        tierQuality: round(randFloat(50, 90), 2),
        anomalyPressure: round(randFloat(0, 30), 2),
        stability: round(randFloat(60, 98), 2),
      });
    }
  }

  // Bulk insert metrics
  console.log('Inserting daily metrics...');
  await prisma.dailyMetric.createMany({ data: dailyMetricsBatch as any });
  console.log(`  ${(dailyMetricsBatch as any[]).length} daily metrics inserted.`);

  console.log('Inserting format metrics...');
  await prisma.formatMetric.createMany({ data: formatMetricsBatch as any });
  console.log(`  ${(formatMetricsBatch as any[]).length} format metrics inserted.`);

  console.log('Inserting tier metrics...');
  await prisma.tierMetric.createMany({ data: tierMetricsBatch as any });
  console.log(`  ${(tierMetricsBatch as any[]).length} tier metrics inserted.`);

  console.log('Inserting costs...');
  await prisma.cost.createMany({ data: costsBatch as any });
  console.log(`  ${(costsBatch as any[]).length} cost records inserted.`);

  console.log('Inserting affiliate revenue...');
  await prisma.affiliateRevenue.createMany({ data: affiliateRevBatch as any });
  console.log(`  ${(affiliateRevBatch as any[]).length} affiliate revenue records inserted.`);

  console.log('Inserting health scores...');
  await prisma.healthScore.createMany({ data: healthScoreBatch as any });
  console.log(`  ${(healthScoreBatch as any[]).length} health scores inserted.`);

  // 5. Unmatched cost records (3-5 per site/day for a subset of sites)
  console.log('\nGenerating unmatched cost records...');
  const unmatchedCosts: any[] = [];
  const unmatchedSites = siteRecords.slice(0, 12); // First 12 sites get unmatched costs
  const unmatchedSources = ['manual_entry', 'external_api', 'csv_import'];

  for (const site of unmatchedSites) {
    // Pick 3-5 random days for unmatched costs
    const dayCount = randInt(3, 5);
    const selectedDays = shuffle([...dates]).slice(0, dayCount);

    for (const date of selectedDays) {
      const source = pick(unmatchedSources);
      unmatchedCosts.push({
        siteId: site.id,
        date,
        amount: round(randFloat(5, 25), 4),
        source,
        mappingStatus: 'unmatched',
      });
    }
  }
  await prisma.cost.createMany({ data: unmatchedCosts });
  console.log(`  ${unmatchedCosts.length} unmatched cost records inserted.`);

  // 6. Anomalies (15-20 records)
  console.log('\nGenerating anomalies...');
  const anomalyCount = randInt(15, 20);
  const anomalyTypes = ['spike', 'drop', 'trend_change', 'outlier'];
  const anomalySeverities = ['low', 'medium', 'high', 'critical'];
  const anomalyMetrics = ['revenue', 'users', 'ctr', 'rpm', 'costs', 'romi'];
  const anomalies: any[] = [];

  for (let i = 0; i < anomalyCount; i++) {
    const site = pick(siteRecords);
    const date = pick(dates);
    const metric = pick(anomalyMetrics);
    const type = pick(anomalyTypes);
    const severity = pick(anomalySeverities);
    const expected = round(randFloat(20, 100), 4);
    const deltaPercent = type === 'spike' ? randFloat(25, 80) : randFloat(-60, -20);
    const actual = round(expected * (1 + deltaPercent / 100), 4);

    anomalies.push({
      siteId: site.id,
      date,
      type,
      severity,
      metric,
      expected,
      actual,
      delta: round(deltaPercent, 2),
      description: `${severity.charAt(0).toUpperCase() + severity.slice(1)} ${type} detected in ${metric}: expected ${expected}, got ${actual} (${deltaPercent > 0 ? '+' : ''}${round(deltaPercent, 1)}%)`,
      resolved: rand() > 0.6,
    });
  }
  await prisma.anomaly.createMany({ data: anomalies });
  console.log(`  ${anomalies.length} anomaly records inserted.`);

  // 7. AI Analysis (1 record)
  console.log('\nCreating AI analysis record...');
  await prisma.aiAnalysis.create({
    data: {
      date: dates[dates.length - 1],
      scope: 'global',
      summary:
        'Overall portfolio performance remains strong with a combined ROMI of 127%. The Gays bundle continues to lead in both absolute revenue and efficiency metrics. Trans bundle shows promising growth trajectory with a 12% week-over-week increase in RPM. JAV bundle maintains stable performance but faces increased cost pressure from rising traffic acquisition costs. Hentai bundle has the lowest absolute revenue but delivers competitive ROMI due to low operational costs. Weekend traffic patterns show consistent 15% uplift across all bundles. Format distribution is healthy with POP and BANNER maintaining dominant positions. Tier 1 geo-targeting efficiency has improved by 8% this month.',
      risks: JSON.parse(
        JSON.stringify([
          {
            level: 'medium',
            description: 'JAV bundle cost pressure increasing - costs up 18% while revenue flat',
            affectedBundles: ['jav'],
          },
          {
            level: 'low',
            description: 'Hentai bundle showing slight downtrend in Tier 1 traffic share',
            affectedBundles: ['hentai'],
          },
          {
            level: 'high',
            description: 'Three sites showing anomalous CTR drops that may indicate ad quality issues',
            affectedBundles: ['gays', 'trans'],
          },
        ])
      ),
      opportunities: JSON.parse(
        JSON.stringify([
          {
            impact: 'high',
            description: 'Trans bundle RPM growth suggests potential for increased traffic investment',
            estimatedValue: '$2,400/month',
          },
          {
            impact: 'medium',
            description: 'VAST format underutilized across portfolio - expansion could yield 8-12% revenue lift',
            estimatedValue: '$1,800/month',
          },
          {
            impact: 'low',
            description: 'Tier 2 geo-targeting optimization could improve fill rates by 5-10%',
            estimatedValue: '$900/month',
          },
        ])
      ),
      recommendations: JSON.parse(
        JSON.stringify([
          {
            priority: 1,
            action: 'Increase traffic budget for Trans bundle by 20%',
            expectedImpact: 'Estimated $2,400/month additional revenue at current RPM',
            timeframe: 'immediate',
          },
          {
            priority: 2,
            action: 'Investigate and resolve CTR anomalies on flagged sites',
            expectedImpact: 'Prevent estimated $1,200/month revenue loss',
            timeframe: '48 hours',
          },
          {
            priority: 3,
            action: 'Expand VAST format implementation to all eligible sites',
            expectedImpact: '8-12% revenue lift on participating sites',
            timeframe: '1 week',
          },
          {
            priority: 4,
            action: 'Review JAV bundle cost structure and renegotiate traffic sources',
            expectedImpact: 'Reduce cost pressure by 10-15%',
            timeframe: '2 weeks',
          },
        ])
      ),
      rawResponse: null,
    },
  });
  console.log('  AI analysis record created.');

  // 8. Settings
  console.log('\nCreating settings...');
  await prisma.setting.createMany({
    data: [
      {
        key: 'sync.google_sheets.enabled',
        value: JSON.parse(JSON.stringify(true)),
      },
      {
        key: 'sync.google_sheets.interval_minutes',
        value: JSON.parse(JSON.stringify(30)),
      },
      {
        key: 'sync.google_sheets.spreadsheet_id',
        value: JSON.parse(JSON.stringify('1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms')),
      },
      {
        key: 'ai.analysis.enabled',
        value: JSON.parse(JSON.stringify(true)),
      },
      {
        key: 'ai.analysis.schedule',
        value: JSON.parse(JSON.stringify('daily')),
      },
      {
        key: 'ai.analysis.model',
        value: JSON.parse(JSON.stringify('claude-sonnet-4-20250514')),
      },
      {
        key: 'anomaly.detection.enabled',
        value: JSON.parse(JSON.stringify(true)),
      },
      {
        key: 'anomaly.detection.sensitivity',
        value: JSON.parse(JSON.stringify(0.75)),
      },
      {
        key: 'dashboard.default_date_range',
        value: JSON.parse(JSON.stringify('30d')),
      },
      {
        key: 'dashboard.currency',
        value: JSON.parse(JSON.stringify('USD')),
      },
    ],
  });
  console.log('  10 settings created.');

  // 9. Sync logs
  console.log('\nCreating sync logs...');
  const syncLogs: any[] = [];
  const syncSources = ['google_sheets', 'ad_network_api', 'affiliate_api'];

  for (let i = 0; i < 15; i++) {
    const startDate = new Date(dates[dates.length - 1]);
    startDate.setHours(startDate.getHours() - i * 4);

    const isSuccess = rand() > 0.15;
    const duration = randInt(5000, 45000);
    const completedAt = new Date(startDate.getTime() + duration);

    syncLogs.push({
      source: syncSources[i % syncSources.length],
      status: isSuccess ? 'completed' : 'failed',
      startedAt: startDate,
      completedAt: isSuccess ? completedAt : null,
      recordsProcessed: isSuccess ? randInt(40, 1200) : 0,
      error: isSuccess ? null : pick([
        'Connection timeout after 30000ms',
        'API rate limit exceeded - retry after 60s',
        'Authentication token expired',
        'Spreadsheet not found or access denied',
      ]),
    });
  }
  await prisma.syncLog.createMany({ data: syncLogs });
  console.log(`  ${syncLogs.length} sync log entries created.`);

  // Summary
  console.log('\n─── Seed Complete ───');
  console.log(`Bundles:            ${bundles.length}`);
  console.log(`Sites:              ${siteRecords.length}`);
  console.log(`Daily metrics:      ${(dailyMetricsBatch as any[]).length}`);
  console.log(`Format metrics:     ${(formatMetricsBatch as any[]).length}`);
  console.log(`Tier metrics:       ${(tierMetricsBatch as any[]).length}`);
  console.log(`Cost records:       ${(costsBatch as any[]).length + unmatchedCosts.length}`);
  console.log(`Affiliate records:  ${(affiliateRevBatch as any[]).length}`);
  console.log(`Health scores:      ${(healthScoreBatch as any[]).length}`);
  console.log(`Anomalies:          ${anomalies.length}`);
  console.log(`AI analyses:        1`);
  console.log(`Settings:           10`);
  console.log(`Sync logs:          ${syncLogs.length}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('Seed failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
