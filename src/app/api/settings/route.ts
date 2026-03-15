import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { jsonResponse, errorResponse } from '@/lib/api-utils'

export async function GET() {
  try {
    const settings = await prisma.setting.findMany()

    const result: Record<string, unknown> = {}
    for (const setting of settings) {
      result[setting.key] = setting.value
    }

    return jsonResponse(result)
  } catch (error) {
    console.error('Settings GET error:', error)
    return errorResponse('Failed to load settings')
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { key, value } = body

    if (!key) {
      return errorResponse('Missing required field: key', 400)
    }

    const setting = await prisma.setting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    })

    return jsonResponse({ key: setting.key, value: setting.value })
  } catch (error) {
    console.error('Settings PUT error:', error)
    return errorResponse('Failed to update settings')
  }
}
