import { prisma } from '@/lib/db'

export class AdSpyglassService {
  private apiUrl: string
  private apiKey: string

  constructor(apiUrl?: string, apiKey?: string) {
    this.apiUrl = apiUrl || process.env.ADSPYGLASS_API_URL || 'https://api.adspyglass.com'
    this.apiKey = apiKey || process.env.ADSPYGLASS_API_KEY || ''
  }

  async fetchSiteMetrics(siteId: string, from: Date, to: Date) {
    if (!this.apiKey) {
      throw new Error('AdSpyglass API key not configured. Set ADSPYGLASS_API_KEY or configure in Settings.')
    }
    // TODO: Implement actual API call
    throw new Error('AdSpyglass integration not yet implemented')
  }

  async fetchFormatMetrics(siteId: string, from: Date, to: Date) {
    if (!this.apiKey) {
      throw new Error('AdSpyglass API key not configured.')
    }
    throw new Error('AdSpyglass integration not yet implemented')
  }

  async testConnection(): Promise<boolean> {
    if (!this.apiKey) return false
    // TODO: ping API
    return false
  }
}

export const adspyglass = new AdSpyglassService()
