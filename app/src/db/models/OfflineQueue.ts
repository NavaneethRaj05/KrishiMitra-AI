import { Model } from '@nozbe/watermelondb'
import { field, date, readonly } from '@nozbe/watermelondb/decorators'

export default class OfflineQueue extends Model {
  static table = 'offline_queue'

  @field('action_type') actionType: any // 'search' | 'sync_thread' | 'sync_message'
  @field('payload') payload: any // stringified JSON
  @field('retry_count') retryCount: any
  @readonly @date('created_at') createdAt: any
}
