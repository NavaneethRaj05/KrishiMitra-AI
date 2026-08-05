import React, { useEffect, useState } from 'react'
import { StyleSheet, View, ScrollView, SafeAreaView, ActivityIndicator, Alert, TouchableOpacity, useWindowDimensions } from 'react-native'
import { colors, spacing, radii, shadows } from '../../components/ui/tokens'
import { KrishiMitraAIText } from '../../components/ui/KrishiMitraAIText'
import { MessageBubble } from '../../components/thread/MessageBubble'
import { FollowUpChips } from '../../components/search/FollowUpChips'
import { SearchBar } from '../../components/search/SearchBar'
import { VoiceRecorder } from '../../components/search/VoiceRecorder'
import { PhotoCapture } from '../../components/photo/PhotoCapture'
import { OfflineBanner } from '../../components/ui/OfflineBanner'
import { Sidebar } from '../../components/thread/Sidebar'
import { searchService, SearchResult } from '../../services/searchService'
import { useSearchStore } from '../../store/useSearchStore'
import { useAuthStore } from '../../store/useAuthStore'
import { useOfflineStore } from '../../store/useOfflineStore'
import { useThemeStore } from '../../store/useThemeStore'
import { ArrowLeft, WifiOff, Sun, Moon } from 'lucide-react-native'
import { t } from '../../i18n'

export const SearchResultScreen: React.FC<{ route: any; navigation: any }> = ({ route, navigation }) => {
  const { width } = useWindowDimensions()
  const isLargeScreen = width > 768
  const { mode, toggleTheme } = useThemeStore()
  const [activeTab, setActiveTab] = useState('search')

  const { query, threadId: initialThreadId, imageContext, imageUri, imageB64, detectedLanguage: routeLanguage } = route.params
  
  const searchStore = useSearchStore()
  const isConnected = useOfflineStore((state) => state.isConnected)
  
  const [loading, setLoading] = useState(true)
  const [result, setResult] = useState<SearchResult | null>(null)
  const [activeThreadId, setActiveThreadId] = useState<string | null>(initialThreadId)
  const [showMicOverlay, setShowMicOverlay] = useState(false)
  const [showCameraOverlay, setShowCameraOverlay] = useState(false)
  const [attachedImageUri, setAttachedImageUri] = useState<string | null>(null)
  const [attachedImageBase64, setAttachedImageBase64] = useState<string | null>(null)
  const [answerLanguage, setAnswerLanguage] = useState<string>(routeLanguage || useAuthStore.getState().farmer?.preferredLanguage || 'en')
  const [detectedLanguage, setDetectedLanguage] = useState<string | undefined>(routeLanguage)

  const getLanguageLabel = (langCode?: string) => {
    const code = (langCode || 'en').toLowerCase()
    if (code === 'kn' || code === 'kannada') return 'Kannada'
    if (code === 'hi' || code === 'hindi') return 'Hindi'
    if (code === 'ta' || code === 'tamil') return 'Tamil'
    if (code === 'te' || code === 'telugu') return 'Telugu'
    if (code === 'mr' || code === 'marathi') return 'Marathi'
    return 'English'
  }

  useEffect(() => {
    executeSearch()
  }, [query])

  const executeSearch = async (overrideLanguage?: string) => {
    setLoading(true)
    try {
      const lang = overrideLanguage || answerLanguage
      // 1. Run Search client
      const searchRes = await searchService.search(query, activeThreadId, imageContext, imageB64, lang)
      setResult(searchRes)
      setAnswerLanguage(searchRes.answerLanguage || lang)
      if (searchRes.detectedLanguage) {
        setDetectedLanguage(searchRes.detectedLanguage)
      }
      
      // Update global Zustand store
      searchStore.setAnswer(searchRes.answer)
      searchStore.setCitations(searchRes.citations)
      searchStore.setFollowUps(searchRes.followUps)
      searchStore.setIntent(searchRes.intent)
      searchStore.setOfflineFallbackUsed(searchRes.offlineFallbackUsed)
      searchStore.setConfidenceScore(searchRes.confidenceScore)
      searchStore.setSourceBreakdown(searchRes.sourceBreakdown)
      searchStore.setDetectedLanguage(searchRes.detectedLanguage)
      searchStore.setAnswerLanguage(searchRes.answerLanguage)

      // 2. Persist to WatermelonDB
      let threadId = activeThreadId
      if (!threadId) {
        const season = useAuthStore.getState().farmer?.cropPhase || 'Kharif'
        threadId = await searchService.createLocalThread(query, searchRes.intent, season)
        setActiveThreadId(threadId)
        searchStore.setThreadId(threadId)
      }

      // Save user prompt message
      await searchService.saveMessageToLocalDB(threadId, 'user', query, undefined, imageUri)
      // Save assistant answer message
      await searchService.saveMessageToLocalDB(threadId, 'assistant', searchRes.answer, searchRes)

    } catch (e) {
      console.error('Search failed:', e)
      Alert.alert('Search Error', 'Failed to retrieve answer.')
    } finally {
      setLoading(false)
    }
  }

  const handleLanguageChange = (langCode: string) => {
    setAnswerLanguage(langCode)
    // Re-run search with new language
    executeSearch(langCode)
  }

  const handleFollowUpSubmit = (followUpQuery: string, fImageUri?: string | null, fImageB64?: string | null) => {
    // Navigate to Thread screen to continue the threaded chat
    navigation.navigate('Thread', {
      threadId: activeThreadId,
      threadTitle: query,
      initialFollowUpQuery: followUpQuery,
      imageUri: fImageUri,
      imageB64: fImageB64
    })
  }

  if (isLargeScreen) {
    return (
      <SafeAreaView style={styles.container}>
        {/* TOP WEB NAV BAR */}
        <View style={styles.topNavBar}>
          <TouchableOpacity onPress={() => navigation.navigate('MainTabs')} style={styles.topNavLogo}>
            <View style={styles.logoIcon}>
              <KrishiMitraAIText size="base" style={{ lineHeight: 18 }}>🌾</KrishiMitraAIText>
            </View>
            <View style={styles.logoTextWrapper}>
              <KrishiMitraAIText size="sm" weight="bold" color={colors.text.primary}>KrishiMitra AI</KrishiMitraAIText>
              <KrishiMitraAIText size="xs" color={colors.text.tertiary} style={styles.logoSubText}>KrishiSearch</KrishiMitraAIText>
            </View>
          </TouchableOpacity>

          {/* Top Right Offline badge & Theme Toggle */}
          <View style={styles.topNavRight}>
            <TouchableOpacity onPress={toggleTheme} style={{ padding: 6, marginRight: 10 }}>
              {mode === 'dark' ? <Sun size={18} color="#F59E0B" /> : <Moon size={18} color={colors.text.secondary} />}
            </TouchableOpacity>
            <View style={styles.offlineBadge}>
              <WifiOff size={11} color={!isConnected ? '#633806' : colors.text.tertiary} style={{ marginRight: 4 }} />
              <KrishiMitraAIText size="xs" weight="bold" color={!isConnected ? '#633806' : colors.text.tertiary}>
                {isConnected ? 'Offline ready' : 'Offline mode'}
              </KrishiMitraAIText>
            </View>
          </View>
        </View>

        {/* WEB MAIN SPLIT VIEW */}
        <View style={styles.webMain}>
          {/* Persistent Sidebar */}
          <Sidebar
            activeThreadId={activeThreadId}
            onThreadPress={(thread) => {
              // Switch thread
              setActiveThreadId(thread.id);
              navigation.setParams({ threadId: thread.id, query: thread.title });
            }}
            onNewSearchPress={() => {
              navigation.navigate('MainTabs');
            }}
          />

          {/* Right Content Pane (KrishiSearch Answer panel) */}
          <View style={styles.webContent}>
            {/* Input modality indicator bar */}
            <View style={styles.modalityRow}>
              <KrishiMitraAIText size="xs" color={colors.text.tertiary} style={styles.modalityItem}>
                🗣️ {getLanguageLabel(detectedLanguage)} → {getLanguageLabel(answerLanguage)}
              </KrishiMitraAIText>
              <KrishiMitraAIText size="xs" color={colors.text.tertiary} style={styles.modalityItem}>🕸️ RAG + KAG</KrishiMitraAIText>
              <KrishiMitraAIText size="xs" color={colors.text.tertiary} style={styles.modalityItem}>{isConnected ? '🌐 Online mode' : '⚡ Offline mode'}</KrishiMitraAIText>
            </View>

            <ScrollView style={styles.webScrollView} contentContainerStyle={styles.webScrollContent}>
              {/* User query bubble */}
              <MessageBubble role="user" content={query} imageUri={imageUri} />

              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={colors.green.bright} />
                  <KrishiMitraAIText size="sm" color={colors.text.secondary} style={styles.loadingText}>
                    {t('search.typing')}
                  </KrishiMitraAIText>
                </View>
              ) : (
                result && (
                  <>
                    {/* Answer Card */}
                    <MessageBubble
                      role="assistant"
                      content={result.answer}
                      citations={result.citations}
                      intent={result.intent}
                      offlineFallback={result.offlineFallbackUsed}
                      confidenceScore={result.confidenceScore}
                      sourceBreakdown={result.sourceBreakdown}
                      answerLanguage={answerLanguage}
                      detectedLanguage={detectedLanguage}
                      onLanguageChange={handleLanguageChange}
                    />

                    {/* Follow-up chips */}
                    <View style={{ marginTop: spacing.md }}>
                      <KrishiMitraAIText size="xs" weight="bold" color={colors.text.tertiary} style={styles.followupTitle}>
                        Follow-up questions
                      </KrishiMitraAIText>
                      <FollowUpChips
                        chips={result.followUps}
                        onChipPress={handleFollowUpSubmit}
                      />
                    </View>
                  </>
                )
              )}
            </ScrollView>

            {/* Bottom sticky bar (within right pane) */}
            <View style={styles.webBottomBar}>
              <SearchBar
                placeholder="Ask a follow-up…"
                onSubmit={(q) => {
                  handleFollowUpSubmit(q, attachedImageUri, attachedImageBase64)
                  setAttachedImageUri(null)
                  setAttachedImageBase64(null)
                }}
                onMicPress={() => setShowMicOverlay(true)}
                onCameraPress={() => setShowCameraOverlay(true)}
                onImageSelected={(uri, base64) => {
                  setAttachedImageUri(uri)
                  setAttachedImageBase64(base64)
                }}
                attachedImageUri={attachedImageUri}
                onRemoveImage={() => {
                  setAttachedImageUri(null)
                  setAttachedImageBase64(null)
                }}
              />
            </View>
          </View>
        </View>

        {/* MODAL OVERLAYS */}
        {showMicOverlay && (
          <VoiceRecorder
            onClose={() => setShowMicOverlay(false)}
            onTranscriptComplete={(transcript, language) => {
              setShowMicOverlay(false)
              if (language) setDetectedLanguage(language)
              handleFollowUpSubmit(transcript)
            }}
          />
        )}
        {showCameraOverlay && (
          <PhotoCapture
            onClose={() => setShowCameraOverlay(false)}
            navigation={navigation}
            onPhotoSelected={async (uri) => {
              setAttachedImageUri(uri)
              try {
                const FileSystem = require('expo-file-system')
                const base64Data = await FileSystem.readAsStringAsync(uri, {
                  encoding: FileSystem.EncodingType.Base64,
                })
                setAttachedImageBase64(base64Data)
              } catch (e) {
                console.warn('Failed to read image as base64:', e)
              }
            }}
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
        <KrishiMitraAIText size="md" weight="bold" numberOfLines={1} style={styles.headerTitle}>
          {query}
        </KrishiMitraAIText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* User query bubble */}
        <MessageBubble role="user" content={query} imageUri={imageUri} />

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.green.bright} />
            <KrishiMitraAIText size="sm" color={colors.text.secondary} style={styles.loadingText}>
              {t('search.typing')}
            </KrishiMitraAIText>
          </View>
        ) : (
          result && (
            <>
              {/* Answer bubble with confidence, sources, language toggle */}
              <MessageBubble
                role="assistant"
                content={result.answer}
                citations={result.citations}
                intent={result.intent}
                offlineFallback={result.offlineFallbackUsed}
                confidenceScore={result.confidenceScore}
                sourceBreakdown={result.sourceBreakdown}
                answerLanguage={answerLanguage}
                detectedLanguage={detectedLanguage}
                onLanguageChange={handleLanguageChange}
              />

              {/* Follow-up chips */}
              <FollowUpChips
                chips={result.followUps}
                onChipPress={handleFollowUpSubmit}
              />
            </>
          )
        )}
      </ScrollView>

      {/* VoiceRecorder modal overlay */}
      {showMicOverlay && (
        <VoiceRecorder
          onClose={() => setShowMicOverlay(false)}
          onTranscriptComplete={(transcript, language) => {
            setShowMicOverlay(false)
            if (language) setDetectedLanguage(language)
            handleFollowUpSubmit(transcript)
          }}
        />
      )}

      {/* PhotoCapture modal overlay */}
      {showCameraOverlay && (
        <PhotoCapture
          onClose={() => setShowCameraOverlay(false)}
          navigation={navigation}
          onPhotoSelected={async (uri) => {
            setAttachedImageUri(uri)
            try {
              const FileSystem = require('expo-file-system')
              const base64Data = await FileSystem.readAsStringAsync(uri, {
                encoding: FileSystem.EncodingType.Base64,
              })
              setAttachedImageBase64(base64Data)
            } catch (e) {
              console.warn('Failed to read image as base64:', e)
            }
          }}
        />
      )}

      {/* Sticky Bottom Input */}
      <View style={styles.bottomBar}>
        <SearchBar
          placeholder="Ask a follow-up…"
          onSubmit={(q) => {
            handleFollowUpSubmit(q, attachedImageUri, attachedImageBase64)
            setAttachedImageUri(null)
            setAttachedImageBase64(null)
          }}
          onMicPress={() => setShowMicOverlay(true)}
          onCameraPress={() => setShowCameraOverlay(true)}
          onImageSelected={(uri, base64) => {
            setAttachedImageUri(uri)
            setAttachedImageBase64(base64)
          }}
          attachedImageUri={attachedImageUri}
          onRemoveImage={() => {
            setAttachedImageUri(null)
            setAttachedImageBase64(null)
          }}
        />
      </View>
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
    marginTop: spacing.xl,
  },
  loadingText: {
    marginTop: spacing.md,
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
export default SearchResultScreen;
