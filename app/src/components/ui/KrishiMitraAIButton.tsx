/**
 * KrishiMitraAIButton — legacy theme-aware button.
 * Kept for backward compatibility; new code should use KMButton.
 */

import React from 'react'
import { TouchableOpacity, TouchableOpacityProps, ActivityIndicator, StyleSheet } from 'react-native'
import { useTheme } from '../../hooks/useTheme'
import { spacing, radii } from '../../theme/tokens'
import { KrishiMitraAIText } from './KrishiMitraAIText'

interface KrishiMitraAIButtonProps extends TouchableOpacityProps {
  title: string
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

export const KrishiMitraAIButton: React.FC<KrishiMitraAIButtonProps> = ({
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  style,
  ...rest
}) => {
  const { theme } = useTheme()

  const containerStyle = (() => {
    switch (variant) {
      case 'primary':
        return { backgroundColor: theme.accent.primary, borderColor: theme.accent.primary, borderWidth: 1 }
      case 'secondary':
        return { backgroundColor: theme.bg.surface, borderColor: theme.border.strong, borderWidth: 1 }
      case 'danger':
        return { backgroundColor: theme.status.errorBg, borderColor: theme.status.error, borderWidth: 1 }
      case 'ghost':
        return { backgroundColor: 'transparent', borderWidth: 0 }
    }
  })()

  const textColor = (() => {
    if (disabled || loading) return theme.text.tertiary
    switch (variant) {
      case 'primary':   return theme.text.inverse
      case 'secondary': return theme.accent.primary
      case 'danger':    return theme.status.error
      case 'ghost':     return theme.text.secondary
    }
  })()

  const py = size === 'sm' ? spacing.sm : size === 'md' ? spacing.md : spacing.base
  const px = size === 'sm' ? spacing.md : size === 'md' ? spacing.lg : spacing.xl
  const textSize = size === 'sm' ? 'sm' : size === 'md' ? 'base' : 'md'

  return (
    <TouchableOpacity
      activeOpacity={0.78}
      style={[
        styles.btn,
        containerStyle,
        { paddingVertical: py, paddingHorizontal: px },
        (disabled || loading) && styles.disabled,
        style,
      ]}
      disabled={disabled || loading}
      {...rest}
    >
      {loading
        ? <ActivityIndicator color={textColor} size="small" />
        : <KrishiMitraAIText size={textSize as any} weight="semibold" color={textColor} align="center">
            {title}
          </KrishiMitraAIText>
      }
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  btn: {
    borderRadius: radii.md,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  disabled: { opacity: 0.45 },
})

export default KrishiMitraAIButton
