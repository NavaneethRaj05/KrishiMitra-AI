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

  // Premium cream palette
  const CREAM = isDark ? '#161512' : '#FAFAF8'
  const CARD  = isDark ? '#1E1C18' : '#FFFFFF'
  const CARD2 = isDark ? '#252320' : '#FAFAF8'
  const BORDER = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'
  const TXT1  = isDark ? '#F0EDE8' : '#1A1A18'
  const TXT2  = isDark ? '#A09890' : '#6B6760'
  const TXT3  = isDark ? '#6B6760' : '#A09890'
  const AMBER = '#D4860A'
  const TEAL  = '#1D9E75'
  const GOLD  = '#E8A31D'

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: CREAM }]}>
      <KMStatusBar />

      {/* ── Top Nav Bar ─────────────────────────────────────────── */}
      <View style={[styles.navbar, { backgroundColor: CREAM, borderBottomColor: BORDER }]}>
        <View style={styles.navLeft}>
          <View style={[styles.logoMark, { backgroundColor: TEAL }]}>
            <KMText style={{ fontSize: 16 }}>🌾</KMText>
          </View>
          <KMText size="md" weight="bold" color={TEAL} style={{ letterSpacing: -0.3 }}>KrishiMitra</KMText>
        </View>

        {/* Search bar – desktop only */}
        {isDesktop && (
          <TouchableOpacity
            onPress={() => navigation.navigate('AskTab')}
            style={[styles.navSearch, { backgroundColor: CARD2, borderColor: BORDER }]}
          >
            <Search size={14} color={TXT3} />
            <KMText size="sm" color={TXT3} style={{ marginLeft: 8 }}>Ask anything about your farm…</KMText>
          </TouchableOpacity>
        )}

        <View style={styles.navRight}>
          {/* Connectivity pill */}
          <View style={[styles.connPill, {
            backgroundColor: isConnected ? '#E6FBF3' : '#FEF3C7',
            borderColor: isConnected ? '#6EE7B7' : '#FCD34D',
          }]}>
            {isConnected
              ? <Wifi size={11} color="#059669" strokeWidth={2.5} />
              : <WifiOff size={11} color="#D97706" strokeWidth={2.5} />}
            <KMText size="xs" weight="bold" color={isConnected ? '#059669' : '#D97706'} style={{ marginLeft: 4 }}>
              {isConnected ? 'Online' : 'Offline'}
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={TEAL} colors={[TEAL]} />}
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
              style={[styles.avatarBtn, { backgroundColor: TEAL + '18', borderColor: TEAL + '40' }]}
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
            <QuickPill icon={Mic}      label="Voice"   onPress={() => setShowMic(true)}   color={TEAL}  bg={TEAL + '12'} />
            <QuickPill icon={Camera}   label="Scan"    onPress={() => setShowCamera(true)} color="#4F46A8" bg="#4F46A812" />
            <QuickPill icon={TrendingUp} label="Mandi" onPress={() => submitQuery('Current mandi prices for my crops')} color={AMBER} bg={AMBER + '12'} />
            <QuickPill icon={ShieldCheck} label="Schemes" onPress={() => submitQuery('Government schemes for farmers in my district')} color="#0284C7" bg="#0284C712" />
          </View>

          {/* ── Dashboard Grid ─────────────────────────────────────── */}
          {isDesktop ? (
            /* Desktop: 3-column grid */
            <View style={styles.desktopGrid}>
              {/* Col 1 — Crop Health + Smart Analysis */}
              <View style={styles.gridCol}>
                <CropHealthCard CARD={CARD} CARD2={CARD2} BORDER={BORDER} TXT1={TXT1} TXT2={TXT2} TEAL={TEAL} onAsk={submitQuery} />
                <SmartAnalysisCard CARD={CARD} BORDER={BORDER} TXT1={TXT1} TXT2={TXT2} TXT3={TXT3} TEAL={TEAL} AMBER={AMBER} />
              </View>
              {/* Col 2 — Growth Chart + Weather */}
              <View style={styles.gridCol}>
                <GrowthCard CARD={CARD} CARD2={CARD2} BORDER={BORDER} TXT1={TXT1} TXT2={TXT2} TXT3={TXT3} GOLD={GOLD} AMBER={AMBER} />
                <WeatherCard CARD={CARD} BORDER={BORDER} TXT1={TXT1} TXT2={TXT2} onAsk={submitQuery} />
              </View>
              {/* Col 3 — Recent Updates */}
              <View style={[styles.gridCol, { flex: 0.85 }]}>
                <RecentUpdatesCard CARD={CARD} CARD2={CARD2} BORDER={BORDER} TXT1={TXT1} TXT2={TXT2} TXT3={TXT3} AMBER={AMBER} TEAL={TEAL} recentThreads={recentThreads} onPress={(t: any) => { resetSearch(); setThreadId(t.id); navigation.navigate('Thread', { threadId: t.id, threadTitle: t.title }) }} onSeeAll={() => navigation.navigate('History')} />
              </View>
            </View>
          ) : (
            /* Mobile: stacked cards */
            <View>
              <CropHealthCard CARD={CARD} CARD2={CARD2} BORDER={BORDER} TXT1={TXT1} TXT2={TXT2} TEAL={TEAL} onAsk={submitQuery} />
              <GrowthCard CARD={CARD} CARD2={CARD2} BORDER={BORDER} TXT1={TXT1} TXT2={TXT2} TXT3={TXT3} GOLD={GOLD} AMBER={AMBER} />
              <SmartAnalysisCard CARD={CARD} BORDER={BORDER} TXT1={TXT1} TXT2={TXT2} TXT3={TXT3} TEAL={TEAL} AMBER={AMBER} />
              <WeatherCard CARD={CARD} BORDER={BORDER} TXT1={TXT1} TXT2={TXT2} onAsk={submitQuery} />
              <RecentUpdatesCard CARD={CARD} CARD2={CARD2} BORDER={BORDER} TXT1={TXT1} TXT2={TXT2} TXT3={TXT3} AMBER={AMBER} TEAL={TEAL} recentThreads={recentThreads} onPress={(t: any) => { resetSearch(); setThreadId(t.id); navigation.navigate('Thread', { threadId: t.id, threadTitle: t.title }) }} onSeeAll={() => navigation.navigate('History')} />
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
function CropHealthCard({ CARD, CARD2, BORDER, TXT1, TXT2, TEAL, onAsk }: any) {
  return (
    <View style={[styles.dashCard, { backgroundColor: CARD, borderColor: BORDER }]}>
      <View style={styles.cardHeaderRow}>
        <KMText size="base" weight="bold" color={TXT1}>Crop Health</KMText>
        <TouchableOpacity onPress={() => onAsk('Give me a detailed crop health analysis')}>
          <KMText size="xs" weight="semibold" color={TEAL}>See all</KMText>
        </TouchableOpacity>
      </View>
      <View style={styles.healthGrid}>
        <HealthRow icon={Droplets} label="Water Level" value="Low" status="Alert" statusColor="#D97706" />
        <HealthRow icon={Sun}      label="Light"       value="Indirect" status="OK" statusColor="#059669" />
        <HealthRow icon={Wind}     label="Humidity"    value="56%"     status="Good" statusColor={TEAL} />
        <HealthRow icon={Leaf}     label="Fertilization" value="Moderate" status="OK" statusColor="#059669" />
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
        <KMText size="base" weight="bold" color={TXT1}>Growth</KMText>
        <View style={[styles.monthBadge, { backgroundColor: '#F5F0E8' }]}>
          <KMText size="xs" weight="semibold" color={AMBER}>Month ↓</KMText>
        </View>
      </View>
      {/* Growth rate badge */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
        <View style={[styles.growthBadge, { backgroundColor: GOLD + '20' }]}>
          <KMText size="xs" weight="bold" color={GOLD}>↑ 3%</KMText>
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
function SmartAnalysisCard({ CARD, BORDER, TXT1, TXT2, TXT3, TEAL, AMBER }: any) {
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
        <KMText size="base" weight="bold" color={TXT1}>Smart Analysis</KMText>
        <KMText size="xs" color={TXT3}>Listen to key points</KMText>
      </View>
      {/* Animated waveform visualizer */}
      <View style={styles.waveform}>
        {[3, 6, 10, 7, 12, 8, 5, 11, 9, 6, 13, 7, 4, 10, 8, 5, 11, 9, 6, 8].map((h, i) => (
          <Animated.View key={i} style={{
            width: 3, height: h * 2.2, borderRadius: 2,
            backgroundColor: AMBER,
            opacity: opacity,
            marginHorizontal: 1.5,
            alignSelf: 'center',
          }} />
        ))}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={[styles.playBtn, { backgroundColor: TEAL + '15', borderColor: TEAL + '30' }]}>
            <KMText style={{ color: TEAL, fontSize: 12 }}>▶</KMText>
          </View>
          <KMText size="xs" color={TXT3}>1x</KMText>
        </View>
        <KMText size="xs" color={TXT3} weight="medium">20:16</KMText>
      </View>
    </View>
  )
}

// ── Weather Card ──────────────────────────────────────────────────────────────
function WeatherCard({ CARD, BORDER, TXT1, TXT2, onAsk }: any) {
  return (
    <TouchableOpacity
      onPress={() => onAsk('What is the 7-day weather forecast for my farm?')}
      style={[styles.dashCard, { backgroundColor: '#E8F4FE', borderColor: '#BDDFF8' }]}
      activeOpacity={0.85}
    >
      <View style={styles.cardHeaderRow}>
        <KMText size="base" weight="bold" color="#1565A0">Farm Weather</KMText>
        <KMText size="xl">⛅</KMText>
      </View>
      <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
        <StatChip label="Temp" value="28" unit="°C" color="#1565A0" bg="#BDDFF830" />
        <StatChip label="Humidity" value="62" unit="%" color="#1565A0" bg="#BDDFF830" />
        <StatChip label="Wind" value="12" unit="km/h" color="#1565A0" bg="#BDDFF830" />
      </View>
    </TouchableOpacity>
  )
}

// ── Recent Updates Card ───────────────────────────────────────────────────────
function RecentUpdatesCard({ CARD, CARD2, BORDER, TXT1, TXT2, TXT3, AMBER, TEAL, recentThreads, onPress, onSeeAll }: any) {
  const MOCK_UPDATES = [
    { label: 'Growth rate: 5%', tag: 'Growth', tagColor: AMBER, tagBg: AMBER + '18', date: 'Nov 12, 2024' },
    { label: 'Soil moisture: Low', tag: 'Watering', tagColor: '#FFFFFF', tagBg: '#1A1A18', date: 'Oct 27, 2024' },
    { label: 'Excessive light', tag: 'Light', tagColor: TXT2, tagBg: '#F0EDE8', date: 'Nov 18, 2024' },
  ]
  return (
    <View style={[styles.dashCard, { backgroundColor: CARD, borderColor: BORDER }]}>
      <View style={styles.cardHeaderRow}>
        <KMText size="base" weight="bold" color={TXT1}>Recent Updates</KMText>
        <TouchableOpacity onPress={onSeeAll}>
          <KMText size="xs" weight="semibold" color={TEAL}>See all</KMText>
        </TouchableOpacity>
      </View>
      {(recentThreads.length > 0 ? recentThreads.slice(0, 3).map((t: any) => ({
        label: t.title,
        tag: t.intent?.replace(/_/g, ' ') || 'Query',
        tagColor: TEAL,
        tagBg: TEAL + '15',
        date: new Date(t.createdAt).toLocaleDateString(),
      })) : MOCK_UPDATES).map((item: any, i: number) => (
        <TouchableOpacity key={i} onPress={() => recentThreads[i] && onPress(recentThreads[i])}
          style={[styles.updateRow, { borderBottomColor: 'rgba(0,0,0,0.05)', borderBottomWidth: i < 2 ? 1 : 0 }]}
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
