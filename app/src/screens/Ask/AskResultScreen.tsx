/**
 * AskResultScreen — shows the AI answer for a query.
 *
 * Layout:
 *   App bar with back + query title
 *   Scrollable answer area:
 *     - User message bubble
 *     - Loading skeleton  OR  AnswerBlock + FollowUpChips
 *   Sticky bottom bar with follow-up input
 */

import React, { useEffect, useState, useRef } from 'react'
import {
  StyleSheet,
  View,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
  Alert,
} from 'react-native'
import { ArrowLeft } from 'lucide-react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated'
import { useTheme } from '../../hooks/useTheme'
import { useSearchStore } from '../../store/useSearchStore'
import { useAuthStore } from '../../store/useAuthStore'
import { useOfflineStore } from '../../store/useOfflineStore'
import { spacing, radii, shadows } from '../../theme/tokens'
import { KMText } from '../../components/ui/Text'
import { KMCard } from '../../components/ui/Card'
import { KMStatusBar } from '../../components/ui/StatusBar'
import { AskBar } from '../../components/search/AskBar'
import { AnswerBlock } from '../../components/search/AnswerBlock'
import { VoiceModal } from '../../components/search/VoiceModal'
import { PhotoCapture } from '../../components/photo/PhotoCapture'
import { MessageBubble } from '../../components/thread/MessageBubble'
import { FollowUpChips } from '../../components/search/FollowUpChips'
import { searchService, SearchResult } from '../../services/searchService'
import { t } from '../../i18n'
import * as FileSystem from 'expo-file-system'

interface Props {
  route: any
  navigation: any
}

// ── Skeleton shimmer ──────────────────────────────────────────────────────────
function SkeletonLine({ width, height = 16 }: { width: string | number; height?: number }) {
  const { theme } = useTheme()
  const opacity = useSharedValue(0.4)
  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 700 }),
        withTiming(0.4, { duration: 700 }),
      ),
      -1,
    )
  }, [])
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }))
  return (
    <Animated.View
      style={[style, {
        width: width as any,
        height,
        borderRadius: radii.sm,
        backgroundColor: theme.skeleton.base,
        marginBottom: 10,
      }]}
    />
  )
}

function AnswerSkeleton() {
  return (
    <View style={{ padding: spacing.lg, gap: 8 }}>
      <SkeletonLine width="40%" height={14} />
      <SkeletonLine width="100%" height={16} />
      <SkeletonLine width="90%" height={16} />
      <SkeletonLine width="95%" height={16} />
      <SkeletonLine width="75%" height={16} />
      <View style={{ height: 16 }} />
      <SkeletonLine width="60%" height={14} />
      <SkeletonLine width="100%" height={16} />
      <SkeletonLine width="80%" height={16} />
    </View>
  )
}

export default function AskResultScreen({ route, navigation }: Props) {
  const { query, threadId: initialThreadId, imageUri, imageB64, detectedLanguage: routeLang } = route.params
  const { theme } = useTheme()
  const isConnected = useOfflineStore((s) => s.isConnected)
  const searchStore = useSearchStore()
  const scrollRef = useRef<ScrollView>(null)

  const [loading, setLoading] = useState(true)
  const [result, setResult] = useState<SearchResult | null>(null)
  const [activeThreadId, setActiveThreadId] = useState<string | null>(initialThreadId ?? null)
  const [answerLang, setAnswerLang] = useState<string>(
    routeLang ?? useAuthStore.getState().farmer?.preferredLanguage ?? 'en',
  )
  const [showMic, setShowMic] = useState(false)
  const [showCamera, setShowCamera] = useState(false)
  const [followImageUri, setFollowImageUri] = useState<string | null>(null)
  const [followImageB64, setFollowImageB64] = useState<string | null>(null)

  useEffect(() => {
    runSearch()
  }, [query])

  const runSearch = async (overrideLang?: string) => {
    setLoading(true)
    try {
      const lang = overrideLang ?? answerLang
      const res = await searchService.search(query, activeThreadId, null, imageB64 ?? null, lang)
      setResult(res)
      setAnswerLang(res.answerLanguage ?? lang)

      // Update Zustand store
      searchStore.setAnswer(res.answer)
      searchStore.setCitations(res.citations)
      searchStore.setFollowUps(res.followUps)
      searchStore.setIntent(res.intent)
      searchStore.setOfflineFallbackUsed(res.offlineFallbackUsed)
      searchStore.setConfidenceScore(res.confidenceScore)
      searchStore.setSourceBreakdown(res.sourceBreakdown)

      // Persist thread
      let tId = activeThreadId
      if (!tId) {
        const season = useAuthStore.getState().farmer?.cropPhase ?? 'Kharif'
        tId = await searchService.createLocalThread(query, res.intent, season)
        setActiveThreadId(tId)
        searchStore.setThreadId(tId)
      }
      await searchService.saveMessageToLocalDB(tId, 'user', query, undefined, imageUri)
      await searchService.saveMessageToLocalDB(tId, 'assistant', res.answer, res)
    } catch (e) {
      Alert.alert('Error', 'Could not retrieve answer. Please try again.')
    } finally {
      setLoading(false)
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 200)
    }
  }

  const handleFollowUp = (followQuery: string, fImgUri?: string | null, fImgB64?: string | null) => {
    navigation.navigate('Thread', {
      threadId: activeThreadId,
      threadTitle: query,
      initialFollowUpQuery: followQuery,
      imageUri: fImgUri,
      imageB64: fImgB64,
    })
  }

  const Container = Platform.OS === 'web' ? View : SafeAreaView

  return (
    <Container style={[styles.root, { backgroundColor: theme.bg.base }]}>
      <KMStatusBar />

      {/* App bar */}
      <View style={[styles.appBar, {
        backgroundColor: theme.bg.base,
        borderBottomColor: theme.border.subtle,
      }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={24} color={theme.text.primary} />
        </TouchableOpacity>
        <KMText size="base" weight="bold" numberOfLines={1} style={styles.barTitle}>
          {query}
        </KMText>
        <View style={{ width: 44 }} />
      </View>

      {/* Scrollable answer area */}
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* User message */}
        <MessageBubble role="user" content={query} imageUri={imageUri} />

        {loading ? (
          <View style={[styles.answerCardWrapper, { backgroundColor: theme.bg.surface, borderColor: theme.border.default, ...shadows.md }]}>
            <AnswerSkeleton />
          </View>
        ) : result ? (
          <View style={[styles.answerCardWrapper, { backgroundColor: theme.bg.surface, borderColor: theme.border.default, ...shadows.md }]}>
            <AnswerBlock
              answer={result.answer}
              citations={result.citations}
              intent={result.intent}
              confidenceScore={result.confidenceScore}
              sourceBreakdown={result.sourceBreakdown}
              offlineFallback={result.offlineFallbackUsed}
            />
          </View>
        ) : null}

        {/* Follow-up chips */}
        {!loading && result && result.followUps.length > 0 && (
          <View style={styles.followUps}>
            <KMText size="sm" weight="bold" color={theme.text.tertiary} style={styles.followUpsLabel}>
              FOLLOW-UP QUESTIONS
            </KMText>
            <FollowUpChips
              chips={result.followUps}
              onChipPress={(chip) => handleFollowUp(chip)}
            />
          </View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Bottom sticky input */}
      <View style={[styles.bottomBar, {
        backgroundColor: theme.bg.base,
        borderTopColor: theme.border.subtle,
      }]}>
        <AskBar
          placeholder="Ask a follow-up…"
          onSubmit={(q) => {
            handleFollowUp(q, followImageUri, followImageB64)
            setFollowImageUri(null); setFollowImageB64(null)
          }}
          onMicPress={() => setShowMic(true)}
          onCameraPress={() => setShowCamera(true)}
          onImageSelected={(uri, b64) => { setFollowImageUri(uri); setFollowImageB64(b64) }}
          attachedImageUri={followImageUri}
          onRemoveImage={() => { setFollowImageUri(null); setFollowImageB64(null) }}
          layout="thread"
        />
      </View>

      <VoiceModal
        visible={showMic}
        onClose={() => setShowMic(false)}
        onTranscriptComplete={(transcript, language) => {
          setShowMic(false)
          handleFollowUp(transcript)
        }}
      />

      {showCamera && (
        <PhotoCapture
          onClose={() => setShowCamera(false)}
          navigation={navigation}
          onPhotoSelected={async (uri) => {
            setFollowImageUri(uri)
            try {
              const b64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 })
              setFollowImageB64(b64)
            } catch {}
            setShowCamera(false)
          }}
        />
      )}
    </Container>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    ...(Platform.OS === 'web' ? { height: ('100vh' as any), maxHeight: ('100vh' as any), display: 'flex' as const, flexDirection: 'column' as const } : {}),
  },
  appBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 60,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  barTitle: {
    flex: 1,
    textAlign: 'center',
    marginHorizontal: spacing.xs,
  },
  scroll: {
    flex: 1,
    ...(Platform.OS === 'web' ? { overflowY: 'auto' as any } : {}),
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: 180,
    flexGrow: 1,
  },
  answerCardWrapper: {
    marginTop: spacing.md,
    borderRadius: radii.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  followUps: {
    marginTop: spacing.xxl,
  },
  followUpsLabel: {
    letterSpacing: 0.8,
    marginBottom: spacing.md,
  },
  bottomBar: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    borderTopWidth: 1,
  },
})
