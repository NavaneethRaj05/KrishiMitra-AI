import { database } from '../db/database'
import { useOfflineStore } from '../store/useOfflineStore'
import { useAuthStore } from '../store/useAuthStore'
import { offlineSearch } from './offlineSearch'
import { Q } from '@nozbe/watermelondb'
import { Platform } from 'react-native'

// Auto-detect API URL based on environment/platform
const getApiBase = () => {
  if (typeof window !== 'undefined' && window.location && window.location.hostname) {
    const hostname = window.location.hostname
    return `http://${hostname}:5000/api`
  }
  return 'http://localhost:5000/api'
}
const API_BASE = getApiBase()
const API_TIMEOUT = 30000 // 30 seconds

export interface Citation {
  index: number
  source: string
  title: string
  url: string
  snippet: string
  authority_badge?: string
  authority_tier?: 'gold' | 'silver' | 'bronze' | 'basic'
  relevance_score?: number
}

export interface SourceBreakdown {
  rag: number
  kag: number
  web: number
}

export interface SearchResult {
  answer: string
  citations: Citation[]
  followUps: string[]
  intent: string
  offlineFallbackUsed: boolean
  confidenceScore: number
  sourceBreakdown: SourceBreakdown
  detectedLanguage: string
  answerLanguage: string
}

// Simple zero-dependency polynomial hash function
const simpleHash = (str: string): string => {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash |= 0 // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16)
}

class SearchService {
  async search(
    query: string,
    threadId: string | null = null,
    imageContext: any = null,
    imageB64: string | null = null,
    language?: string
  ): Promise<SearchResult> {
    const isOnline = useOfflineStore.getState().isConnected
    const authStore = useAuthStore.getState()
    const farmer = authStore.farmer

    const farmerContext = {
      farmerId: authStore.farmer?.farmerId || 'unknown_farmer',
      name: farmer?.name || '',
      phone: farmer?.phone || '',
      state: farmer?.state || '',
      district: farmer?.district || '',
      block: farmer?.block || '',
      registeredCrops: farmer?.registeredCrops || [],
      landAcres: farmer?.landAcres || 0,
      soilType: farmer?.soilType || '',
      irrigationType: farmer?.irrigationType || '',
      preferredLanguage: language || farmer?.preferredLanguage || 'en',
      cropPhase: farmer?.cropPhase || 'germination'
    }

    // Attempt to obtain browser GPS coordinates if available
    let gpsHeaders: Record<string, string> = {}
    if (typeof window !== 'undefined' && window.navigator && window.navigator.geolocation) {
      try {
        window.navigator.geolocation.getCurrentPosition(
          (pos) => {
            if (pos && pos.coords) {
              gpsHeaders['x-latitude'] = String(pos.coords.latitude)
              gpsHeaders['x-longitude'] = String(pos.coords.longitude)
            }
          },
          () => {},
          { timeout: 3000 }
        )
      } catch (e) {}
    }

    if (isOnline) {
      try {
        let response
        const headers = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authStore.token || 'demo_token'}`,
          'x-user-profile': btoa(JSON.stringify(farmerContext)),
          ...gpsHeaders
        }

        if (imageB64) {
          // If image is present, attempt dedicated image diagnosis endpoint or search with image_b64
          response = await fetch(`${API_BASE}/query/text`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              query: query || 'Analyze this crop leaf image for disease or issues.',
              image_b64: imageB64,
              language: farmerContext.preferredLanguage
            }),
            signal: AbortSignal.timeout(API_TIMEOUT)
          })
        } else {
          response = await fetch(`${API_BASE}/query/text`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              query: query,
              language: farmerContext.preferredLanguage
            }),
            signal: AbortSignal.timeout(API_TIMEOUT)
          })
        }

        if (response.ok) {
          const data = await response.json()
          const result: SearchResult = {
            answer: data.answer,
            citations: (data.citations || []).map((c: any) => ({
              ...c,
              authority_tier: c.authority_tier || this.inferAuthorityTier(c.source),
              authority_badge: c.authority_badge || c.source,
              relevance_score: c.relevance_score || c.score || 0.7,
            })),
            followUps: data.follow_up_questions || [],
            intent: data.intent || 'general_agri',
            offlineFallbackUsed: false,
            confidenceScore: data.confidence_score || this.computeLocalConfidence(data.citations || []),
            sourceBreakdown: data.source_breakdown || { rag: 50, kag: 30, web: 20 },
            detectedLanguage: data.detected_language || farmerContext.preferredLanguage,
            answerLanguage: data.answer_language || farmerContext.preferredLanguage,
          }
          // Cache response for future offline use
          await this.cacheAnswer(query, result, farmerContext)
          return result
        }
      } catch (e) {
        console.warn('Server search failed, falling back to local storage:', e)
      }
    }

    // Offline: check cache first
    const cached = await this.getCachedAnswer(query, farmerContext)
    if (cached) {
      return { ...cached, offlineFallbackUsed: true }
    }

    // Last resort: SQLite FTS5 local search
    const ftsResult = await offlineSearch.search(query, farmerContext.registeredCrops[0], !!imageB64)
    return {
      answer: ftsResult.answer,
      citations: (ftsResult.citations || []).map((c: any) => ({
        ...c,
        authority_tier: this.inferAuthorityTier(c.source),
        authority_badge: c.source,
        relevance_score: 0.6,
      })),
      followUps: ftsResult.followUps || [],
      intent: ftsResult.intent || 'general_agri',
      offlineFallbackUsed: true,
      confidenceScore: this.computeLocalConfidence(ftsResult.citations || []),
      sourceBreakdown: { rag: 100, kag: 0, web: 0 },
      detectedLanguage: farmerContext.preferredLanguage,
      answerLanguage: farmerContext.preferredLanguage,
    }
  }

  /**
   * Infer authority tier from source name when backend doesn't provide it.
   */
  private inferAuthorityTier(source: string): 'gold' | 'silver' | 'bronze' | 'basic' {
    const s = (source || '').toLowerCase()
    if (s.includes('icar') || s.includes('niphm')) return 'gold'
    if (s.includes('kvk') || s.includes('agmarknet') || s.includes('govt') || s.includes('apmc')) return 'silver'
    if (s.includes('research') || s.includes('vikaspedia') || s.includes('organic')) return 'bronze'
    return 'basic'
  }

  /**
   * Compute a local confidence score from citations authority + relevance.
   */
  private computeLocalConfidence(citations: any[]): number {
    if (!citations || citations.length === 0) return 0.45
    const tierScores: Record<string, number> = { gold: 1.0, silver: 0.85, bronze: 0.7, basic: 0.55 }
    let total = 0
    for (const c of citations) {
      const tier = c.authority_tier || this.inferAuthorityTier(c.source)
      total += tierScores[tier] || 0.55
    }
    return Math.min(0.98, total / citations.length)
  }

  private async getCachedAnswer(query: string, context: any): Promise<SearchResult | null> {
    try {
      const queryHash = simpleHash(query + JSON.stringify(context))
      const cachedAnswersCollection = database.get('cached_answers')
      
      const records: any[] = await cachedAnswersCollection
        .query(Q.where('query_hash', queryHash))
        .fetch()

      if (records.length > 0) {
        const cached = records[0]
        if (cached.expiresAt > Date.now()) {
          try {
            return JSON.parse(cached.answer) as SearchResult
          } catch (e) {}
        }
      }
    } catch (e) {
      console.warn('Failed to read from WatermelonDB cache:', e)
    }
    return null
  }

  private async cacheAnswer(query: string, result: SearchResult, context: any) {
    try {
      const queryHash = simpleHash(query + JSON.stringify(context))
      const contextHash = simpleHash(JSON.stringify(context))
      const cachedAnswersCollection = database.get('cached_answers')

      await database.write(async () => {
        // Look for existing and delete/overwrite
        const existing = await cachedAnswersCollection.query(Q.where('query_hash', queryHash)).fetch()
        for (const record of existing) {
          await record.destroyPermanently()
        }

        await cachedAnswersCollection.create((ca: any) => {
          ca.queryHash = queryHash
          ca.query = query
          ca.answer = JSON.stringify(result)
          ca.farmerContextHash = contextHash
          ca.expiresAt = Date.now() + 48 * 3600 * 1000 // 48h TTL
        })
      })
    } catch (e) {
      console.warn('Failed to write to WatermelonDB cache:', e)
    }
  }

  async saveMessageToLocalDB(threadId: string, role: 'user' | 'assistant', content: string, result?: SearchResult, imageUri?: string) {
    try {
      const messagesCollection = database.get('messages')
      await database.write(async () => {
        await messagesCollection.create((m: any) => {
          m.threadId = threadId
          m.role = role
          m.content = content
          m.citations = result ? JSON.stringify(result.citations) : '[]'
          m.followUps = result ? JSON.stringify(result.followUps) : '[]'
          m.intent = result ? result.intent : 'general_agri'
          m.imageUri = imageUri || ''
          m.offlineFallback = result ? result.offlineFallbackUsed : false
        })
      })
    } catch (e) {
      console.error('Failed to save message to WatermelonDB:', e)
    }
  }

  async createLocalThread(title: string, intent: string, season: string): Promise<string> {
    try {
      const threadsCollection = database.get('threads')
      const authStore = useAuthStore.getState()
      
      let newThread: any = null
      await database.write(async () => {
        newThread = await threadsCollection.create((t: any) => {
          t.farmerId = authStore.farmer?.farmerId || 'unknown_farmer'
          t.title = title.slice(0, 60)
          t.intent = intent
          t.season = season
          t.messageCount = 0
          t.isBookmarked = false
        })
      })
      return newThread ? newThread.id : Math.random().toString(36).substring(7)
    } catch (e) {
      console.error('Failed to create thread in WatermelonDB:', e)
      return Math.random().toString(36).substring(7)
    }
  }
}

export const searchService = new SearchService()
