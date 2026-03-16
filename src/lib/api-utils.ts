import { NextRequest, NextResponse } from 'next/server'
import { getDateRange, getPreviousDateRange } from '@/services/metrics'
import { verifyToken } from '@/lib/auth'

export function parsePeriodParam(searchParams: URLSearchParams) {
  const period = searchParams.get('period') || '7d'
  return getDateRange(period)
}

export function parsePreviousPeriod(from: Date, to: Date) {
  return getPreviousDateRange(from, to)
}

export function parseFilters(searchParams: URLSearchParams) {
  return {
    bundleId: searchParams.get('bundleId') || undefined,
    format: searchParams.get('format') || undefined,
    tier: searchParams.get('tier') || undefined,
  }
}

export function jsonResponse(data: unknown, status = 200) {
  return NextResponse.json(data, { status })
}

export function errorResponse(message: string, status = 500) {
  return NextResponse.json({ error: message }, { status })
}

export function requireAuth(request: NextRequest): NextResponse | null {
  // Skip auth check if AUTH_PASSWORD is not set (dev mode)
  if (!process.env.AUTH_PASSWORD) return null

  const token = request.cookies.get('auth-token')?.value
  if (!token || !verifyToken(token)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}
