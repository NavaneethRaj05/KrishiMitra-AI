import React, { useState } from 'react'
import { StyleSheet, View, TextInput, TouchableOpacity, Image, Alert, Platform } from 'react-native'
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated'
import { Mic, Camera, Send, X, Keyboard, Paperclip } from 'lucide-react-native'
import * as ImagePicker from 'expo-image-picker'
import * as FileSystem from 'expo-file-system'
import { colors, spacing, radii } from '../ui/tokens'
import { VaaniText } from '../ui/VaaniText'
import { t } from '../../i18n'

export type InputMode = 'idle' | 'text' | 'voice' | 'camera' | 'soil'

interface SearchBarProps {
  onSubmit: (query: string) => void
  onMicPress: () => void
  onCameraPress: () => void
  onImageSelected?: (uri: string, base64: string) => void
  attachedImageUri?: string | null
  onRemoveImage?: () => void
  placeholder?: string
}

export const SearchBar: React.FC<SearchBarProps> = ({
  onSubmit,
  onMicPress,
  onCameraPress,
  onImageSelected,
  attachedImageUri,
  onRemoveImage,
  placeholder
}) => {
  const [text, setText] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  
  // Glow animation on focus
  const glowOpacity = useSharedValue(0)

  const handleFocus = () => {
    setIsFocused(true)
    glowOpacity.value = withSpring(1, { damping: 15 })
  }

  const handleBlur = () => {
    setIsFocused(false)
    glowOpacity.value = withSpring(0, { damping: 15 })
  }

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value * 0.5,
  }))

  const handleSend = () => {
    if (text.trim() || attachedImageUri) {
      onSubmit(text.trim())
      setText('')
    }
  }

  const handleAttachImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (!permission.granted) {
        Alert.alert('Permission Denied', 'Gallery access is required to select images.')
        return
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      })

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0]
        const uri = asset.uri

        // Web: use FileReader on blob URI; Native: use expo-file-system
        if (Platform.OS === 'web') {
          // Web platform — fetch the blob and convert to base64 via FileReader
          const response = await fetch(uri)
          const blob = await response.blob()
          const base64Data: string = await new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onloadend = () => {
              const dataUrl = reader.result as string
              // strip "data:image/...;base64," prefix
              resolve(dataUrl.split(',')[1] || '')
            }
            reader.onerror = reject
            reader.readAsDataURL(blob)
          })
          if (onImageSelected) {
            onImageSelected(uri, base64Data)
          }
        } else {
          // Native platform — use expo-file-system
          const base64Data = await FileSystem.readAsStringAsync(uri, {
            encoding: FileSystem.EncodingType.Base64,
          })
          if (onImageSelected) {
            onImageSelected(uri, base64Data)
          }
        }
      }
    } catch (err: any) {
      console.warn('Image picker or base64 conversion failed:', err.message)
    }
  }

  // Determine current input mode for the pill indicator
  const getCurrentMode = (): { icon: string; label: string; color: string } => {
    const isSoil = /N\s*=\s*\d+/i.test(text) || /nitrogen/i.test(text) || /potassium/i.test(text) || /phosphorus/i.test(text);
    if (isSoil) return { icon: '📊', label: 'Soil Advisor', color: '#BA7517' }
    if (attachedImageUri && text.trim()) return { icon: '🔗', label: 'Text + Image', color: colors.green.bright }
    if (attachedImageUri) return { icon: '📷', label: 'Image', color: colors.green.bright }
    if (text.trim()) return { icon: '⌨', label: 'Text', color: '#378ADD' }
    return { icon: '✨', label: 'Ask anything', color: colors.text.secondary }
  }

  const mode = getCurrentMode()

  return (
    <View style={styles.wrapper}>
      {/* Glow effect */}
      <Animated.View style={[styles.glowBorder, glowStyle, { pointerEvents: 'none' } as any]} />
      
      <View style={[
        styles.outerContainer,
        isFocused && styles.outerContainerFocused,
      ]}>
        {/* Mode pill indicator */}
        {(text.trim() || attachedImageUri) && (
          <View style={[styles.modePill, { backgroundColor: mode.color + '22' }]}>
            <VaaniText size="xs" color={mode.color} weight="semibold">
              {mode.icon} {mode.label}
            </VaaniText>
          </View>
        )}

        {/* Image preview */}
        {attachedImageUri && (
          <View style={styles.imagePreviewContainer}>
            <Image source={{ uri: attachedImageUri }} style={styles.imagePreview} />
            <TouchableOpacity onPress={onRemoveImage} style={styles.removeImageBtn}>
              <X size={14} color="#fff" />
            </TouchableOpacity>
          </View>
        )}

        {/* Input row */}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder={placeholder || (attachedImageUri ? t('home.search_image_placeholder', { defaultValue: 'Ask about this image...' }) : t('home.search_placeholder'))}
            placeholderTextColor={colors.text.tertiary}
            value={text}
            onChangeText={setText}
            onSubmitEditing={handleSend}
            onFocus={handleFocus}
            onBlur={handleBlur}
          />
          
          <View style={styles.iconContainer}>
            {(text.length > 0 || attachedImageUri) ? (
              <TouchableOpacity onPress={handleSend} style={styles.sendButton}>
                <Send size={18} color={colors.text.inverse} />
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity onPress={handleAttachImage} style={styles.iconButton}>
                  <Paperclip size={20} color={colors.text.secondary} />
                </TouchableOpacity>

                <TouchableOpacity onPress={onMicPress} style={styles.iconButton}>
                  <Mic size={20} color={colors.text.secondary} />
                </TouchableOpacity>
                
                <TouchableOpacity onPress={onCameraPress} style={styles.iconButton}>
                  <Camera size={20} color={colors.text.secondary} />
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    width: '100%',
    marginVertical: spacing.md,
  },
  glowBorder: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: radii.md + 2,
    borderWidth: 2,
    borderColor: colors.green.bright,
  },
  outerContainer: {
    backgroundColor: colors.bg.input,
    borderColor: colors.border.default,
    borderRadius: radii.md,
    borderWidth: 1,
    width: '100%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  outerContainerFocused: {
    borderColor: colors.border.focus,
  },
  modePill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.green.dim,
    borderRadius: radii.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  imagePreviewContainer: {
    position: 'relative',
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    alignSelf: 'flex-start',
  },
  imagePreview: {
    width: 60,
    height: 60,
    borderRadius: radii.sm,
    borderColor: colors.border.default,
    borderWidth: 1,
  },
  removeImageBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: radii.full,
    padding: 2,
  },
  inputRow: {
    alignItems: 'center',
    flexDirection: 'row',
    width: '100%',
  },
  input: {
    color: colors.text.primary,
    flex: 1,
    fontSize: 16,
    height: 48,
    paddingRight: spacing.md,
  },
  iconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    padding: spacing.sm,
    marginLeft: spacing.xs,
  },
  sendButton: {
    backgroundColor: colors.green.bright,
    borderRadius: radii.full,
    padding: spacing.sm,
    marginLeft: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
export default SearchBar
