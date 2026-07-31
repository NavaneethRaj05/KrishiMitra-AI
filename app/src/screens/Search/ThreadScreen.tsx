import React, { useEffect, useState, useRef } from 'react'
import { StyleSheet, View, ScrollView, SafeAreaView, ActivityIndicator, Alert, TouchableOpacity, useWindowDimensions } from 'react-native'
import { colors, spacing, radii, shadows } from '../../components/ui/tokens'
import { VaaniText } from '../../components/ui/VaaniText'
import { MessageBubble } from '../../components/thread/MessageBubble'
import { FollowUpChips } from '../../components/search/FollowUpChips'
import { SearchBar } from '../../components/search/SearchBar'
import { OfflineBanner } from '../../components/ui/OfflineBanner'
import { Sidebar } from '../../components/thread/Sidebar'
import { database } from '../../db/database'
import { searchService } from '../../services/searchService'
import { PhotoCapture } from '../../components/photo/PhotoCapture'
import { photoService } from '../../services/photoService'
import { useOfflineStore } from '../../store/useOfflineStore'
import { ArrowLeft, WifiOff } from 'lucide-react-native'
import { t } from '../../i18n'

export const ThreadScreen: React.FC<{ route: any; navigation: any }> = ({ route, navigation }) => {
  const { width } = useWindowDimensions()
  const isLargeScreen = width > 768
  const [activeTab, setActiveTab] = useState('search')
  const isConnected = useOfflineStore((state) => state.isConnected)

  const { threadId, threadTitle, initialFollowUpQuery } = route.params
  
  const [messages, setMessages] = useState<any[]>([])
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [loadingNewMessage, setLoadingNewMessage] = useState(false)
  const [suggestedFollowUps, setSuggestedFollowUps] = useState<string[]>([])
  const [showCameraOverlay, setShowCameraOverlay] = useState(false)
  
  const scrollViewRef = useRef<ScrollView>(null)

  useEffect(() => {
    loadMessageHistory()
  }, [threadId])

  const loadMessageHistory = async () => {
    setLoadingHistory(true)
    try {
      const threadRecord = await database.get('threads').find(threadId) as any
      
      // Load all messages belonging to this thread
      const allMsgs = await threadRecord.messages.fetch()
      // Sort chronologically by date
      const sorted = [...allMsgs].sort((a, b) => a.createdAt - b.createdAt)
      setMessages(sorted)

      // Set follow ups from the last assistant message
      const assistantMsgs = sorted.filter(m => m.role === 'assistant')
      if (assistantMsgs.length > 0) {
        const lastAns = assistantMsgs[assistantMsgs.length - 1]
        try {
          setSuggestedFollowUps(JSON.parse(lastAns.followUps) || [])
        } catch (e) {}
      }

      // If there's an initial follow up query forwarded from SearchResult, run it
      if (initialFollowUpQuery) {
        executeFollowUp(initialFollowUpQuery)
      }
    } catch (e) {
      console.warn('Failed to load message history:', e)
      Alert.alert('History Error', 'Failed to retrieve conversation logs.')
    } finally {
      setLoadingHistory(false)
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 300)
    }
  }

  const executeFollowUp = async (queryText: string, overrideLanguage?: string) => {
    if (loadingNewMessage) return
    setLoadingNewMessage(true)
    
    // Check if this is a language toggle re-run of the last question
    const lastMsg = messages[messages.length - 1]
    const isRerun = lastMsg && lastMsg.role === 'assistant' && messages.some(m => m.content === queryText)
    
    if (!isRerun) {
      const userMsgMock = {
        id: 'temp_user_' + Date.now(),
        role: 'user',
        content: queryText,
        createdAt: Date.now()
      }
      setMessages(prev => [...prev, userMsgMock])
    }
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100)

    try {
      // 1. Run Search client
      const searchRes = await searchService.search(queryText, threadId, null, null, overrideLanguage)
      
      // 2. Save User & Assistant messages to WatermelonDB (only save user if not a rerun)
      if (!isRerun) {
        await searchService.saveMessageToLocalDB(threadId, 'user', queryText)
      }
      await searchService.saveMessageToLocalDB(threadId, 'assistant', searchRes.answer, searchRes)

      // 3. Reload messages from DB to display saved record
      const threadRecord = await database.get('threads').find(threadId) as any
      const allMsgs = await threadRecord.messages.fetch()
      const sorted = [...allMsgs].sort((a, b) => a.createdAt - b.createdAt)
      setMessages(sorted)

      setSuggestedFollowUps(searchRes.followUps || [])
    } catch (e) {
      console.error('Follow up search failed:', e)
      Alert.alert('Search Error', 'Failed to get answer.')
    } finally {
      setLoadingNewMessage(false)
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 300)
    }
  }

  const handleLanguageChange = (langCode: string, assistantMsg: any) => {
    const msgIndex = messages.findIndex(m => m.id === assistantMsg.id)
    if (msgIndex > 0) {
      const prevMsg = messages[msgIndex - 1]
      if (prevMsg.role === 'user') {
        executeFollowUp(prevMsg.content, langCode)
      }
    } else {
      const userMsgs = messages.filter(m => m.role === 'user')
      if (userMsgs.length > 0) {
        executeFollowUp(userMsgs[userMsgs.length - 1].content, langCode)
      }
    }
  }
  const handlePhotoSelected = async (uri: string) => {
    if (loadingNewMessage) return
    setLoadingNewMessage(true)

    // Run disease detection on the selected photo
    const result = await photoService.runDiseaseDetection(uri)
    const queryText = `Treatment for ${result.disease}`

    // Insert mock user message locally
    const userMsgMock = {
      id: 'temp_user_' + Date.now(),
      role: 'user',
      content: queryText,
      imageUri: uri,
      createdAt: Date.now()
    }
    setMessages(prev => [...prev, userMsgMock])
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100)

    try {
      // Get AI results
      const searchRes = await searchService.search(queryText, threadId, result)

      // Save user prompt & answer messages to local WatermelonDB
      await searchService.saveMessageToLocalDB(threadId, 'user', queryText, undefined, uri)
      await searchService.saveMessageToLocalDB(threadId, 'assistant', searchRes.answer, searchRes)

      // Reload messages from DB to display saved record
      const threadRecord = await database.get('threads').find(threadId) as any
      const allMsgs = await threadRecord.messages.fetch()
      const sorted = [...allMsgs].sort((a, b) => a.createdAt - b.createdAt)
      setMessages(sorted)

      setSuggestedFollowUps(searchRes.followUps || [])
    } catch (e) {
      console.error('Photo search failed:', e)
      Alert.alert('Search Error', 'Failed to get answer.')
    } finally {
      setLoadingNewMessage(false)
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 300)
    }
  }

  if (isLargeScreen) {
    return (
      <SafeAreaView style={styles.container}>
        {/* TOP WEB NAV BAR */}
        <View style={styles.topNavBar}>
          <TouchableOpacity onPress={() => navigation.navigate('Home')} style={styles.topNavLogo}>
            <View style={styles.logoIcon}>
              <VaaniText size="base" style={{ lineHeight: 18 }}>🌾</VaaniText>
            </View>
            <View style={styles.logoTextWrapper}>
              <VaaniText size="sm" weight="bold" color={colors.text.primary}>KrishiMitra AI</VaaniText>
              <VaaniText size="xs" color={colors.text.tertiary} style={styles.logoSubText}>KrishiSearch</VaaniText>
            </View>
          </TouchableOpacity>

          {/* Top Right Offline badge */}
          <View style={styles.topNavRight}>
            <View style={styles.offlineBadge}>
              <WifiOff size={11} color={!isConnected ? '#633806' : colors.text.tertiary} style={{ marginRight: 4 }} />
              <VaaniText size="xs" weight="bold" color={!isConnected ? '#633806' : colors.text.tertiary}>
                {isConnected ? 'Offline ready' : 'Offline mode'}
              </VaaniText>
            </View>
          </View>
        </View>

        {/* WEB MAIN SPLIT VIEW */}
        <View style={styles.webMain}>
          {/* Persistent Sidebar */}
          <Sidebar
            activeThreadId={threadId}
            onThreadPress={(thread) => {
              navigation.setParams({ threadId: thread.id, threadTitle: thread.title });
            }}
            onNewSearchPress={() => {
              navigation.navigate('Home');
            }}
          />

          {/* Right Content Pane (KrishiSearch Answer panel) */}
          <View style={styles.webContent}>
            {/* Input modality indicator bar */}
            <View style={styles.modalityRow}>
              <VaaniText size="xs" color={colors.text.tertiary} style={styles.modalityItem}>🗣️ Multilingual Threads</VaaniText>
              <VaaniText size="xs" color={colors.text.tertiary} style={styles.modalityItem}>🕸️ Neo4j KAG</VaaniText>
              <VaaniText size="xs" color={colors.text.tertiary} style={styles.modalityItem}>{isConnected ? '🌐 Online' : '⚡ Offline'}</VaaniText>
            </View>

            {loadingHistory ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.green.bright} />
              </View>
            ) : (
              <ScrollView
                ref={scrollViewRef}
                style={styles.webScrollView}
                contentContainerStyle={styles.webScrollContent}
                onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
              >
                {messages.map((msg) => {
                  let citations: any[] = []
                  try {
                    citations = msg.citations ? JSON.parse(msg.citations) : []
                  } catch (e) {}
                  
                  return (
                    <MessageBubble
                      key={msg.id}
                      role={msg.role}
                      content={msg.content}
                      citations={citations}
                      offlineFallback={msg.offlineFallback}
                      imageUri={msg.imageUri}
                      intent={msg.intent}
                      onLanguageChange={(langCode) => handleLanguageChange(langCode, msg)}
                    />
                  )
                })}

                {loadingNewMessage && (
                  <View style={styles.loadingBubbleContainer}>
                    <ActivityIndicator size="small" color={colors.green.bright} />
                    <VaaniText size="sm" color={colors.text.secondary} style={styles.thinkingText}>
                      {t('search.typing')}
                    </VaaniText>
                  </View>
                )}

                {!loadingNewMessage && suggestedFollowUps.length > 0 && (
                  <View style={{ marginTop: spacing.md }}>
                    <VaaniText size="xs" weight="bold" color={colors.text.tertiary} style={styles.followupTitle}>
                      Follow-up questions
                    </VaaniText>
                    <FollowUpChips
                      chips={suggestedFollowUps}
                      onChipPress={executeFollowUp}
                    />
                  </View>
                )}
              </ScrollView>
            )}

            {/* Bottom sticky bar (within right pane) */}
            <View style={styles.webBottomBar}>
              <SearchBar
                placeholder="Ask a follow-up…"
                onSubmit={executeFollowUp}
                onMicPress={() => Alert.alert('ASR Audio', 'Microphone overlays can be triggered from Home.')}
                onCameraPress={() => setShowCameraOverlay(true)}
                onImageSelected={handlePhotoSelected}
              />
            </View>
          </View>
        </View>

        {/* PhotoCapture modal overlay */}
        {showCameraOverlay && (
          <PhotoCapture
            onClose={() => setShowCameraOverlay(false)}
            navigation={navigation}
            onPhotoSelected={handlePhotoSelected}
          />
        )}
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <OfflineBanner />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <VaaniText size="md" weight="bold" numberOfLines={1} style={styles.headerTitle}>
          {threadTitle}
        </VaaniText>
        <View style={{ width: 40 }} />
      </View>

      {loadingHistory ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.green.bright} />
        </View>
      ) : (
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.map((msg) => {
            let citations: any[] = []
            try {
              citations = msg.citations ? JSON.parse(msg.citations) : []
            } catch (e) {}
            
            return (
              <MessageBubble
                key={msg.id}
                role={msg.role}
                content={msg.content}
                citations={citations}
                offlineFallback={msg.offlineFallback}
                imageUri={msg.imageUri}
                intent={msg.intent}
                onLanguageChange={(langCode) => handleLanguageChange(langCode, msg)}
              />
            )
          })}

          {loadingNewMessage && (
            <View style={styles.loadingBubbleContainer}>
              <ActivityIndicator size="small" color={colors.green.bright} />
              <VaaniText size="sm" color={colors.text.secondary} style={styles.thinkingText}>
                {t('search.typing')}
              </VaaniText>
            </View>
          )}

          {!loadingNewMessage && suggestedFollowUps.length > 0 && (
            <FollowUpChips
              chips={suggestedFollowUps}
              onChipPress={executeFollowUp}
            />
          )}
        </ScrollView>
      )}

      {/* Sticky Bottom Input */}
      <View style={styles.bottomBar}>
        <SearchBar
          placeholder="Ask a follow-up…"
          onSubmit={executeFollowUp}
          onMicPress={() => Alert.alert('ASR Audio', 'Microphone overlays can be triggered from Home.')}
          onCameraPress={() => setShowCameraOverlay(true)}
          onImageSelected={handlePhotoSelected}
        />
      </View>

      {/* PhotoCapture modal overlay */}
      {showCameraOverlay && (
        <PhotoCapture
          onClose={() => setShowCameraOverlay(false)}
          navigation={navigation}
          onPhotoSelected={handlePhotoSelected}
        />
      )}
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
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomColor: colors.border.default,
    borderBottomWidth: 1,
    height: 56,
    paddingHorizontal: spacing.base,
  },
  backBtn: {
    padding: spacing.sm,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.base,
    paddingBottom: 160,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  loadingBubbleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.bg.card,
    borderColor: colors.border.default,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
    marginVertical: spacing.sm,
  },
  thinkingText: {
    marginLeft: spacing.sm,
  },
  bottomBar: {
    borderTopColor: colors.border.default,
    borderTopWidth: 1,
    bottom: 0,
    left: 0,
    right: 0,
    position: 'absolute',
    backgroundColor: colors.bg.base,
    paddingHorizontal: spacing.base,
  },
  topNavBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
    backgroundColor: colors.bg.base,
    height: 56,
  },
  topNavLogo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoIcon: {
    width: 32,
    height: 32,
    borderRadius: radii.md,
    backgroundColor: '#1D9E75',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  logoTextWrapper: {
    flexDirection: 'column',
  },
  logoSubText: {
    fontSize: 9,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginTop: -2,
  },
  topNavPills: {
    flexDirection: 'row',
    gap: 6,
  },
  topNavPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: 'transparent',
  },
  topNavRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  offlineBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.full,
    backgroundColor: colors.amber.dim,
    borderColor: '#FAC775',
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  webMain: {
    flexDirection: 'row',
    height: ('calc(100vh - 56px)' as any),
    overflow: 'hidden',
  },
  webContent: {
    flex: 1,
    height: '100%',
    backgroundColor: colors.bg.base,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  modalityRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
  },
  modalityItem: {
    backgroundColor: colors.bg.card,
    borderColor: colors.border.default,
    borderWidth: 1,
    borderRadius: radii.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  webScrollView: {
    flex: 1,
  },
  webScrollContent: {
    padding: spacing.xl,
    maxWidth: 680,
    alignSelf: 'center',
    width: '100%',
    paddingBottom: 120,
  },
  followupTitle: {
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.xs,
  },
  webBottomBar: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.default,
    backgroundColor: colors.bg.base,
  },
})
export default ThreadScreen;
