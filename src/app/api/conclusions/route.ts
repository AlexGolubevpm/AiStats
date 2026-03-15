import { NextRequest } from 'next/server'
import { parsePeriodParam, jsonResponse, errorResponse } from '@/lib/api-utils'
import { generateConclusions } from '@/services/conclusions-engine'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const { from, to } = parsePeriodParam(searchParams)

    const conclusions = await generateConclusions(from, to)

    return jsonResponse(conclusions)
  } catch (error) {
    console.error('Conclusions API error:', error)
    return errorResponse('Failed to generate conclusions')
  }
}
