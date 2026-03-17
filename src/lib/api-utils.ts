import { NextResponse } from 'next/server'
import { getDateRange, getPreviousDateRange } from '@/services/metrics'

export function parsePeriodParam(searchParams: URLSearchParams) {
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  // Support ?from=YYYY-MM-DD&to=YYYY-MM-DD as alternative to ?period=7d
  if (from && to) {
    return getDateRange('custom', from, to)
  }

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
