import React, { useEffect } from 'react'
import { StyleSheet, View, Dimensions, Platform } from 'react-native'
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated'
import { Sprout } from 'lucide-react-native'
import { colors, spacing, radii } from '../../components/ui/tokens'
import { VaaniText } from '../../components/ui/VaaniText'
import { VaaniButton } from '../../components/ui/VaaniButton'
import { getLanguage } from '../../i18n'
import { MMKV } from 'react-native-mmkv'
import { useAuthStore } from '../../store/useAuthStore'

const { width } = Dimensions.get('window')

export const WelcomeScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const selectedLang = getLanguage()
  const sunY = useSharedValue(60)
  const contentOpacity = useSharedValue(0)

  useEffect(() => {
    // Rise sun and fade in text on mount
    sunY.value = withSpring(0, { damping: 12, stiffness: 60 })
    contentOpacity.value = withTiming(1, { duration: 1000 })
  }, [])

  const animatedSunStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sunY.value }],
  }))

  const animatedContentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
  }))

  const handleGetStarted = async () => {
    const demoProfile = {
      farmerId: 'demo_farmer_' + Math.random().toString(36).substring(7),
      name: 'Demo Farmer',
      phone: '9999999999',
      state: 'Karnataka',
      district: 'Mandya',
      block: 'Maddi Block',
      registeredCrops: ['Paddy'],
      landAcres: 2.0,
      soilType: 'Black Soil',
      irrigationType: 'Rainfed',
      preferredLanguage: selectedLang,
      cropPhase: 'vegetative'
    }
    
    // Set token & profile context directly to bypass login
    const authStore = useAuthStore.getState()
    await authStore.setToken('demo_token')
    authStore.setFarmer(demoProfile)
    authStore.setOnboarded(true)

    new MMKV().set('onboarding_done', true)
    navigation.replace('Home')
  }

  return (
    <View style={styles.container}>
      {/* Top 50%: Logo & Hero */}
      <View style={styles.logoAndHeroContainer}>
        {/* Glow effect container */}
        <Animated.View style={[styles.logoGlow, animatedSunStyle]}>
          <View style={styles.logoIconCircle}>
            <Sprout size={56} color={colors.green.bright} />
          </View>
        </Animated.View>
      </View>

      {/* Bottom 50%: Content */}
      <Animated.View style={[styles.contentContainer, animatedContentStyle]}>
        <VaaniText size="xxl" weight="bold" color={colors.green.bright} style={styles.brandTitle}>
          ✦ KrishiMitra AI
        </VaaniText>
        
        <VaaniText size="md" weight="medium" color={colors.text.primary} style={styles.subTitle}>
          ಕೃಷಿ ಜ್ಞಾನ. ನಿಮ್ಮ ಭಾಷೆಯಲ್ಲಿ.
        </VaaniText>
        <VaaniText size="sm" color={colors.text.secondary} style={styles.englishSub}>
          (Farming intelligence. Your language.)
        </VaaniText>

        <View style={styles.infoCard}>
          <VaaniText size="xs" color={colors.text.tertiary} align="center">
            🌱 Precision Agricultural AI · Works Offline · Multilingual
          </VaaniText>
        </View>

        <View style={styles.buttonWrapper}>
          <VaaniButton
            title="Get started"
            onPress={handleGetStarted}
            style={styles.btn}
          />
        </View>
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.bg.base,
    flex: 1,
    justifyContent: 'space-between',
    paddingBottom: spacing.xxl,
  },
  logoAndHeroContainer: {
    height: '45%',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginTop: spacing.xxl,
  },
  logoGlow: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#1E46201a',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: { boxShadow: '0px 8px 20px rgba(29, 158, 117, 0.25)' },
      default: {
        shadowColor: colors.green.bright,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
        elevation: 8,
      }
    })
  },
  logoIconCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: colors.bg.card,
    borderColor: colors.green.bright,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: { boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)' },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
      }
    })
  },
  contentContainer: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    flex: 1,
    justifyContent: 'center',
  },
  brandTitle: {
    letterSpacing: 1.5,
    fontSize: 32,
    marginBottom: spacing.sm,
  },
  subTitle: {
    marginBottom: spacing.xs,
    fontSize: 18,
    textAlign: 'center',
  },
  englishSub: {
    marginBottom: spacing.md,
    fontSize: 14,
    textAlign: 'center',
  },
  infoCard: {
    backgroundColor: colors.bg.card,
    borderColor: colors.border.default,
    borderWidth: 1,
    borderRadius: radii.full,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },
  buttonWrapper: {
    width: '100%',
    paddingHorizontal: spacing.md,
    marginTop: spacing.base,
  },
  btn: {
    width: '100%',
    height: 48,
  },
})

export default WelcomeScreen;
