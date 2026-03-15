import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { jsonResponse, errorResponse } from '@/lib/api-utils'
import { YandexMetricaService } from '@/services/yandex-metrica'

/**
 * GET /api/yandex — get Yandex Metrica status and counters
 */
export async function GET() {
  try {
    const service = new YandexMetricaService()

    if (!service.isConfigured) {
      return jsonResponse({
        configured: false,
        authUrl: YandexMetricaService.getAuthUrl(),
        message: 'Yandex OAuth token not configured. Visit authUrl to authorize.',
      })
    }

    const counters = await service.getCounters()

    // Get sites with yandexCounterId to show mapping status
    const sites = await prisma.site.findMany({
      where: { isActive: true },
      select: { id: true, domain: true, name: true, yandexCounterId: true },
    })

    return jsonResponse({
      configured: true,
      countersCount: counters.length,
      counters: counters.map(c => ({
        id: c.id,
        name: c.name,
        site: c.site,
        status: c.status,
      })),
      sites: sites.map(s => ({
        id: s.id,
        domain: s.domain,
        name: s.name,
        yandexCounterId: s.yandexCounterId,
        mapped: Boolean(s.yandexCounterId),
      })),
    })
  } catch (error) {
    console.error('Yandex API error:', error)
    return errorResponse(`Yandex API error: ${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * POST /api/yandex — exchange OAuth code for token or auto-map counters
 *
 * Body:
 *   { action: "exchange_code", code: "..." }
 *   { action: "auto_map" }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const action = body.action as string

    if (action === 'exchange_code') {
      const code = body.code as string
      if (!code) {
        return errorResponse('Missing "code" parameter', 400)
      }

      const result = await YandexMetricaService.exchangeCode(code)

      // Save token to settings
      await prisma.setting.upsert({
        where: { key: 'yandex.oauth_token' },
        create: { key: 'yandex.oauth_token', value: JSON.parse(JSON.stringify(result.access_token)) },
        update: { value: JSON.parse(JSON.stringify(result.access_token)) },
      })

      return jsonResponse({
        message: 'OAuth token saved successfully',
        token_type: result.token_type,
        expires_in: result.expires_in,
      })
    }

    if (action === 'auto_map') {
      // Get saved token from settings or env
      let token = process.env.YANDEX_OAUTH_TOKEN || ''
      if (!token) {
        const setting = await prisma.setting.findUnique({ where: { key: 'yandex.oauth_token' } })
        if (setting) token = setting.value as string
      }

      if (!token) {
        return errorResponse('Yandex OAuth token not configured', 400)
      }

      const service = new YandexMetricaService(token)
      const counters = await service.getCounters()
      const sites = await prisma.site.findMany({ where: { isActive: true } })

      let mapped = 0
      for (const site of sites) {
        const cleanDomain = site.domain.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '')

        const match = counters.find(c => {
          const counterDomain = c.site.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '')
          return counterDomain === cleanDomain ||
                 counterDomain.includes(cleanDomain) ||
                 cleanDomain.includes(counterDomain)
        })

        if (match) {
          await prisma.site.update({
            where: { id: site.id },
            data: { yandexCounterId: String(match.id) },
          })
          mapped++
        }
      }

      return jsonResponse({
        message: `Auto-mapped ${mapped} of ${sites.length} sites`,
        mapped,
        total: sites.length,
        availableCounters: counters.length,
      })
    }

    return errorResponse('Unknown action. Use "exchange_code" or "auto_map"', 400)
  } catch (error) {
    console.error('Yandex POST error:', error)
    return errorResponse(`Error: ${error instanceof Error ? error.message : String(error)}`)
  }
}
