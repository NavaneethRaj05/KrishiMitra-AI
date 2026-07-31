import React, { useState, useEffect } from 'react'
import { StyleSheet, View, ScrollView, SafeAreaView, TextInput, TouchableOpacity, Alert } from 'react-native'
import { ArrowLeft, Search, Trash2, Bookmark, BookmarkCheck, Wifi, WifiOff, MessageSquare } from 'lucide-react-native'
import { colors, spacing, radii } from '../../components/ui/tokens'
import { VaaniText } from '../../components/ui/VaaniText'
import { database } from '../../db/database'
import { Q } from '@nozbe/watermelondb'

const INTENT_COLORS: Record<string, string> = {
  disease_query: '#B84040',
  market_query: '#D4930A',
  scheme_query: '#4A9ECC',
  agronomy_query: '#5DBB6B',
  weather_query: '#4A9ECC',
  general_agri: '#A09880',
}

const INTENT_LABELS: Record<string, string> = {
  disease_query: '🦠 Disease',
  market_query: '📈 Market',
  scheme_query: '🏛️ Scheme',
  agronomy_query: '🌱 Agronomy',
  weather_query: '🌤️ Weather',
  general_agri: '🌾 General',
}

interface GroupedThreads {
  label: string
  threads: any[]
}

const groupThreadsByDate = (threads: any[]): GroupedThreads[] => {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 86400000)
  const weekAgo = new Date(today.getTime() - 7 * 86400000)

  const groups: GroupedThreads[] = [
    { label: 'Today', threads: [] },
    { label: 'Yesterday', threads: [] },
    { label: 'This Week', threads: [] },
    { label: 'Older', threads: [] },
  ]

  for (const thread of threads) {
    const threadDate = new Date(thread.createdAt)
    if (threadDate >= today) {
      groups[0].threads.push(thread)
    } else if (threadDate >= yesterday) {
      groups[1].threads.push(thread)
    } else if (threadDate >= weekAgo) {
      groups[2].threads.push(thread)
    } else {
      groups[3].threads.push(thread)
    }
  }

  return groups.filter(g => g.threads.length > 0)
}

export const HistoryScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [threads, setThreads] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [intentFilter, setIntentFilter] = useState<string | null>(null)
  const [onlyBookmarked, setOnlyBookmarked] = useState(false)

  useEffect(() => {
    loadThreads()
  }, [searchQuery, intentFilter, onlyBookmarked])

  const loadThreads = async () => {
    try {
      const threadsCollection = database.get('threads')
      let queryBuilder = threadsCollection.query(Q.sortBy('updated_at', Q.desc))

      if (searchQuery.trim()) {
        queryBuilder = threadsCollection.query(
          Q.where('title', Q.like(`%${searchQuery.trim()}%`)),
          Q.sortBy('updated_at', Q.desc)
        )
      }

      const records = await queryBuilder.fetch()
      
      // Client-side filtering
      let filtered = records
      if (intentFilter) {
        filtered = filtered.filter((t: any) => t.intent === intentFilter)
      }
      if (onlyBookmarked) {
        filtered = filtered.filter((t: any) => t.isBookmarked)
      }
      
      setThreads(filtered)
    } catch (e) {
      console.warn('Failed to load threads:', e)
    }
  }

  const toggleBookmark = async (thread: any) => {
    try {
      await database.write(async () => {
        await thread.update((t: any) => {
          t.isBookmarked = !t.isBookmarked
          t.syncedAt = null // trigger re-sync to server
        })
      })
      loadThreads()
    } catch (e) {
      console.warn('Failed to toggle bookmark:', e)
    }
  }

  const getRelativeTime = (date: any): string => {
    const now = Date.now()
    const ts = date instanceof Date ? date.getTime() : date
    const diff = now - ts
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return new Date(ts).toLocaleDateString()
  }

  const handleClearHistory = () => {
    Alert.alert(
      'Clear History',
      'Are you sure you want to delete all farming conversation logs?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              await database.write(async () => {
                const threadsCollection = database.get('threads')
                const allThreads = await threadsCollection.query().fetch()
                for (const t of allThreads) {
                  await t.destroyPermanently()
                }
              })
              loadThreads()
            } catch (err) {
              console.error('Failed to clear database logs:', err)
            }
          }
        }
      ]
    )
  }

  const grouped = groupThreadsByDate(threads)
  const intentFilters = ['disease_query', 'market_query', 'scheme_query', 'agronomy_query']

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <VaaniText size="md" weight="bold" color={colors.text.primary}>
          My Conversations
        </VaaniText>
        <TouchableOpacity onPress={handleClearHistory} style={styles.backBtn}>
          <Trash2 size={20} color={colors.red} />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Search size={18} color={colors.text.tertiary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search threads…"
          placeholderTextColor={colors.text.tertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Filter Row */}
      <View style={styles.filterRowContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {/* Bookmark filter toggle */}
          <TouchableOpacity
            onPress={() => setOnlyBookmarked(!onlyBookmarked)}
            style={[styles.filterChip, onlyBookmarked && styles.filterChipBookmarkActive]}
          >
            <VaaniText size="xs" color={onlyBookmarked ? colors.text.inverse : colors.text.secondary}>
              ⭐️ Bookmarked Only
            </VaaniText>
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            onPress={() => setIntentFilter(null)}
            style={[styles.filterChip, !intentFilter && styles.filterChipActive]}
          >
            <VaaniText size="xs" color={!intentFilter ? colors.text.inverse : colors.text.secondary}>
              All Categories
            </VaaniText>
          </TouchableOpacity>
          {intentFilters.map((f) => (
            <TouchableOpacity
              key={f}
              onPress={() => setIntentFilter(intentFilter === f ? null : f)}
              style={[styles.filterChip, intentFilter === f && styles.filterChipActive]}
            >
              <VaaniText size="xs" color={intentFilter === f ? colors.text.inverse : colors.text.secondary}>
                {INTENT_LABELS[f] || f}
              </VaaniText>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {grouped.map((group) => (
          <View key={group.label}>
            <VaaniText size="xs" weight="bold" color={colors.text.tertiary} style={styles.groupLabel}>
              {group.label}
            </VaaniText>
            {group.threads.map((thread: any) => {
              const intentColor = INTENT_COLORS[thread.intent] || colors.text.tertiary
              return (
                <TouchableOpacity
                  key={thread.id}
                  onPress={() => navigation.navigate('Thread', { threadId: thread.id, threadTitle: thread.title })}
                  style={styles.threadCard}
                  activeOpacity={0.7}
                >
                  <View style={styles.threadMain}>
                    <View style={styles.threadTitleRow}>
                      <VaaniText size="sm" weight="semibold" color={colors.text.primary} numberOfLines={1} style={styles.threadTitle}>
                        {thread.title}
                      </VaaniText>
                      <TouchableOpacity onPress={() => toggleBookmark(thread)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        {thread.isBookmarked ? (
                          <BookmarkCheck size={16} color={colors.amber.bright} />
                        ) : (
                          <Bookmark size={16} color={colors.text.tertiary} />
                        )}
                      </TouchableOpacity>
                    </View>

                    <View style={styles.threadMeta}>
                      {/* Intent badge */}
                      <View style={[styles.intentBadge, { backgroundColor: intentColor + '22' }]}>
                        <VaaniText size="xs" color={intentColor} weight="bold">
                          {INTENT_LABELS[thread.intent] || '🌾 General'}
                        </VaaniText>
                      </View>

                      {/* Message count */}
                      <View style={styles.metaItem}>
                        <MessageSquare size={12} color={colors.text.tertiary} />
                        <VaaniText size="xs" color={colors.text.tertiary} style={styles.metaText}>
                          {thread.messageCount || 0}
                        </VaaniText>
                      </View>

                      {/* Sync status */}
                      <View style={styles.metaItem}>
                        {thread.syncedAt ? (
                          <Wifi size={12} color={colors.green.bright} />
                        ) : (
                          <WifiOff size={12} color={colors.amber.bright} />
                        )}
                      </View>

                      {/* Relative time */}
                      <VaaniText size="xs" color={colors.text.tertiary}>
                        {getRelativeTime(thread.createdAt)}
                      </VaaniText>
                    </View>
                  </View>
                </TouchableOpacity>
              )
            })}
          </View>
        ))}

        {threads.length === 0 && (
          <View style={styles.emptyContainer}>
            <VaaniText size="base" color={colors.text.tertiary} align="center">
              No conversations found.{'\n'}Try adjusting your filters or search query.
            </VaaniText>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.bg.base,
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 56,
    paddingHorizontal: spacing.base,
    borderBottomColor: colors.border.default,
    borderBottomWidth: 1,
  },
  backBtn: {
    padding: spacing.sm,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.card,
    borderColor: colors.border.default,
    borderRadius: radii.md,
    borderWidth: 1,
    marginHorizontal: spacing.base,
    marginVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    color: colors.text.primary,
    flex: 1,
    fontSize: 14,
    height: 40,
  },
  filterRowContainer: {
    marginBottom: spacing.sm,
  },
  filterScroll: {
    paddingHorizontal: spacing.base,
  },
  filterChip: {
    backgroundColor: colors.bg.card,
    borderColor: colors.border.default,
    borderWidth: 1,
    borderRadius: radii.full,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.xs,
    marginRight: spacing.xs,
  },
  filterChipActive: {
    backgroundColor: colors.green.bright,
    borderColor: colors.green.bright,
  },
  filterChipBookmarkActive: {
    backgroundColor: colors.amber.bright,
    borderColor: colors.amber.bright,
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: colors.border.strong,
    marginHorizontal: spacing.xs,
    alignSelf: 'center',
  },
  scrollContent: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.xxl,
  },
  groupLabel: {
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  threadCard: {
    backgroundColor: colors.bg.card,
    borderColor: colors.border.default,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  threadMain: {
    flex: 1,
  },
  threadTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  threadTitle: {
    flex: 1,
    marginRight: spacing.sm,
  },
  threadMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  intentBadge: {
    borderRadius: radii.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: 1,
    marginRight: spacing.sm,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  metaText: {
    marginLeft: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
  },
})

export default HistoryScreen
