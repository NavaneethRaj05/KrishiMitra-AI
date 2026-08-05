/**
 * AskBar — the primary multimodal input component.
 *
 * Design goals:
 *  - Single tappable surface: voice, camera, gallery, or text
 *  - Tap anywhere (not just icon) starts text input
 *  - Voice button is the dominant CTA (large, positioned prominently)
 *  - Image preview inline before submission
 *  - Mode pill shows current input type
 *  - Focus state uses accent border ring, not glowing shadow
 */

import React, { useState } from 'react'
import {
  View,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  Platform,
  StyleSheet,
  ViewStyle,
} from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated'
import { Mic, Camera, Paperclip, ArrowUp, X } from 'lucide-react-native'
import * as ImagePicker from 'expo-image-picker'
import * as FileSystem from 'expo-file-system'
import { useTheme } from '../../hooks/useTheme'
import { spacing, radii, typography, shadows } from '../../theme/tokens'
import { KMText } from '../ui/Text'
import { t } from '../../i18n'

interface AskBarProps {
  onSubmit: (query: string) => void
  onMicPress: () => void
  onCameraPress: () => void
  onImageSelected?: (uri: string, base64: string) => void
  attachedImageUri?: string | null
  onRemoveImage?: () => void
  placeholder?: string
  /** Show voice as primary large button (home screen) vs compact (thread) */
  layout?: 'home' | 'thread'
  style?: ViewStyle
}

export const AskBar: React.FC<AskBarProps> = ({
  onSubmit,
  onMicPress,
  onCameraPress,
  onImageSelected,
  attachedImageUri,
  onRemoveImage,
  placeholder,
  layout = 'home',
  style,
}) => {
  const { theme, isDark } = useTheme()
  const [text, setText] = useState('')
  const [focused, setFocused] = useState(false)
  const borderAnim = useSharedValue(0)
  const hasContent = text.trim().length > 0 || !!attachedImageUri

  const handleFocus = () => {
    setFocused(true)
    borderAnim.value = withTiming(1, { duration: 200 })
  }
  const handleBlur = () => {
    setFocused(false)
    borderAnim.value = withTiming(0, { duration: 200 })
  }

  const animBorderStyle = useAnimatedStyle(() => ({
    borderColor: borderAnim.value === 1
      ? theme.accent.primary
      : theme.border.default,
    borderWidth: borderAnim.value === 1 ? 1.5 : 1,
  }))

  const handleSend = () => {
    if (hasContent) {
      onSubmit(text.trim())
      setText('')
    }
  }

  const handleAttachImage = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (!perm.granted) {
        Alert.alert('Permission needed', 'Gallery access is required to select crop images.')
        return
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.85,
      })
      if (!result.canceled && result.assets?.length) {
        const asset = result.assets[0]
        const uri = asset.uri
        let base64 = ''
        if (Platform.OS === 'web') {
          const resp = await fetch(uri)
          const blob = await resp.blob()
          base64 = await new Promise<string>((resolve) => {
            const reader = new FileReader()
            reader.onloadend = () => resolve((reader.result as string).split(',')[1] || '')
            reader.readAsDataURL(blob)
          })
        } else {
          base64 = await FileSystem.readAsStringAsync(uri, {
            encoding: FileSystem.EncodingType.Base64,
          })
        }
        onImageSelected?.(uri, base64)
      }
    } catch (err) {
      console.warn('Image picker failed:', err)
    }
  }

  // Detect soil data input mode
  const isSoilMode = /N\s*=\s*\d+|nitrogen|potassium|phosphorus/i.test(text)
  const modeLabel = isSoilMode
    ? { icon: '📊', text: 'Soil Analysis', color: theme.status.warning }
    : attachedImageUri && text.trim()
    ? { icon: '🔗', text: 'Image + Text', color: theme.accent.primary }
    : attachedImageUri
    ? { icon: '📷', text: 'Image Diagnosis', color: theme.accent.primary }
    : null

  return (
    <View style={[styles.wrapper, style]}>
      <Animated.View
        style={[
          styles.container,
          { backgroundColor: theme.bg.surface },
          animBorderStyle,
          shadows.md,
        ]}
      >
        {/* Mode indicator pill */}
        {modeLabel && (
          <View style={[styles.modePill, { backgroundColor: modeLabel.color + '18' }]}>
            <KMText size="xs" weight="bold" color={modeLabel.color}>
              {modeLabel.icon}  {modeLabel.text}
            </KMText>
          </View>
        )}

        {/* Attached image preview */}
        {attachedImageUri && (
          <View style={styles.imagePreviewRow}>
            <View style={[styles.imagePreviewWrap, { borderColor: theme.border.default }]}>
              <Image source={{ uri: attachedImageUri }} style={styles.imagePreview} />
              <TouchableOpacity
                onPress={onRemoveImage}
                style={[styles.removeImageBtn, { backgroundColor: theme.bg.surface }]}
                hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
              >
                <X size={12} color={theme.text.secondary} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Main input row */}
        <View style={styles.inputRow}>
          <TextInput
            style={[
              styles.input,
              {
                color: theme.text.primary,
                fontSize: typography.sizes.base,
              },
            ]}
            placeholder={
              placeholder ??
              (attachedImageUri
                ? t('home.search_image_placeholder', { defaultValue: 'Ask about this crop…' })
                : t('home.search_placeholder'))
            }
            placeholderTextColor={theme.text.tertiary}
            value={text}
            onChangeText={setText}
            onSubmitEditing={handleSend}
            onFocus={handleFocus}
            onBlur={handleBlur}
            multiline={false}
            returnKeyType="send"
          />

          <View style={styles.actions}>
            {hasContent ? (
              /* Send button */
              <TouchableOpacity
                onPress={handleSend}
                style={[styles.sendBtn, { backgroundColor: theme.accent.primary }]}
                accessibilityLabel="Send question"
              >
                <ArrowUp size={20} color={theme.text.inverse} strokeWidth={2.5} />
              </TouchableOpacity>
            ) : (
              /* Idle icons */
              <>
                <TouchableOpacity
                  onPress={handleAttachImage}
                  style={styles.iconBtn}
                  accessibilityLabel="Attach image"
                >
                  <Paperclip size={22} color={theme.text.secondary} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={onCameraPress}
                  style={styles.iconBtn}
                  accessibilityLabel="Scan crop with camera"
                >
                  <Camera size={22} color={theme.text.secondary} />
                </TouchableOpacity>
                {/* Mic — primary action, accent-colored */}
                <TouchableOpacity
                  onPress={onMicPress}
                  style={[styles.micBtn, { backgroundColor: theme.accent.primaryDim }]}
                  accessibilityLabel="Ask by voice"
                >
                  <Mic size={22} color={theme.accent.primaryHover} />
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
  },
  container: {
    borderRadius: radii['2xl'], // extra rounded for floating pill feel
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    width: '100%',
  },
  modePill: {
    alignSelf: 'flex-start',
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },
  imagePreviewRow: {
    paddingBottom: spacing.sm,
  },
  imagePreviewWrap: {
    position: 'relative',
    alignSelf: 'flex-start',
    borderRadius: radii.md,
    borderWidth: 1,
    overflow: 'visible',
  },
  imagePreview: {
    width: 72,
    height: 72,
    borderRadius: radii.md,
  },
  removeImageBtn: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: radii.full,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    ...shadows.sm,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52, // taller touch target
  },
  input: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingRight: spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  iconBtn: {
    padding: spacing.sm,
  },
  micBtn: {
    width: 44, // larger voice CTA
    height: 44,
    borderRadius: radii.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: radii.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.xs,
  },
})

export default AskBar
