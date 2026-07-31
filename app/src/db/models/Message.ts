import { Model } from '@nozbe/watermelondb'
import { field, date, relation, readonly } from '@nozbe/watermelondb/decorators'
import Thread from './Thread'

export default class Message extends Model {
  static table = 'messages'

  static associations = {
    threads: { type: 'belongs_to' as const, key: 'thread_id' },
  }

  @field('thread_id') threadId: any
  @field('role') role: any // 'user' | 'assistant'
  @field('content') content: any
  @field('citations') citations: any // stringified JSON array of Citation
  @field('follow_ups') followUps: any // stringified JSON array of string
  @field('intent') intent: any
  @field('image_uri') imageUri: any
  @field('offline_fallback') offlineFallback: any
  @field('synced_at') syncedAt: any
  @readonly @date('created_at') createdAt: any

  @relation('threads', 'thread_id') thread: any
}
