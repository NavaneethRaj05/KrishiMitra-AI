import { appSchema, tableSchema } from '@nozbe/watermelondb'

export const schema = appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: 'threads',
      columns: [
        { name: 'farmer_id', type: 'string', isIndexed: true },
        { name: 'title', type: 'string' },
        { name: 'intent', type: 'string' },   // disease|market|scheme|agronomy
        { name: 'season', type: 'string' },
        { name: 'message_count', type: 'number' },
        { name: 'is_bookmarked', type: 'boolean' },
        { name: 'synced_at', type: 'number', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ]
    }),
    tableSchema({
      name: 'messages',
      columns: [
        { name: 'thread_id', type: 'string', isIndexed: true },
        { name: 'role', type: 'string' },       // user | assistant
        { name: 'content', type: 'string' },
        { name: 'citations', type: 'string' },  // JSON stringified array
        { name: 'follow_ups', type: 'string' }, // JSON stringified array
        { name: 'intent', type: 'string' },
        { name: 'image_uri', type: 'string', isOptional: true },  // for photo queries
        { name: 'offline_fallback', type: 'boolean' },
        { name: 'synced_at', type: 'number', isOptional: true },
        { name: 'created_at', type: 'number' },
      ]
    }),
    tableSchema({
      name: 'cached_answers',
      columns: [
        { name: 'query_hash', type: 'string', isIndexed: true },
        { name: 'query', type: 'string' },
        { name: 'answer', type: 'string' },     // JSON stringified SearchResult
        { name: 'farmer_context_hash', type: 'string' },
        { name: 'expires_at', type: 'number' },
        { name: 'created_at', type: 'number' },
      ]
    }),
    tableSchema({
      name: 'offline_queue',
      columns: [
        { name: 'action_type', type: 'string' },  // search|sync_thread|sync_message
        { name: 'payload', type: 'string' },       // JSON stringified action data
        { name: 'retry_count', type: 'number' },
        { name: 'created_at', type: 'number' },
      ]
    }),
    tableSchema({
      name: 'farmer_profiles',
      columns: [
        { name: 'farmer_id', type: 'string', isIndexed: true },
        { name: 'name', type: 'string' },
        { name: 'phone', type: 'string' },
        { name: 'state', type: 'string' },
        { name: 'district', type: 'string' },
        { name: 'block', type: 'string' },
        { name: 'primary_crops', type: 'string' },   // JSON stringified array of crops
        { name: 'land_acres', type: 'number' },
        { name: 'soil_type', type: 'string' },
        { name: 'irrigation_type', type: 'string' },
        { name: 'preferred_language', type: 'string' },
        { name: 'updated_at', type: 'number' },
      ]
    }),
  ]
})
