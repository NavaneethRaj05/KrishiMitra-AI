import { Model } from '@nozbe/watermelondb'
import { field, date, readonly } from '@nozbe/watermelondb/decorators'

export default class CachedAnswer extends Model {
  static table = 'cached_answers'

  @field('query_hash') queryHash: any
  @field('query') query: any
  @field('answer') answer: any // stringified JSON SearchResult
  @field('farmer_context_hash') farmerContextHash: any
  @field('expires_at') expiresAt: any
  @readonly @date('created_at') createdAt: any
}
