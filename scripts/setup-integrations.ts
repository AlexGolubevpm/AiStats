/**
 * One-time setup script: applies metrikaCounterId migration,
 * auto-matches Yandex Metrica counters to sites by domain,
 * and saves API credentials to Settings.
 *
 * Usage: npx tsx scripts/setup-integrations.ts
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Yandex Metrica counters (from management API)
const METRICA_COUNTERS: { id: string; domain: string }[] = [
  { id: '105911829', domain: '18tokyo.com' },
  { id: '103969163', domain: 'adultxhub.com' },
  { id: '107068582', domain: 'allnarutohentai.com' },
  { id: '103748471', domain: 'animehentaixhub.com' },
  { id: '103469955', domain: 'asianinmovies.com' },
  { id: '105792731', domain: 'bigtitstokyo.com' },
  { id: '103469890', domain: 'chinesexhub.com' },
  { id: '107068671', domain: 'gaydesirexhub.com' },
  { id: '107068647', domain: 'gaylovexhub.com' },
  { id: '103969151', domain: 'gayxhub.com' },
  { id: '107068623', domain: 'hentailoverxhub.com' },
  { id: '107068610', domain: 'hihentaiporn.com' },
  { id: '107068619', domain: 'ihentaiporn.com' },
  { id: '94309089', domain: 'japan-whores.com' },
  { id: '105911844', domain: 'japanesematures.com' },
  { id: '103469948', domain: 'javcalientexhub.com' },
  { id: '103469964', domain: 'javmix.com' },
  { id: '107069166', domain: 'jpmilfs.com' },
  { id: '107068679', domain: 'loveforboysxhub.com' },
  { id: '105792968', domain: 'povjp.com' },
  { id: '107068653', domain: 'prideboysxhub.com' },
  { id: '107068690', domain: 'pridexhub.com' },
  { id: '107068635', domain: 'ultimatehentaixhub.com' },
  { id: '105792990', domain: 'wierdjapan.com' },
  { id: '100275058', domain: 'asianmuffin.com' },
  { id: '100274934', domain: 'gayxxxworld.com' },
  { id: '100275025', domain: 'hentaismile.com' },
]

function cleanDomain(d: string): string {
  return d.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/+$/, '')
}

async function main() {
  console.log('=== Setup Integrations ===\n')

  // 1. Save AdOK credentials
  console.log('1. Saving AdOK credentials to Settings...')
  const adokSettings = [
    { key: 'adok_auth_email', value: 'ads@xhubtraffic.com' },
    { key: 'adok_auth_token', value: 'YctjS1JBEyWxaq142xAG' },
    { key: 'adspyglass_url', value: 'https://api.adok.ai' },
  ]
  for (const s of adokSettings) {
    await prisma.setting.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: { key: s.key, value: s.value },
    })
    console.log(`  ✓ ${s.key}`)
  }

  // 2. Save Yandex Metrica token
  console.log('\n2. Saving Yandex Metrica OAuth token...')
  await prisma.setting.upsert({
    where: { key: 'yandex_metrika_oauth_token' },
    update: { value: 'y0__xCM_tGECBj0oDYg_4DgzxL4D2I198zAmBzg0uMFZiapJAbS0w' },
    create: { key: 'yandex_metrika_oauth_token', value: 'y0__xCM_tGECBj0oDYg_4DgzxL4D2I198zAmBzg0uMFZiapJAbS0w' },
  })
  console.log('  ✓ yandex_metrika_oauth_token')

  // 3. Auto-match counters to sites
  console.log('\n3. Matching Yandex Metrica counters to sites...')
  const sites = await prisma.site.findMany()
  let matched = 0
  let unmatched = 0

  for (const counter of METRICA_COUNTERS) {
    const counterDomain = cleanDomain(counter.domain)
    const site = sites.find((s) => {
      const siteDomain = cleanDomain(s.domain)
      return siteDomain === counterDomain || siteDomain.includes(counterDomain) || counterDomain.includes(siteDomain)
    })

    if (site) {
      await prisma.site.update({
        where: { id: site.id },
        data: { metrikaCounterId: counter.id },
      })
      console.log(`  ✓ ${counter.domain} → ${site.name} (counter: ${counter.id})`)
      matched++
    } else {
      console.log(`  ✗ ${counter.domain} — no matching site found`)
      unmatched++
    }
  }

  console.log(`\n  Matched: ${matched}, Unmatched: ${unmatched}`)

  // 4. Summary
  const sitesWithCounter = await prisma.site.count({ where: { metrikaCounterId: { not: null } } })
  const totalSites = await prisma.site.count()
  console.log(`\n=== Done ===`)
  console.log(`Sites with Metrica counter: ${sitesWithCounter}/${totalSites}`)
  console.log(`\nNow run "Sync All" from Settings → Sync tab.`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
