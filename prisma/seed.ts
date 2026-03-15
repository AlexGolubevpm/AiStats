import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ─── Constants ───

const BUNDLE_DEFS = [
  { name: 'Gays', slug: 'gays', color: '#3B82F6' },
  { name: 'Trans', slug: 'trans', color: '#EC4899' },
  { name: 'JAV', slug: 'jav', color: '#EF4444' },
  { name: 'Hentai', slug: 'hentai', color: '#8B5CF6' },
] as const;

// Real sites from AdSpyglass, mapped to bundles
const REAL_SITES: Record<string, Array<{ name: string; domain: string; slug: string }>> = {
  gays: [
    { name: 'GayXHub', domain: 'gayxhub.com', slug: 'gayxhub' },
    { name: 'GayXXXWorld', domain: 'gayxxxworld.com', slug: 'gayxxxworld' },
    { name: 'GayDesireXHub', domain: 'gaydesirexhub.com', slug: 'gaydesirexhub' },
    { name: 'GayLoveXHub', domain: 'gaylovexhub.com', slug: 'gaylovexhub' },
    { name: 'LoveForBoysXHub', domain: 'loveforboysxhub.com', slug: 'loveforboysxhub' },
    { name: 'PrideBoysXHub', domain: 'prideboysxhub.com', slug: 'prideboysxhub' },
    { name: 'PrideXHub', domain: 'pridexhub.com', slug: 'pridexhub' },
    { name: 'AdultXHub', domain: 'adultxhub.com', slug: 'adultxhub' },
  ],
  jav: [
    { name: 'Japan Whores', domain: 'japan-whores.com', slug: 'japan-whores' },
    { name: 'Japanese Matures', domain: 'japanesematures.com', slug: 'japanesematures' },
    { name: 'JavMix', domain: 'javmix.com', slug: 'javmix' },
    { name: 'JP Milfs', domain: 'jpmilfs.com', slug: 'jpmilfs' },
    { name: 'POV JP', domain: 'povjp.com', slug: 'povjp' },
    { name: 'Big Tits Tokyo', domain: 'bigtitstokyo.com', slug: 'bigtitstokyo' },
    { name: '18 Tokyo', domain: '18tokyo.com', slug: '18tokyo' },
    { name: 'Wierd Japan', domain: 'wierdjapan.com', slug: 'wierdjapan' },
    { name: 'Asian Muffin', domain: 'asianmuffin.com', slug: 'asianmuffin' },
  ],
  hentai: [
    { name: 'Hentai Smile', domain: 'hentaismile.com', slug: 'hentaismile' },
    { name: 'Anime Hentai XHub', domain: 'animehentaixhub.com', slug: 'animehentaixhub' },
    { name: 'Hentai Lover XHub', domain: 'hentailoverxhub.com', slug: 'hentailoverxhub' },
    { name: 'Hi Hentai Porn', domain: 'hihentaiporn.com', slug: 'hihentaiporn' },
  ],
  trans: [
    // No sites in AdSpyglass yet
  ],
};

// ─── Seed logic ───

async function main() {
  console.log('Seeding database (structure only — no fake metrics)...\n');

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

  // 3. Create sites (real domains from AdSpyglass)
  console.log('Creating sites...');
  let siteCount = 0;

  for (const bundle of bundles) {
    const def = BUNDLE_DEFS.find((b) => b.slug === bundle.slug)!;
    const realSites = REAL_SITES[def.slug] || [];

    for (const siteDef of realSites) {
      await prisma.site.create({
        data: {
          name: siteDef.name,
          slug: siteDef.slug,
          domain: siteDef.domain,
          bundleId: bundle.id,
          externalId: null,
          sheetName: siteDef.name,
          isActive: true,
        },
      });
      siteCount++;
    }
  }
  console.log(`Created ${siteCount} sites.\n`);

  // 4. Settings
  console.log('Creating settings...');
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

  // Summary
  console.log('\n--- Seed Complete ---');
  console.log(`Bundles:   ${bundles.length}`);
  console.log(`Sites:     ${siteCount}`);
  console.log(`Settings:  10`);
  console.log('\nNo fake metrics seeded. Real data will come from AdSpyglass sync.');
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
