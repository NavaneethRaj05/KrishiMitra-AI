import { searchService } from './searchService'
import { FarmerContext } from '../store/useAuthStore'
import { database } from '../db/database'
import { Q } from '@nozbe/watermelondb'

const CROP_PHASE_QUERIES: Record<string, Record<string, string[]>> = {
  paddy: {
    germination:  ['paddy germination problems', 'paddy seed treatment', 'nursery management paddy'],
    vegetative:   ['paddy tiller count low', 'nitrogen top dressing paddy', 'paddy weed control'],
    flowering:    ['paddy blast disease treatment', 'paddy water management flowering'],
    grain_fill:   ['paddy grain discolouration', 'paddy harvest time'],
    maturity:     ['paddy harvesting tips', 'paddy storage moisture'],
  },
  wheat: {
    sowing:       ['wheat sowing depth', 'wheat seed rate per acre', 'wheat variety selection'],
    vegetative:   ['wheat yellow rust treatment', 'wheat irrigation schedule'],
    heading:      ['wheat aphid control', 'wheat late irrigation'],
    maturity:     ['wheat harvesting combine settings', 'wheat storage'],
  },
  tomato: {
    nursery:      ['tomato nursery diseases', 'seedling damping off tomato'],
    vegetative:   ['tomato whitefly control', 'tomato leaf curl virus', 'staking tomato plants'],
    flowering:    ['tomato blossom drop reason', 'calcium deficiency tomato'],
    harvesting:   ['tomato grading standards', 'shelf life extension tomato']
  }
}

class PredictiveCacheService {
  async prefetch(farmerContext: FarmerContext) {
    try {
      const queries = this.generateQueries(farmerContext)
      console.log(`PredictiveCache: Generating ${queries.length} queries to pre-fetch...`)
      
      for (const query of queries.slice(0, 10)) { // limit 10 queries per sync to conserve data
        const isStale = await this.checkIfStale(query, farmerContext)
        if (isStale) {
          // Add a short delay between fetches to respect API limits
          await new Promise(resolve => setTimeout(resolve, 800))
          try {
            console.log(`PredictiveCache: Pre-fetching "${query}"`)
            await searchService.search(query)
          } catch (e) {
            console.warn(`PredictiveCache: Failed to prefetch query "${query}":`, e)
          }
        }
      }
    } catch (e) {
      console.error('PredictiveCache prefetch process failed:', e)
    }
  }

  generateQueries(ctx: FarmerContext): string[] {
    const queries: string[] = []
    const crops = ctx.registeredCrops || []

    for (const crop of crops) {
      const normalizedCrop = crop.toLowerCase()
      const phase = ctx.cropPhase || 'vegetative'
      const phaseQueries = CROP_PHASE_QUERIES[normalizedCrop]?.[phase] || []
      
      queries.push(...phaseQueries)
      
      // Add market price queries for district mandi
      const district = ctx.district || 'Mandya'
      queries.push(`${crop} price ${district} mandi today`)
    }

    // Add generic seasonal schemes
    queries.push('PM-KISAN next installment date')
    queries.push('PMFBY crop insurance claim status')

    return queries
  }

  private async checkIfStale(query: string, context: FarmerContext): Promise<boolean> {
    try {
      const queryHash = this.simpleHash(query + JSON.stringify(context))
      const cachedCollection = database.get('cached_answers')
      
      const records = await cachedCollection.query(Q.where('query_hash', queryHash)).fetch()
      if (records.length === 0) return true
      
      const record = records[0] as any
      // Stale if it expires in less than 6 hours
      return record.expiresAt - Date.now() < 6 * 3600 * 1000
    } catch (e) {
      return true
    }
  }

  private simpleHash(str: string): string {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i)
      hash |= 0
    }
    return Math.abs(hash).toString(16)
  }
}

export const predictiveCache = new PredictiveCacheService()
export default predictiveCache;
