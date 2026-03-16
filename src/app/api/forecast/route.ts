import { NextRequest } from 'next/server'
import { parsePeriodParam, jsonResponse, errorResponse } from '@/lib/api-utils'
import { generateForecast, type ForecastInput } from '@/services/forecast-engine'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const { from, to } = parsePeriodParam(searchParams)

    // Parse optional scenario inputs from query params
    const input: ForecastInput = {
      trafficChange: parseFloat(searchParams.get('trafficChange') || '0'),
      rpmChange: parseFloat(searchParams.get('rpmChange') || '0'),
      costChange: parseFloat(searchParams.get('costChange') || '0'),
      affiliateChange: parseFloat(searchParams.get('affiliateChange') || '0'),
    }

    const result = await generateForecast(from, to, input)

    return jsonResponse(result)
  } catch (error) {
    console.error('Forecast API error:', error)
    return errorResponse('Failed to load forecast data')
  }
}
