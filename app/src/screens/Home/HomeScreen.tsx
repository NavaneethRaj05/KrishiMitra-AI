import React, { useState, useEffect } from 'react'
import { StyleSheet, View, ScrollView, TouchableOpacity, SafeAreaView, Alert, useWindowDimensions } from 'react-native'
import { Menu, Wifi, WifiOff, Calendar, Clock, Settings, MapPin, Plus, Sun, Moon } from 'lucide-react-native'
import { colors, spacing, radii, shadows } from '../../components/ui/tokens'
import { VaaniText } from '../../components/ui/VaaniText'
import { SearchBar } from '../../components/search/SearchBar'
import { VoiceRecorder } from '../../components/search/VoiceRecorder'
import { PhotoCapture } from '../../components/photo/PhotoCapture'
import { ThreadDrawer } from '../../components/thread/ThreadDrawer'
import { Sidebar } from '../../components/thread/Sidebar'
import { useAuthStore } from '../../store/useAuthStore'
import { useOfflineStore } from '../../store/useOfflineStore'
import { useSearchStore } from '../../store/useSearchStore'
import { useThemeStore } from '../../store/useThemeStore'
import { database } from '../../db/database'
import { Q } from '@nozbe/watermelondb'
import { t, setLanguage, getLanguage, getLanguagesList } from '../../i18n'
import { MMKV } from 'react-native-mmkv'

export const HomeScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { width } = useWindowDimensions()
  const isLargeScreen = width > 768

  const { mode, toggleTheme } = useThemeStore()
  const farmer = useAuthStore((state) => state.farmer)
  const isConnected = useOfflineStore((state) => state.isConnected)
  const resetSearch = useSearchStore((state) => state.resetSearch)
  const setThreadId = useSearchStore((state) => state.setThreadId)
  const setInputMode = useSearchStore((state) => state.setInputMode)
  
  const [activeTab, setActiveTab] = useState('search')
  const [trending, setTrending] = useState<string[]>([])
  const [recentThreads, setRecentThreads] = useState<any[]>([])
  const [showMicOverlay, setShowMicOverlay] = useState(false)
  const [showCameraOverlay, setShowCameraOverlay] = useState(false)
  const [showThreadDrawer, setShowThreadDrawer] = useState(false)
  const [attachedImageUri, setAttachedImageUri] = useState<string | null>(null)
  const [attachedImageBase64, setAttachedImageBase64] = useState<string | null>(null)
  const [detectedVoiceLanguage, setDetectedVoiceLanguage] = useState<string | undefined>(undefined)
  const [appLang, setAppLang] = useState(getLanguage())

  useEffect(() => {
    fetchTrendingQueries()
    
    const initPull = async () => {
      try {
        const { syncService } = require('../../services/syncService')
        await syncService.pullThreadsFromServer()
      } catch (e) {
        console.warn('Failed to pull threads on mount:', e)
      }
      fetchRecentThreads()
    }
    initPull()
  }, [])

  const fetchTrendingQueries = () => {
    try {
      const storage = new MMKV()
      const cached = storage.getString('trending_queries')
      if (cached) {
        setTrending(JSON.parse(cached))
      } else {
        // Fallbacks
        setTrending([
          t('home_trending.paddy_blast'),
          t('home_trending.tomato_price'),
          t('home_trending.pm_kisan'),
          t('home_trending.cotton_pest')
        ])
      }
    } catch (e) {
      setTrending([t('home_trending.paddy_blast'), t('home_trending.tomato_price'), t('home_trending.pm_kisan')])
    }
  }

  const fetchRecentThreads = async () => {
    try {
      const threadsCollection = database.get('threads')
      const records = await threadsCollection
        .query(Q.sortBy('updated_at', Q.desc), Q.take(5))
        .fetch()
      setRecentThreads(records)
    } catch (e) {
      console.warn('Failed to query threads from WatermelonDB:', e)
      setRecentThreads([])
    }
  }

  const handleQuerySubmit = (
    query: string,
    existingThreadId: string | null = null,
    imageUri?: string | null,
    imageB64?: string | null,
    language?: string
  ) => {
    resetSearch()
    setThreadId(existingThreadId)
    
    // Determine input mode
    if (imageUri && query) {
      setInputMode('multimodal')
    } else if (imageUri) {
      setInputMode('image')
    } else {
      setInputMode('text')
    }

    navigation.navigate('SearchResult', {
      query: query || (imageUri ? 'Diagnose crop leaf disease' : ''),
      threadId: existingThreadId,
      imageUri,
      imageB64,
      detectedLanguage: language || detectedVoiceLanguage,
    })
  }

  const handleRecentThreadPress = (thread: any) => {
    resetSearch()
    setThreadId(thread.id)
    navigation.navigate('Thread', { threadId: thread.id, threadTitle: thread.title })
  }

  const handleVoiceTranscript = (transcript: string, language?: string) => {
    setShowMicOverlay(false)
    setInputMode('voice')
    if (language) {
      setDetectedVoiceLanguage(language)
    }
    handleQuerySubmit(transcript, null, null, null, language)
  }

  if (isLargeScreen) {
    return (
      <SafeAreaView style={styles.container}>
        {/* TOP WEB NAV BAR */}
        <View style={styles.topNavBar}>
          <View style={styles.topNavLogo}>
            <View style={styles.logoIcon}>
              <VaaniText size="base" style={{ lineHeight: 18 }}>🌾</VaaniText>
            </View>
            <View style={styles.logoTextWrapper}>
              <VaaniText size="sm" weight="bold" color={colors.text.primary}>KrishiMitra AI</VaaniText>
              <VaaniText size="xs" color={colors.text.tertiary} style={styles.logoSubText}>KrishiSearch</VaaniText>
            </View>
          </View>

          {/* Top Right Offline badge & Theme Toggle */}
          <View style={styles.topNavRight}>
            <TouchableOpacity onPress={toggleTheme} style={{ padding: 6, marginRight: 10 }}>
              {mode === 'dark' ? <Sun size={18} color="#F59E0B" /> : <Moon size={18} color={colors.text.secondary} />}
            </TouchableOpacity>
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
            activeThreadId={null}
            onThreadPress={handleRecentThreadPress}
            onNewSearchPress={() => {
              resetSearch()
              setThreadId(null)
              Alert.alert('New Search', 'Search cleared. Ask a new question!');
            }}
          />

          {/* Right Content Pane */}
          <View style={styles.webContent}>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.webScrollContent}>
              <View style={styles.heroSection}>
                <VaaniText size="xxl" weight="bold" color={colors.text.primary} style={{ ...styles.heroTitle, fontSize: 32 }}>
                  KrishiMitra AI
                </VaaniText>
              </View>

              {/* Dynamic App Language Selector */}
              <View style={styles.dashboardLangCard}>
                <VaaniText size="xs" weight="bold" color={colors.text.tertiary} style={{ marginBottom: spacing.xs, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  {t('home.choose_language')}
                </VaaniText>
                <View style={styles.dashboardLangGrid}>
                  {getLanguagesList().map((lang) => {
                    const isSelected = getLanguage() === lang.code
                    return (
                      <TouchableOpacity
                        key={lang.code}
                        onPress={() => {
                          setLanguage(lang.code)
                          setAppLang(lang.code)
                          if (farmer) {
                            useAuthStore.getState().setFarmer({
                              preferredLanguage: lang.code
                            })
                          }
                          fetchTrendingQueries()
                        }}
                        style={[
                          styles.dashboardLangButton,
                          isSelected && styles.dashboardLangButtonSelected
                        ]}
                      >
                        <VaaniText size="base" style={{ marginRight: 6 }}>{lang.flag}</VaaniText>
                        <VaaniText size="xs" weight={isSelected ? 'bold' : 'regular'} color={isSelected ? colors.green.bright : colors.text.primary}>
                          {lang.name}
                        </VaaniText>
                      </TouchableOpacity>
                    )
                  })}
                </View>
              </View>

              {/* Large Unified Search Bar */}
              <View style={styles.webSearchWrapper}>
                <SearchBar
                  onSubmit={(q) => {
                    handleQuerySubmit(q, null, attachedImageUri, attachedImageBase64)
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
                  placeholder={t('home.search_placeholder')}
                />
              </View>

              {/* Quick Prompts Row */}
              <View style={styles.quickPromptsRow}>
                {[
                  t('home.prompt_paddy_blast'),
                  t('home.prompt_tomato_price', { district: t('districts.' + (farmer?.district || 'Mandya')) }),
                  t('home.prompt_rabi_crops'),
                  t('home.prompt_urea_dosage')
                ].map((promptText, i) => (
                  <TouchableOpacity key={i} onPress={() => handleQuerySubmit(promptText)} style={styles.qpButton}>
                    <VaaniText size="xs" color={colors.text.secondary}>
                      {promptText}
                    </VaaniText>
                  </TouchableOpacity>
                ))}
              </View>


            </ScrollView>
          </View>
        </View>

        {/* MODAL OVERLAYS */}
        {showMicOverlay && (
          <VoiceRecorder
            onClose={() => setShowMicOverlay(false)}
            onTranscriptComplete={handleVoiceTranscript}
          />
        )}
        {showCameraOverlay && (
          <PhotoCapture
            onClose={() => { setShowCameraOverlay(false); setActiveTab('search'); }}
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
      {/* Custom Header: 56px */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setShowThreadDrawer(true)}>
          <Menu size={24} color={colors.text.primary} />
        </TouchableOpacity>
        
        <VaaniText size="md" weight="bold" color={colors.text.primary}>
          KrishiMitra AI
        </VaaniText>

        <View style={styles.headerRight}>
          <View style={styles.seasonPill}>
            <Calendar size={12} color={colors.amber.bright} />
            <VaaniText size="xs" color={colors.amber.bright} weight="bold" style={styles.seasonText}>
              Kharif
            </VaaniText>
          </View>
          
          <View style={[styles.badge, isConnected ? styles.badgeOnline : styles.badgeOffline]}>
            {isConnected ? (
              <Wifi size={12} color={colors.green.bright} />
            ) : (
              <WifiOff size={12} color={colors.red} />
            )}
            <VaaniText size="xs" weight="bold" color={isConnected ? colors.green.bright : colors.red} style={styles.badgeText}>
              {isConnected ? 'Online' : 'Offline'}
            </VaaniText>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Farmer greeting */}
        <View style={styles.greetingContainer}>
          <VaaniText size="xl" weight="bold">
            {t('home.greeting_morning', { name: farmer?.name || 'Farmer' })} ☀️
          </VaaniText>
          <VaaniText size="sm" color={colors.text.secondary} style={styles.greetingLocation}>
            {t(`districts.${farmer?.district || 'Mandya'}`)}, {t(`states.${farmer?.state || 'Karnataka'}`)} · {t('home.seasonal_nudge', { crop: t(`crops.${farmer?.registeredCrops?.[0] || 'Paddy'}`), week: 6, season: 'Kharif' })}
          </VaaniText>
        </View>

        {/* Dynamic App Language Selector */}
        <View style={styles.dashboardLangCard}>
          <VaaniText size="xs" weight="bold" color={colors.text.tertiary} style={{ marginBottom: spacing.xs, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {t('home.choose_language')}
          </VaaniText>
          <View style={styles.dashboardLangGrid}>
            {getLanguagesList().map((lang) => {
              const isSelected = getLanguage() === lang.code
              return (
                <TouchableOpacity
                  key={lang.code}
                  onPress={() => {
                    setLanguage(lang.code)
                    setAppLang(lang.code)
                    if (farmer) {
                      useAuthStore.getState().setFarmer({
                        preferredLanguage: lang.code
                      })
                    }
                    fetchTrendingQueries()
                  }}
                  style={[
                    styles.dashboardLangButton,
                    isSelected && styles.dashboardLangButtonSelected
                  ]}
                >
                  <VaaniText size="base" style={{ marginRight: 6 }}>{lang.flag}</VaaniText>
                  <VaaniText size="xs" weight={isSelected ? 'bold' : 'regular'} color={isSelected ? colors.green.bright : colors.text.primary}>
                    {lang.name}
                  </VaaniText>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>

        {/* Central Unified Search Bar */}
        <SearchBar
          onSubmit={(q) => {
            handleQuerySubmit(q, null, attachedImageUri, attachedImageBase64)
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

        {/* Horizontal Trending Chips */}
        <View style={styles.trendingContainer}>
          <VaaniText size="sm" weight="semibold" color={colors.text.secondary} style={styles.sectionTitle}>
            {t('home.trending_title', { district: farmer?.district || 'Mandya' })}
          </VaaniText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.trendingScroll}>
            {trending.map((chip, i) => (
              <TouchableOpacity key={i} onPress={() => handleQuerySubmit(chip)} style={styles.trendingChip}>
                <VaaniText size="sm" color={colors.text.secondary}>
                  {chip}
                </VaaniText>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Continue conversation list */}
        {recentThreads.length > 0 && (
          <View style={styles.recentContainer}>
            <VaaniText size="sm" weight="semibold" color={colors.text.secondary} style={styles.sectionTitle}>
              {t('home.recent_title')}
            </VaaniText>
            {recentThreads.map((thread) => (
              <TouchableOpacity
                key={thread.id}
                onPress={() => handleRecentThreadPress(thread)}
                style={styles.threadCard}
              >
                <Clock size={16} color={colors.green.bright} />
                <View style={styles.threadCardContent}>
                  <VaaniText size="base" weight="semibold">
                    {thread.title}
                  </VaaniText>
                  <VaaniText size="xs" color={colors.text.tertiary}>
                    {thread.intent} · {new Date(thread.createdAt).toLocaleDateString()}
                  </VaaniText>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Seasonal alert card */}
        <TouchableOpacity
          onPress={() => handleQuerySubmit(t('home_trending.paddy_blast'))}
          style={styles.alertCard}
        >
          <View style={styles.alertHeader}>
            <VaaniText size="sm" weight="bold" color={colors.red}>
              {t('home_alerts.high_risk')}
            </VaaniText>
          </View>
          <VaaniText size="base" weight="semibold" style={styles.alertBody}>
            {t('home_alerts.humidity_warn', { district: t(`districts.${farmer?.district || 'Mandya'}`) })}
          </VaaniText>
          <VaaniText size="xs" color={colors.text.secondary} style={styles.alertFooter}>
            {t('home_alerts.action_guideline')}
          </VaaniText>
        </TouchableOpacity>
      </ScrollView>

      {/* Bottom tabs */}
      <View style={styles.bottomTabBar}>
        <TouchableOpacity onPress={() => navigation.navigate('History')} style={styles.tabButton}>
          <Clock size={20} color={colors.text.secondary} />
          <VaaniText size="xs" color={colors.text.secondary}>{t('tabs.history')}</VaaniText>
        </TouchableOpacity>
      </View>

      {/* Thread Drawer */}
      <ThreadDrawer
        visible={showThreadDrawer}
        onClose={() => setShowThreadDrawer(false)}
        onThreadPress={handleRecentThreadPress}
      />

      {/* VoiceRecorder modal overlay */}
      {showMicOverlay && (
        <VoiceRecorder
          onClose={() => setShowMicOverlay(false)}
          onTranscriptComplete={handleVoiceTranscript}
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
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.bg.base,
    flex: 1,
  },
  header: {
    alignItems: 'center',
    borderBottomColor: colors.border.default,
    borderBottomWidth: 1,
    flexDirection: 'row',
    height: 56,
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  seasonPill: {
    alignItems: 'center',
    backgroundColor: colors.amber.dim,
    borderColor: colors.amber.dark,
    borderRadius: radii.full,
    borderWidth: 1,
    flexDirection: 'row',
    marginRight: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  seasonText: {
    marginLeft: spacing.xs,
  },
  badge: {
    alignItems: 'center',
    borderRadius: radii.full,
    borderWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  badgeOnline: {
    backgroundColor: colors.green.dim,
    borderColor: colors.green.dark,
  },
  badgeOffline: {
    backgroundColor: colors.redDim,
    borderColor: colors.red,
  },
  badgeText: {
    marginLeft: spacing.xs,
  },
  scrollContent: {
    padding: spacing.base,
    paddingBottom: spacing.xxl,
  },
  greetingContainer: {
    marginBottom: spacing.xl,
    marginTop: spacing.sm,
  },
  greetingLocation: {
    marginTop: spacing.xs,
  },
  trendingContainer: {
    marginTop: spacing.xl,
  },
  sectionTitle: {
    marginBottom: spacing.md,
  },
  trendingScroll: {
    paddingRight: spacing.xl,
  },
  trendingChip: {
    backgroundColor: colors.bg.card,
    borderColor: colors.border.default,
    borderRadius: radii.full,
    borderWidth: 1,
    marginRight: spacing.sm,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
  },
  recentContainer: {
    marginTop: spacing.xl,
  },
  threadCard: {
    alignItems: 'center',
    backgroundColor: colors.bg.card,
    borderColor: colors.border.default,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: spacing.sm,
    padding: spacing.base,
  },
  threadCardContent: {
    marginLeft: spacing.md,
  },
  alertCard: {
    backgroundColor: colors.redDim,
    borderColor: colors.red,
    borderRadius: radii.md,
    borderWidth: 1,
    marginTop: spacing.xl,
    padding: spacing.base,
    ...shadows.card,
  },
  alertHeader: {
    marginBottom: spacing.xs,
  },
  alertBody: {
    marginBottom: spacing.sm,
  },
  alertFooter: {
    textDecorationLine: 'underline',
  },
  bottomTabBar: {
    borderTopColor: colors.border.default,
    borderTopWidth: 1,
    flexDirection: 'row',
    height: 60,
    justifyContent: 'space-around',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.bg.base,
  },
  tabButton: {
    alignItems: 'center',
    justifyContent: 'center',
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
  topNavPillActive: {
    backgroundColor: colors.green.dim,
    borderColor: '#5DCAA5',
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
    overflow: 'hidden',
  },
  webScrollContent: {
    padding: spacing.xl,
    maxWidth: 680,
    alignSelf: 'center',
    width: '100%',
    paddingBottom: 80,
  },
  heroSection: {
    alignItems: 'center',
    marginVertical: spacing.xl,
  },
  heroEyebrow: {
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  heroTitle: {
    fontSize: 26,
    marginVertical: spacing.xs,
    textAlign: 'center',
  },
  heroSub: {
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  webSearchWrapper: {
    width: '100%',
    marginBottom: spacing.base,
  },
  quickPromptsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  qpButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.bg.base,
  },
  webDivider: {
    height: 1,
    backgroundColor: colors.border.default,
    marginVertical: spacing.lg,
    width: '100%',
  },
  webAlertCard: {
    backgroundColor: colors.redDim,
    borderColor: colors.red,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.base,
    marginTop: spacing.md,
  },
  dashboardLangCard: {
    backgroundColor: colors.bg.card,
    borderColor: colors.border.default,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    alignSelf: 'stretch',
  },
  dashboardLangGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  dashboardLangButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.input,
    borderColor: colors.border.default,
    borderWidth: 1,
    borderRadius: radii.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  dashboardLangButtonSelected: {
    borderColor: colors.green.bright,
    backgroundColor: colors.green.dim,
  },
})
export default HomeScreen;
