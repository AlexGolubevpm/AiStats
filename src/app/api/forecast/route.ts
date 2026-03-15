import { NextRequest } from 'next/server'
import { parsePeriodParam, jsonResponse, errorResponse } from '@/lib/api-utils'
import { getForecastBaseValues } from '@/services/forecast-engine'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const { from, to } = parsePeriodParam(searchParams)

    const baseValues = await getForecastBaseValues(from, to)

    return jsonResponse(baseValues)
  } catch (error) {
    console.error('Forecast API error:', error)
    return errorResponse('Failed to load forecast data')
  }
}
