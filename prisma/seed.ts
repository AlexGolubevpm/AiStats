import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ─── Constants ───

const BUNDLE_DEFS = [
  { name: 'Gays', slug: 'gays', color: '#3B82F6' },
  { name: 'Trans', slug: 'trans', color: '#EC4899' },
  { name: 'JAV', slug: 'jav', color: '#EF4444' },
  { name: 'Hentai', slug: 'hentai', color: '#8B5CF6' },
] as const;

// Real sites mapped to bundles with Yandex Metrica counter IDs
const REAL_SITES: Record<string, Array<{ name: string; domain: string; slug: string; metrikaCounterId?: string }>> = {
  gays: [
    { name: 'GayXHub', domain: 'gayxhub.com', slug: 'gayxhub', metrikaCounterId: '103969151' },
    { name: 'GayXXXWorld', domain: 'gayxxxworld.com', slug: 'gayxxxworld', metrikaCounterId: '100274934' },
    { name: 'GayDesireXHub', domain: 'gaydesirexhub.com', slug: 'gaydesirexhub', metrikaCounterId: '107068671' },
    { name: 'GayLoveXHub', domain: 'gaylovexhub.com', slug: 'gaylovexhub', metrikaCounterId: '107068647' },
    { name: 'LoveForBoysXHub', domain: 'loveforboysxhub.com', slug: 'loveforboysxhub', metrikaCounterId: '107068679' },
    { name: 'PrideBoysXHub', domain: 'prideboysxhub.com', slug: 'prideboysxhub', metrikaCounterId: '107068653' },
    { name: 'PrideXHub', domain: 'pridexhub.com', slug: 'pridexhub', metrikaCounterId: '107068690' },
    { name: 'AdultXHub', domain: 'adultxhub.com', slug: 'adultxhub', metrikaCounterId: '103969163' },
    { name: 'BoysXHub', domain: 'boysxhub.com', slug: 'boysxhub' },
    { name: 'HotGayXHub', domain: 'hotgayxhub.com', slug: 'hotgayxhub' },
    { name: 'GayWorldXHub', domain: 'gayworldxhub.com', slug: 'gayworldxhub' },
  ],
  jav: [
    { name: 'Japan Whores', domain: 'japan-whores.com', slug: 'japan-whores', metrikaCounterId: '94309089' },
    { name: 'Japanese Matures', domain: 'japanesematures.com', slug: 'japanesematures', metrikaCounterId: '105911844' },
    { name: 'JavMix', domain: 'javmix.com', slug: 'javmix', metrikaCounterId: '103469964' },
    { name: 'JP Milfs', domain: 'jpmilfs.com', slug: 'jpmilfs', metrikaCounterId: '107069166' },
    { name: 'POV JP', domain: 'povjp.com', slug: 'povjp', metrikaCounterId: '105792968' },
    { name: 'Big Tits Tokyo', domain: 'bigtitstokyo.com', slug: 'bigtitstokyo', metrikaCounterId: '105792731' },
    { name: '18 Tokyo', domain: '18tokyo.com', slug: '18tokyo', metrikaCounterId: '105911829' },
    { name: 'Wierd Japan', domain: 'wierdjapan.com', slug: 'wierdjapan', metrikaCounterId: '105792990' },
    { name: 'Asian Muffin', domain: 'asianmuffin.com', slug: 'asianmuffin', metrikaCounterId: '100275058' },
  ],
  hentai: [
    { name: 'Hentai Smile', domain: 'hentaismile.com', slug: 'hentaismile', metrikaCounterId: '100275025' },
    { name: 'Anime Hentai XHub', domain: 'animehentaixhub.com', slug: 'animehentaixhub', metrikaCounterId: '103748471' },
    { name: 'Hentai Lover XHub', domain: 'hentailoverxhub.com', slug: 'hentailoverxhub', metrikaCounterId: '107068623' },
    { name: 'Hi Hentai Porn', domain: 'hihentaiporn.com', slug: 'hihentaiporn', metrikaCounterId: '107068610' },
    { name: 'iHentai Porn', domain: 'ihentaiporn.com', slug: 'ihentaiporn', metrikaCounterId: '107068619' },
    { name: 'All Naruto Hentai', domain: 'allnarutohentai.com', slug: 'allnarutohentai', metrikaCounterId: '107068582' },
    { name: 'Ultimate Hentai XHub', domain: 'ultimatehentaixhub.com', slug: 'ultimatehentaixhub', metrikaCounterId: '107068635' },
    { name: 'Hentai Desire XHub', domain: 'hentaidesirexhub.com', slug: 'hentaidesirexhub' },
    { name: 'Fantasy Hentai XHub', domain: 'fantasyhentaixhub.com', slug: 'fantasyhentaixhub' },
    { name: 'Hentai Zone XHub', domain: 'hentaizonexhub.com', slug: 'hentaizonexhub' },
  ],
  trans: [
    // No sites yet
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
          metrikaCounterId: siteDef.metrikaCounterId || null,
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
        key: 'costs_sheet_id',
        value: JSON.parse(JSON.stringify('1sFc4VPOjXLQVT0bk89oPottIYq-9vyVU_W2BPsUAnSo')),
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
  console.log('  8 settings created.');

  // Summary
  console.log('\n--- Seed Complete ---');
  console.log(`Bundles:   ${bundles.length}`);
  console.log(`Sites:     ${siteCount}`);
  console.log(`Settings:  8`);
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
