/**
 * WelcomeScreen — Premium first impression
 *
 * Design: Zolve-inspired
 *  - Large editorial headline on warm cream background
 *  - Frosted glass language selector card
 *  - Clean single-action CTA button
 *  - Subtle animated background shapes
 */

import React, { useEffect, useRef, useState } from 'react'
import {
  StyleSheet, View, SafeAreaView, TouchableOpacity,
  ScrollView, Dimensions, Platform, Animated, Easing,
} from 'react-native'
import { Sprout, WifiOff, Mic, Languages, ShieldCheck, Check, ChevronRight, Leaf } from 'lucide-react-native'
import { useTheme } from '../../hooks/useTheme'
import { spacing, radii } from '../../theme/tokens'
import { KMText } from '../../components/ui/Text'
import { KMButton } from '../../components/ui/Button'
import { getLanguage, setLanguage, getLanguagesList } from '../../i18n'
import { MMKV } from 'react-native-mmkv'
import { useAuthStore } from '../../store/useAuthStore'

const { height: H, width: W } = Dimensions.get('window')
const TEAL  = '#1D9E75'
const AMBER = '#D4860A'
const CREAM = '#FAFAF8'
const CREAM2 = '#F5F0E8'

export default function WelcomeScreen({ navigation }: any) {
  const { theme, isDark } = useTheme()
  const [selectedLang, setSelectedLang] = useState(getLanguage())

  // Animations
  const logoAnim  = useRef(new Animated.Value(0)).current
  const heroAnim  = useRef(new Animated.Value(30)).current
  const cardAnim  = useRef(new Animated.Value(40)).current
  const cardOpacity = useRef(new Animated.Value(0)).current
  const floatAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.stagger(80, [
      Animated.timing(logoAnim, { toValue: 1, duration: 600, useNativeDriver: true, easing: Easing.out(Easing.back(1.4)) }),
      Animated.parallel([
        Animated.spring(heroAnim, { toValue: 0, useNativeDriver: true, speed: 10, bounciness: 6 }),
        Animated.timing(cardOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]),
      Animated.spring(cardAnim, { toValue: 0, useNativeDriver: true, speed: 8, bounciness: 4 }),
    ]).start()

    // Floating orbs
    Animated.loop(Animated.sequence([
      Animated.timing(floatAnim, { toValue: 1, duration: 3200, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
      Animated.timing(floatAnim, { toValue: 0, duration: 3200, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
    ])).start()
  }, [])

  const floatY = floatAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -14] })

  const handleGetStarted = async () => {
    const demo = {
      farmerId: `demo_${Math.random().toString(36).slice(2, 8)}`,
      name: 'Demo Farmer', phone: '9999999999',
      state: 'Karnataka', district: 'Mandya', block: 'Maddur',
      registeredCrops: ['Paddy'], landAcres: 2.0,
      soilType: 'Black Soil', irrigationType: 'Rainfed',
      preferredLanguage: selectedLang, cropPhase: 'vegetative',
    }
    setLanguage(selectedLang)
    const auth = useAuthStore.getState()
    await auth.setToken('demo_token')
    auth.setFarmer(demo)
    auth.setOnboarded(true)
    new MMKV().set('onboarding_done', true)
    navigation.replace('MainTabs')
  }

  const langs = getLanguagesList()
  const BG    = isDark ? '#0F0E0C' : CREAM
  const CARD  = isDark ? '#1A1916' : '#FFFFFF'
  const BORDER = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)'
  const TXT1  = isDark ? '#F0EDE8' : '#1A1A18'
  const TXT2  = isDark ? '#8A8580' : '#6B6760'
  const TXT3  = isDark ? '#5A5650' : '#9E9B96'

  return (
    <View style={[styles.root, { backgroundColor: BG }]}>

      {/* ── Decorative background orbs ──────────────────────────── */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Animated.View style={[styles.orb1, { transform: [{ translateY: floatY }] }]} />
        <View style={styles.orb2} />
        <View style={styles.orb3} />
      </View>

      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* ── Logo mark ──────────────────────────────────────────── */}
          <Animated.View style={[styles.logoArea, {
            opacity: logoAnim,
            transform: [{ scale: logoAnim.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) }],
          }]}>
            <View style={[styles.logoOuter, { backgroundColor: TEAL + '18', borderColor: TEAL + '30' }]}>
              <View style={[styles.logoInner, { backgroundColor: TEAL }]}>
                <KMText style={{ fontSize: 28 }}>🌾</KMText>
              </View>
            </View>
          </Animated.View>

          {/* ── Editorial headline ─────────────────────────────────── */}
          <Animated.View style={[styles.heroBlock, {
            opacity: cardOpacity,
            transform: [{ translateY: heroAnim }],
          }]}>
            <KMText
              style={[styles.headline, { color: TXT1 }]}
            >
              Your farm,{'\n'}smarter.
            </KMText>
            <KMText size="base" color={TXT2} style={styles.subline}>
              AI-powered advice for crops, weather, market prices and government schemes — in your language.
            </KMText>
          </Animated.View>

          {/* ── Feature pills ──────────────────────────────────────── */}
          <Animated.View style={[styles.pillRow, { opacity: cardOpacity }]}>
            {[
              { icon: WifiOff,  label: 'Works Offline', color: '#0284C7' },
              { icon: Mic,      label: 'Voice First',   color: TEAL       },
              { icon: Languages,label: '6 Languages',   color: AMBER      },
            ].map((f, i) => (
              <View key={i} style={[styles.featurePill, { backgroundColor: f.color + '12', borderColor: f.color + '25' }]}>
                <f.icon size={13} color={f.color} strokeWidth={2} />
                <KMText size="xs" weight="semibold" color={f.color} style={{ marginLeft: 5 }}>{f.label}</KMText>
              </View>
            ))}
          </Animated.View>

          {/* ── Language selector ──────────────────────────────────── */}
          <Animated.View style={[styles.langSection, {
            opacity: cardOpacity,
            transform: [{ translateY: cardAnim }],
          }]}>
            <KMText size="xs" weight="bold" color={TXT3} style={styles.langLabel}>
              SELECT YOUR LANGUAGE
            </KMText>
            <View style={[styles.langCard, { backgroundColor: CARD, borderColor: BORDER,
              ...Platform.select({ web: { boxShadow: '0 4px 24px rgba(0,0,0,0.07)' }, default: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 16, elevation: 4 } }),
            }]}>
              {langs.map((lang, idx) => {
                const isActive = selectedLang === lang.code
                return (
                  <TouchableOpacity
                    key={lang.code}
                    onPress={() => setSelectedLang(lang.code)}
                    activeOpacity={0.72}
                    style={[
                      styles.langRow,
                      { borderBottomColor: BORDER, borderBottomWidth: idx < langs.length - 1 ? 1 : 0 },
                      isActive && { backgroundColor: TEAL + '0C' },
                    ]}
                  >
                    <KMText style={styles.langFlag}>{lang.flag}</KMText>
                    <KMText
                      size="base"
                      weight={isActive ? 'semibold' : 'medium'}
                      color={isActive ? TEAL : TXT1}
                      style={{ flex: 1 }}
                    >
                      {lang.name}
                    </KMText>
                    {isActive && (
                      <View style={[styles.checkCircle, { backgroundColor: TEAL }]}>
                        <Check size={12} color="#fff" strokeWidth={3} />
                      </View>
                    )}
                  </TouchableOpacity>
                )
              })}
            </View>
          </Animated.View>

          {/* ── CTA ────────────────────────────────────────────────── */}
          <Animated.View style={[styles.ctaBlock, { opacity: cardOpacity }]}>
            <TouchableOpacity
              onPress={handleGetStarted}
              activeOpacity={0.88}
              style={[styles.ctaBtn, { backgroundColor: TXT1,
                ...Platform.select({ web: { boxShadow: `0 8px 28px rgba(0,0,0,0.2)` }, default: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 20, elevation: 8 } }),
              }]}
            >
              <KMText size="base" weight="bold" color="#fff">Get Started</KMText>
              <View style={[styles.ctaArrow, { backgroundColor: 'rgba(255,255,255,0.18)' }]}>
                <ChevronRight size={18} color="#fff" strokeWidth={2.5} />
              </View>
            </TouchableOpacity>
            <View style={styles.trustRow}>
              <ShieldCheck size={12} color={TXT3} />
              <KMText size="xs" color={TXT3} style={{ marginLeft: 5 }}>Your data stays on your device</KMText>
            </View>
          </Animated.View>

        </ScrollView>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  root:   { flex: 1, overflow: 'hidden' },
  scroll: { flexGrow: 1, paddingHorizontal: 28, paddingBottom: 40 },

  // Background orbs
  orb1: {
    position: 'absolute', width: 360, height: 360, borderRadius: 180,
    backgroundColor: TEAL + '10', top: -120, right: -80,
  },
  orb2: {
    position: 'absolute', width: 280, height: 280, borderRadius: 140,
    backgroundColor: AMBER + '08', bottom: 100, left: -100,
  },
  orb3: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    backgroundColor: '#4F46A808', bottom: -60, right: -40,
  },

  // Logo
  logoArea: { alignItems: 'center', marginTop: H * 0.06, marginBottom: 32 },
  logoOuter: {
    width: 92, height: 92, borderRadius: 28, borderWidth: 1.5,
    justifyContent: 'center', alignItems: 'center',
  },
  logoInner: {
    width: 72, height: 72, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center',
  },

  // Hero text
  heroBlock:  { marginBottom: 20 },
  headline:   { fontSize: 42, fontWeight: '800', lineHeight: 50, letterSpacing: -1.5, marginBottom: 14 },
  subline:    { lineHeight: 24, maxWidth: 340 },

  // Feature pills
  pillRow:    { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 28 },
  featurePill:{
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 99, borderWidth: 1,
  },

  // Language
  langSection: { marginBottom: 28 },
  langLabel:   { letterSpacing: 1.2, marginBottom: 10 },
  langCard:    { borderRadius: 20, borderWidth: 1, overflow: 'hidden' },
  langRow:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, height: 58 },
  langFlag:    { fontSize: 22, width: 36 },
  checkCircle: { width: 22, height: 22, borderRadius: 99, justifyContent: 'center', alignItems: 'center' },

  // CTA
  ctaBlock: { width: '100%' },
  ctaBtn: {
    height: 56, borderRadius: 16, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 14, paddingHorizontal: 24,
  },
  ctaArrow: {
    width: 30, height: 30, borderRadius: 99,
    justifyContent: 'center', alignItems: 'center', marginLeft: 10,
  },
  trustRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
})
