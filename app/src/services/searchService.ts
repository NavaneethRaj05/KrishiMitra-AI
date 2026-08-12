import { database } from '../db/database'
import { useOfflineStore } from '../store/useOfflineStore'
import { useAuthStore } from '../store/useAuthStore'
import { offlineSearch } from './offlineSearch'
import { Q } from '@nozbe/watermelondb'

// Auto-detect API URL based on environment/platform
const getApiBase = () => {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL
  if (typeof window !== 'undefined' && window.location?.hostname) {
    return `http://${window.location.hostname}:5000/api`
  }
  return 'http://10.0.2.2:5000/api'
}
const API_BASE = getApiBase()
const API_TIMEOUT = 30000

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

const simpleHash = (str: string): string => {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash |= 0
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
    /**
     * ALWAYS try the live API first — no connectivity gate.
     *
     * Root cause of "cached answer when online":
     *   useOfflineStore.isConnected is set by a periodic health-ping to
     *   localhost:5000/health. If that ping races, times out, or the backend
     *   restarts, isConnected flips to false even while the real internet is
     *   fine. This caused searchService to skip the API and serve stale cache.
     *
     * Fix: ignore the connectivity store here. Just fetch. Fall back to
     * cache ONLY on genuine network-level errors (no route, DNS, timeout).
     */
    const authStore = useAuthStore.getState()
    const farmer = authStore.farmer

    const farmerContext = {
      farmerId: farmer?.farmerId || 'unknown_farmer',
      name: farmer?.name || '',
      state: farmer?.state || '',
      district: farmer?.district || '',
      block: farmer?.block || '',
      registeredCrops: farmer?.registeredCrops || [],
      landAcres: farmer?.landAcres || 0,
      soilType: farmer?.soilType || '',
      irrigationType: farmer?.irrigationType || '',
      preferredLanguage: language || farmer?.preferredLanguage || 'en',
      cropPhase: farmer?.cropPhase || 'germination',
    }

    // Grab GPS headers non-blocking (best-effort)
    const gpsHeaders: Record<string, string> = {}
    if (typeof window !== 'undefined' && window.navigator?.geolocation) {
      window.navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (pos?.coords) {
            gpsHeaders['x-latitude']  = String(pos.coords.latitude)
            gpsHeaders['x-longitude'] = String(pos.coords.longitude)
          }
        },
        () => {},
        { timeout: 2000 }
      )
    }

    // ── Live API attempt (always, regardless of connectivity store) ──────────
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authStore.token || 'demo_token'}`,
        'x-user-profile': btoa(JSON.stringify(farmerContext)),
        ...gpsHeaders,
      }

      const body = JSON.stringify(
        imageB64
          ? { query: query || 'Analyze this crop leaf image for disease or issues.', image_b64: imageB64, language: farmerContext.preferredLanguage }
          : { query, language: farmerContext.preferredLanguage }
      )

      const response = await fetch(`${API_BASE}/query/text`, {
        method: 'POST',
        headers,
        body,
        signal: AbortSignal.timeout(API_TIMEOUT),
      })

      if (response.ok) {
        const data = await response.json()
        const result: SearchResult = {
          answer: data.answer,
          citations: (data.citations || []).map((c: any) => ({
            ...c,
            authority_tier:   c.authority_tier  || this.inferAuthorityTier(c.source),
            authority_badge:  c.authority_badge || c.source,
            relevance_score:  c.relevance_score || c.score || 0.7,
          })),
          followUps:         data.follow_up_questions || [],
          intent:            data.intent || 'general_agri',
          offlineFallbackUsed: false,           // ← always false for live responses
          confidenceScore:   data.confidence_score || this.computeLocalConfidence(data.citations || []),
          sourceBreakdown:   data.source_breakdown  || { rag: 50, kag: 30, web: 20 },
          detectedLanguage:  data.detected_language || farmerContext.preferredLanguage,
          answerLanguage:    data.answer_language   || farmerContext.preferredLanguage,
        }
        // Update connectivity store to reflect we are actually online
        useOfflineStore.getState().setConnected(true)
        // Cache for offline use — fire and forget
        this.cacheAnswer(query, result, farmerContext).catch(() => {})
        return result
      }

      // HTTP error (4xx / 5xx) — server is reachable but returned an error.
      // Throw it so the UI shows a proper error message rather than silently
      // serving stale cache.
      const errText = await response.text().catch(() => response.statusText)
      throw new Error(`Server error ${response.status}: ${errText.slice(0, 200)}`)

    } catch (e: any) {
      // Only fall to cache for true network-level failures:
      // - AbortError / TimeoutError: request timed out
      // - TypeError "Failed to fetch": no network route at all
      // Any other error (including our thrown HTTP errors) re-throws.
      const isNetworkFailure =
        e?.name === 'AbortError'   ||
        e?.name === 'TimeoutError' ||
        (e instanceof TypeError && e.message?.toLowerCase().includes('fetch'))

      if (!isNetworkFailure) {
        // Mark offline only for server errors, not network issues
        // (server errors mean we ARE online, just the server is broken)
        throw e
      }

      // Genuine network failure — mark offline and fall through to cache
      useOfflineStore.getState().setConnected(false)
      console.warn('Network failure — falling back to cache:', e?.message)
    }

    // ── Offline fallback: check cache ────────────────────────────────────────
    const cached = await this.getCachedAnswer(query, farmerContext)
    if (cached) {
      return { ...cached, offlineFallbackUsed: true }
    }

    // ── Last resort: local SQLite FTS search ─────────────────────────────────
    const ftsResult = await offlineSearch.search(query, farmerContext.registeredCrops[0], !!imageB64)
    return {
      answer:             ftsResult.answer,
      citations:          (ftsResult.citations || []).map((c: any) => ({
        ...c,
        authority_tier:  this.inferAuthorityTier(c.source),
        authority_badge: c.source,
        relevance_score: 0.6,
      })),
      followUps:          ftsResult.followUps || [],
      intent:             ftsResult.intent || 'general_agri',
      offlineFallbackUsed: true,
      confidenceScore:    this.computeLocalConfidence(ftsResult.citations || []),
      sourceBreakdown:    { rag: 100, kag: 0, web: 0 },
      detectedLanguage:   farmerContext.preferredLanguage,
      answerLanguage:     farmerContext.preferredLanguage,
    }
  }

  private inferAuthorityTier(source: string): 'gold' | 'silver' | 'bronze' | 'basic' {
    const s = (source || '').toLowerCase()
    if (s.includes('icar') || s.includes('niphm'))                                return 'gold'
    if (s.includes('kvk') || s.includes('agmarknet') || s.includes('govt') || s.includes('apmc')) return 'silver'
    if (s.includes('research') || s.includes('vikaspedia') || s.includes('organic'))              return 'bronze'
    return 'basic'
  }

  private computeLocalConfidence(citations: any[]): number {
    if (!citations?.length) return 0.45
    const scores: Record<string, number> = { gold: 1.0, silver: 0.85, bronze: 0.7, basic: 0.55 }
    const avg = citations.reduce((sum, c) => sum + (scores[c.authority_tier || this.inferAuthorityTier(c.source)] || 0.55), 0) / citations.length
    return Math.min(0.98, avg)
  }

  private async getCachedAnswer(query: string, context: any): Promise<SearchResult | null> {
    try {
      const queryHash = simpleHash(query + JSON.stringify(context))
      const records: any[] = await database.get('cached_answers')
        .query(Q.where('query_hash', queryHash))
        .fetch()
      if (records.length > 0 && records[0].expiresAt > Date.now()) {
        return JSON.parse(records[0].answer) as SearchResult
      }
    } catch (e) {
      console.warn('Cache read failed:', e)
    }
    return null
  }

  private async cacheAnswer(query: string, result: SearchResult, context: any) {
    try {
      const queryHash   = simpleHash(query + JSON.stringify(context))
      const contextHash = simpleHash(JSON.stringify(context))
      await database.write(async () => {
        const existing = await database.get('cached_answers').query(Q.where('query_hash', queryHash)).fetch()
        for (const r of existing) await (r as any).destroyPermanently()
        await database.get('cached_answers').create((ca: any) => {
          ca.queryHash        = queryHash
          ca.query            = query
          ca.answer           = JSON.stringify(result)
          ca.farmerContextHash = contextHash
          ca.expiresAt        = Date.now() + 48 * 3600 * 1000 // 48h TTL
        })
      })
    } catch (e) {
      console.warn('Cache write failed:', e)
    }
  }

  async saveMessageToLocalDB(threadId: string, role: 'user' | 'assistant', content: string, result?: SearchResult, imageUri?: string) {
    try {
      await database.write(async () => {
        await database.get('messages').create((m: any) => {
          m.threadId      = threadId
          m.role          = role
          m.content       = content
          m.citations     = result ? JSON.stringify(result.citations) : '[]'
          m.followUps     = result ? JSON.stringify(result.followUps) : '[]'
          m.intent        = result ? result.intent : 'general_agri'
          m.imageUri      = imageUri || ''
          m.offlineFallback = result ? result.offlineFallbackUsed : false
        })
      })
    } catch (e) {
      console.error('Failed to save message:', e)
    }
  }

  async createLocalThread(title: string, intent: string, season: string): Promise<string> {
    try {
      const authStore = useAuthStore.getState()
      let newThread: any = null
      await database.write(async () => {
        newThread = await database.get('threads').create((t: any) => {
          t.farmerId      = authStore.farmer?.farmerId || 'unknown_farmer'
          t.title         = title.slice(0, 60)
          t.intent        = intent
          t.season        = season
          t.messageCount  = 0
          t.isBookmarked  = false
        })
      })
      return newThread ? newThread.id : Math.random().toString(36).substring(7)
    } catch (e) {
      console.error('Failed to create thread:', e)
      return Math.random().toString(36).substring(7)
    }
  }
}

export const searchService = new SearchService()
