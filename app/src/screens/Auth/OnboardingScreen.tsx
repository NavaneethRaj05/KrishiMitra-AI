import React, { useState } from 'react'
import { StyleSheet, View, ScrollView, TouchableOpacity, Alert, Dimensions } from 'react-native'
import Slider from '@react-native-community/slider'
import { Sprout, MapPin, Droplet, Layers, ChevronLeft, ChevronRight, Check } from 'lucide-react-native'
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated'
import { colors, spacing, radii, typography } from '../../components/ui/tokens'
import { VaaniText } from '../../components/ui/VaaniText'
import { VaaniInput } from '../../components/ui/VaaniInput'
import { VaaniButton } from '../../components/ui/VaaniButton'
import { useAuthStore, FarmerContext } from '../../store/useAuthStore'
import { authService } from '../../services/authService'
import { getLanguage, t } from '../../i18n'

const { width } = Dimensions.get('window')

const DISTRICTS = [
  'Mandya', 'Dharwad', 'Hassan', 'Belagavi', 'Shimoga', 'Mysore',
  'Tumkur', 'Davanagere', 'Kalaburagi', 'Bellary', 'Bagalkot',
  'Koppal', 'Chikkamagaluru', 'Udupi', 'Dakshina Kannada',
  'Vijayapura', 'Gadag', 'Haveri', 'Chamarajanagar', 'Ramanagara',
  'Chikkaballapur', 'Kolar', 'Bangalore Rural', 'Bangalore Urban',
  'Yadgir', 'Raichur', 'Bidar', 'Chitradurga', 'Uttara Kannada', 'Kodagu'
].sort()

const CROPS = ['Paddy', 'Wheat', 'Cotton', 'Sugarcane', 'Maize', 'Tomato', 'Potato', 'Groundnut', 'Coffee', 'Vegetables', 'Pulses']

const SOIL_TYPES = [
  { code: 'Black Soil', name: 'Black Soil', emoji: '🌑', desc: 'High clay, rich moisture retention' },
  { code: 'Red Soil', name: 'Red Soil', emoji: '🔴', desc: 'Porous, rich iron content, loamy' },
  { code: 'Alluvial Soil', name: 'Alluvial Soil', emoji: '🌾', desc: 'Highly fertile river basin soil' },
  { code: 'Sandy Soil', name: 'Sandy Soil', emoji: '🏜️', desc: 'Gritty, low moisture, high drainage' },
  { code: 'Clay Soil', name: 'Clay Soil', emoji: '🏺', desc: 'Heavy, dense, holds water strongly' },
  { code: 'Loam Soil', name: 'Loam Soil', emoji: '🌱', desc: 'Perfect mix of sand, silt, and clay' },
]

const IRRIGATION_TYPES = ['Rainfed', 'Drip', 'Canal', 'Borewell']

export const OnboardingScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const currentLang = getLanguage()
  const authStore = useAuthStore()

  // Onboarding Wizard State
  const [step, setStep] = useState(1)
  
  // Fields state
  const [name, setName] = useState(authStore.farmer?.name || '')
  const [state, setState] = useState(authStore.farmer?.state || 'Karnataka')
  const [district, setDistrict] = useState(authStore.farmer?.district || 'Mandya')
  const [block, setBlock] = useState(authStore.farmer?.block || '')
  const [selectedCrops, setSelectedCrops] = useState<string[]>(authStore.farmer?.registeredCrops || [])
  const [soilType, setSoilType] = useState(authStore.farmer?.soilType || 'Black Soil')
  const [landAcres, setLandAcres] = useState(authStore.farmer?.landAcres || 2.0)
  const [irrigationType, setIrrigationType] = useState(authStore.farmer?.irrigationType || 'Rainfed')
  const [loading, setLoading] = useState(false)
  const [districtSearch, setDistrictSearch] = useState('')

  // Animated progress bar width
  const progressPercent = (step / 4) * 100

  const handleNext = () => {
    if (step === 1) {
      if (!name.trim()) {
        Alert.alert('Error', 'Please enter your name.')
        return
      }
      if (!district) {
        Alert.alert('Error', 'Please select your district.')
        return
      }
    } else if (step === 2) {
      if (selectedCrops.length === 0) {
        Alert.alert('Error', 'Please select at least one crop.')
        return
      }
    }
    
    if (step < 4) {
      setStep(step + 1)
    } else {
      handleComplete()
    }
  }

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1)
    } else if (authStore.isOnboarded) {
      navigation.goBack()
    }
  }

  const toggleCrop = (crop: string) => {
    if (selectedCrops.includes(crop)) {
      setSelectedCrops(selectedCrops.filter(c => c !== crop))
    } else {
      setSelectedCrops([...selectedCrops, crop])
    }
  }

  const handleComplete = async () => {
    setLoading(true)
    const profileData: FarmerContext = {
      farmerId: authStore.farmer?.farmerId || 'farmer_' + Math.random().toString(36).substring(7),
      name: name.trim(),
      phone: authStore.farmer?.phone || '9876543210',
      state,
      district,
      block: block.trim() || 'Maddi Village',
      registeredCrops: selectedCrops,
      landAcres: parseFloat(landAcres.toFixed(1)),
      soilType,
      irrigationType,
      preferredLanguage: currentLang,
      cropPhase: 'vegetative'
    }

    try {
      await authService.onboard(profileData)
      navigation.reset({
        index: 0,
        routes: [{ name: 'Home' }],
      })
    } catch (e) {
      console.warn('Failed to onboard:', e)
      authStore.setFarmer(profileData)
      authStore.setOnboarded(true)
      navigation.reset({
        index: 0,
        routes: [{ name: 'Home' }],
      })
    } finally {
      setLoading(false)
    }
  }

  const filteredDistricts = DISTRICTS.filter(d => 
    d.toLowerCase().includes(districtSearch.toLowerCase())
  )

  const renderStepHeader = () => {
    const stepsInfo = [
      { icon: MapPin, title: t('onboarding.step_location') },
      { icon: Sprout, title: t('onboarding.step_crops') },
      { icon: Layers, title: t('onboarding.step_soil') },
      { icon: Droplet, title: t('onboarding.step_land') },
    ]

    return (
      <View style={styles.stepHeaderContainer}>
        {/* Progress Bar */}
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
        </View>

        <View style={styles.stepInfoRow}>
          {stepsInfo.map((info, idx) => {
            const stepNum = idx + 1
            const isActive = step === stepNum
            const isCompleted = step > stepNum
            const StepIcon = info.icon

            return (
              <View key={stepNum} style={styles.stepIndicatorCol}>
                <View style={[
                  styles.stepBadge,
                  isActive && styles.stepBadgeActive,
                  isCompleted && styles.stepBadgeCompleted
                ]}>
                  {isCompleted ? (
                    <Check size={16} color={colors.text.inverse} strokeWidth={3} />
                  ) : (
                    <StepIcon size={16} color={isActive ? colors.green.bright : colors.text.tertiary} />
                  )}
                </View>
                <VaaniText 
                  size="xs" 
                  weight={isActive ? 'semibold' : 'regular'} 
                  color={isActive ? colors.green.bright : colors.text.secondary}
                  style={styles.stepText}
                >
                  {info.title}
                </VaaniText>
              </View>
            )
          })}
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        
        {/* Welcome Section */}
        <View style={styles.introHeader}>
          <VaaniText size="xl" weight="bold" color={colors.green.bright}>
            {t('onboarding.welcome')}
          </VaaniText>
          <VaaniText size="sm" color={colors.text.secondary}>
            {t('onboarding.welcome_sub')}
          </VaaniText>
        </View>

        {renderStepHeader()}

        {/* Step 1: Location */}
        {step === 1 && (
          <View style={styles.stepContent}>
            <VaaniText size="base" weight="semibold" style={styles.inputLabel}>{t('onboarding.your_name')}</VaaniText>
            <VaaniInput
              placeholder="e.g. Rajesh Gowda"
              value={name}
              onChangeText={setName}
            />

            <VaaniText size="base" weight="semibold" style={styles.inputLabel}>{t('onboarding.state')}</VaaniText>
            <VaaniInput
              value={t('states.' + state)}
              editable={false}
              style={styles.disabledInput}
            />

            <VaaniText size="base" weight="semibold" style={styles.inputLabel}>{t('onboarding.district')}</VaaniText>
            <VaaniInput
              placeholder="Search & select district..."
              value={districtSearch || t('districts.' + district)}
              onChangeText={(text) => {
                setDistrictSearch(text)
                setDistrict(text)
              }}
            />
            {districtSearch.length > 0 && filteredDistricts.length > 0 && (
              <View style={styles.dropdown}>
                {filteredDistricts.slice(0, 5).map((d) => (
                  <TouchableOpacity 
                    key={d} 
                    style={styles.dropdownItem}
                    onPress={() => {
                      setDistrict(d)
                      setDistrictSearch('')
                    }}
                  >
                    <VaaniText size="sm">{t('districts.' + d)}</VaaniText>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <VaaniText size="base" weight="semibold" style={styles.inputLabel}>{t('onboarding.block')}</VaaniText>
            <VaaniInput
              placeholder="e.g. Maddur Block"
              value={block}
              onChangeText={setBlock}
            />
          </View>
        )}

        {/* Step 2: Crops */}
        {step === 2 && (
          <View style={styles.stepContent}>
            <VaaniText size="base" weight="semibold" style={styles.sectionLabel}>
              {t('onboarding.select_crops')}
            </VaaniText>
            <VaaniText size="xs" color={colors.text.secondary} style={styles.sectionDesc}>
              {t('onboarding.select_crops_sub')}
            </VaaniText>

            <View style={styles.chipGrid}>
              {CROPS.map((crop) => {
                const isSelected = selectedCrops.includes(crop)
                return (
                  <TouchableOpacity
                    key={crop}
                    onPress={() => toggleCrop(crop)}
                    style={[styles.cropChip, isSelected && styles.cropChipActive]}
                  >
                    {isSelected && <Check size={14} color={colors.text.inverse} style={styles.checkIcon} />}
                    <VaaniText size="sm" weight="medium" color={isSelected ? colors.text.inverse : colors.text.primary}>
                      {t('crops.' + crop)}
                    </VaaniText>
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>
        )}

        {/* Step 3: Soil Selection */}
        {step === 3 && (
          <View style={styles.stepContent}>
            <VaaniText size="base" weight="semibold" style={styles.sectionLabel}>
              {t('onboarding.select_soil')}
            </VaaniText>
            <VaaniText size="xs" color={colors.text.secondary} style={styles.sectionDesc}>
              {t('onboarding.select_soil_sub')}
            </VaaniText>

            <View style={styles.soilGrid}>
              {SOIL_TYPES.map((soil) => {
                const isSelected = soilType === soil.code
                return (
                  <TouchableOpacity
                    key={soil.code}
                    onPress={() => setSoilType(soil.code)}
                    style={[styles.soilCard, isSelected && styles.soilCardActive]}
                  >
                    <View style={styles.soilIconContainer}>
                      <VaaniText size="xl">{soil.emoji}</VaaniText>
                    </View>
                    <VaaniText size="sm" weight="semibold" color={isSelected ? colors.green.bright : colors.text.primary}>
                      {soil.name}
                    </VaaniText>
                    <VaaniText size="xs" color={colors.text.tertiary} align="center" style={styles.soilDescText}>
                      {soil.desc}
                    </VaaniText>
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>
        )}

        {/* Step 4: Land & Water */}
        {step === 4 && (
          <View style={styles.stepContent}>
            <View style={styles.sliderHeader}>
              <VaaniText size="base" weight="semibold">{t('onboarding.land_acres')}</VaaniText>
              <VaaniText size="base" weight="bold" color={colors.green.bright}>
                {landAcres.toFixed(1)} {t('sidebar.acres', { count: landAcres })}
              </VaaniText>
            </View>
            <Slider
              minimumValue={0.5}
              maximumValue={50}
              step={0.5}
              value={landAcres}
              onValueChange={setLandAcres}
              minimumTrackTintColor={colors.green.bright}
              maximumTrackTintColor={colors.border.strong}
              thumbTintColor={colors.green.bright}
              style={styles.slider}
            />

            <VaaniText size="base" weight="semibold" style={[styles.sectionLabel, { marginTop: spacing.xl }]}>
              {t('onboarding.irrigation')}
            </VaaniText>
            <View style={styles.irrigationContainer}>
              {IRRIGATION_TYPES.map((type) => {
                const isSelected = irrigationType === type
                return (
                  <TouchableOpacity
                    key={type}
                    onPress={() => setIrrigationType(type)}
                    style={[styles.irrigationCard, isSelected && styles.irrigationCardActive]}
                  >
                    <VaaniText 
                      size="sm" 
                      weight="semibold"
                      color={isSelected ? colors.text.inverse : colors.text.primary}
                    >
                      {type}
                    </VaaniText>
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>
        )}

      </ScrollView>

      {/* Persistent Navigation Controls */}
      <View style={styles.footer}>
        {step > 1 || authStore.isOnboarded ? (
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <ChevronLeft size={20} color={colors.text.secondary} />
            <VaaniText color={colors.text.secondary} weight="semibold" style={{ marginLeft: spacing.xs }}>
              {t('onboarding.back')}
            </VaaniText>
          </TouchableOpacity>
        ) : (
          <View style={styles.backSpacer} />
        )}

        <VaaniButton
          title={step === 4 ? t('onboarding.finish') : t('onboarding.continue')}
          onPress={handleNext}
          loading={loading}
          style={styles.nextBtn}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.base,
  },
  scrollContainer: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl + 40,
  },
  introHeader: {
    marginBottom: spacing.lg,
    marginTop: spacing.md,
  },
  stepHeaderContainer: {
    marginBottom: spacing.xl,
  },
  progressBarBg: {
    height: 4,
    backgroundColor: colors.border.strong,
    borderRadius: radii.full,
    marginBottom: spacing.lg,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.green.bright,
  },
  stepInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stepIndicatorCol: {
    alignItems: 'center',
    width: (width - spacing.lg * 2) / 4,
  },
  stepBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.bg.card,
    borderColor: colors.border.default,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  stepBadgeActive: {
    borderColor: colors.green.bright,
    backgroundColor: colors.green.dim,
  },
  stepBadgeCompleted: {
    borderColor: colors.green.bright,
    backgroundColor: colors.green.bright,
  },
  stepText: {
    fontSize: 9,
    textAlign: 'center',
  },
  stepContent: {
    backgroundColor: colors.bg.card,
    borderRadius: radii.lg,
    borderColor: colors.border.default,
    borderWidth: 1,
    padding: spacing.lg,
    minHeight: 320,
  },
  inputLabel: {
    marginBottom: spacing.xs,
    marginTop: spacing.md,
  },
  disabledInput: {
    backgroundColor: colors.bg.input,
    opacity: 0.7,
  },
  dropdown: {
    backgroundColor: colors.bg.card2,
    borderColor: colors.border.strong,
    borderWidth: 1,
    borderRadius: radii.md,
    marginTop: spacing.xs,
  },
  dropdownItem: {
    padding: spacing.md,
    borderBottomColor: colors.border.default,
    borderBottomWidth: 1,
  },
  sectionLabel: {
    marginBottom: spacing.xs,
  },
  sectionDesc: {
    marginBottom: spacing.lg,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  cropChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.input,
    borderColor: colors.border.default,
    borderWidth: 1,
    borderRadius: radii.full,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.base,
  },
  cropChipActive: {
    backgroundColor: colors.green.bright,
    borderColor: colors.green.bright,
  },
  checkIcon: {
    marginRight: spacing.xs,
  },
  soilGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  soilCard: {
    width: '47%',
    backgroundColor: colors.bg.input,
    borderColor: colors.border.default,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  soilCardActive: {
    borderColor: colors.green.bright,
    backgroundColor: colors.green.dim,
  },
  soilIconContainer: {
    marginBottom: spacing.sm,
  },
  soilDescText: {
    marginTop: spacing.xs,
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  irrigationContainer: {
    flexDirection: 'column',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  irrigationCard: {
    backgroundColor: colors.bg.input,
    borderColor: colors.border.default,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  irrigationCardActive: {
    backgroundColor: colors.green.bright,
    borderColor: colors.green.bright,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.bg.base,
    borderTopColor: colors.border.default,
    borderTopWidth: 1,
    padding: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  backSpacer: {
    width: 60,
  },
  nextBtn: {
    width: 150,
  },
})

export default OnboardingScreen
