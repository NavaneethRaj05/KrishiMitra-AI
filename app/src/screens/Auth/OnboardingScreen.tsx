/**
 * OnboardingScreen — 4-step farm profile wizard.
 * Steps: Location → Crops → Soil → Land & Water
 * Fully theme-aware (light / dark / system).
 */

import React, { useState } from 'react'
import {
  StyleSheet, View, ScrollView, TouchableOpacity,
  Alert, Dimensions, SafeAreaView,
} from 'react-native'
import Slider from '@react-native-community/slider'
import {
  Sprout, MapPin, Droplet, Layers,
  ChevronLeft, Check,
} from 'lucide-react-native'
import { useTheme } from '../../hooks/useTheme'
import { spacing, radii, shadows } from '../../theme/tokens'
import { KMText } from '../../components/ui/Text'
import { KMInput } from '../../components/ui/Input'
import { KMButton } from '../../components/ui/Button'
import { useAuthStore, FarmerContext } from '../../store/useAuthStore'
import { authService } from '../../services/authService'
import { getLanguage, t } from '../../i18n'

const { width } = Dimensions.get('window')

const DISTRICTS = [
  'Mandya','Dharwad','Hassan','Belagavi','Shimoga','Mysore','Tumkur',
  'Davanagere','Kalaburagi','Bellary','Bagalkot','Koppal','Chikkamagaluru',
  'Udupi','Dakshina Kannada','Vijayapura','Gadag','Haveri','Chamarajanagar',
  'Ramanagara','Chikkaballapur','Kolar','Bangalore Rural','Bangalore Urban',
  'Yadgir','Raichur','Bidar','Chitradurga','Uttara Kannada','Kodagu',
].sort()

const CROPS = [
  'Paddy','Wheat','Cotton','Sugarcane','Maize','Tomato',
  'Potato','Groundnut','Coffee','Vegetables','Pulses',
]

const SOIL_TYPES = [
  { code: 'Black Soil',   emoji: '🌑', desc: 'High clay, rich moisture' },
  { code: 'Red Soil',     emoji: '🔴', desc: 'Porous, iron-rich, loamy' },
  { code: 'Alluvial Soil',emoji: '🌾', desc: 'Fertile river basin soil' },
  { code: 'Sandy Soil',   emoji: '🏜️', desc: 'Low moisture, high drainage' },
  { code: 'Clay Soil',    emoji: '🏺', desc: 'Heavy, dense, holds water' },
  { code: 'Loam Soil',    emoji: '🌱', desc: 'Ideal mix of sand/silt/clay' },
]

const IRRIGATION_TYPES = ['Rainfed', 'Drip', 'Canal', 'Borewell']

const TOTAL_STEPS = 4

export const OnboardingScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { theme, isDark } = useTheme()
  const currentLang = getLanguage()
  const authStore = useAuthStore()

  const [step, setStep]                     = useState(1)
  const [name, setName]                     = useState(authStore.farmer?.name ?? '')
  const [farmState]                         = useState(authStore.farmer?.state ?? 'Karnataka')
  const [district, setDistrict]             = useState(authStore.farmer?.district ?? 'Mandya')
  const [block, setBlock]                   = useState(authStore.farmer?.block ?? '')
  const [selectedCrops, setSelectedCrops]   = useState<string[]>(authStore.farmer?.registeredCrops ?? [])
  const [soilType, setSoilType]             = useState(authStore.farmer?.soilType ?? 'Black Soil')
  const [landAcres, setLandAcres]           = useState(authStore.farmer?.landAcres ?? 2.0)
  const [irrigationType, setIrrigationType] = useState(authStore.farmer?.irrigationType ?? 'Rainfed')
  const [districtSearch, setDistrictSearch] = useState('')
  const [loading, setLoading]               = useState(false)

  const progressPct = (step / TOTAL_STEPS) * 100

  const handleNext = () => {
    if (step === 1 && !name.trim()) {
      Alert.alert('Required', 'Please enter your name.')
      return
    }
    if (step === 2 && selectedCrops.length === 0) {
      Alert.alert('Required', 'Please select at least one crop.')
      return
    }
    if (step < TOTAL_STEPS) setStep(s => s + 1)
    else handleComplete()
  }

  const handleBack = () => {
    if (step > 1) setStep(s => s - 1)
    else if (authStore.isOnboarded) navigation.goBack()
  }

  const toggleCrop = (crop: string) =>
    setSelectedCrops(prev =>
      prev.includes(crop) ? prev.filter(c => c !== crop) : [...prev, crop],
    )

  const handleComplete = async () => {
    setLoading(true)
    const profile: FarmerContext = {
      farmerId: authStore.farmer?.farmerId ?? `farmer_${Math.random().toString(36).slice(2, 9)}`,
      name: name.trim(),
      phone: authStore.farmer?.phone ?? '9876543210',
      state: farmState,
      district,
      block: block.trim() || 'Village',
      registeredCrops: selectedCrops,
      landAcres: parseFloat(landAcres.toFixed(1)),
      soilType,
      irrigationType,
      preferredLanguage: currentLang,
      cropPhase: 'vegetative',
    }
    try {
      await authService.onboard(profile)
    } catch {
      authStore.setFarmer(profile)
      authStore.setOnboarded(true)
    } finally {
      setLoading(false)
      navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] })
    }
  }

  const filteredDistricts = DISTRICTS.filter(d =>
    d.toLowerCase().includes(districtSearch.toLowerCase()),
  )

  /* ── Step progress header ─────────────────────────────────────────── */
  const STEPS = [
    { Icon: MapPin,  title: t('onboarding.step_location') },
    { Icon: Sprout,  title: t('onboarding.step_crops') },
    { Icon: Layers,  title: t('onboarding.step_soil') },
    { Icon: Droplet, title: t('onboarding.step_land') },
  ]

  const renderHeader = () => (
    <View style={s.stepHeaderWrap}>
      {/* Thicker Progress bar */}
      <View style={[s.progressTrack, { backgroundColor: theme.border.subtle }]}>
        <View style={[s.progressFill, {
          width: `${progressPct}%` as any,
          backgroundColor: theme.accent.primary,
        }]} />
      </View>
      {/* Larger Step dots */}
      <View style={s.stepsRow}>
        {STEPS.map(({ Icon, title }, idx) => {
          const n = idx + 1
          const isActive    = step === n
          const isCompleted = step > n
          return (
            <View key={n} style={s.stepCol}>
              <View style={[s.stepDot, {
                backgroundColor: isCompleted
                  ? theme.accent.primary
                  : isActive
                  ? theme.bg.surface
                  : theme.bg.subtle,
                borderColor: isCompleted || isActive
                  ? theme.accent.primary
                  : theme.border.default,
                ...(isActive ? shadows.sm : {}),
              }]}>
                {isCompleted
                  ? <Check size={18} color={theme.text.inverse} strokeWidth={3} />
                  : <Icon size={18} color={isActive ? theme.accent.primary : theme.text.tertiary} />
                }
              </View>
              <KMText
                size="xs"
                weight={isActive ? 'semibold' : 'regular'}
                color={isActive ? theme.accent.primary : theme.text.tertiary}
                style={s.stepLabel}
              >
                {title}
              </KMText>
            </View>
          )
        })}
      </View>
    </View>
  )

  /* ── Step content ─────────────────────────────────────────────────── */
  const renderStep = () => {
    /* Step 1 — Location */
    if (step === 1) return (
      <View style={[s.stepCard, { backgroundColor: theme.bg.surface, borderColor: theme.border.default }]}>
        <KMText size="sm" weight="semibold" color={theme.text.secondary} style={s.fieldLabel}>{t('onboarding.your_name')}</KMText>
        <KMInput placeholder="e.g. Rajesh Gowda" value={name} onChangeText={setName} />

        <KMText size="sm" weight="semibold" color={theme.text.secondary} style={s.fieldLabel}>{t('onboarding.state')}</KMText>
        <KMInput value={t(`states.${farmState}`)} editable={false} style={{ opacity: 0.6 }} />

        <KMText size="sm" weight="semibold" color={theme.text.secondary} style={s.fieldLabel}>{t('onboarding.district')}</KMText>
        <KMInput
          placeholder="Search district…"
          value={districtSearch || t(`districts.${district}`)}
          onChangeText={v => { setDistrictSearch(v); setDistrict(v) }}
        />
        {districtSearch.length > 0 && filteredDistricts.length > 0 && (
          <View style={[s.dropdown, { backgroundColor: theme.bg.elevated, borderColor: theme.border.default }]}>
            {filteredDistricts.slice(0, 5).map(d => (
              <TouchableOpacity
                key={d}
                style={[s.dropdownItem, { borderBottomColor: theme.border.subtle }]}
                onPress={() => { setDistrict(d); setDistrictSearch('') }}
              >
                <KMText size="sm">{t(`districts.${d}`)}</KMText>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <KMText size="sm" weight="semibold" color={theme.text.secondary} style={s.fieldLabel}>{t('onboarding.block')}</KMText>
        <KMInput placeholder="e.g. Maddur Block" value={block} onChangeText={setBlock} />
      </View>
    )

    /* Step 2 — Crops */
    if (step === 2) return (
      <View style={[s.stepCard, { backgroundColor: theme.bg.surface, borderColor: theme.border.default }]}>
        <KMText size="lg" weight="bold">{t('onboarding.select_crops')}</KMText>
        <KMText size="sm" color={theme.text.secondary} style={s.subLabel}>
          {t('onboarding.select_crops_sub')}
        </KMText>
        <View style={s.chipGrid}>
          {CROPS.map(crop => {
            const sel = selectedCrops.includes(crop)
            return (
              <TouchableOpacity
                key={crop}
                onPress={() => toggleCrop(crop)}
                style={[s.cropChip, {
                  backgroundColor: sel ? theme.accent.primary : theme.bg.subtle,
                  borderColor:     sel ? theme.accent.primary : theme.border.default,
                }]}
              >
                {sel && <Check size={16} color={theme.text.inverse} style={{ marginRight: 6 }} />}
                <KMText
                  size="base"
                  weight={sel ? 'bold' : 'medium'}
                  color={sel ? theme.text.inverse : theme.text.primary}
                >
                  {t(`crops.${crop}`)}
                </KMText>
              </TouchableOpacity>
            )
          })}
        </View>
      </View>
    )

    /* Step 3 — Soil */
    if (step === 3) return (
      <View style={[s.stepCard, { backgroundColor: theme.bg.surface, borderColor: theme.border.default }]}>
        <KMText size="lg" weight="bold">{t('onboarding.select_soil')}</KMText>
        <KMText size="sm" color={theme.text.secondary} style={s.subLabel}>
          {t('onboarding.select_soil_sub')}
        </KMText>
        <View style={s.soilGrid}>
          {SOIL_TYPES.map(soil => {
            const sel = soilType === soil.code
            return (
              <TouchableOpacity
                key={soil.code}
                onPress={() => setSoilType(soil.code)}
                style={[s.soilCard, {
                  backgroundColor: sel ? theme.accent.primaryDim : theme.bg.subtle,
                  borderColor:     sel ? theme.accent.primary    : theme.border.default,
                }]}
              >
                <View style={s.soilIconWrap}>
                  <KMText size="2xl">{soil.emoji}</KMText>
                </View>
                <KMText size="base" weight="semibold"
                  color={sel ? theme.accent.primaryHover : theme.text.primary}
                  style={{ marginBottom: 4 }}>
                  {soil.code}
                </KMText>
                <KMText size="xs" color={theme.text.tertiary} align="center" style={s.soilDesc}>
                  {soil.desc}
                </KMText>
              </TouchableOpacity>
            )
          })}
        </View>
      </View>
    )

    /* Step 4 — Land & Irrigation */
    return (
      <View style={[s.stepCard, { backgroundColor: theme.bg.surface, borderColor: theme.border.default }]}>
        <View style={s.sliderHeader}>
          <KMText size="lg" weight="bold">{t('onboarding.land_acres')}</KMText>
          <View style={[s.valuePill, { backgroundColor: theme.accent.primaryDim, borderColor: theme.accent.primary + '40' }]}>
            <KMText size="lg" weight="bold" color={theme.accent.primaryHover}>
              {landAcres.toFixed(1)} acres
            </KMText>
          </View>
        </View>
        <Slider
          minimumValue={0.5}
          maximumValue={50}
          step={0.5}
          value={landAcres}
          onValueChange={setLandAcres}
          minimumTrackTintColor={theme.accent.primary}
          maximumTrackTintColor={theme.border.strong}
          thumbTintColor={theme.accent.primary}
          style={s.slider}
        />
        <View style={s.sliderLabels}>
          <KMText size="xs" color={theme.text.tertiary}>0.5 ac</KMText>
          <KMText size="xs" color={theme.text.tertiary}>50 ac</KMText>
        </View>

        <KMText size="lg" weight="bold" style={[s.fieldLabel, { marginTop: spacing.xxl }]}>
          {t('onboarding.irrigation')}
        </KMText>
        <View style={s.irrigationGrid}>
          {IRRIGATION_TYPES.map(type => {
            const sel = irrigationType === type
            return (
              <TouchableOpacity
                key={type}
                onPress={() => setIrrigationType(type)}
                style={[s.irrigationCard, {
                  backgroundColor: sel ? theme.accent.primary : theme.bg.subtle,
                  borderColor:     sel ? theme.accent.primary : theme.border.default,
                }]}
              >
                <KMText size="base" weight={sel ? 'bold' : 'medium'}
                  color={sel ? theme.text.inverse : theme.text.primary}>
                  {type}
                </KMText>
              </TouchableOpacity>
            )
          })}
        </View>
      </View>
    )
  }

  /* ── Render ─────────────────────────────────────────────────────────── */
  return (
    <SafeAreaView style={[s.root, { backgroundColor: theme.bg.base }]}>
      <ScrollView
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={s.intro}>
          <KMText size="2xl" weight="bold" color={isDark ? theme.text.primary : theme.accent.primaryHover}>
            {t('onboarding.welcome')}
          </KMText>
          <KMText size="base" color={theme.text.secondary} style={{ marginTop: 4 }}>
            {t('onboarding.welcome_sub')}
          </KMText>
        </View>

        {renderHeader()}
        {renderStep()}
      </ScrollView>

      {/* Footer navigation */}
      <View style={[s.footer, {
        backgroundColor: theme.bg.surface,
        borderTopColor:  theme.border.default,
        ...shadows.md,
      }]}>
        {(step > 1 || authStore.isOnboarded) ? (
          <TouchableOpacity onPress={handleBack} style={s.backBtn}>
            <ChevronLeft size={20} color={theme.text.secondary} />
            <KMText color={theme.text.secondary} weight="semibold" style={{ marginLeft: 4 }}>
              {t('onboarding.back')}
            </KMText>
          </TouchableOpacity>
        ) : (
          <View style={s.backSpacer} />
        )}

        <KMButton
          title={step === TOTAL_STEPS ? t('onboarding.finish') : t('onboarding.continue')}
          onPress={handleNext}
          loading={loading}
          style={s.nextBtn}
          size="lg"
        />
      </View>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  root:       { flex: 1 },
  scroll:     { padding: spacing.lg, paddingBottom: 120 },
  intro:      { marginBottom: spacing.xl },
  stepHeaderWrap: { marginBottom: spacing.xl, paddingHorizontal: spacing.sm },
  progressTrack:  { height: 8, borderRadius: radii.full, marginBottom: spacing.lg, overflow: 'hidden' },
  progressFill:   { height: '100%', borderRadius: radii.full },
  stepsRow:       { flexDirection: 'row', justifyContent: 'space-between' },
  stepCol:        { alignItems: 'center', width: (width - spacing.lg * 2) / 4 },
  stepDot: {
    width: 40, height: 40, borderRadius: 20,
    borderWidth: 2,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: spacing.sm,
  },
  stepLabel:  { fontSize: 11, textAlign: 'center' },
  stepCard: {
    borderRadius: radii.xl,
    borderWidth: 1,
    padding: spacing.xl,
    minHeight: 340,
    ...shadows.sm,
  },
  fieldLabel: { marginTop: spacing.md, marginBottom: spacing.sm, textTransform: 'uppercase', letterSpacing: 0.5 },
  subLabel:   { marginBottom: spacing.xl, marginTop: 4 },
  dropdown: {
    borderRadius: radii.md,
    borderWidth: 1,
    marginTop: 4,
    overflow: 'hidden',
  },
  dropdownItem: {
    padding: spacing.md,
    borderBottomWidth: 1,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  cropChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.full,
    borderWidth: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  soilGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  soilCard: {
    width: '47%',
    borderRadius: radii.xl,
    borderWidth: 1,
    padding: spacing.md,
    alignItems: 'center',
  },
  soilIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0,0,0,0.03)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  soilDesc:  { marginTop: spacing.xs, fontSize: 11, lineHeight: 14 },
  sliderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  valuePill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
    borderWidth: 1,
  },
  slider:        { width: '100%', height: 40 },
  sliderLabels: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 10, marginTop: -5 },
  irrigationGrid: { gap: spacing.md, marginTop: spacing.lg },
  irrigationCard: {
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.md,
    alignItems: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    borderTopWidth: 1,
    padding: spacing.lg,
    paddingBottom: spacing.xl, // safe area approx
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backBtn:    { flexDirection: 'row', alignItems: 'center', padding: spacing.sm, marginLeft: -spacing.sm },
  backSpacer: { width: 60 },
  nextBtn:    { width: 160 },
})

export default OnboardingScreen
