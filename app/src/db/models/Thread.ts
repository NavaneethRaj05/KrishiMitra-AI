import { Model } from '@nozbe/watermelondb'
import { field, date, children, readonly } from '@nozbe/watermelondb/decorators'

export default class Thread extends Model {
  static table = 'threads'

  static associations = {
    messages: { type: 'has_many' as const, foreignKey: 'thread_id' },
  }

  @field('farmer_id') farmerId: any
  @field('title') title: any
  @field('intent') intent: any
  @field('season') season: any
  @field('message_count') messageCount: any
  @field('is_bookmarked') isBookmarked: any
  @field('synced_at') syncedAt: any
  @readonly @date('created_at') createdAt: any
  @readonly @date('updated_at') updatedAt: any

  @children('messages') messages: any
}
