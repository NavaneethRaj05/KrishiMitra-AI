/**
 * KrishiMitra AI — Premium Home Dashboard
 *
 * Design language inspired by Zolve:
 *  - Warm cream / frosted-white base (#FAFAF8)
 *  - Glassmorphism cards with subtle borders
 *  - Clean sans-serif typography, generous whitespace
 *  - Warm amber + teal accent palette
 *  - Dashboard grid: crop health card, growth chart, quick stats, recent activity
 */

import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  RefreshControl,
  Platform,
  useWindowDimensions,
  Animated,
  Easing,
} from 'react-native'
import {
  Wifi, WifiOff, Mic, Camera, TrendingUp,
  Clock, ChevronRight, MessageSquare, MapPin,
  Leaf, ArrowRight, Droplets, Sun, Wind, Bell,
  Zap, BarChart2, ShieldCheck, Sparkles, Search,
} from 'lucide-react-native'
import { useTheme } from '../../hooks/useTheme'
import { useAuthStore } from '../../store/useAuthStore'
import { useOfflineStore } from '../../store/useOfflineStore'
import { useSearchStore } from '../../store/useSearchStore'
import { spacing, radii, shadows } from '../../theme/tokens'
import { KMText } from '../../components/ui/Text'
import { KMStatusBar } from '../../components/ui/StatusBar'
import { AskBar } from '../../components/search/AskBar'
import { VoiceModal } from '../../components/search/VoiceModal'
import { MOCK_WEATHER, MOCK_MANDI_PRICES, MOCK_TRENDING_QUERIES } from '../../mock/mockData'
import { database } from '../../db/database'
import { Q } from '@nozbe/watermelondb'
import { MMKV } from 'react-native-mmkv'
import * as FileSystem from 'expo-file-system'
import { PhotoCapture } from '../../components/photo/PhotoCapture'

interface Props { navigation: any }

// ── Micro-chart sparkline bars ───────────────────────────────────────────────
function SparkBar({ value, max, color }: { value: number; max: number; color: string }) {
  const h = Math.max(4, (value / max) * 48)
  return (
    <View style={{ width: 6, height: 48, justifyContent: 'flex-end' }}>
      <View style={{ width: 6, height: h, borderRadius: 3, backgroundColor: color, opacity: 0.85 }} />
    </View>
  )
}

// ── Stat Chip ─────────────────────────────────────────────────────────────────
function StatChip({ label, value, unit, color, bg }: any) {
  return (
    <View style={[styles.statChip, { backgroundColor: bg }]}>
      <KMText size="xs" color={color} weight="medium" style={{ marginBottom: 2, opacity: 0.75 }}>{label}</KMText>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2 }}>
        <KMText size="md" weight="bold" color={color}>{value}</KMText>
        {unit && <KMText size="xs" color={color} style={{ opacity: 0.65 }}>{unit}</KMText>}
      </View>
    </View>
  )
}

// ── Quick Action Pill ─────────────────────────────────────────────────────────
function QuickPill({ icon: Icon, label, onPress, color, bg }: any) {
  const scale = useRef(new Animated.Value(1)).current
  const press = () => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.93, duration: 80, useNativeDriver: true, easing: Easing.out(Easing.quad) }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 40 }),
    ]).start()
    onPress()
  }
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity onPress={press} activeOpacity={1} style={[styles.quickPill, { backgroundColor: bg }]}>
        <View style={[styles.quickPillIcon, { backgroundColor: color + '18' }]}>
          <Icon size={18} color={color} strokeWidth={2} />
        </View>
        <KMText size="xs" weight="semibold" color={color}>{label}</KMText>
      </TouchableOpacity>
    </Animated.View>
  )
}

// ── Health Metric Row ─────────────────────────────────────────────────────────
function HealthRow({ icon: Icon, label, value, status, statusColor }: any) {
  return (
    <View style={styles.healthRow}>
      <View style={[styles.healthIcon, { backgroundColor: statusColor + '15' }]}>
        <Icon size={14} color={statusColor} strokeWidth={2.5} />
      </View>
      <View style={{ flex: 1 }}>
        <KMText size="xs" color="#8A8580" weight="medium">{label}</KMText>
        <KMText size="sm" weight="bold" color="#1A1A18">{value}</KMText>
      </View>
      <View style={[styles.statusBadge, { backgroundColor: statusColor + '18' }]}>
        <KMText size="xs" weight="bold" color={statusColor}>{status}</KMText>
      </View>
    </View>
  )
}

// ── Growth chart data ─────────────────────────────────────────────────────────
const GROWTH_DATA = [28, 35, 30, 42, 38, 46, 52]
const GROWTH_LABELS = ['Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb']

export default function HomeScreen({ navigation }: Props) {
  const { theme, isDark } = useTheme()
  const farmer = useAuthStore((s) => s.farmer)
  const isConnected = useOfflineStore((s) => s.isConnected)
  const resetSearch = useSearchStore((s) => s.resetSearch)
  const setThreadId = useSearchStore((s) => s.setThreadId)
  const setInputMode = useSearchStore((s) => s.setInputMode)
  const { width } = useWindowDimensions()
  const isDesktop = width >= 768

  const [trending, setTrending] = useState<string[]>([])
  const [recentThreads, setRecentThreads] = useState<any[]>([])
  const [showMic, setShowMic] = useState(false)
  const [showCamera, setShowCamera] = useState(false)
  const [attachedImageUri, setAttachedImageUri] = useState<string | null>(null)
  const [attachedImageB64, setAttachedImageB64] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  // Fade-in on mount
  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(24)).current
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, speed: 12, bounciness: 4 }),
    ]).start()
  }, [])

  const loadData = useCallback(async () => {
    const storage = new MMKV()
    try {
      const cached = storage.getString('trending_queries')
      setTrending(cached ? JSON.parse(cached) : MOCK_TRENDING_QUERIES)
    } catch { setTrending(MOCK_TRENDING_QUERIES) }
    try {
      const col = database.get('threads')
      const records = await col.query(Q.sortBy('updated_at', Q.desc), Q.take(4)).fetch()
      setRecentThreads(records)
    } catch { setRecentThreads([]) }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const onRefresh = async () => {
    setRefreshing(true)
    await loadData()
    setRefreshing(false)
  }

  const submitQuery = (query: string, imgUri?: string | null, imgB64?: string | null, lang?: string) => {
    resetSearch(); setThreadId(null)
    setInputMode(imgUri ? 'multimodal' : 'text')
    navigation.navigate('AskResult', { query: query || 'Diagnose this crop', imageUri: imgUri, imageB64: imgB64, detectedLanguage: lang })
  }

  const hour = new Date().getHours()
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const firstName = farmer?.name?.split(' ')[0] ?? 'Farmer'

  // Stitch Aero-Glass Obsidian palette
  const BG_BASE = isDark ? '#08100C' : '#F4FBF7'
  const CARD    = isDark ? '#101C16' : '#FFFFFF'
  const CARD2   = isDark ? '#16281F' : '#F0FDF4'
  const BORDER  = isDark ? 'rgba(16, 185, 129, 0.18)' : 'rgba(16, 185, 129, 0.12)'
  const TXT1    = isDark ? '#F2FBF6' : '#0F172A'
  const TXT2    = isDark ? '#94A3B8' : '#475569'
  const TXT3    = isDark ? '#64748B' : '#94A3B8'
  const AMBER   = '#F59E0B'
  const EMERALD = '#10B981'
  const GOLD    = '#FBBF24'

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: BG_BASE }]}>
      <KMStatusBar />

      {/* ── Top Nav Bar ─────────────────────────────────────────── */}
      <View style={[styles.navbar, { backgroundColor: BG_BASE, borderBottomColor: BORDER }]}>
        <View style={styles.navLeft}>
          <View style={[styles.logoMark, { backgroundColor: EMERALD,
            ...Platform.select({
              web: { boxShadow: '0 0 16px rgba(16, 185, 129, 0.4)' },
              ios: { shadowColor: EMERALD, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 8 },
              default: {},
            }),
          }]}>
            <KMText style={{ fontSize: 16 }}>🌾</KMText>
          </View>
          <KMText size="md" weight="bold" color={EMERALD} style={{ letterSpacing: -0.3 }}>KrishiMitra AI</KMText>
        </View>

        {/* Search bar – desktop only */}
        {isDesktop && (
          <TouchableOpacity
            onPress={() => navigation.navigate('AskTab')}
            style={[styles.navSearch, { backgroundColor: CARD2, borderColor: BORDER }]}
          >
            <Search size={14} color={TXT3} />
            <KMText size="sm" color={TXT3} style={{ marginLeft: 8 }}>Ask anything in Kannada, Hindi, or English…</KMText>
          </TouchableOpacity>
        )}

        <View style={styles.navRight}>
          {/* Connectivity pill */}
          <View style={[styles.connPill, {
            backgroundColor: isConnected ? (isDark ? '#064E3B40' : '#ECFDF5') : (isDark ? '#78350F40' : '#FFFBEB'),
            borderColor: isConnected ? '#10B981' : '#F59E0B',
          }]}>
            {isConnected
              ? <Wifi size={11} color="#10B981" strokeWidth={2.5} />
              : <WifiOff size={11} color="#F59E0B" strokeWidth={2.5} />}
            <KMText size="xs" weight="bold" color={isConnected ? '#10B981' : '#F59E0B'} style={{ marginLeft: 4 }}>
              {isConnected ? 'Online' : 'Offline Mode'}
            </KMText>
          </View>
          <TouchableOpacity style={[styles.iconBtn, { backgroundColor: CARD2, borderColor: BORDER }]}>
            <Bell size={18} color={TXT2} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Main Scroll ─────────────────────────────────────────── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={EMERALD} colors={[EMERALD]} />}
        contentContainerStyle={[styles.scrollContent, isDesktop && { paddingHorizontal: 32 }]}
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

          {/* ── Greeting ──────────────────────────────────────────── */}
          <View style={styles.greetRow}>
            <View>
              <KMText size="sm" color={TXT3} weight="medium">{greet}</KMText>
              <KMText size="2xl" weight="bold" color={TXT1} style={{ letterSpacing: -0.5, marginTop: 2 }}>
                {firstName} 👋
              </KMText>
              {farmer?.district && (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                  <MapPin size={12} color={TXT3} />
                  <KMText size="xs" color={TXT3} style={{ marginLeft: 4 }}>{farmer.district}, {farmer.state}</KMText>
                </View>
              )}
            </View>
            <TouchableOpacity
              style={[styles.avatarBtn, { backgroundColor: EMERALD + '18', borderColor: EMERALD + '40' }]}
              onPress={() => navigation.navigate('ProfileTab')}
            >
              <KMText style={{ fontSize: 22 }}>👨‍🌾</KMText>
            </TouchableOpacity>
          </View>

          {/* ── Ask Bar (glassmorphism) ────────────────────────────── */}
          <View style={[styles.askCard, { backgroundColor: CARD, borderColor: BORDER,
            ...Platform.select({ web: { boxShadow: '0 4px 24px rgba(0,0,0,0.07)' } as any, default: shadows.md }),
          }]}>
            <AskBar
              onSubmit={(q) => { submitQuery(q, attachedImageUri, attachedImageB64); setAttachedImageUri(null); setAttachedImageB64(null) }}
              onMicPress={() => setShowMic(true)}
              onCameraPress={() => setShowCamera(true)}
              onImageSelected={(uri, b64) => { setAttachedImageUri(uri); setAttachedImageB64(b64) }}
              attachedImageUri={attachedImageUri}
              onRemoveImage={() => { setAttachedImageUri(null); setAttachedImageB64(null) }}
              layout="home"
            />
          </View>

          {/* ── Quick Actions Row ──────────────────────────────────── */}
          <View style={styles.quickRow}>
            <QuickPill icon={Mic}        label="Voice AI"  onPress={() => setShowMic(true)}   color={EMERALD} bg={EMERALD + '18'} />
            <QuickPill icon={Camera}     label="Scan Leaf" onPress={() => setShowCamera(true)} color="#818CF8" bg="#818CF818" />
            <QuickPill icon={TrendingUp} label="Mandi"     onPress={() => submitQuery('Current mandi prices for my crops')} color={AMBER} bg={AMBER + '18'} />
            <QuickPill icon={ShieldCheck} label="Schemes"  onPress={() => submitQuery('Government schemes for farmers in my district')} color="#38BDF8" bg="#38BDF818" />
          </View>

          {/* ── Stitch Active Crop Status (NDVI Health Bars) ─────── */}
          <View style={[styles.dashCard, { backgroundColor: CARD, borderColor: BORDER }]}>
            <View style={styles.cardHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: EMERALD }} />
                <KMText size="base" weight="bold" color={TXT1}>Active Crop Monitoring</KMText>
              </View>
              <View style={[styles.growthBadge, { backgroundColor: EMERALD + '20' }]}>
                <KMText size="xs" weight="bold" color={EMERALD}>NDVI Live</KMText>
              </View>
            </View>

            {/* Field 1: Wheat */}
            <View style={{ marginBottom: 14 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                <KMText size="sm" weight="bold" color={TXT1}>🌾 Field A • Wheat (HD-2967)</KMText>
                <KMText size="xs" weight="bold" color={EMERALD}>88% Optimal</KMText>
              </View>
              <View style={{ height: 6, backgroundColor: isDark ? '#1C2E24' : '#E2E8F0', borderRadius: 3, overflow: 'hidden' }}>
                <View style={{ width: '88%', height: 6, backgroundColor: EMERALD, borderRadius: 3 }} />
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                <KMText size="xs" color={TXT3}>Days to harvest: 42 days</KMText>
                <KMText size="xs" color={TXT3}>Irrigation: Normal</KMText>
              </View>
            </View>

            {/* Field 2: Tomato / Mustard */}
            <View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                <KMText size="sm" weight="bold" color={TXT1}>🍅 Field B • Tomato (Arka Rakshak)</KMText>
                <KMText size="xs" weight="bold" color={AMBER}>74% Needs Water</KMText>
              </View>
              <View style={{ height: 6, backgroundColor: isDark ? '#1C2E24' : '#E2E8F0', borderRadius: 3, overflow: 'hidden' }}>
                <View style={{ width: '74%', height: 6, backgroundColor: AMBER, borderRadius: 3 }} />
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                <KMText size="xs" color={TXT3}>Days to harvest: 18 days</KMText>
                <KMText size="xs" color={AMBER}>Mild moisture deficit</KMText>
              </View>
            </View>
          </View>

          {/* ── Dashboard Grid ─────────────────────────────────────── */}
          {isDesktop ? (
            /* Desktop: 3-column grid */
            <View style={styles.desktopGrid}>
              {/* Col 1 — Crop Health + Smart Analysis */}
              <View style={styles.gridCol}>
                <CropHealthCard CARD={CARD} CARD2={CARD2} BORDER={BORDER} TXT1={TXT1} TXT2={TXT2} EMERALD={EMERALD} onAsk={submitQuery} />
                <SmartAnalysisCard CARD={CARD} BORDER={BORDER} TXT1={TXT1} TXT2={TXT2} TXT3={TXT3} EMERALD={EMERALD} AMBER={AMBER} />
              </View>
              {/* Col 2 — Growth Chart + Weather */}
              <View style={styles.gridCol}>
                <GrowthCard CARD={CARD} CARD2={CARD2} BORDER={BORDER} TXT1={TXT1} TXT2={TXT2} TXT3={TXT3} GOLD={GOLD} AMBER={AMBER} />
                <WeatherCard CARD={CARD} BORDER={BORDER} TXT1={TXT1} TXT2={TXT2} onAsk={submitQuery} isDark={isDark} />
              </View>
              {/* Col 3 — Recent Updates */}
              <View style={[styles.gridCol, { flex: 0.85 }]}>
                <RecentUpdatesCard CARD={CARD} CARD2={CARD2} BORDER={BORDER} TXT1={TXT1} TXT2={TXT2} TXT3={TXT3} AMBER={AMBER} EMERALD={EMERALD} recentThreads={recentThreads} onPress={(t: any) => { resetSearch(); setThreadId(t.id); navigation.navigate('Thread', { threadId: t.id, threadTitle: t.title }) }} onSeeAll={() => navigation.navigate('History')} />
              </View>
            </View>
          ) : (
            /* Mobile: stacked cards */
            <View>
              <CropHealthCard CARD={CARD} CARD2={CARD2} BORDER={BORDER} TXT1={TXT1} TXT2={TXT2} EMERALD={EMERALD} onAsk={submitQuery} />
              <GrowthCard CARD={CARD} CARD2={CARD2} BORDER={BORDER} TXT1={TXT1} TXT2={TXT2} TXT3={TXT3} GOLD={GOLD} AMBER={AMBER} />
              <SmartAnalysisCard CARD={CARD} BORDER={BORDER} TXT1={TXT1} TXT2={TXT2} TXT3={TXT3} EMERALD={EMERALD} AMBER={AMBER} />
              <WeatherCard CARD={CARD} BORDER={BORDER} TXT1={TXT1} TXT2={TXT2} onAsk={submitQuery} isDark={isDark} />
              <RecentUpdatesCard CARD={CARD} CARD2={CARD2} BORDER={BORDER} TXT1={TXT1} TXT2={TXT2} TXT3={TXT3} AMBER={AMBER} EMERALD={EMERALD} recentThreads={recentThreads} onPress={(t: any) => { resetSearch(); setThreadId(t.id); navigation.navigate('Thread', { threadId: t.id, threadTitle: t.title }) }} onSeeAll={() => navigation.navigate('History')} />
            </View>
          )}

          {/* ── Trending chips ─────────────────────────────────────── */}
          {trending.length > 0 && (
            <View style={styles.trendSection}>
              <View style={styles.sectionHeader}>
                <Zap size={14} color={AMBER} />
                <KMText size="sm" weight="bold" color={TXT2} style={{ marginLeft: 6 }}>Trending Near You</KMText>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
                {trending.map((chip, i) => (
                  <TouchableOpacity key={i} onPress={() => submitQuery(chip)}
                    style={[styles.trendChip, { backgroundColor: '#F0EDE8', borderColor: 'rgba(0,0,0,0.06)' }]}
                    activeOpacity={0.7}>
                    <Search size={11} color={TXT3} />
                    <KMText size="xs" weight="medium" color={TXT2} style={{ marginLeft: 5 }}>{chip}</KMText>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          <View style={{ height: 40 }} />
        </Animated.View>
      </ScrollView>

      <VoiceModal visible={showMic} onClose={() => setShowMic(false)} onTranscriptComplete={(t, lang) => { setShowMic(false); submitQuery(t, null, null, lang) }} />
      {showCamera && (
        <PhotoCapture onClose={() => setShowCamera(false)} navigation={navigation}
          onPhotoSelected={async (uri) => {
            setAttachedImageUri(uri)
            try { const b64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 }); setAttachedImageB64(b64) } catch {}
            setShowCamera(false)
          }} />
      )}
    </SafeAreaView>
  )
}

// ── Crop Health Card ──────────────────────────────────────────────────────────
function CropHealthCard({ CARD, CARD2, BORDER, TXT1, TXT2, EMERALD, onAsk }: any) {
  return (
    <View style={[styles.dashCard, { backgroundColor: CARD, borderColor: BORDER }]}>
      <View style={styles.cardHeaderRow}>
        <KMText size="base" weight="bold" color={TXT1}>Crop Health Diagnostics</KMText>
        <TouchableOpacity onPress={() => onAsk('Give me a detailed crop health analysis')}>
          <KMText size="xs" weight="bold" color={EMERALD}>View All →</KMText>
        </TouchableOpacity>
      </View>
      <View style={styles.healthGrid}>
        <HealthRow icon={Droplets} label="Soil Moisture" value="68% Optimal" status="Good" statusColor={EMERALD} />
        <HealthRow icon={Sun}      label="Solar Exposure" value="Indirect 8h" status="Ideal" statusColor={EMERALD} />
        <HealthRow icon={Wind}     label="Ambient Humidity" value="56%" status="Normal" statusColor="#38BDF8" />
        <HealthRow icon={Leaf}     label="NPK Balance" value="N: Adequate" status="Balanced" statusColor={EMERALD} />
      </View>
    </View>
  )
}

// ── Growth Chart Card ─────────────────────────────────────────────────────────
function GrowthCard({ CARD, CARD2, BORDER, TXT1, TXT2, TXT3, GOLD, AMBER }: any) {
  const maxVal = Math.max(...GROWTH_DATA)
  return (
    <View style={[styles.dashCard, { backgroundColor: CARD, borderColor: BORDER }]}>
      <View style={styles.cardHeaderRow}>
        <KMText size="base" weight="bold" color={TXT1}>Yield & Biomass Index</KMText>
        <View style={[styles.monthBadge, { backgroundColor: AMBER + '20' }]}>
          <KMText size="xs" weight="bold" color={AMBER}>Seasonal Trend</KMText>
        </View>
      </View>
      {/* Growth rate badge */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
        <View style={[styles.growthBadge, { backgroundColor: GOLD + '25' }]}>
          <KMText size="xs" weight="bold" color={GOLD}>↑ +14.2% vs Benchmark</KMText>
        </View>
      </View>
      {/* Mini sparkline */}
      <View style={styles.sparkline}>
        {GROWTH_DATA.map((v, i) => (
          <SparkBar key={i} value={v} max={maxVal} color={AMBER} />
        ))}
      </View>
      <View style={styles.sparkLabels}>
        {GROWTH_LABELS.map((l, i) => (
          <KMText key={i} size="xs" color={TXT3} style={{ flex: 1, textAlign: 'center', fontSize: 9 }}>{l}</KMText>
        ))}
      </View>
    </View>
  )
}

// ── Smart Analysis Card ───────────────────────────────────────────────────────
function SmartAnalysisCard({ CARD, BORDER, TXT1, TXT2, TXT3, EMERALD, AMBER }: any) {
  const waveRef = useRef(new Animated.Value(0)).current
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(waveRef, { toValue: 1, duration: 1200, useNativeDriver: true }),
      Animated.timing(waveRef, { toValue: 0, duration: 1200, useNativeDriver: true }),
    ])).start()
  }, [])
  const opacity = waveRef.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] })

  return (
    <View style={[styles.dashCard, { backgroundColor: CARD, borderColor: BORDER }]}>
      <View style={styles.cardHeaderRow}>
        <KMText size="base" weight="bold" color={TXT1}>AI Voice Briefing</KMText>
        <KMText size="xs" color={TXT3}>Audio summary</KMText>
      </View>
      {/* Animated waveform visualizer */}
      <View style={styles.waveform}>
        {[3, 6, 10, 7, 12, 8, 5, 11, 9, 6, 13, 7, 4, 10, 8, 5, 11, 9, 6, 8].map((h, i) => (
          <Animated.View key={i} style={{
            width: 3, height: h * 2.2, borderRadius: 2,
            backgroundColor: EMERALD,
            opacity: opacity,
            marginHorizontal: 1.5,
            alignSelf: 'center',
          }} />
        ))}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={[styles.playBtn, { backgroundColor: EMERALD + '20', borderColor: EMERALD + '50' }]}>
            <KMText style={{ color: EMERALD, fontSize: 12 }}>▶</KMText>
          </View>
          <KMText size="xs" color={TXT3} weight="medium">Listen in Kannada</KMText>
        </View>
        <KMText size="xs" color={TXT3} weight="medium">02:15 min</KMText>
      </View>
    </View>
  )
}

// ── Weather Card ──────────────────────────────────────────────────────────────
function WeatherCard({ CARD, BORDER, TXT1, TXT2, onAsk, isDark }: any) {
  const bg = isDark ? '#0F2338' : '#E0F2FE'
  const border = isDark ? 'rgba(56, 189, 248, 0.25)' : '#BAE6FD'
  const textCol = isDark ? '#BAE6FD' : '#0369A1'
  return (
    <TouchableOpacity
      onPress={() => onAsk('What is the 7-day weather forecast for my farm?')}
      style={[styles.dashCard, { backgroundColor: bg, borderColor: border }]}
      activeOpacity={0.85}
    >
      <View style={styles.cardHeaderRow}>
        <View>
          <KMText size="base" weight="bold" color={textCol}>Microclimate Radar</KMText>
          <KMText size="xs" color={textCol} style={{ opacity: 0.8 }}>Hassan District • Scattered Clouds</KMText>
        </View>
        <KMText size="xl">⛅</KMText>
      </View>
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
        <StatChip label="Temp" value="28" unit="°C" color={textCol} bg={isDark ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.6)'} />
        <StatChip label="Humidity" value="62" unit="%" color={textCol} bg={isDark ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.6)'} />
        <StatChip label="Rain Prob" value="15" unit="%" color={textCol} bg={isDark ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.6)'} />
      </View>
    </TouchableOpacity>
  )
}

// ── Recent Updates Card ───────────────────────────────────────────────────────
function RecentUpdatesCard({ CARD, CARD2, BORDER, TXT1, TXT2, TXT3, AMBER, EMERALD, recentThreads, onPress, onSeeAll }: any) {
  const MOCK_UPDATES = [
    { label: 'NDVI vegetation index: +4.2%', tag: 'Growth', tagColor: EMERALD, tagBg: EMERALD + '18', date: 'Today' },
    { label: 'Drip schedule alert: Field B', tag: 'Irrigation', tagColor: '#38BDF8', tagBg: '#38BDF818', date: 'Yesterday' },
    { label: 'APMC Onion Mandi Rate: ₹2,400/q', tag: 'Market', tagColor: AMBER, tagBg: AMBER + '18', date: '2d ago' },
  ]
  return (
    <View style={[styles.dashCard, { backgroundColor: CARD, borderColor: BORDER }]}>
      <View style={styles.cardHeaderRow}>
        <KMText size="base" weight="bold" color={TXT1}>Recent Advisory Log</KMText>
        <TouchableOpacity onPress={onSeeAll}>
          <KMText size="xs" weight="bold" color={EMERALD}>History →</KMText>
        </TouchableOpacity>
      </View>
      {(recentThreads.length > 0 ? recentThreads.slice(0, 3).map((t: any) => ({
        label: t.title,
        tag: t.intent?.replace(/_/g, ' ') || 'Query',
        tagColor: EMERALD,
        tagBg: EMERALD + '18',
        date: new Date(t.createdAt).toLocaleDateString(),
      })) : MOCK_UPDATES).map((item: any, i: number) => (
        <TouchableOpacity key={i} onPress={() => recentThreads[i] && onPress(recentThreads[i])}
          style={[styles.updateRow, { borderBottomColor: BORDER, borderBottomWidth: i < 2 ? 1 : 0 }]}
          activeOpacity={0.7}
        >
          <View style={[styles.updateDot, { backgroundColor: item.tagBg }]}>
            <KMText style={{ fontSize: 10 }}>🌱</KMText>
          </View>
          <KMText size="sm" weight="medium" color={TXT1} style={{ flex: 1, marginHorizontal: 10 }} numberOfLines={1}>{item.label}</KMText>
          <View style={[styles.tagBadge, { backgroundColor: item.tagBg }]}>
            <KMText size="xs" weight="bold" color={item.tagColor}>{item.tag}</KMText>
          </View>
          <KMText size="xs" color={TXT3} style={{ marginLeft: 8, width: 68 }} numberOfLines={1}>{item.date}</KMText>
          <ChevronRight size={14} color={TXT3} style={{ marginLeft: 4 }} />
        </TouchableOpacity>
      ))}
    </View>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1 },
  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 60,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  navLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoMark: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  navSearch: {
    flex: 1,
    marginHorizontal: 24,
    height: 38,
    borderRadius: 99,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  navRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  connPill: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 99, borderWidth: 1,
  },
  iconBtn: {
    width: 36, height: 36, borderRadius: 99,
    borderWidth: 1, justifyContent: 'center', alignItems: 'center',
  },
  scrollContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 80 },
  greetRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 },
  avatarBtn: {
    width: 52, height: 52, borderRadius: 99,
    borderWidth: 1.5, justifyContent: 'center', alignItems: 'center',
  },
  askCard: {
    borderRadius: 20, borderWidth: 1,
    marginBottom: 16, overflow: 'hidden',
  },
  quickRow: { flexDirection: 'row', gap: 8, marginBottom: 20, flexWrap: 'wrap' },
  quickPill: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    paddingVertical: 10, paddingHorizontal: 14,
    borderRadius: 99, flex: 1, minWidth: 70,
    justifyContent: 'center',
  },
  quickPillIcon: {
    width: 28, height: 28, borderRadius: 99,
    justifyContent: 'center', alignItems: 'center',
  },
  desktopGrid: { flexDirection: 'row', gap: 16, alignItems: 'flex-start' },
  gridCol: { flex: 1, gap: 16 },
  dashCard: {
    borderRadius: 20, borderWidth: 1,
    padding: 18, marginBottom: 16,
    ...Platform.select({
      web: { boxShadow: '0 2px 16px rgba(0,0,0,0.05)' },
      default: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2 },
    }),
  },
  cardHeaderRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 14,
  },
  healthGrid: { gap: 6 },
  healthRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 6,
  },
  healthIcon: { width: 30, height: 30, borderRadius: 99, justifyContent: 'center', alignItems: 'center' },
  statusBadge: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99,
  },
  statChip: {
    flex: 1, borderRadius: 12, padding: 10,
  },
  sparkline: {
    flexDirection: 'row', alignItems: 'flex-end',
    gap: 4, paddingTop: 4, paddingBottom: 4,
  },
  sparkLabels: {
    flexDirection: 'row', marginTop: 4,
  },
  monthBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99 },
  growthBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99 },
  waveform: {
    flexDirection: 'row', alignItems: 'center', height: 40,
    marginVertical: 8,
  },
  playBtn: {
    width: 30, height: 30, borderRadius: 99, borderWidth: 1,
    justifyContent: 'center', alignItems: 'center',
  },
  trendSection: { marginBottom: 12 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  trendChip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 99, borderWidth: 1,
  },
  updateRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 11,
  },
  updateDot: { width: 28, height: 28, borderRadius: 99, justifyContent: 'center', alignItems: 'center' },
  tagBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
})
