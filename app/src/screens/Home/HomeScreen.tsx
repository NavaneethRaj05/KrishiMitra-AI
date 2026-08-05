/**
 * HomeScreen — KrishiMitra AI field companion home. (Redesigned)
 *
 * Layout (mobile):
 *   - Gradient hero header: logo + greeting + location + connectivity
 *   - Central Ask bar (voice-first, always visible, glass-morphism card)
 *   - Quick action 2x2 grid with gradient icon backgrounds
 *   - Trending topics horizontal pills
 *   - Weather snapshot card
 *   - Mandi prices card
 *   - Recent conversations
 */

import React, { useState, useEffect, useCallback } from 'react'
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  RefreshControl,
  Platform,
} from 'react-native'
import {
  Wifi, WifiOff, Mic, Camera, Cloud,
  TrendingUp, Clock, ChevronRight, MessageSquare, Search, MapPin,
  Leaf, Zap, ArrowRight, Sparkles,
} from 'lucide-react-native'
import { useTheme } from '../../hooks/useTheme'
import { useAuthStore } from '../../store/useAuthStore'
import { useOfflineStore } from '../../store/useOfflineStore'
import { useSearchStore } from '../../store/useSearchStore'
import { spacing, radii, shadows } from '../../theme/tokens'
import { KMText } from '../../components/ui/Text'
import { KMCard } from '../../components/ui/Card'
import { KMBadge } from '../../components/ui/Badge'
import { KMStatusBar } from '../../components/ui/StatusBar'
import { WeatherCard } from '../../components/cards/WeatherCard'
import { MandiCard } from '../../components/cards/MandiCard'
import { AskBar } from '../../components/search/AskBar'
import { VoiceModal } from '../../components/search/VoiceModal'
import { MOCK_WEATHER, MOCK_MANDI_PRICES, MOCK_TRENDING_QUERIES } from '../../mock/mockData'
import { database } from '../../db/database'
import { Q } from '@nozbe/watermelondb'
import { t, getLanguage } from '../../i18n'
import { MMKV } from 'react-native-mmkv'
import * as FileSystem from 'expo-file-system'
import { PhotoCapture } from '../../components/photo/PhotoCapture'

interface Props {
  navigation: any
}

const QUICK_ACTIONS = [
  {
    id: 'voice',
    icon: Mic,
    label: 'Ask by Voice',
    subtitle: 'Speak your query',
    gradient: ['#1D9E75', '#0F6047'],
    glyph: '🎙️',
  },
  {
    id: 'camera',
    icon: Camera,
    label: 'Scan Crop',
    subtitle: 'Detect disease',
    gradient: ['#4F46A8', '#2E2A63'],
    glyph: '📸',
  },
  {
    id: 'weather',
    icon: Cloud,
    label: 'Weather',
    subtitle: 'Farm forecast',
    gradient: ['#0284C7', '#075985'],
    glyph: '⛅',
  },
  {
    id: 'market',
    icon: TrendingUp,
    label: 'Mandi Rates',
    subtitle: 'Live prices',
    gradient: ['#D4860A', '#835005'],
    glyph: '📊',
  },
] as const

export default function HomeScreen({ navigation }: Props) {
  const { theme, isDark } = useTheme()
  const farmer = useAuthStore((s) => s.farmer)
  const isConnected = useOfflineStore((s) => s.isConnected)
  const resetSearch = useSearchStore((s) => s.resetSearch)
  const setThreadId = useSearchStore((s) => s.setThreadId)
  const setInputMode = useSearchStore((s) => s.setInputMode)

  const [trending, setTrending] = useState<string[]>([])
  const [recentThreads, setRecentThreads] = useState<any[]>([])
  const [showMic, setShowMic] = useState(false)
  const [showCamera, setShowCamera] = useState(false)
  const [attachedImageUri, setAttachedImageUri] = useState<string | null>(null)
  const [attachedImageB64, setAttachedImageB64] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [voiceLang, setVoiceLang] = useState<string | undefined>()

  const loadData = useCallback(async () => {
    const storage = new MMKV()
    try {
      const cached = storage.getString('trending_queries')
      setTrending(cached ? JSON.parse(cached) : MOCK_TRENDING_QUERIES)
    } catch {
      setTrending(MOCK_TRENDING_QUERIES)
    }

    try {
      const col = database.get('threads')
      const records = await col.query(Q.sortBy('updated_at', Q.desc), Q.take(3)).fetch()
      setRecentThreads(records)
    } catch {
      setRecentThreads([])
    }

    try {
      const { syncService } = require('../../services/syncService')
      await syncService.pullThreadsFromServer()
    } catch {}
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const onRefresh = async () => {
    setRefreshing(true)
    await loadData()
    setRefreshing(false)
  }

  const submitQuery = (
    query: string,
    threadId?: string | null,
    imgUri?: string | null,
    imgB64?: string | null,
    language?: string,
  ) => {
    resetSearch()
    setThreadId(threadId ?? null)
    setInputMode(imgUri && query ? 'multimodal' : imgUri ? 'image' : 'text')
    navigation.navigate('AskResult', {
      query: query || (imgUri ? 'Diagnose this crop leaf' : ''),
      threadId: threadId ?? null,
      imageUri: imgUri,
      imageB64: imgB64,
      detectedLanguage: language ?? voiceLang,
    })
  }

  const handleVoiceResult = (transcript: string, language?: string) => {
    setShowMic(false)
    setInputMode('voice')
    if (language) setVoiceLang(language)
    submitQuery(transcript, null, null, null, language)
  }

  const handleQuickAction = async (id: string) => {
    if (id === 'voice')   { setShowMic(true); return }
    if (id === 'camera')  { setShowCamera(true); return }
    if (id === 'weather') { submitQuery('What is the weather forecast for my farm area?'); return }
    if (id === 'market')  { submitQuery('What are the current mandi prices for my crops?'); return }
  }

  const hour = new Date().getHours()
  const greetWord = hour < 5 ? 'Good night' : hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const greetEmoji = hour < 5 ? '🌙' : hour < 12 ? '🌄' : hour < 17 ? '☀️' : '🌆'
  const firstName = farmer?.name?.split(' ')[0] ?? 'Farmer'

  // Hero gradient based on time of day
  const heroColors = isDark
    ? ['#0a1a13', '#112b1f']
    : hour < 12
      ? ['#e8f7f2', '#f0fdf8']
      : hour < 17
        ? ['#fef9ee', '#fef3d0']
        : ['#eef2f8', '#e8eef6']

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.bg.base }]}>
      <KMStatusBar />

      {/* ── Hero Header ───────────────────────────────────────── */}
      <View style={[styles.hero, { backgroundColor: heroColors[0] }]}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <View style={styles.logoRow}>
            <View style={[styles.logoMark, {
              backgroundColor: theme.accent.primary,
              ...shadows.sm,
            }]}>
              <KMText size="base">🌾</KMText>
            </View>
            <View>
              <KMText size="md" weight="bold" color={theme.accent.primary}>KrishiMitra</KMText>
              <KMText size="xs" color={theme.text.tertiary} style={styles.logoSub}>AI Field Companion</KMText>
            </View>
          </View>

          <View style={styles.topBarRight}>
            {/* Offline / Online pill */}
            <View style={[styles.connPill, {
              backgroundColor: isConnected ? '#d1fae5' : '#fef3c7',
              borderColor: isConnected ? '#6ee7b7' : '#fcd34d',
            }]}>
              {isConnected
                ? <Wifi size={11} color="#059669" strokeWidth={2.5} />
                : <WifiOff size={11} color="#d97706" strokeWidth={2.5} />}
              <KMText size="xs" weight="bold" color={isConnected ? '#059669' : '#d97706'} style={{ marginLeft: 4 }}>
                {isConnected ? 'Online' : 'Offline'}
              </KMText>
            </View>
          </View>
        </View>

        {/* Greeting */}
        <View style={styles.greetingBlock}>
          <KMText size="xs" color={theme.text.tertiary} weight="medium" style={styles.greetingTime}>
            {greetEmoji}  {greetWord.toUpperCase()}
          </KMText>
          <KMText size="2xl" weight="bold" style={styles.greetingName}>
            {firstName}
          </KMText>
          <View style={styles.greetingMeta}>
            <MapPin size={13} color={theme.text.secondary} />
            <KMText size="sm" weight="medium" color={theme.text.secondary} style={{ marginLeft: 5 }}>
              {farmer?.district ?? 'Your Farm'}
            </KMText>
            {farmer?.registeredCrops?.[0] && (
              <>
                <KMText size="sm" color={theme.text.tertiary} style={{ marginHorizontal: 6 }}>·</KMText>
                <Leaf size={12} color={theme.accent.primary} />
                <KMText size="sm" weight="medium" color={theme.accent.primary} style={{ marginLeft: 4 }}>
                  {farmer.registeredCrops[0]} season
                </KMText>
              </>
            )}
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.accent.primary}
            colors={[theme.accent.primary]}
          />
        }
      >
        {/* ── Ask Bar — lifted, floating card ───────────────── */}
        <View style={[styles.askBarWrapper, {
          backgroundColor: theme.bg.surface,
          borderColor: theme.border.default,
          ...shadows.md,
        }]}>
          <AskBar
            onSubmit={(q) => {
              submitQuery(q, null, attachedImageUri, attachedImageB64)
              setAttachedImageUri(null)
              setAttachedImageB64(null)
            }}
            onMicPress={() => setShowMic(true)}
            onCameraPress={() => setShowCamera(true)}
            onImageSelected={(uri, b64) => { setAttachedImageUri(uri); setAttachedImageB64(b64) }}
            attachedImageUri={attachedImageUri}
            onRemoveImage={() => { setAttachedImageUri(null); setAttachedImageB64(null) }}
            layout="home"
          />
        </View>

        {/* ── Quick Action Grid ──────────────────────────────── */}
        <View style={styles.quickGrid}>
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon
            return (
              <TouchableOpacity
                key={action.id}
                onPress={() => handleQuickAction(action.id)}
                activeOpacity={0.82}
                style={[styles.quickCard, {
                  backgroundColor: action.gradient[0],
                  ...shadows.md,
                }]}
              >
                {/* Glyph watermark */}
                <KMText style={styles.quickGlyph}>{action.glyph}</KMText>
                {/* Icon */}
                <View style={styles.quickIconWrap}>
                  <Icon size={26} color="#fff" strokeWidth={2} />
                </View>
                <KMText size="base" weight="bold" color="#fff" style={styles.quickLabel}>
                  {action.label}
                </KMText>
                <KMText size="xs" color="rgba(255,255,255,0.75)" style={styles.quickSubtitle}>
                  {action.subtitle}
                </KMText>
              </TouchableOpacity>
            )
          })}
        </View>

        {/* ── Trending In Your Area ──────────────────────────── */}
        {trending.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionTitleRow}>
                <Zap size={14} color={theme.accent.secondary} />
                <KMText size="sm" weight="bold" color={theme.text.primary} style={{ marginLeft: 6 }}>
                  Trending Near You
                </KMText>
              </View>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.trendingScroll}
            >
              {trending.map((chip, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => submitQuery(chip)}
                  style={[styles.trendingChip, {
                    backgroundColor: theme.bg.surface,
                    borderColor: theme.border.default,
                    ...shadows.xs,
                  }]}
                  activeOpacity={0.7}
                >
                  <Search size={12} color={theme.text.tertiary} style={{ marginRight: 6 }} />
                  <KMText size="sm" weight="medium" color={theme.text.secondary}>{chip}</KMText>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ── Weather snapshot ──────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleRow}>
              <Cloud size={14} color="#0284C7" />
              <KMText size="sm" weight="bold" color={theme.text.primary} style={{ marginLeft: 6 }}>Farm Weather</KMText>
            </View>
          </View>
          <WeatherCard
            data={MOCK_WEATHER as any}
            onPress={() => submitQuery('What is the weather forecast and crop risk for my farm?')}
          />
        </View>

        {/* ── Mandi Prices ──────────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleRow}>
              <TrendingUp size={14} color={theme.accent.secondary} />
              <KMText size="sm" weight="bold" color={theme.text.primary} style={{ marginLeft: 6 }}>Mandi Prices</KMText>
            </View>
            <TouchableOpacity
              onPress={() => submitQuery('Current mandi prices for my crops')}
              style={[styles.seeAllBtn, { borderColor: theme.border.default }]}
            >
              <KMText size="xs" weight="bold" color={theme.accent.primary}>See all</KMText>
              <ArrowRight size={12} color={theme.accent.primary} style={{ marginLeft: 3 }} />
            </TouchableOpacity>
          </View>
          <MandiCard items={MOCK_MANDI_PRICES.slice(0, 3) as any} />
        </View>

        {/* ── Recent conversations ───────────────────────────── */}
        {recentThreads.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionTitleRow}>
                <Clock size={14} color={theme.text.secondary} />
                <KMText size="sm" weight="bold" color={theme.text.primary} style={{ marginLeft: 6 }}>Recent Chats</KMText>
              </View>
              <TouchableOpacity
                onPress={() => navigation.navigate('History')}
                style={[styles.seeAllBtn, { borderColor: theme.border.default }]}
              >
                <KMText size="xs" weight="bold" color={theme.accent.primary}>See all</KMText>
                <ArrowRight size={12} color={theme.accent.primary} style={{ marginLeft: 3 }} />
              </TouchableOpacity>
            </View>
            {recentThreads.map((thread) => (
              <TouchableOpacity
                key={thread.id}
                onPress={() => {
                  resetSearch()
                  setThreadId(thread.id)
                  navigation.navigate('Thread', { threadId: thread.id, threadTitle: thread.title })
                }}
                style={[styles.threadCard, {
                  backgroundColor: theme.bg.surface,
                  borderColor: theme.border.default,
                  ...shadows.sm,
                }]}
                activeOpacity={0.75}
              >
                <View style={[styles.threadIcon, { backgroundColor: theme.accent.primaryDim }]}>
                  <MessageSquare size={18} color={theme.accent.primary} />
                </View>
                <View style={styles.threadContent}>
                  <KMText size="base" weight="semibold" numberOfLines={1}>
                    {thread.title}
                  </KMText>
                  <View style={styles.threadMetaRow}>
                    <KMBadge
                      label={thread.intent?.replace(/_/g, ' ') || 'General'}
                      variant="neutral"
                      size="xs"
                    />
                    <KMText size="xs" color={theme.text.tertiary} style={{ marginLeft: spacing.sm }}>
                      {new Date(thread.createdAt).toLocaleDateString()}
                    </KMText>
                  </View>
                </View>
                <ChevronRight size={18} color={theme.text.tertiary} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Modals */}
      <VoiceModal
        visible={showMic}
        onClose={() => setShowMic(false)}
        onTranscriptComplete={handleVoiceResult}
      />

      {showCamera && (
        <PhotoCapture
          onClose={() => setShowCamera(false)}
          navigation={navigation}
          onPhotoSelected={async (uri) => {
            setAttachedImageUri(uri)
            try {
              const b64 = await FileSystem.readAsStringAsync(uri, {
                encoding: FileSystem.EncodingType.Base64,
              })
              setAttachedImageB64(b64)
            } catch {}
            setShowCamera(false)
          }}
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  // ── Hero ────────────────────────────────────────────────────
  hero: {
    paddingTop: Platform.OS === 'ios' ? 0 : spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 64,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  logoMark: {
    width: 40,
    height: 40,
    borderRadius: radii.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoSub: {
    fontSize: 10,
    letterSpacing: 0.3,
    marginTop: -2,
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  connPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.full,
    borderWidth: 1,
  },

  greetingBlock: {
    marginTop: spacing.sm,
  },
  greetingTime: {
    letterSpacing: 1.2,
    marginBottom: 4,
    fontSize: 11,
  },
  greetingName: {
    lineHeight: 32,
    marginBottom: 6,
  },
  greetingMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },

  // ── Scroll ──────────────────────────────────────────────────
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: 80,
  },

  // ── Ask bar wrapper ─────────────────────────────────────────
  askBarWrapper: {
    borderRadius: radii.xl,
    borderWidth: 1,
    marginBottom: spacing.xl,
    overflow: 'hidden',
  },

  // ── Quick Grid ──────────────────────────────────────────────
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  quickCard: {
    width: '47%',
    borderRadius: radii.xl,
    padding: spacing.lg,
    minHeight: 110,
    overflow: 'hidden',
    position: 'relative',
  },
  quickGlyph: {
    position: 'absolute',
    bottom: -4,
    right: 6,
    fontSize: 48,
    opacity: 0.18,
  },
  quickIconWrap: {
    width: 44,
    height: 44,
    borderRadius: radii.lg,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  quickLabel: {
    marginBottom: 2,
    zIndex: 1,
  },
  quickSubtitle: {
    zIndex: 1,
    fontSize: 11,
  },

  // ── Section ─────────────────────────────────────────────────
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radii.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },

  // ── Trending ────────────────────────────────────────────────
  trendingScroll: {
    gap: spacing.md,
    paddingRight: spacing.xl,
    paddingBottom: spacing.sm,
  },
  trendingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.full,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },

  // ── Thread cards ────────────────────────────────────────────
  threadCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.xl,
    borderWidth: 1,
    padding: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  threadIcon: {
    width: 46,
    height: 46,
    borderRadius: radii.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  threadContent: {
    flex: 1,
    gap: 4,
  },
  threadMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
})
