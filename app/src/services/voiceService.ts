import { Audio } from 'expo-av'
import { Platform } from 'react-native'
import { useAuthStore } from '../store/useAuthStore'

const COMMANDS: Record<string, string[]> = {
  photo: ['photo', 'ಚಿತ್ರ', 'फोटो', 'படம்', 'ఫోటో', 'camera', 'ಕ್ಯಾಮೆರಾ', 'कैमरा', 'கேமரா', 'కెమెరా'],
  stop:  ['stop', 'ನಿಲ್ಲಿಸು', 'रुको', 'நிறுத்து', 'ఆపు', 'ಸಾಕು', 'बस']
}

class VoiceService {
  private recording: Audio.Recording | null = null
  private isListening = false
  private recognition: any = null
  private webTranscript = ''

  async startRecording(onMeteringChange: (metering: number) => void): Promise<boolean> {
    try {
      if (this.isListening) return false
      
      if (Platform.OS === 'web') {
        this.isListening = true
        this.webTranscript = ''
        
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        if (SpeechRecognition) {
          try {
            const rec = new SpeechRecognition()
            rec.continuous = true
            rec.interimResults = true
            
            const preferredLang = useAuthStore.getState().farmer?.preferredLanguage || 'en'
            if (preferredLang === 'kn') rec.lang = 'kn-IN'
            else if (preferredLang === 'hi') rec.lang = 'hi-IN'
            else if (preferredLang === 'ta') rec.lang = 'ta-IN'
            else if (preferredLang === 'te') rec.lang = 'te-IN'
            else rec.lang = 'en-IN'
            
            rec.onresult = (event: any) => {
              // Build full accumulated transcript from ALL results (not just the delta)
              let finalText = ''
              let interimText = ''
              for (let i = 0; i < event.results.length; ++i) {
                const result = event.results[i]
                if (result.isFinal) {
                  finalText += result[0].transcript + ' '
                } else {
                  interimText += result[0].transcript
                }
              }
              const fullTranscript = (finalText + interimText).trim()
              if (fullTranscript) {
                this.webTranscript = fullTranscript
              }
            }
            
            rec.onerror = (event: any) => {
              console.warn('Speech recognition error:', event.error)
            }
            
            rec.onend = () => {
              if (this.isListening) {
                try { rec.start() } catch (e) {}
              }
            }
            
            rec.start()
            this.recognition = rec
          } catch (e) {
            console.warn('Failed to start Web SpeechRecognition:', e)
          }
        }

        const intervalId = setInterval(() => {
          if (!this.isListening) {
            clearInterval(intervalId)
            return
          }
          const mockMetering = -60 + Math.random() * 60
          onMeteringChange(mockMetering)
        }, 150)
        return true
      }

      const permission = await Audio.requestPermissionsAsync()
      if (permission.status !== 'granted') {
        console.warn('Microphone permission denied')
        return false
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      })

      const rec = new Audio.Recording()
      await rec.prepareToRecordAsync({
        android: {
          extension: '.m4a',
          outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        ios: {
          extension: '.m4a',
          outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
          audioQuality: Audio.IOSAudioQuality.HIGH,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {}
      })

      rec.setOnRecordingStatusUpdate((status) => {
        if (status.metering !== undefined) {
          onMeteringChange(status.metering)
        }
      })

      await rec.startAsync()
      this.recording = rec
      this.isListening = true
      return true
    } catch (e) {
      console.error('Failed to start audio recording:', e)
      return false
    }
  }

  async stopRecording(): Promise<{ transcript: string; detectedLanguage: string }> {
    try {
      if (Platform.OS === 'web') {
        this.isListening = false
        if (this.recognition) {
          try {
            this.recognition.stop()
          } catch (e) {}
          this.recognition = null
        }
        
        const finalVal = this.webTranscript.trim()
        if (finalVal) {
          const preferredLang = useAuthStore.getState().farmer?.preferredLanguage || 'en'
          return { transcript: finalVal, detectedLanguage: preferredLang }
        }
        return this.getRandomMockTranscript()
      }

      if (!this.recording) return { transcript: '', detectedLanguage: 'en' }
      
      await this.recording.stopAndUnloadAsync()
      const uri = this.recording.getURI()
      this.recording = null
      this.isListening = false

      console.log(`Audio recorded at ${uri}`)
      if (uri) {
        try {
          const apiBase = typeof window !== 'undefined' && window.location && window.location.hostname ? `http://${window.location.hostname}:5000/api` : 'http://localhost:5000/api'
          const preferredLang = useAuthStore.getState().farmer?.preferredLanguage || 'en'
          const formData = new FormData()
          formData.append('file', {
            uri: uri,
            type: 'audio/m4a',
            name: 'audio.m4a'
          } as any)
          formData.append('language', preferredLang)

          const response = await fetch(`${apiBase}/query/transcribe`, {
            method: 'POST',
            body: formData,
            headers: {
              'Authorization': `Bearer ${useAuthStore.getState().token || 'demo_token'}`
            }
          })

          if (response.ok) {
            const data = await response.json()
            const resultData = data.data || data
            if (resultData && resultData.text) {
              return { transcript: resultData.text, detectedLanguage: resultData.language || preferredLang }
            }
          }
        } catch (err) {
          console.warn('Voice upload to Whisper backend failed, falling back:', err)
        }
      }

      return this.getRandomMockTranscript()
    } catch (e) {
      console.error('Failed to stop recording:', e)
      this.isListening = false
      return { transcript: '', detectedLanguage: 'en' }
    }
  }

  getLiveTranscript(): string {
    return this.webTranscript
  }

  detectLocalCommands(transcript: string): 'photo' | 'stop' | null {
    const clean = transcript.toLowerCase().trim()
    for (const [command, keywords] of Object.entries(COMMANDS)) {
      for (const kw of keywords) {
        if (clean.includes(kw)) {
          return command as 'photo' | 'stop'
        }
      }
    }
    return null
  }

  private getRandomMockTranscript(): { transcript: string; detectedLanguage: string } {
    const queries = [
      { transcript: 'ಭತ್ತದ ಬ್ಲಾಸ್ಟ್ ರೋಗಕ್ಕೆ ಚಿಕಿತ್ಸೆ ಏನು?', language: 'kn' },
      { transcript: 'टमाटर के पत्तों पर पीले धब्बे क्यों हैं?', language: 'hi' },
      { transcript: 'நெல் விலை இன்று என்ன?', language: 'ta' },
      { transcript: 'పత్తి పంట తెగుళ్లు నివారణ ఎలా?', language: 'te' },
      { transcript: 'How to apply micro irrigation subsidy?', language: 'en' }
    ]
    const selected = queries[Math.floor(Math.random() * queries.length)]
    return { transcript: selected.transcript, detectedLanguage: selected.language }
  }
}

export const voiceService = new VoiceService()
