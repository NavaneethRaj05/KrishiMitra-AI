import React, { useState } from 'react'
import { StyleSheet, View, TouchableOpacity, Modal, FlatList } from 'react-native'
import { ChevronDown, Check, Globe } from 'lucide-react-native'
import { colors, spacing, radii } from './tokens'
import { KrishiMitraAIText } from './KrishiMitraAIText'

const LANGUAGES = [
  { code: 'en', name: 'English', native: 'English', flag: '🇺🇸' },
  { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ', flag: '🇮🇳' },
  { code: 'hi', name: 'Hindi', native: 'हिंदी', flag: '🇮🇳' },
  { code: 'ta', name: 'Tamil', native: 'தமிழ்', flag: '🇮🇳' },
  { code: 'te', name: 'Telugu', native: 'తెలుగు', flag: '🇮🇳' },
]

interface LanguageToggleProps {
  currentLanguage: string
  detectedLanguage?: string
  onLanguageChange: (langCode: string) => void
  compact?: boolean
}

export const LanguageToggle: React.FC<LanguageToggleProps> = ({
  currentLanguage,
  detectedLanguage,
  onLanguageChange,
  compact = false,
}) => {
  const [showPicker, setShowPicker] = useState(false)

  const current = LANGUAGES.find(l => l.code === currentLanguage) || LANGUAGES[0]
  const detected = detectedLanguage ? LANGUAGES.find(l => l.code === detectedLanguage) : null

  return (
    <>
      <TouchableOpacity
        onPress={() => setShowPicker(true)}
        style={[styles.toggleButton, compact && styles.toggleCompact]}
        activeOpacity={0.7}
      >
        <Globe size={12} color={colors.sky.bright} />
        <KrishiMitraAIText size="xs" weight="semibold" color={colors.sky.bright} style={styles.toggleText}>
          {current.flag} {compact ? current.code.toUpperCase() : current.native}
        </KrishiMitraAIText>
        <ChevronDown size={10} color={colors.sky.bright} />
      </TouchableOpacity>

      <Modal visible={showPicker} transparent animationType="fade" onRequestClose={() => setShowPicker(false)}>
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setShowPicker(false)}
        >
          <View style={styles.pickerContainer}>
            <KrishiMitraAIText size="sm" weight="bold" color={colors.text.primary} style={styles.pickerTitle}>
              Answer Language
            </KrishiMitraAIText>

            {detected && detected.code !== currentLanguage && (
              <TouchableOpacity
                style={styles.detectedHint}
                onPress={() => {
                  onLanguageChange(detected.code)
                  setShowPicker(false)
                }}
              >
                <KrishiMitraAIText size="xs" color={colors.amber.bright}>
                  🎤 Detected: {detected.native} — Tap to switch
                </KrishiMitraAIText>
              </TouchableOpacity>
            )}

            <FlatList
              data={LANGUAGES}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => {
                const isSelected = item.code === currentLanguage
                const isDetected = item.code === detectedLanguage
                return (
                  <TouchableOpacity
                    onPress={() => {
                      onLanguageChange(item.code)
                      setShowPicker(false)
                    }}
                    style={[styles.languageItem, isSelected && styles.languageItemSelected]}
                  >
                    <KrishiMitraAIText size="md" style={styles.flag}>{item.flag}</KrishiMitraAIText>
                    <View style={styles.languageInfo}>
                      <KrishiMitraAIText size="sm" weight={isSelected ? 'bold' : 'regular'} color={colors.text.primary}>
                        {item.native}
                      </KrishiMitraAIText>
                      <KrishiMitraAIText size="xs" color={colors.text.tertiary}>
                        {item.name}
                      </KrishiMitraAIText>
                    </View>
                    {isDetected && !isSelected && (
                      <View style={styles.detectedBadge}>
                        <KrishiMitraAIText size="xs" color={colors.amber.bright}>🎤</KrishiMitraAIText>
                      </View>
                    )}
                    {isSelected && (
                      <Check size={16} color={colors.green.bright} />
                    )}
                  </TouchableOpacity>
                )
              }}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.sky.dim,
    borderColor: colors.sky.bright + '33',
    borderWidth: 1,
    borderRadius: radii.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  toggleCompact: {
    paddingHorizontal: spacing.xs,
  },
  toggleText: {
    marginHorizontal: spacing.xs,
  },
  overlay: {
    flex: 1,
    backgroundColor: colors.bg.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  pickerContainer: {
    backgroundColor: colors.bg.card,
    borderColor: colors.border.default,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.base,
    width: '100%',
    maxWidth: 320,
    maxHeight: 400,
  },
  pickerTitle: {
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  detectedHint: {
    backgroundColor: colors.amber.dim,
    borderRadius: radii.sm,
    padding: spacing.sm,
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.md,
    marginBottom: spacing.xs,
  },
  languageItemSelected: {
    backgroundColor: colors.green.dim,
  },
  flag: {
    marginRight: spacing.md,
  },
  languageInfo: {
    flex: 1,
  },
  detectedBadge: {
    marginRight: spacing.sm,
  },
})
export default LanguageToggle
