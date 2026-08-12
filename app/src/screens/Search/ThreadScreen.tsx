/**
 * ThreadScreen — full conversation thread view.
 *
 * Fixes applied:
 *  1. Scroll: removed onContentSizeChange (was fighting user scroll).
 *             overflow:hidden removed on web. flexGrow:1 + 120px spacer.
 *             KeyboardAvoidingView lifts input on iOS keyboard open.
 *  2. Offline badge: offlineFallback correctly passed per message from DB.
 *  3. Connectivity indicator in app bar so user always knows live/offline.
 */

import React, { useEffect, useState, useRef, useCallback } from 'react'
import {
  StyleSheet, View, ScrollView, SafeAreaView,
  ActivityIndicator, Alert, TouchableOpacity, Platform,
  KeyboardAvoidingView,
} from 'react-native'
import { ArrowLeft, Wifi, WifiOff } from 'lucide-react-native'
import { useTheme } from '../../hooks/useTheme'
import { useOfflineStore } from '../../store/useOfflineStore'
import { spacing, radii } from '../../theme/tokens'
import { KMText } from '../../components/ui/Text'
import { KMStatusBar } from '../../components/ui/StatusBar'
import { AskBar } from '../../components/search/AskBar'
import { VoiceModal } from '../../components/search/VoiceModal'
import { MessageBubble } from '../../components/thread/MessageBubble'
import { FollowUpChips } from '../../components/search/FollowUpChips'
import { PhotoCapture } from '../../components/photo/PhotoCapture'
import { database } from '../../db/database'
import { searchService } from '../../services/searchService'
import { photoService } from '../../services/photoService'
import * as FileSystem from 'expo-file-system'

export default function ThreadScreen({ route, navigation }: any) {
  const { theme } = useTheme()
  const isConnected = useOfflineStore((s) => s.isConnected)
  const {
    threadId, threadTitle,
    initialFollowUpQuery,
    imageUri: initImgUri,
    imageB64: initImgB64,
  } = route.params

  const [messages, setMessages]             = useState<any[]>([])
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [loadingReply, setLoadingReply]     = useState(false)
  const [followUps, setFollowUps]           = useState<string[]>([])
  const [showMic, setShowMic]               = useState(false)
  const [showCamera, setShowCamera]         = useState(false)
  const [attachedUri, setAttachedUri]       = useState<string | null>(null)
  const [attachedB64, setAttachedB64]       = useState<string | null>(null)

  const scrollRef = useRef<ScrollView>(null)

  const scrollToBottom = useCallback((animated = true) => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated }), 100)
  }, [])

  useEffect(() => { loadHistory() }, [threadId])

  const loadHistory = async () => {
    setLoadingHistory(true)
    try {
      const record = await database.get('threads').find(threadId) as any
      const all: any[] = await record.messages.fetch()
      const sorted = [...all].sort((a, b) => a.createdAt - b.createdAt)
      setMessages(sorted)

      const last = sorted.filter((m: any) => m.role === 'assistant').at(-1)
      if (last) {
        try { setFollowUps(JSON.parse(last.followUps) || []) } catch {}
      }

      if (initialFollowUpQuery) {
        // Delay so history renders before reply starts
        setTimeout(() => sendReply(initialFollowUpQuery, initImgUri, initImgB64), 120)
      }
    } catch {
      Alert.alert('Error', 'Could not load conversation history.')
    } finally {
      setLoadingHistory(false)
      scrollToBottom(false)
    }
  }

  const sendReply = async (
    text: string,
    imgUri?: string | null,
    imgB64?: string | null,
    lang?: string,
  ) => {
    if (loadingReply) return
    setLoadingReply(true)

    // Optimistic user bubble — shown immediately
    const tempId = `tmp_${Date.now()}`
    setMessages(prev => [
      ...prev,
      { id: tempId, role: 'user', content: text, imageUri: imgUri ?? '', createdAt: Date.now(), offlineFallback: false },
    ])
    scrollToBottom()

    try {
      const res = await searchService.search(text, threadId, null, imgB64 ?? null, lang)
      await searchService.saveMessageToLocalDB(threadId, 'user', text, undefined, imgUri ?? undefined)
      await searchService.saveMessageToLocalDB(threadId, 'assistant', res.answer, res)

      // Reload from DB so persisted IDs + offlineFallback flag are correct
      const record = await database.get('threads').find(threadId) as any
      const all: any[] = await record.messages.fetch()
      setMessages([...all].sort((a, b) => a.createdAt - b.createdAt))
      setFollowUps(res.followUps || [])
    } catch (e: any) {
      // Remove the optimistic bubble on failure
      setMessages(prev => prev.filter(m => m.id !== tempId))
      Alert.alert('Error', e?.message?.includes('API')
        ? `Server error: ${e.message}`
        : 'Could not get an answer. Check your connection and try again.')
    } finally {
      setLoadingReply(false)
      scrollToBottom()
    }
  }

  const handlePhotoSelected = async (uri: string) => {
    let b64 = ''
    try {
      b64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 })
    } catch {}
    try {
      const result = await photoService.runDiseaseDetection(uri)
      sendReply(`Treatment for ${result.disease}`, uri, b64)
    } catch {
      sendReply('Diagnose this crop image', uri, b64)
    }
  }

  const Container = Platform.OS === 'web' ? View : SafeAreaView

  return (
    <Container style={[styles.root, { backgroundColor: theme.bg.base }]}>
      <KMStatusBar />

      {/* App bar */}
      <View style={[styles.appBar, {
        borderBottomColor: theme.border.subtle,
        backgroundColor: theme.bg.base,
      }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={22} color={theme.text.primary} />
        </TouchableOpacity>
        <KMText size="sm" weight="semibold" numberOfLines={1} style={styles.barTitle}>
          {threadTitle ?? 'Conversation'}
        </KMText>
        {/* Live connectivity badge */}
        <View style={[styles.connBadge, {
          backgroundColor: isConnected ? '#E6FBF3' : '#FEF3C7',
          borderColor: isConnected ? '#6EE7B7' : '#FCD34D',
        }]}>
          {isConnected
            ? <Wifi size={11} color="#059669" strokeWidth={2.5} />
            : <WifiOff size={11} color="#D97706" strokeWidth={2.5} />}
        </View>
      </View>

      {/* KeyboardAvoidingView lifts input bar on iOS keyboard */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {loadingHistory ? (
          <View style={styles.loadingCenter}>
            <ActivityIndicator size="large" color={theme.accent.primary} />
          </View>
        ) : (
          <ScrollView
            ref={scrollRef}
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            // ✅ No onContentSizeChange — it was fighting user scroll
            keyboardShouldPersistTaps="handled"
          >
            {messages.map(msg => {
              let citations: any[] = []
              try { citations = msg.citations ? JSON.parse(msg.citations) : [] } catch {}
              return (
                <MessageBubble
                  key={msg.id}
                  role={msg.role}
                  content={msg.content}
                  imageUri={msg.imageUri}
                  citations={citations}
                  intent={msg.intent}
                  // ✅ Correctly read offlineFallback from DB record
                  offlineFallback={Boolean(msg.offlineFallback)}
                />
              )
            })}

            {loadingReply && (
              <View style={[styles.thinkingBubble, {
                backgroundColor: theme.bg.surface,
                borderColor: theme.border.default,
              }]}>
                <ActivityIndicator size="small" color={theme.accent.primary} />
                <KMText size="sm" color={theme.text.secondary} style={{ marginLeft: spacing.sm }}>
                  {isConnected ? 'KrishiMitra is thinking…' : 'Searching offline…'}
                </KMText>
              </View>
            )}

            {!loadingReply && followUps.length > 0 && (
              <View style={styles.followUpsWrap}>
                <KMText size="xs" weight="semibold" color={theme.text.tertiary} style={styles.followUpsLabel}>
                  FOLLOW-UP QUESTIONS
                </KMText>
                <FollowUpChips chips={followUps} onChipPress={(q) => sendReply(q)} />
              </View>
            )}

            {/* ✅ Extra bottom padding so last message clears the input bar */}
            <View style={{ height: 120 }} />
          </ScrollView>
        )}

        {/* Sticky input — inside KAV so it lifts with keyboard on iOS */}
        <View style={[styles.bottomBar, {
          backgroundColor: theme.bg.base,
          borderTopColor: theme.border.subtle,
        }]}>
          <AskBar
            placeholder="Ask a follow-up…"
            layout="thread"
            onSubmit={(q) => {
              sendReply(q, attachedUri, attachedB64)
              setAttachedUri(null); setAttachedB64(null)
            }}
            onMicPress={() => setShowMic(true)}
            onCameraPress={() => setShowCamera(true)}
            onImageSelected={(uri, b64) => { setAttachedUri(uri); setAttachedB64(b64) }}
            attachedImageUri={attachedUri}
            onRemoveImage={() => { setAttachedUri(null); setAttachedB64(null) }}
          />
        </View>
      </KeyboardAvoidingView>

      <VoiceModal
        visible={showMic}
        onClose={() => setShowMic(false)}
        onTranscriptComplete={(transcript, lang) => {
          setShowMic(false)
          sendReply(transcript, null, null, lang)
        }}
      />

      {showCamera && (
        <PhotoCapture
          onClose={() => setShowCamera(false)}
          navigation={navigation}
          onPhotoSelected={async (uri) => {
            setShowCamera(false)
            await handlePhotoSelected(uri)
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
    height: 56,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 40, height: 40,
    justifyContent: 'center', alignItems: 'center',
  },
  barTitle: {
    flex: 1,
    textAlign: 'center',
    marginHorizontal: spacing.xs,
  },
  connBadge: {
    width: 28, height: 28, borderRadius: 99,
    borderWidth: 1, justifyContent: 'center', alignItems: 'center',
  },
  loadingCenter: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
  },
  scroll: {
    flex: 1,
    ...(Platform.OS === 'web' ? { overflowY: 'auto' as any } : {}),
  },
  scrollContent: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.md,
    paddingBottom: 180,
    flexGrow: 1,
  },
  thinkingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.md,
    marginVertical: spacing.sm,
  },
  followUpsWrap: { marginTop: spacing.xl },
  followUpsLabel: { letterSpacing: 0.8, marginBottom: spacing.sm },
  bottomBar: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    paddingBottom: Platform.OS === 'ios' ? spacing.md : spacing.sm,
  },
})
