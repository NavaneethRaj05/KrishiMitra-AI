/**
 * ThreadScreen — full conversation thread view.
 * Loads message history from WatermelonDB and allows follow-up Q&A.
 */

import React, { useEffect, useState, useRef } from 'react'
import {
  StyleSheet, View, ScrollView, SafeAreaView,
  ActivityIndicator, Alert, TouchableOpacity,
} from 'react-native'
import { ArrowLeft } from 'lucide-react-native'
import { useTheme } from '../../hooks/useTheme'
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
import { t } from '../../i18n'
import * as FileSystem from 'expo-file-system'

export default function ThreadScreen({ route, navigation }: any) {
  const { theme } = useTheme()
  const { threadId, threadTitle, initialFollowUpQuery, imageUri: initImgUri, imageB64: initImgB64 } = route.params

  const [messages, setMessages]   = useState<any[]>([])
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [loadingReply, setLoadingReply]     = useState(false)
  const [followUps, setFollowUps] = useState<string[]>([])
  const [showMic, setShowMic]     = useState(false)
  const [showCamera, setShowCamera] = useState(false)
  const [attachedUri, setAttachedUri]   = useState<string | null>(null)
  const [attachedB64, setAttachedB64]   = useState<string | null>(null)
  const scrollRef = useRef<ScrollView>(null)

  useEffect(() => { loadHistory() }, [threadId])

  const loadHistory = async () => {
    setLoadingHistory(true)
    try {
      const record = await database.get('threads').find(threadId) as any
      const all: any[] = await record.messages.fetch()
      const sorted = [...all].sort((a, b) => a.createdAt - b.createdAt)
      setMessages(sorted)
      const last = sorted.filter(m => m.role === 'assistant').at(-1)
      if (last) {
        try { setFollowUps(JSON.parse(last.followUps) || []) } catch {}
      }
      if (initialFollowUpQuery) sendReply(initialFollowUpQuery, initImgUri, initImgB64)
    } catch (e) {
      Alert.alert('Error', 'Could not load conversation history.')
    } finally {
      setLoadingHistory(false)
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 300)
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

    // Optimistic user bubble
    const tempUser = { id: `tmp_${Date.now()}`, role: 'user', content: text, imageUri: imgUri ?? '', createdAt: Date.now() }
    setMessages(prev => [...prev, tempUser])
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80)

    try {
      const res = await searchService.search(text, threadId, null, imgB64 ?? null, lang)
      await searchService.saveMessageToLocalDB(threadId, 'user', text, undefined, imgUri ?? undefined)
      await searchService.saveMessageToLocalDB(threadId, 'assistant', res.answer, res)

      const record = await database.get('threads').find(threadId) as any
      const all: any[] = await record.messages.fetch()
      setMessages([...all].sort((a, b) => a.createdAt - b.createdAt))
      setFollowUps(res.followUps || [])
    } catch {
      Alert.alert('Error', 'Could not get an answer.')
    } finally {
      setLoadingReply(false)
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 300)
    }
  }

  const handlePhotoSelected = async (uri: string) => {
    let b64 = ''
    try {
      b64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 })
    } catch {}
    const result = await photoService.runDiseaseDetection(uri)
    sendReply(`Treatment for ${result.disease}`, uri, b64)
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.bg.base }]}>
      <KMStatusBar />

      {/* App bar */}
      <View style={[styles.appBar, { borderBottomColor: theme.border.subtle }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={22} color={theme.text.primary} />
        </TouchableOpacity>
        <KMText size="sm" weight="semibold" numberOfLines={1} style={styles.barTitle}>
          {threadTitle ?? 'Conversation'}
        </KMText>
        <View style={{ width: 40 }} />
      </View>

      {/* Messages */}
      {loadingHistory ? (
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color={theme.accent.primary} />
        </View>
      ) : (
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
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
                offlineFallback={msg.offlineFallback}
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
                {t('search.typing')}
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

          <View style={{ height: 140 }} />
        </ScrollView>
      )}

      {/* Sticky input */}
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
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  appBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  barTitle: {
    flex: 1,
    textAlign: 'center',
    marginHorizontal: spacing.xs,
  },
  loadingCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scroll: { flex: 1 },
  scrollContent: {
    padding: spacing.base,
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
  followUpsWrap: {
    marginTop: spacing.xl,
  },
  followUpsLabel: {
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
  },
})
