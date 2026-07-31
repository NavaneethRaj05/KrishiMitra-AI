import * as BackgroundFetch from 'expo-background-fetch'
import * as TaskManager from 'expo-task-manager'
import { Platform } from 'react-native'
import { database } from '../db/database'
import { useOfflineStore } from '../store/useOfflineStore'
import { useAuthStore } from '../store/useAuthStore'
import { predictiveCache } from './predictiveCache'
import { Q } from '@nozbe/watermelondb'

const SYNC_TASK_NAME = 'vaani-background-sync'
const getApiBase = () => {
  if (typeof window !== 'undefined' && window.location && window.location.hostname) {
    const hostname = window.location.hostname
    return `http://${hostname}:5000/api`
  }
  return 'http://localhost:5000/api'
}
const API_BASE = getApiBase()

// Define the background sync task
TaskManager.defineTask(SYNC_TASK_NAME, async () => {
  try {
    const isOnline = useOfflineStore.getState().isConnected
    if (!isOnline) {
      return BackgroundFetch.BackgroundFetchResult.NoData
    }

    console.log('Background Sync: Task started...')

    // 1. Flush offline queue
    await syncService.flushOfflineQueue()

    // 2. Sync local unsynced threads & messages to server
    await syncService.syncThreadsAndMessages()

    // 3. Pre-fetch upcoming seasonal queries (Predictive Cache)
    const farmer = useAuthStore.getState().farmer
    if (farmer) {
      await predictiveCache.prefetch(farmer)
    }

    // 4. Fetch trending queries
    await syncService.refreshTrendingQueries()

    console.log('Background Sync: Task finished successfully.')
    return BackgroundFetch.BackgroundFetchResult.NewData
  } catch (err) {
    console.error('Background Sync: Task failed with error:', err)
    return BackgroundFetch.BackgroundFetchResult.Failed
  }
})

class SyncService {
  async registerBackgroundSync() {
    try {
      if (Platform.OS === 'web') {
        // Native background fetch is not available in web browsers
        return
      }
      const status = await BackgroundFetch.getStatusAsync()
      if (status === BackgroundFetch.BackgroundFetchStatus.Restricted || status === BackgroundFetch.BackgroundFetchStatus.Denied) {
        return
      }

      const isRegistered = await TaskManager.isTaskRegisteredAsync(SYNC_TASK_NAME)
      if (!isRegistered) {
        await BackgroundFetch.registerTaskAsync(SYNC_TASK_NAME, {
          minimumInterval: 60 * 60 * 6, // run every 6 hours
          stopOnTerminate: false,
          startOnBoot: true,
        })
        console.log('✅ Background sync fetch registered successfully.')
      }
    } catch (e) {
      console.warn('Failed to register background sync fetch:', e)
    }
  }

  async flushOfflineQueue() {
    try {
      const queueCollection = database.get('offline_queue')
      const queuedItems: any[] = await queueCollection.query().fetch()

      if (queuedItems.length === 0) return

      console.log(`Flushing offline queue: ${queuedItems.length} actions pending...`)
      
      const authStore = useAuthStore.getState()

      for (const item of queuedItems) {
        try {
          const payload = JSON.parse(item.payload)
          
          if (item.actionType === 'search') {
            // Send search query to server
            await fetch(`${API_BASE}/search`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authStore.token}`
              },
              body: JSON.stringify(payload)
            })
          }
          
          // Delete from queue after successful execution
          await database.write(async () => {
            await item.destroyPermanently()
          })
        } catch (itemErr) {
          console.warn('Failed to execute offline queue item, incrementing retry:', itemErr)
          await database.write(async () => {
            await item.update((q: any) => {
              q.retryCount += 1
            })
          })
        }
      }
      useOfflineStore.getState().setOfflineQueueSize(0)
    } catch (e) {
      console.error('Failed to flush offline queue:', e)
    }
  }

  async syncThreadsAndMessages() {
    try {
      const authStore = useAuthStore.getState()
      if (!authStore.token) return

      const threadsCollection = database.get('threads')
      const messagesCollection = database.get('messages')

      // Get unsynced messages and unsynced threads
      const unsyncedMessages = await messagesCollection.query(Q.where('synced_at', null)).fetch()
      const unsyncedThreads = await threadsCollection.query(Q.where('synced_at', null)).fetch()

      // Set of thread IDs that need syncing
      const threadIdsToSync = new Set<string>()
      unsyncedThreads.forEach((t: any) => threadIdsToSync.add(t.id))
      unsyncedMessages.forEach((m: any) => threadIdsToSync.add(m.threadId))

      if (threadIdsToSync.size === 0) return

      // Fetch all these threads from database
      const threadsToSync = await threadsCollection.query(Q.where('id', Q.oneOf(Array.from(threadIdsToSync)))).fetch()

      const threadsPayload = []
      for (const thread of threadsToSync as any[]) {
        // Fetch all messages for this thread to sync complete history
        const messages = await messagesCollection.query(Q.where('thread_id', thread.id)).fetch()
        threadsPayload.push({
          client_id: thread.id,
          title: thread.title,
          intent: thread.intent,
          season: thread.season,
          is_bookmarked: thread.isBookmarked,
          messages: messages.map((m: any) => ({
            role: m.role,
            content: m.content,
            citations: m.citations || '[]',
            follow_ups: m.followUps || '[]',
            intent: m.intent,
            image_uri: m.imageUri,
            offline_fallback: m.offlineFallback || false,
            created_at: new Date(m.createdAt).toISOString()
          }))
        })
      }

      // Send to server
      const response = await fetch(`${API_BASE}/sync/threads/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authStore.token}`
        },
        body: JSON.stringify({ threads: threadsPayload })
      })

      if (response.ok) {
        const resData = await response.json()
        if (resData.success) {
          // Mark threads and messages as synced
          await database.write(async () => {
            const now = Date.now()
            for (const thread of threadsToSync) {
              await thread.update((t: any) => {
                t.syncedAt = now
              })
            }
            for (const msg of unsyncedMessages) {
              await msg.update((m: any) => {
                m.syncedAt = now
              })
            }
          })
          console.log(`Successfully batch synced ${threadsToSync.length} threads and ${unsyncedMessages.length} messages.`)
        }
      }
    } catch (e) {
      console.error('Failed to sync threads and messages:', e)
    }
  }

  async pullThreadsFromServer() {
    try {
      const authStore = useAuthStore.getState()
      if (!authStore.token) return

      const threadsCollection = database.get('threads')
      const messagesCollection = database.get('messages')
      
      const syncedRecords = await threadsCollection.query(Q.where('synced_at', Q.notEq(null))).fetch()
      let lastSyncTime = ''
      if (syncedRecords.length > 0) {
        const maxTime = Math.max(...syncedRecords.map((r: any) => r.syncedAt || 0))
        lastSyncTime = new Date(maxTime).toISOString()
      }

      const url = `${API_BASE}/sync/threads${lastSyncTime ? `?since=${encodeURIComponent(lastSyncTime)}` : ''}`
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${authStore.token}`
        }
      })

      if (response.ok) {
        const resData = await response.json()
        if (resData.success && resData.data && resData.data.length > 0) {
          await database.write(async () => {
            for (const serverThread of resData.data) {
              // Check if thread exists locally
              const localThreads = await threadsCollection.query(Q.where('id', serverThread.clientId)).fetch()
              
              let localThreadObj: any = null
              
              if (localThreads.length > 0) {
                // Conflict resolution: server wins
                localThreadObj = localThreads[0]
                await localThreadObj.update((t: any) => {
                  t.title = serverThread.title
                  t.intent = serverThread.intent
                  t.season = serverThread.season
                  t.isBookmarked = serverThread.isBookmarked
                  t.syncedAt = Date.now()
                })
              } else {
                // Create thread locally
                localThreadObj = await threadsCollection.create((t: any) => {
                  t._raw.id = serverThread.clientId // force set ID to align across devices
                  t.farmerId = serverThread.farmer
                  t.title = serverThread.title
                  t.intent = serverThread.intent
                  t.season = serverThread.season
                  t.isBookmarked = serverThread.isBookmarked
                  t.syncedAt = Date.now()
                  t.createdAt = new Date(serverThread.createdAt).getTime()
                  t.updatedAt = new Date(serverThread.updatedAt).getTime()
                })
              }

              // Sync messages for this thread
              for (const serverMsg of serverThread.messages || []) {
                const localMsgs = await messagesCollection
                  .query(
                    Q.where('thread_id', localThreadObj.id),
                    Q.where('role', serverMsg.role),
                    Q.where('content', serverMsg.content)
                  )
                  .fetch()

                if (localMsgs.length === 0) {
                  // Create message locally
                  await messagesCollection.create((m: any) => {
                    m.threadId = localThreadObj.id
                    m.role = serverMsg.role
                    m.content = serverMsg.content
                    m.citations = serverMsg.citations || '[]'
                    m.followUps = serverMsg.followUps || '[]'
                    m.intent = serverMsg.intent || 'general_agri'
                    m.imageUri = serverMsg.imageUri || ''
                    m.offlineFallback = serverMsg.offlineFallback || false
                    m.syncedAt = Date.now()
                    m.createdAt = new Date(serverMsg.createdAt).getTime()
                  })
                }
              }
            }
          })
          console.log(`Successfully pulled and merged ${resData.data.length} threads from server.`)
        }
      }
    } catch (e) {
      console.error('Failed to pull threads from server:', e)
    }
  }

  async refreshTrendingQueries() {
    try {
      const farmer = useAuthStore.getState().farmer
      const district = farmer?.district || 'Mandya'
      // Derive season from current month: Jun–Nov = Kharif, Dec–May = Rabi
      const currentMonth = new Date().getMonth() // 0-indexed
      const season = (currentMonth >= 5 && currentMonth <= 10) ? 'Kharif' : 'Rabi'

      const response = await fetch(`${API_BASE}/search/trending?district=${district}&season=${season}`)
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data) {
          // Cache trending in MMKV
          const storage = new (require('react-native-mmkv').MMKV)()
          storage.set('trending_queries', JSON.stringify(data.data))
        }
      }
    } catch (e) {
      console.warn('Failed to refresh trending queries:', e)
    }
  }
}

export const syncService = new SyncService()
