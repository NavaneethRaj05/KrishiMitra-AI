import React, { useState } from 'react'
import { StyleSheet, View, ScrollView, TouchableOpacity, Alert } from 'react-native'
import Slider from '@react-native-community/slider'
import { colors, spacing, radii } from '../../components/ui/tokens'
import { KrishiMitraAIText } from '../../components/ui/KrishiMitraAIText'
import { KrishiMitraAIInput } from '../../components/ui/KrishiMitraAIInput'
import { KrishiMitraAIButton } from '../../components/ui/KrishiMitraAIButton'
import { useAuthStore, FarmerContext } from '../../store/useAuthStore'
import { authService } from '../../services/authService'
import { getLanguage, getLanguagesList } from '../../i18n'

const CROPS = ['Paddy', 'Wheat', 'Cotton', 'Sugarcane', 'Maize', 'Vegetables', 'Pulses']
const IRRIGATION_TYPES = ['Rainfed', 'Drip', 'Canal', 'Borewell']
const SOIL_TYPES = [
  { code: 'Black Soil', name: 'Black Soil', emoji: '🌑', desc: 'High clay, rich moisture' },
  { code: 'Red Soil', name: 'Red Soil', emoji: '🔴', desc: 'Porous, rich iron content' },
  { code: 'Alluvial Soil', name: 'Alluvial Soil', emoji: '🌾', desc: 'Highly fertile river basin' },
  { code: 'Laterite Soil', name: 'Laterite Soil', emoji: '🧱', desc: 'Leached, clayey texture' }
]

export const FarmerSetupScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const currentLang = getLanguage()
  const authStore = useAuthStore()
  
  const [name, setName] = useState('')
  const [state, setState] = useState('Karnataka')
  const [district, setDistrict] = useState('Mandya')
  const [block, setBlock] = useState('')
  const [selectedCrops, setSelectedCrops] = useState<string[]>([])
  const [landAcres, setLandAcres] = useState(2.0)
  const [soilType, setSoilType] = useState('Black Soil')
  const [irrigationType, setIrrigationType] = useState('Canal')
  const [loading, setLoading] = useState(false)

  const toggleCrop = (crop: string) => {
    if (selectedCrops.includes(crop)) {
      setSelectedCrops(selectedCrops.filter(c => c !== crop))
    } else {
      setSelectedCrops([...selectedCrops, crop])
    }
  }

  const handleSaveSetup = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter your name.')
      return
    }
    if (selectedCrops.length === 0) {
      Alert.alert('Error', 'Please select at least one primary crop.')
      return
    }

    setLoading(true)
    const profile: FarmerContext = {
      farmerId: authStore.farmer?.farmerId || 'farmer_' + Math.random().toString(36).substring(7),
      name,
      phone: authStore.farmer?.phone || '',
      state,
      district,
      block: block || 'Maddi Village',
      registeredCrops: selectedCrops,
      landAcres: parseFloat(landAcres.toFixed(1)),
      soilType,
      irrigationType,
      preferredLanguage: currentLang,
      cropPhase: 'vegetative' // default starting phase
    }

    const success = await authService.saveSetup(profile)
    setLoading(false)
    if (success) {
      navigation.replace('MainTabs')
    } else {
      Alert.alert('Error', 'Failed to save profile. Proceeding offline.')
      authStore.setFarmer(profile)
      navigation.replace('MainTabs')
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <KrishiMitraAIText size="xl" weight="bold" color={colors.green.bright} style={styles.title}>
        Set Up Your Farm Profile
      </KrishiMitraAIText>
      <KrishiMitraAIText size="sm" color={colors.text.secondary} style={styles.subTitle}>
        This context helps KrishiMitra AI generate personalized crop, soil, and market recommendations.
      </KrishiMitraAIText>

      {/* Basic details */}
      <View style={styles.section}>
        <KrishiMitraAIInput
          placeholder="Farmer Name"
          value={name}
          onChangeText={setName}
          label="Your Name"
        />
        
        <KrishiMitraAIInput
          placeholder="e.g. Karnataka"
          value={state}
          onChangeText={setState}
          label="State"
        />

        <KrishiMitraAIInput
          placeholder="e.g. Mandya"
          value={district}
          onChangeText={setDistrict}
          label="District"
        />

        <KrishiMitraAIInput
          placeholder="e.g. Maddur block"
          value={block}
          onChangeText={setBlock}
          label="Block / Village"
        />
      </View>

      {/* Crops select */}
      <View style={styles.section}>
        <KrishiMitraAIText size="base" weight="semibold" style={styles.sectionLabel}>
          Primary Crops
        </KrishiMitraAIText>
        <View style={styles.chipContainer}>
          {CROPS.map((crop) => {
            const isSelected = selectedCrops.includes(crop)
            return (
              <TouchableOpacity
                key={crop}
                onPress={() => toggleCrop(crop)}
                style={[styles.chip, isSelected && styles.chipSelected]}
              >
                <KrishiMitraAIText size="sm" color={isSelected ? colors.text.inverse : colors.text.secondary}>
                  {crop}
                </KrishiMitraAIText>
              </TouchableOpacity>
            )
          })}
        </View>
      </View>

      {/* Land slider */}
      <View style={styles.section}>
        <View style={styles.row}>
          <KrishiMitraAIText size="base" weight="semibold">Farm Size</KrishiMitraAIText>
          <KrishiMitraAIText size="base" weight="bold" color={colors.green.bright}>
            {landAcres.toFixed(1)} Acres
          </KrishiMitraAIText>
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
      </View>

      {/* Soil Cards */}
      <View style={styles.section}>
        <KrishiMitraAIText size="base" weight="semibold" style={styles.sectionLabel}>
          Soil Type
        </KrishiMitraAIText>
        <View style={styles.soilGrid}>
          {SOIL_TYPES.map((soil) => {
            const isSelected = soilType === soil.code
            return (
              <TouchableOpacity
                key={soil.code}
                onPress={() => setSoilType(soil.code)}
                style={[styles.soilCard, isSelected && styles.soilCardSelected]}
              >
                <KrishiMitraAIText size="xl" style={styles.soilEmoji}>{soil.emoji}</KrishiMitraAIText>
                <KrishiMitraAIText size="sm" weight="semibold" color={isSelected ? colors.green.bright : colors.text.primary}>
                  {soil.name}
                </KrishiMitraAIText>
                <KrishiMitraAIText size="xs" color={colors.text.tertiary} align="center" style={styles.soilDesc}>
                  {soil.desc}
                </KrishiMitraAIText>
              </TouchableOpacity>
            )
          })}
        </View>
      </View>

      {/* Irrigation Picker */}
      <View style={styles.section}>
        <KrishiMitraAIText size="base" weight="semibold" style={styles.sectionLabel}>
          Irrigation Source
        </KrishiMitraAIText>
        <View style={styles.irrigationContainer}>
          {IRRIGATION_TYPES.map((type) => {
            const isSelected = irrigationType === type
            return (
              <TouchableOpacity
                key={type}
                onPress={() => setIrrigationType(type)}
                style={[styles.irrigationButton, isSelected && styles.irrigationButtonSelected]}
              >
                <KrishiMitraAIText size="sm" color={isSelected ? colors.text.inverse : colors.text.secondary}>
                  {type}
                </KrishiMitraAIText>
              </TouchableOpacity>
            )
          })}
        </View>
      </View>

      <KrishiMitraAIButton
        title="Save Setup"
        onPress={handleSaveSetup}
        loading={loading}
        style={styles.submitBtn}
      />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.bg.base,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  title: {
    marginBottom: spacing.xs,
  },
  subTitle: {
    marginBottom: spacing.xl,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionLabel: {
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  slider: {
    height: 40,
    width: '100%',
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  chip: {
    backgroundColor: colors.bg.card,
    borderColor: colors.border.default,
    borderRadius: radii.full,
    borderWidth: 1,
    marginBottom: spacing.sm,
    marginRight: spacing.sm,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
  },
  chipSelected: {
    backgroundColor: colors.green.bright,
    borderColor: colors.green.bright,
  },
  soilGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  soilCard: {
    alignItems: 'center',
    backgroundColor: colors.bg.card,
    borderColor: colors.border.default,
    borderRadius: radii.md,
    borderWidth: 1,
    marginBottom: spacing.md,
    padding: spacing.md,
    width: '47%',
  },
  soilCardSelected: {
    borderColor: colors.green.bright,
    backgroundColor: colors.green.dim,
  },
  soilEmoji: {
    marginBottom: spacing.xs,
  },
  soilDesc: {
    marginTop: spacing.xs,
  },
  irrigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  irrigationButton: {
    alignItems: 'center',
    backgroundColor: colors.bg.card,
    borderColor: colors.border.default,
    borderRadius: radii.md,
    borderWidth: 1,
    paddingVertical: spacing.sm,
    width: '23%',
  },
  irrigationButtonSelected: {
    backgroundColor: colors.green.bright,
    borderColor: colors.green.bright,
  },
  submitBtn: {
    marginTop: spacing.lg,
    width: '100%',
  },
})
export default FarmerSetupScreen;
