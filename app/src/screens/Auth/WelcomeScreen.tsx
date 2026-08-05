/**
 * WelcomeScreen — first impression.
 *
 * Design:
 *  - Split hero: top 45% is a warm illustrated backdrop, bottom 55% is content
 *  - Animated entry (logo and content fade/slide in)
 *  - Language selector with full-width rows (larger tap targets)
 *  - Premium single CTA
 */

import React, { useEffect } from 'react'
import { StyleSheet, View, SafeAreaView, Platform, TouchableOpacity, ScrollView, Dimensions } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
} from 'react-native-reanimated'
import { Sprout, WifiOff, Mic, Languages, ShieldCheck, Check } from 'lucide-react-native'
import { useTheme } from '../../hooks/useTheme'
import { spacing, radii, shadows } from '../../theme/tokens'
import { KMText } from '../../components/ui/Text'
import { KMButton } from '../../components/ui/Button'
import { getLanguage, setLanguage, getLanguagesList } from '../../i18n'
import { MMKV } from 'react-native-mmkv'
import { useAuthStore } from '../../store/useAuthStore'
import { useState } from 'react'

const { height: SCREEN_HEIGHT } = Dimensions.get('window')

export default function WelcomeScreen({ navigation }: any) {
  const { theme, isDark } = useTheme()
  const [selectedLang, setSelectedLang] = useState(getLanguage())

  const logoY = useSharedValue(40)
  const logoOpacity = useSharedValue(0)
  const contentY = useSharedValue(40)
  const contentOpacity = useSharedValue(0)

  useEffect(() => {
    logoY.value = withSpring(0, { damping: 14, stiffness: 70 })
    logoOpacity.value = withTiming(1, { duration: 600 })
    
    contentY.value = withDelay(200, withSpring(0, { damping: 14, stiffness: 70 }))
    contentOpacity.value = withDelay(200, withTiming(1, { duration: 600 }))
  }, [])

  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: logoY.value }],
    opacity: logoOpacity.value,
  }))
  
  const contentStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: contentY.value }],
    opacity: contentOpacity.value,
  }))

  const handleGetStarted = async () => {
    // Quick demo profile — real users go through Onboarding
    const demo = {
      farmerId: `demo_${Math.random().toString(36).slice(2, 8)}`,
      name: 'Demo Farmer',
      phone: '9999999999',
      state: 'Karnataka',
      district: 'Mandya',
      block: 'Maddur',
      registeredCrops: ['Paddy'],
      landAcres: 2.0,
      soilType: 'Black Soil',
      irrigationType: 'Rainfed',
      preferredLanguage: selectedLang,
      cropPhase: 'vegetative',
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

  return (
    <View style={[styles.root, { backgroundColor: theme.bg.base }]}>
      {/* Hero Backdrop Area (Top 45%) */}
      <View style={[styles.heroArea, { backgroundColor: isDark ? '#0A1A14' : theme.bg.tinted }]}>
        {/* Decorative elements to suggest a field/morning */}
        <View style={[styles.sun, { backgroundColor: theme.accent.secondary + '20' }]} />
        <View style={[styles.fieldShape1, { backgroundColor: theme.accent.primary + '10' }]} />
        <View style={[styles.fieldShape2, { backgroundColor: theme.accent.primary + '15' }]} />
        
        <SafeAreaView style={styles.heroSafeArea}>
          <Animated.View style={[styles.logoWrap, logoStyle]}>
            <View style={[styles.logoMark, { 
              backgroundColor: theme.bg.surface,
              borderColor: theme.accent.primary + '40',
              ...shadows.sm
            }]}>
              <Sprout size={36} color={theme.accent.primary} />
            </View>
            <KMText size="2xl" weight="bold" color={isDark ? theme.text.primary : theme.accent.primaryHover} style={{ marginTop: spacing.md, letterSpacing: 0.5 }}>
              KrishiMitra AI
            </KMText>
            <KMText size="sm" weight="medium" color={isDark ? theme.text.secondary : theme.accent.primary} style={{ marginTop: 2 }}>
              Farming intelligence. Your language.
            </KMText>
          </Animated.View>
        </SafeAreaView>
      </View>

      {/* Content Area (Bottom 55%) */}
      <Animated.View style={[styles.contentArea, { backgroundColor: theme.bg.base }, contentStyle]}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} bounces={false}>
          
          {/* Feature Row */}
          <View style={styles.featuresRow}>
            {[
              { icon: WifiOff, label: 'Offline' },
              { icon: Mic, label: 'Voice' },
              { icon: Languages, label: 'Local' },
            ].map((f, i) => (
              <View key={i} style={styles.featureItem}>
                <View style={[styles.featureIcon, { backgroundColor: theme.bg.subtle }]}>
                  <f.icon size={16} color={theme.text.secondary} />
                </View>
                <KMText size="xs" color={theme.text.secondary} weight="medium">{f.label}</KMText>
              </View>
            ))}
          </View>

          {/* Language Selector */}
          <View style={styles.langSection}>
            <KMText size="xs" weight="bold" color={theme.text.tertiary} style={styles.langTitle}>
              SELECT LANGUAGE
            </KMText>
            <View style={[styles.langCard, { backgroundColor: theme.bg.surface, borderColor: theme.border.default }]}>
              {langs.map((lang, idx) => {
                const isActive = selectedLang === lang.code
                return (
                  <TouchableOpacity
                    key={lang.code}
                    onPress={() => setSelectedLang(lang.code)}
                    activeOpacity={0.7}
                    style={[
                      styles.langRow,
                      idx < langs.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.border.subtle },
                      isActive && { backgroundColor: theme.accent.primaryDim }
                    ]}
                  >
                    <KMText size="xl" style={{ width: 32 }}>{lang.flag}</KMText>
                    <KMText
                      size="base"
                      weight={isActive ? 'semibold' : 'medium'}
                      color={isActive ? theme.accent.primary : theme.text.primary}
                      style={{ flex: 1 }}
                    >
                      {lang.name}
                    </KMText>
                    {isActive && (
                      <Check size={20} color={theme.accent.primary} />
                    )}
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>

          <View style={{ flex: 1 }} />

          {/* Bottom CTA Area */}
          <View style={styles.ctaArea}>
            <KMButton
              title="Get Started"
              size="lg"
              fullWidth
              onPress={handleGetStarted}
              style={styles.ctaBtn}
            />
            <View style={styles.trustRow}>
              <ShieldCheck size={14} color={theme.text.tertiary} />
              <KMText size="xs" color={theme.text.tertiary} style={{ marginLeft: 4 }}>
                Your data stays on your device
              </KMText>
            </View>
          </View>
          
        </ScrollView>
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  heroArea: {
    height: SCREEN_HEIGHT * 0.42,
    position: 'relative',
    overflow: 'hidden',
  },
  sun: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    top: -50,
    right: -40,
  },
  fieldShape1: {
    position: 'absolute',
    width: 600,
    height: 300,
    borderRadius: 300,
    bottom: -150,
    left: -100,
    transform: [{ scaleX: 1.5 }],
  },
  fieldShape2: {
    position: 'absolute',
    width: 500,
    height: 250,
    borderRadius: 250,
    bottom: -120,
    right: -100,
    transform: [{ scaleX: 1.2 }],
  },
  heroSafeArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoWrap: {
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  logoMark: {
    width: 72,
    height: 72,
    borderRadius: 24,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentArea: {
    flex: 1,
    borderTopLeftRadius: radii['2xl'],
    borderTopRightRadius: radii['2xl'],
    marginTop: -radii['2xl'],
    ...shadows.lg,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
  },
  featuresRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  featureItem: {
    alignItems: 'center',
    gap: 6,
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: radii.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  langSection: {
    width: '100%',
    marginBottom: spacing.xl,
  },
  langTitle: {
    letterSpacing: 1,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  langCard: {
    borderRadius: radii.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  langRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    height: 56, // Larger tap target
  },
  ctaArea: {
    marginTop: 'auto',
    width: '100%',
  },
  ctaBtn: {
    marginBottom: spacing.md,
    borderRadius: radii.xl,
  },
  trustRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
})

