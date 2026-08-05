/**
 * RecordsScreen — conversation history, disease cases, farm activity.
 * Replaces the old HistoryScreen when accessed from bottom tabs.
 */

import React, { useState, useEffect, useCallback } from 'react'
import {
  StyleSheet,
  View,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native'
import {
  Search, Trash2, Bookmark, BookmarkCheck,
  MessageSquare, Wifi, WifiOff,
} from 'lucide-react-native'
import { useTheme } from '../../hooks/useTheme'
import { spacing, radii, shadows } from '../../theme/tokens'
import { KMText } from '../../components/ui/Text'
import { KMBadge } from '../../components/ui/Badge'
import { KMStatusBar } from '../../components/ui/StatusBar'
import { database } from '../../db/database'
import { Q } from '@nozbe/watermelondb'

const INTENT_META: Record<string, { label: string; icon: string; variant: any }> = {
  disease_query:   { label: 'Disease',  icon: '🦠', variant: 'error'   },
  market_query:    { label: 'Market',   icon: '📈', variant: 'warning' },
  scheme_query:    { label: 'Scheme',   icon: '🏛️', variant: 'info'    },
  agronomy_query:  { label: 'Agronomy', icon: '🌱', variant: 'success' },
  weather_query:   { label: 'Weather',  icon: '🌤️', variant: 'info'    },
  general_agri:    { label: 'General',  icon: '🌾', variant: 'neutral' },
}

const groupByDate = (threads: any[]) => {
  const now = Date.now()
  const groups: { label: string; threads: any[] }[] = [
    { label: 'Today', threads: [] },
    { label: 'Yesterday', threads: [] },
    { label: 'This Week', threads: [] },
    { label: 'Older', threads: [] },
  ]
  for (const t of threads) {
    const diff = now - t.createdAt
    if (diff < 86400000)       groups[0].threads.push(t)
    else if (diff < 172800000) groups[1].threads.push(t)
    else if (diff < 604800000) groups[2].threads.push(t)
    else                       groups[3].threads.push(t)
  }
  return groups.filter((g) => g.threads.length > 0)
}

export default function RecordsScreen({ navigation }: any) {
  const { theme } = useTheme()
  const [threads, setThreads] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [intentFilter, setIntentFilter] = useState<string | null>(null)
  const [onlyBookmarked, setOnlyBookmarked] = useState(false)

  const loadThreads = useCallback(async () => {
    try {
      const col = database.get('threads')
      let q = search.trim()
        ? col.query(Q.where('title', Q.like(`%${search.trim()}%`)), Q.sortBy('updated_at', Q.desc))
        : col.query(Q.sortBy('updated_at', Q.desc))
      let records: any[] = await q.fetch()
      if (intentFilter) records = records.filter((t: any) => t.intent === intentFilter)
      if (onlyBookmarked) records = records.filter((t: any) => t.isBookmarked)
      setThreads(records)
    } catch { setThreads([]) }
  }, [search, intentFilter, onlyBookmarked])

  useEffect(() => { loadThreads() }, [loadThreads])

  const toggleBookmark = async (thread: any) => {
    try {
      await database.write(async () => {
        await thread.update((t: any) => { t.isBookmarked = !t.isBookmarked })
      })
      loadThreads()
    } catch {}
  }

  const handleClear = () => {
    Alert.alert(
      'Clear all records',
      'This will permanently delete all conversation history from this device.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete all',
          style: 'destructive',
          onPress: async () => {
            await database.write(async () => {
              const all = await database.get('threads').query().fetch()
              for (const t of all) await t.destroyPermanently()
            })
            setThreads([])
          },
        },
      ],
    )
  }

  const relTime = (ts: any) => {
    const diff = Date.now() - (ts instanceof Date ? ts.getTime() : ts)
    const m = Math.floor(diff / 60000)
    const h = Math.floor(diff / 3600000)
    const d = Math.floor(diff / 86400000)
    if (m < 1) return 'just now'
    if (m < 60) return `${m}m ago`
    if (h < 24) return `${h}h ago`
    if (d < 7) return `${d}d ago`
    return new Date(ts).toLocaleDateString()
  }

  const grouped = groupByDate(threads)
  const intentFilters = Object.keys(INTENT_META)

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.bg.base }]}>
      <KMStatusBar />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border.subtle }]}>
        <View>
          <KMText size="2xl" weight="bold">Records</KMText>
          <KMText size="base" color={theme.text.tertiary} style={{ marginTop: 4 }}>
            {threads.length} conversations
          </KMText>
        </View>
        <TouchableOpacity
          onPress={handleClear}
          style={[styles.clearBtn, { backgroundColor: theme.status.errorBg }]}
          activeOpacity={0.7}
        >
          <Trash2 size={20} color={theme.status.error} />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={[styles.searchBar, {
        backgroundColor: theme.bg.surface,
        borderColor: theme.border.default,
      }]}>
        <Search size={20} color={theme.text.tertiary} />
        <TextInput
          style={[styles.searchInput, { color: theme.text.primary }]}
          placeholder="Search conversations…"
          placeholderTextColor={theme.text.tertiary}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtersScroll}
        contentContainerStyle={styles.filtersContent}
      >
        <TouchableOpacity
          onPress={() => setOnlyBookmarked(!onlyBookmarked)}
          style={[styles.filterChip, {
            backgroundColor: onlyBookmarked ? theme.status.warning : theme.bg.surface,
            borderColor: onlyBookmarked ? theme.status.warning : theme.border.default,
          }]}
        >
          <KMText size="sm" weight="bold" color={onlyBookmarked ? theme.text.inverse : theme.text.secondary}>
            ⭐ Saved
          </KMText>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setIntentFilter(null)}
          style={[styles.filterChip, {
            backgroundColor: !intentFilter ? theme.accent.primary : theme.bg.surface,
            borderColor: !intentFilter ? theme.accent.primary : theme.border.default,
          }]}
        >
          <KMText size="sm" weight="bold" color={!intentFilter ? theme.text.inverse : theme.text.secondary}>
            All
          </KMText>
        </TouchableOpacity>

        {intentFilters.map((f) => {
          const meta = INTENT_META[f]
          const isActive = intentFilter === f
          return (
            <TouchableOpacity
              key={f}
              onPress={() => setIntentFilter(isActive ? null : f)}
              style={[styles.filterChip, {
                backgroundColor: isActive ? theme.accent.primary : theme.bg.surface,
                borderColor: isActive ? theme.accent.primary : theme.border.default,
              }]}
            >
              <KMText size="sm" weight="bold" color={isActive ? theme.text.inverse : theme.text.secondary}>
                {meta.icon} {meta.label}
              </KMText>
            </TouchableOpacity>
          )
        })}
      </ScrollView>

      {/* Grouped threads */}
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {grouped.length === 0 ? (
          <View style={styles.empty}>
            <MessageSquare size={48} color={theme.text.tertiary} />
            <KMText size="lg" weight="medium" color={theme.text.tertiary} align="center" style={{ marginTop: spacing.md }}>
              No conversations found
            </KMText>
          </View>
        ) : (
          grouped.map((group) => (
            <View key={group.label}>
              <KMText
                size="sm"
                weight="bold"
                color={theme.text.tertiary}
                style={styles.groupLabel}
              >
                {group.label.toUpperCase()}
              </KMText>
              {group.threads.map((thread) => {
                const meta = INTENT_META[thread.intent] ?? INTENT_META.general_agri
                return (
                  <TouchableOpacity
                    key={thread.id}
                    onPress={() => navigation.navigate('Thread', { threadId: thread.id, threadTitle: thread.title })}
                    style={[styles.threadCard, {
                      backgroundColor: theme.bg.surface,
                      borderColor: theme.border.default,
                      ...shadows.sm,
                    }]}
                    activeOpacity={0.75}
                  >
                    <View style={styles.threadMain}>
                      <View style={styles.threadTitleRow}>
                        <KMText size="base" weight="bold" numberOfLines={1} style={{ flex: 1, paddingRight: 8 }}>
                          {thread.title}
                        </KMText>
                        <TouchableOpacity
                          onPress={() => toggleBookmark(thread)}
                          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                        >
                          {thread.isBookmarked
                            ? <BookmarkCheck size={20} color={theme.status.warning} />
                            : <Bookmark size={20} color={theme.text.tertiary} />}
                        </TouchableOpacity>
                      </View>
                      <View style={styles.threadMeta}>
                        <KMBadge
                          label={meta.label}
                          variant={meta.variant}
                          size="xs"
                          icon={meta.icon}
                        />
                        <View style={styles.metaItem}>
                          <MessageSquare size={12} color={theme.text.tertiary} />
                          <KMText size="xs" color={theme.text.tertiary} weight="medium" style={{ marginLeft: 4 }}>
                            {thread.messageCount ?? 0}
                          </KMText>
                        </View>
                        {thread.syncedAt
                          ? <Wifi size={12} color={theme.sync.online} />
                          : <WifiOff size={12} color={theme.sync.offline} />}
                        <KMText size="xs" color={theme.text.tertiary} weight="medium">
                          {relTime(thread.createdAt)}
                        </KMText>
                      </View>
                    </View>
                  </TouchableOpacity>
                )
              })}
            </View>
          ))
        )}
        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
  },
  clearBtn: {
    width: 44,
    height: 44,
    borderRadius: radii.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.xl,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    height: 48,
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.md,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 16,
  },
  filtersScroll: {
    maxHeight: 48,
    marginBottom: spacing.md,
  },
  filtersContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    alignItems: 'center',
  },
  filterChip: {
    borderRadius: radii.full,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  groupLabel: {
    letterSpacing: 1,
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  threadCard: {
    borderRadius: radii.xl,
    borderWidth: 1,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  threadMain: { flex: 1 },
  threadTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  threadMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
})
