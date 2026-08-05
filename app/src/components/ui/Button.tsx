/**
 * KM Button — premium themed button with multiple variants.
 *
 * Variants:
 *   primary   — filled teal  (main CTA)
 *   secondary — ghost border (secondary action)
 *   warning   — amber fill
 *   danger    — red fill
 *   ghost     — no border, text-only
 *   surface   — surface fill, subtle border
 *
 * Sizes: sm | md | lg
 */

import React from 'react'
import {
  TouchableOpacity,
  TouchableOpacityProps,
  ActivityIndicator,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native'
import { useTheme } from '../../hooks/useTheme'
import { spacing, radii, typography, shadows } from '../../theme/tokens'
import { KMText } from './Text'

export type ButtonVariant = 'primary' | 'secondary' | 'warning' | 'danger' | 'ghost' | 'surface'
export type ButtonSize = 'sm' | 'md' | 'lg'

interface KMButtonProps extends TouchableOpacityProps {
  title: string
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  icon?: React.ReactNode
  iconPosition?: 'left' | 'right'
  fullWidth?: boolean
}

export const KMButton: React.FC<KMButtonProps> = ({
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  style,
  ...rest
}) => {
  const { theme, isDark } = useTheme()

  const getContainerStyle = (): ViewStyle => {
    const base: ViewStyle = {
      borderRadius: radii.md,
      justifyContent: 'center',
      alignItems: 'center',
      flexDirection: 'row',
    }

    switch (variant) {
      case 'primary':
        return {
          ...base,
          backgroundColor: theme.accent.primary,
          borderWidth: 0,
          ...shadows.sm,
        }
      case 'secondary':
        return {
          ...base,
          backgroundColor: 'transparent',
          borderWidth: 1.5,
          borderColor: theme.accent.primary,
        }
      case 'warning':
        return {
          ...base,
          backgroundColor: theme.accent.secondary,
          borderWidth: 0,
        }
      case 'danger':
        return {
          ...base,
          backgroundColor: theme.status.error,
          borderWidth: 0,
        }
      case 'ghost':
        return {
          ...base,
          backgroundColor: 'transparent',
          borderWidth: 0,
        }
      case 'surface':
        return {
          ...base,
          backgroundColor: theme.bg.surface,
          borderWidth: 1,
          borderColor: theme.border.default,
          ...shadows.xs,
        }
    }
  }

  const getTextColor = (): string => {
    if (disabled || loading) return theme.text.tertiary
    switch (variant) {
      case 'primary':   return theme.text.inverse
      case 'secondary': return theme.accent.primary
      case 'warning':   return theme.text.inverse
      case 'danger':    return theme.text.inverse
      case 'ghost':     return theme.text.secondary
      case 'surface':   return theme.text.primary
    }
  }

  const sizeMap = {
    sm: { py: spacing.sm, px: spacing.md, textSize: 'sm' as const, height: 36 },
    md: { py: spacing.md, px: spacing.lg, textSize: 'base' as const, height: 44 },
    lg: { py: spacing.base, px: spacing.xl, textSize: 'md' as const, height: 52 },
  }
  const sizeConfig = sizeMap[size]

  return (
    <TouchableOpacity
      activeOpacity={0.78}
      style={[
        getContainerStyle(),
        {
          paddingVertical: sizeConfig.py,
          paddingHorizontal: sizeConfig.px,
          minHeight: sizeConfig.height,
          width: fullWidth ? '100%' : undefined,
        },
        (disabled || loading) && styles.disabled,
        style,
      ]}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={getTextColor()} size="small" />
      ) : (
        <>
          {icon && iconPosition === 'left' && (
            <View style={styles.iconLeft}>{icon}</View>
          )}
          <KMText
            size={sizeConfig.textSize}
            weight="semibold"
            color={getTextColor()}
            align="center"
          >
            {title}
          </KMText>
          {icon && iconPosition === 'right' && (
            <View style={styles.iconRight}>{icon}</View>
          )}
        </>
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  disabled: {
    opacity: 0.45,
  },
  iconLeft: {
    marginRight: spacing.sm,
  },
  iconRight: {
    marginLeft: spacing.sm,
  },
})

export default KMButton
