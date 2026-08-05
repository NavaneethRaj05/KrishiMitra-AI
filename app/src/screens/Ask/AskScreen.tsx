/**
 * AskScreen — the dedicated Ask tab.
 * Shows a clean input area with multimodal options
 * and suggested starting prompts.
 */

import React, { useState } from 'react'
import {
  StyleSheet,
  View,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native'
import { Mic, Camera, Leaf, Droplet, TrendingUp, BookOpen, ArrowRight } from 'lucide-react-native'
import { useTheme } from '../../hooks/useTheme'
import { useSearchStore } from '../../store/useSearchStore'
import { useAuthStore } from '../../store/useAuthStore'
import { spacing, radii, shadows } from '../../theme/tokens'
import { KMText } from '../../components/ui/Text'
import { KMCard } from '../../components/ui/Card'
import { KMStatusBar } from '../../components/ui/StatusBar'
import { AskBar } from '../../components/search/AskBar'
import { VoiceModal } from '../../components/search/VoiceModal'
import { PhotoCapture } from '../../components/photo/PhotoCapture'
import { t } from '../../i18n'
import * as FileSystem from 'expo-file-system'

interface Props {
  navigation: any
}

const PROMPT_CATEGORIES = [
  {
    category: 'Disease & Pest',
    icon: Leaf,
    color: '#1D9E75',
    prompts: [
      'My paddy leaves are turning yellow — what disease is this?',
      'How to treat tomato leaf curl virus organically?',
      'Identify this pest on my cotton leaves',
    ],
  },
  {
    category: 'Water & Soil',
    icon: Droplet,
    color: '#0284C7',
    prompts: [
      'How often should I irrigate wheat in winter?',
      'What is the ideal pH for sugarcane soil?',
      'How to improve soil health after harvesting paddy?',
    ],
  },
  {
    category: 'Market & Prices',
    icon: TrendingUp,
    color: '#D4860A',
    prompts: [
      'What is the MSP for paddy this season?',
      'Current tomato price in Mandya mandi',
      'When is the best time to sell groundnut?',
    ],
  },
  {
    category: 'Schemes & Subsidies',
    icon: BookOpen,
    color: '#4F46A8',
    prompts: [
      'Am I eligible for PM-KISAN scheme?',
      'What subsidies are available for drip irrigation?',
      'How to apply for crop insurance (PMFBY)?',
    ],
  },
] as const

export default function AskScreen({ navigation }: Props) {
  const { theme } = useTheme()
  const farmer = useAuthStore((s) => s.farmer)
  const resetSearch = useSearchStore((s) => s.resetSearch)
  const setThreadId = useSearchStore((s) => s.setThreadId)
  const setInputMode = useSearchStore((s) => s.setInputMode)

  const [showMic, setShowMic] = useState(false)
  const [showCamera, setShowCamera] = useState(false)
  const [attachedImageUri, setAttachedImageUri] = useState<string | null>(null)
  const [attachedImageB64, setAttachedImageB64] = useState<string | null>(null)

  const submitQuery = (
    query: string,
    imgUri?: string | null,
    imgB64?: string | null,
    language?: string,
  ) => {
    resetSearch()
    setThreadId(null)
    setInputMode(imgUri && query ? 'multimodal' : imgUri ? 'image' : 'text')
    navigation.navigate('AskResult', {
      query: query || (imgUri ? 'Diagnose this crop leaf' : ''),
      imageUri: imgUri,
      imageB64: imgB64,
      detectedLanguage: language,
    })
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.bg.base }]}>
      <KMStatusBar />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border.subtle }]}>
        <KMText size="2xl" weight="bold">Ask KrishiMitra</KMText>
        <KMText size="base" color={theme.text.secondary} style={{ marginTop: 4 }}>
          Voice · Image · Text
        </KMText>
      </View>

      {/* Sticky ask bar */}
      <View style={[styles.askBarWrap, {
        backgroundColor: theme.bg.base,
        borderBottomColor: theme.border.subtle,
      }]}>
        <AskBar
          onSubmit={(q) => {
            submitQuery(q, attachedImageUri, attachedImageB64)
            setAttachedImageUri(null); setAttachedImageB64(null)
          }}
          onMicPress={() => setShowMic(true)}
          onCameraPress={() => setShowCamera(true)}
          onImageSelected={(uri, b64) => { setAttachedImageUri(uri); setAttachedImageB64(b64) }}
          attachedImageUri={attachedImageUri}
          onRemoveImage={() => { setAttachedImageUri(null); setAttachedImageB64(null) }}
          placeholder={t('home.search_placeholder')}
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Prompt categories */}
        {PROMPT_CATEGORIES.map(({ category, icon: Icon, color, prompts }) => (
          <View key={category} style={styles.categorySection}>
            <View style={styles.categoryHeader}>
              <View style={[styles.categoryIcon, { backgroundColor: color + '18' }]}>
                <Icon size={16} color={color} />
              </View>
              <KMText size="sm" weight="bold" color={theme.text.secondary} style={{ letterSpacing: 0.5, textTransform: 'uppercase' }}>
                {category}
              </KMText>
            </View>
            {prompts.map((prompt, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => submitQuery(prompt)}
                style={[styles.promptCard, {
                  backgroundColor: theme.bg.surface,
                  borderColor: theme.border.default,
                  ...shadows.sm,
                }]}
                activeOpacity={0.75}
              >
                <KMText size="base" weight="medium" style={{ flex: 1, lineHeight: 22 }}>{prompt}</KMText>
                <View style={[styles.promptArrow, { backgroundColor: color + '14' }]}>
                  <ArrowRight size={16} color={color} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ))}

        <View style={{ height: spacing.xxl }} />
      </ScrollView>

      <VoiceModal
        visible={showMic}
        onClose={() => setShowMic(false)}
        onTranscriptComplete={(transcript, language) => {
          setShowMic(false)
          submitQuery(transcript, null, null, language)
        }}
      />

      {showCamera && (
        <PhotoCapture
          onClose={() => setShowCamera(false)}
          navigation={navigation}
          onPhotoSelected={async (uri) => {
            setAttachedImageUri(uri)
            try {
              const b64 = await FileSystem.readAsStringAsync(uri, {
                encoding: FileSystem.EncodingType.Base64,
              })
              setAttachedImageB64(b64)
            } catch {}
            setShowCamera(false)
          }}
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
  },
  askBarWrap: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  categorySection: {
    marginBottom: spacing.xxl,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  categoryIcon: {
    width: 32,
    height: 32,
    borderRadius: radii.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  promptCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.xl,
    borderWidth: 1,
    padding: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  promptArrow: {
    width: 32,
    height: 32,
    borderRadius: radii.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
})
