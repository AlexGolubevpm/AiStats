/**
 * One-time production migration script.
 * Safe to run multiple times (idempotent).
 * Does NOT delete any existing data.
 *
 * Usage: npx tsx scripts/migrate-prod.ts
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Yandex Metrica counter IDs (from API)
const METRIKA_COUNTERS: Record<string, string> = {
  'gayxhub.com': '103969151',
  'gayxxxworld.com': '100274934',
  'gaydesirexhub.com': '107068671',
  'gaylovexhub.com': '107068647',
  'loveforboysxhub.com': '107068679',
  'prideboysxhub.com': '107068653',
  'pridexhub.com': '107068690',
  'adultxhub.com': '103969163',
  'japan-whores.com': '94309089',
  'japanesematures.com': '105911844',
  'javmix.com': '103469964',
  'jpmilfs.com': '107069166',
  'povjp.com': '105792968',
  'bigtitstokyo.com': '105792731',
  '18tokyo.com': '105911829',
  'wierdjapan.com': '105792990',
  'asianmuffin.com': '100275058',
  'hentaismile.com': '100275025',
  'animehentaixhub.com': '103748471',
  'hentailoverxhub.com': '107068623',
  'hihentaiporn.com': '107068610',
  'ihentaiporn.com': '107068619',
  'allnarutohentai.com': '107068582',
  'ultimatehentaixhub.com': '107068635',
}

// New sites not in original seed
const NEW_SITES = [
  { name: 'iHentai Porn', domain: 'ihentaiporn.com', slug: 'ihentaiporn', bundle: 'hentai' },
  { name: 'All Naruto Hentai', domain: 'allnarutohentai.com', slug: 'allnarutohentai', bundle: 'hentai' },
  { name: 'Ultimate Hentai XHub', domain: 'ultimatehentaixhub.com', slug: 'ultimatehentaixhub', bundle: 'hentai' },
  { name: 'Hentai Desire XHub', domain: 'hentaidesirexhub.com', slug: 'hentaidesirexhub', bundle: 'hentai' },
  { name: 'Fantasy Hentai XHub', domain: 'fantasyhentaixhub.com', slug: 'fantasyhentaixhub', bundle: 'hentai' },
  { name: 'Hentai Zone XHub', domain: 'hentaizonexhub.com', slug: 'hentaizonexhub', bundle: 'hentai' },
  { name: 'BoysXHub', domain: 'boysxhub.com', slug: 'boysxhub', bundle: 'gays' },
  { name: 'HotGayXHub', domain: 'hotgayxhub.com', slug: 'hotgayxhub', bundle: 'gays' },
  { name: 'GayWorldXHub', domain: 'gayworldxhub.com', slug: 'gayworldxhub', bundle: 'gays' },
]

async function main() {
  console.log('=== Production data migration ===\n')

  // 1. Add missing sites
  console.log('1. Adding missing sites...')
  const bundles = await prisma.bundle.findMany()
  const bundleBySlug = new Map(bundles.map(b => [b.slug, b.id]))

  for (const site of NEW_SITES) {
    const bundleId = bundleBySlug.get(site.bundle)
    if (!bundleId) {
      console.log(`  SKIP: bundle "${site.bundle}" not found for ${site.domain}`)
      continue
    }

    const existing = await prisma.site.findFirst({ where: { domain: site.domain } })
    if (existing) {
      console.log(`  EXISTS: ${site.domain}`)
      continue
    }

    await prisma.site.create({
      data: {
        name: site.name,
        slug: site.slug,
        domain: site.domain,
        bundleId,
        sheetName: site.name,
        metrikaCounterId: METRIKA_COUNTERS[site.domain] || null,
        isActive: true,
      },
    })
    console.log(`  ADDED: ${site.domain}`)
  }

  // 2. Update metrikaCounterIds on existing sites
  console.log('\n2. Updating Metrica counter IDs...')
  let updated = 0
  for (const [domain, counterId] of Object.entries(METRIKA_COUNTERS)) {
    const site = await prisma.site.findFirst({ where: { domain } })
    if (!site) continue
    if (site.metrikaCounterId === counterId) continue

    await prisma.site.update({
      where: { id: site.id },
      data: { metrikaCounterId: counterId },
    })
    updated++
    console.log(`  SET: ${domain} → ${counterId}`)
  }
  console.log(`  Updated ${updated} sites`)

  // 3. Fix costs_sheet_id setting
  console.log('\n3. Setting costs_sheet_id...')
  await prisma.setting.upsert({
    where: { key: 'costs_sheet_id' },
    create: { key: 'costs_sheet_id', value: '1sFc4VPOjXLQVT0bk89oPottIYq-9vyVU_W2BPsUAnSo' },
    update: { value: '1sFc4VPOjXLQVT0bk89oPottIYq-9vyVU_W2BPsUAnSo' },
  })
  console.log('  OK')

  // Summary
  const siteCount = await prisma.site.count()
  const withMetrika = await prisma.site.count({ where: { metrikaCounterId: { not: null } } })
  console.log(`\n=== Done ===`)
  console.log(`Sites: ${siteCount} total, ${withMetrika} with Metrica counters`)
  console.log(`\nNext: restart workers (pm2 restart all) and trigger sync via Settings → Sync`)

  await prisma.$disconnect()
}

main().catch(async (e) => {
  console.error('Migration failed:', e)
  await prisma.$disconnect()
  process.exit(1)
})
