/**
 * VoiceModal — full-screen voice assistant overlay.
 *
 * Design:
 *  - Frosted-glass-style dark overlay
 *  - Large centered mic button (minimum 80px tap target)
 *  - Organic waveform (20 bars) that responds to volume
 *  - Live transcript with language detection pill
 *  - Subtle pulse ring animation (not aggressive)
 *  - Auto-detect silence and submit after 2s pause
 */

import React, { useState, useEffect, useRef } from 'react'
import {
  Modal,
  View,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated'
import { X, Mic } from 'lucide-react-native'
import { useTheme } from '../../hooks/useTheme'
import { spacing, radii } from '../../theme/tokens'
import { KMText } from '../ui/Text'
import { voiceService } from '../../services/voiceService'
import { useAuthStore } from '../../store/useAuthStore'

interface VoiceModalProps {
  visible: boolean
  onClose: () => void
  onTranscriptComplete: (transcript: string, language?: string) => void
}

// Each waveform bar is its own component so hooks run at the top level
const WaveBar: React.FC<{ height: Animated.SharedValue<number>; color: string }> = ({ height, color }) => {
  const style = useAnimatedStyle(() => ({ height: height.value }))
  return <Animated.View style={[waveStyles.bar, { backgroundColor: color }, style]} />
}

const LANG_NAMES: Record<string, string> = {
  kn: 'Kannada', hi: 'Hindi', ta: 'Tamil', te: 'Telugu', mr: 'Marathi', en: 'English',
}

export const VoiceModal: React.FC<VoiceModalProps> = ({
  visible,
  onClose,
  onTranscriptComplete,
}) => {
  const { theme, isDark } = useTheme()
  const [transcript, setTranscript] = useState('')
  const [langDisplay, setLangDisplay] = useState('Listening…')
  const [isRecording, setIsRecording] = useState(false)

  const stoppedRef = useRef(false)
  const lastSoundRef = useRef(Date.now())
  const hasSpokenRef = useRef(false)
  const intervalRef = useRef<any>(null)

  // Waveform bars
  const barHeights = Array.from({ length: 24 }, () => useSharedValue(6))
  const pulseScale = useSharedValue(1)
  const pulseOpacity = useSharedValue(0.4)

  // Idle pulse animation
  useEffect(() => {
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1.0,  { duration: 1000, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
    )
    pulseOpacity.value = withRepeat(
      withSequence(
        withTiming(0.25, { duration: 1000 }),
        withTiming(0.10, { duration: 1000 }),
      ),
      -1,
    )
  }, [])

  useEffect(() => {
    if (visible) {
      stoppedRef.current = false
      hasSpokenRef.current = false
      setTranscript('')

      const lang = useAuthStore.getState().farmer?.preferredLanguage || 'en'
      setLangDisplay(`🎙 ${LANG_NAMES[lang] || 'English'}`)

      startRecording()
    } else {
      stopRecording()
    }
    return () => {
      clearInterval(intervalRef.current)
      voiceService.stopRecording()
    }
  }, [visible])

  const startRecording = async () => {
    setIsRecording(true)
    const ok = await voiceService.startRecording((metering: number) => {
      const norm = Math.max(0, (metering + 60) / 60)
      // animate random bars
      for (let i = 0; i < 12; i++) {
        const idx = Math.floor(Math.random() * 24)
        barHeights[idx].value = withSpring(norm * 64 + 6, { damping: 8, stiffness: 90 })
      }
      if (norm > 0.15) {
        hasSpokenRef.current = true
        lastSoundRef.current = Date.now()
        pulseScale.value = withSpring(1.2, { damping: 5 })
      } else {
        pulseScale.value = withSpring(1.0, { damping: 8 })
      }
    })

    if (!ok) {
      onClose()
      return
    }

    // Web: poll live transcript
    if (Platform.OS === 'web') {
      intervalRef.current = setInterval(() => {
        if (stoppedRef.current) return
        const live = voiceService.getLiveTranscript()
        if (live) {
          setTranscript(live)
          hasSpokenRef.current = true
          lastSoundRef.current = Date.now()
        }
      }, 300)
    }

    // Silence detection
    const silenceTimer = setInterval(() => {
      if (stoppedRef.current) { clearInterval(silenceTimer); return }
      if (hasSpokenRef.current && Date.now() - lastSoundRef.current > 2200) {
        clearInterval(silenceTimer)
        handleStop()
      }
    }, 500)
  }

  const stopRecording = () => {
    stoppedRef.current = true
    setIsRecording(false)
    clearInterval(intervalRef.current)
    voiceService.stopRecording()
  }

  const handleStop = async () => {
    if (stoppedRef.current) return
    stoppedRef.current = true
    setIsRecording(false)
    clearInterval(intervalRef.current)

    const result = await voiceService.stopRecording()
    const finalTranscript = typeof result === 'string' ? result : result?.transcript
    const detectedLanguage = typeof result === 'string' ? 'en' : result?.detectedLanguage

    onTranscriptComplete(
      finalTranscript || transcript || '',
      detectedLanguage,
    )
  }

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }))

  const micBtnStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(isRecording ? 1.0 : 0.92) }],
  }))

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={[styles.overlay, { backgroundColor: isDark ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.85)' }]}>
        {/* Close */}
        <TouchableOpacity
          onPress={onClose}
          style={[styles.closeBtn, { backgroundColor: theme.bg.surface }]}
          accessibilityLabel="Close voice recorder"
        >
          <X size={24} color={theme.text.secondary} />
        </TouchableOpacity>

        {/* Language / status pill */}
        <View style={[styles.langPill, {
          backgroundColor: theme.accent.primaryDim,
          borderColor: theme.accent.primary + '40',
        }]}>
          <KMText size="sm" weight="bold" color={theme.accent.primaryHover}>
            {langDisplay}
          </KMText>
        </View>

        {/* Waveform */}
        <View style={styles.waveform}>
          {barHeights.map((h, i) => (
            <WaveBar key={i} height={h} color={theme.accent.primary} />
          ))}
        </View>

        {/* Live transcript */}
        <View style={styles.transcriptWrap}>
          <KMText
            size="2xl"
            weight="medium"
            align="center"
            style={{ lineHeight: 34 }}
            color={theme.text.primary}
          >
            {transcript || 'Speak now…'}
          </KMText>
        </View>

        {/* Mic button with pulse ring */}
        <View style={styles.micContainer}>
          {/* Outer pulse ring */}
          <Animated.View
            style={[
              styles.pulseRing,
              { backgroundColor: theme.accent.primary },
              pulseStyle,
            ]}
          />
          {/* Mic button */}
          <Animated.View style={micBtnStyle}>
            <TouchableOpacity
              onPress={handleStop}
              style={[styles.micBtn, { backgroundColor: theme.accent.primary }]}
              activeOpacity={0.85}
              accessibilityLabel="Tap to stop recording"
            >
              <Mic size={36} color={theme.text.inverse} />
            </TouchableOpacity>
          </Animated.View>
        </View>

        <KMText size="base" weight="medium" color={theme.text.secondary} align="center" style={styles.hint}>
          Tap to stop  ·  Speak clearly
        </KMText>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  closeBtn: {
    position: 'absolute',
    top: 60,
    right: 24,
    width: 48,
    height: 48,
    borderRadius: radii.full,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(150,150,150,0.2)',
  },
  langPill: {
    borderRadius: radii.full,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    marginBottom: spacing.xxl,
  },
  waveform: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 100,
    marginBottom: spacing.xxl,
    gap: 4,
  },
  transcriptWrap: {
    minHeight: 100,
    width: '100%',
    justifyContent: 'center',
    marginBottom: spacing.xxl,
    paddingHorizontal: spacing.base,
  },
  micContainer: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  pulseRing: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  micBtn: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hint: {
    marginBottom: spacing.md,
  },
})

const waveStyles = StyleSheet.create({
  bar: {
    width: 6,
    borderRadius: radii.full,
    minHeight: 6,
  },
})

export default VoiceModal
