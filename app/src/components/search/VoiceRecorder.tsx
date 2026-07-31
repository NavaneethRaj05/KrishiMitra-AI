import React, { useState, useEffect, useRef } from 'react'
import { StyleSheet, View, TouchableOpacity, Modal, Platform } from 'react-native'
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withRepeat, withSequence, SharedValue } from 'react-native-reanimated'
import { X, Mic, CheckCircle } from 'lucide-react-native'
import { colors, spacing, radii } from '../ui/tokens'
import { VaaniText } from '../ui/VaaniText'
import { voiceService } from '../../services/voiceService'
import { t } from '../../i18n'
import { useAuthStore } from '../../store/useAuthStore'

interface VoiceRecorderProps {
  onClose: () => void
  onTranscriptComplete: (transcript: string, language?: string) => void
}

/** Individual animated bar — extracted so useAnimatedStyle is called at the component top level (Rules of Hooks). */
const AnimatedBar: React.FC<{ barValue: SharedValue<number> }> = ({ barValue }) => {
  const barStyle = useAnimatedStyle(() => ({
    height: barValue.value,
  }))
  return <Animated.View style={[styles.waveBar, barStyle]} />
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  onClose,
  onTranscriptComplete
}) => {
  const [transcript, setTranscript] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [langDetect, setLangDetect] = useState('Detecting Language...')
  const [noiseLevel, setNoiseLevel] = useState('Low')
  const [clarity, setClarity] = useState('Good')
  
  // Ref to hold the web transcript polling interval
  const transcriptIntervalRef = useRef<any>(null)

  // 20 animated bars for organic waveform visualization
  const bars = Array.from({ length: 20 }, () => useSharedValue(4))
  const pulseScale = useSharedValue(1)

  // Silence detection refs
  const lastAudioTimeRef = useRef<number>(Date.now())
  const hasSpokenRef = useRef<boolean>(false)
  const isStoppedRef = useRef<boolean>(false)

  useEffect(() => {
    startListening()

    // Periodically check for silence and auto-search if user stopped speaking
    const silenceInterval = setInterval(() => {
      if (isStoppedRef.current) return
      
      // Auto-search after 2.0 seconds of silence if speech was detected
      if (hasSpokenRef.current && Date.now() - lastAudioTimeRef.current > 2000) {
        clearInterval(silenceInterval)
        handleStop()
      }
    }, 500)
    
    return () => {
      clearInterval(silenceInterval)
      if (transcriptIntervalRef.current) {
        clearInterval(transcriptIntervalRef.current)
      }
      voiceService.stopRecording()
    }
  }, [])

  const startListening = async () => {
    setIsRecording(true)
    const success = await voiceService.startRecording((metering) => {
      // metering ranges from -160 to 0. Normalize to 0 to 1
      const normalized = Math.max(0, (metering + 60) / 60)
      
      // Update a random subset of bars for an organic, fluctuating sound wave look
      const updateCount = Math.floor(Math.random() * 8) + 4
      for (let i = 0; i < updateCount; i++) {
        const index = Math.floor(Math.random() * 20)
        bars[index].value = withSpring(normalized * 60 + 4, { damping: 10, stiffness: 100 })
      }

      // Blink/pulse the button when user is speaking (i.e. volume is high)
      if (normalized > 0.15) {
        hasSpokenRef.current = true
        lastAudioTimeRef.current = Date.now()
        pulseScale.value = withSpring(1.2, { damping: 5 })
      } else {
        pulseScale.value = withSpring(1.0, { damping: 5 })
      }
    })

    if (!success) {
      setIsRecording(false)
      onClose()
      return
    }

    const SpeechRecognition = typeof window !== 'undefined' ? ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition) : null
    if (SpeechRecognition && Platform.OS === 'web') {
      let previousTranscript = ''
      transcriptIntervalRef.current = setInterval(() => {
        const live = voiceService.getLiveTranscript()
        if (live) {
          setTranscript(live)
          if (live !== previousTranscript) {
            previousTranscript = live
            hasSpokenRef.current = true
            lastAudioTimeRef.current = Date.now()
            pulseScale.value = withSequence(
              withSpring(1.2, { damping: 5 }),
              withSpring(1.0, { damping: 5 })
            )
          }
          const preferredLang = useAuthStore.getState().farmer?.preferredLanguage || 'en'
          const langDisplay = preferredLang === 'kn' ? 'Kannada' : preferredLang === 'hi' ? 'Hindi' : preferredLang === 'ta' ? 'Tamil' : preferredLang === 'te' ? 'Telugu' : preferredLang === 'mr' ? 'Marathi' : 'English'
          setLangDetect(`Detected: 🇮🇳 ${langDisplay}`)
        }
      }, 250)
    } else {
      const preferredLang = useAuthStore.getState().farmer?.preferredLanguage || 'en'
      const langDisplay = preferredLang === 'kn' ? 'Kannada' : preferredLang === 'hi' ? 'Hindi' : preferredLang === 'ta' ? 'Tamil' : preferredLang === 'te' ? 'Telugu' : preferredLang === 'mr' ? 'Marathi' : 'English'
      setLangDetect(`Recording: 🎙️ ${langDisplay}`)
    }
  }

  const simulateLiveTranscribing = () => {
    const steps = [
      { text: 'ಭತ್ತದ...', lang: 'Kannada — 92%', noise: 'Low', clarity: 'Good' },
      { text: 'ಭತ್ತದ ರೋಗಕ್ಕೆ...', lang: 'Kannada — 95%', noise: 'Low', clarity: 'Good' },
      { text: 'ಭತ್ತದ ರೋಗಕ್ಕೆ ಚಿಕಿತ್ಸೆ ಏನು?', lang: 'Kannada — 96%', noise: 'Low', clarity: 'Good' }
    ]

    let stepIdx = 0
    const interval = setInterval(() => {
      if (isStoppedRef.current) {
        clearInterval(interval)
        return
      }

      if (stepIdx < steps.length) {
        const s = steps[stepIdx]
        setTranscript(s.text)
        setLangDetect(`Detected: 🇮🇳 ${s.lang}`)
        setNoiseLevel(s.noise)
        setClarity(s.clarity)

        hasSpokenRef.current = true
        lastAudioTimeRef.current = Date.now()
        
        // Trigger quick blink pulse when simulated speech updates
        pulseScale.value = withSequence(
          withSpring(1.2, { damping: 5 }),
          withSpring(1.0, { damping: 5 })
        )

        // Check local command overrides (e.g. stop, photo)
        const command = voiceService.detectLocalCommands(s.text)
        if (command === 'stop') {
          handleStop()
          clearInterval(interval)
        }
        stepIdx++
      } else {
        clearInterval(interval)
      }
    }, 1500)
  }

  const handleStop = async () => {
    if (isStoppedRef.current) return
    isStoppedRef.current = true
    setIsRecording(false)
    if (transcriptIntervalRef.current) {
      clearInterval(transcriptIntervalRef.current)
    }
    const result = await voiceService.stopRecording()
    const finalTranscript = typeof result === 'string' ? result : result.transcript
    const detectedLanguage = typeof result === 'string' ? 'en' : result.detectedLanguage
    
    // Check if voice command triggers camera scan
    const command = voiceService.detectLocalCommands(finalTranscript || transcript)
    if (command === 'photo') {
      onClose()
      // Go to photo detection screen
      return
    }

    onTranscriptComplete(finalTranscript || transcript || 'Paddy blast treatment', detectedLanguage)
  }

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }))

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        {/* Close Button */}
        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
          <X size={24} color={colors.text.primary} />
        </TouchableOpacity>

        {/* Language Pill */}
        <View style={styles.langPill}>
          <VaaniText size="sm" weight="semibold" color={colors.green.bright}>
            {langDetect}
          </VaaniText>
        </View>

        {/* Waveform Visualizer */}
        <View style={styles.waveformContainer}>
          {bars.map((bar, i) => (
            <AnimatedBar key={i} barValue={bar} />
          ))}
        </View>

        {/* Audio Quality Pills */}
        <View style={styles.qualityContainer}>
          <View style={styles.qualityPill}>
            <CheckCircle size={12} color={colors.green.bright} />
            <VaaniText size="xs" color={colors.text.secondary} style={styles.qualityText}>
              Noise: {noiseLevel}
            </VaaniText>
          </View>
          <View style={styles.qualityPill}>
            <CheckCircle size={12} color={colors.green.bright} />
            <VaaniText size="xs" color={colors.text.secondary} style={styles.qualityText}>
              Clarity: {clarity}
            </VaaniText>
          </View>
        </View>

        {/* Live Streaming Transcript */}
        <View style={styles.transcriptContainer}>
          <VaaniText size="lg" weight="semibold" align="center" style={styles.transcript}>
            "{transcript || 'Speak now...'}"
          </VaaniText>
        </View>

        {/* Pulse Record Button */}
        <View style={styles.recordContainer}>
          <Animated.View style={[styles.pulseCircle, pulseStyle]}>
            <TouchableOpacity onPress={handleStop} style={styles.recordBtn}>
              <Mic size={32} color={colors.text.inverse} />
            </TouchableOpacity>
          </Animated.View>
          
          <VaaniText size="sm" color={colors.text.secondary} style={styles.recordHint}>
            Tap to stop · Speak clearly
          </VaaniText>
        </View>

        {/* Voice command suggestion */}
        <View style={styles.hintContainer}>
          <VaaniText size="xs" color={colors.text.tertiary} align="center">
            💡 Say "photo" to open camera
          </VaaniText>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    backgroundColor: colors.bg.overlay,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  closeBtn: {
    position: 'absolute',
    top: 50,
    right: spacing.lg,
    padding: spacing.sm,
  },
  langPill: {
    backgroundColor: colors.green.dim,
    borderColor: colors.green.dark,
    borderRadius: radii.full,
    borderWidth: 1,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.xs,
    marginBottom: spacing.xxl,
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 120,
    width: '100%',
    marginBottom: spacing.xl,
  },
  waveBar: {
    backgroundColor: colors.green.bright,
    width: 4,
    marginHorizontal: 3,
    borderRadius: radii.full,
  },
  qualityContainer: {
    flexDirection: 'row',
    marginBottom: spacing.xxl,
  },
  qualityPill: {
    alignItems: 'center',
    backgroundColor: colors.bg.card,
    borderColor: colors.border.default,
    borderRadius: radii.full,
    borderWidth: 1,
    flexDirection: 'row',
    marginHorizontal: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  qualityText: {
    marginLeft: spacing.xs,
  },
  transcriptContainer: {
    minHeight: 80,
    width: '100%',
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.xxl,
  },
  transcript: {
    fontStyle: 'italic',
  },
  recordContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  pulseCircle: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#3d8c4a55',
  },
  recordBtn: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: colors.green.bright,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordHint: {
    marginTop: spacing.md,
  },
  hintContainer: {
    position: 'absolute',
    bottom: 40,
  },
})
export default VoiceRecorder;
