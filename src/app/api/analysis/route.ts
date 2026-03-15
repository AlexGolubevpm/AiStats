import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { jsonResponse, errorResponse } from '@/lib/api-utils'

export async function GET() {
  try {
    const latest = await prisma.aiAnalysis.findFirst({
      orderBy: { date: 'desc' },
    })

    if (!latest) {
      return jsonResponse({
        id: null,
        date: new Date(),
        scope: 'network',
        summary: 'No analysis available yet.',
        risks: [],
        opportunities: [],
        recommendations: [],
        rawResponse: null,
      })
    }

    return jsonResponse({
      id: latest.id,
      date: latest.date,
      scope: latest.scope,
      summary: latest.summary,
      risks: latest.risks,
      opportunities: latest.opportunities,
      recommendations: latest.recommendations,
      rawResponse: latest.rawResponse,
    })
  } catch (error) {
    console.error('Analysis GET error:', error)
    return errorResponse('Failed to load analysis')
  }
}

export async function POST(request: NextRequest) {
  try {
    // Return the latest analysis or create a default placeholder
    const latest = await prisma.aiAnalysis.findFirst({
      orderBy: { date: 'desc' },
    })

    if (latest) {
      return jsonResponse({
        id: latest.id,
        date: latest.date,
        scope: latest.scope,
        summary: latest.summary,
        risks: latest.risks,
        opportunities: latest.opportunities,
        recommendations: latest.recommendations,
        rawResponse: latest.rawResponse,
      }, 200)
    }

    // Create a default placeholder analysis
    const body = await request.json().catch(() => ({}))
    const scope = body.scope || 'network'

    const analysis = await prisma.aiAnalysis.create({
      data: {
        date: new Date(),
        scope,
        summary: 'Placeholder analysis. Connect to AI service for real insights.',
        risks: [],
        opportunities: [],
        recommendations: [],
        rawResponse: '',
      },
    })

    return jsonResponse({
      id: analysis.id,
      date: analysis.date,
      scope: analysis.scope,
      summary: analysis.summary,
      risks: analysis.risks,
      opportunities: analysis.opportunities,
      recommendations: analysis.recommendations,
      rawResponse: analysis.rawResponse,
    }, 201)
  } catch (error) {
    console.error('Analysis POST error:', error)
    return errorResponse('Failed to create analysis')
  }
}
