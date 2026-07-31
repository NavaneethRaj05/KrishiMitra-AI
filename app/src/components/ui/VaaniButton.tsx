import React from 'react'
import { TouchableOpacity, TouchableOpacityProps, ActivityIndicator, StyleSheet } from 'react-native'
import { colors, spacing, radii } from './tokens'
import { VaaniText } from './VaaniText'

interface VaaniButtonProps extends TouchableOpacityProps {
  title: string
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

export const VaaniButton: React.FC<VaaniButtonProps> = ({
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  style,
  ...props
}) => {
  const getButtonStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: colors.green.mid,
          borderColor: colors.green.bright,
          borderWidth: 1,
        }
      case 'secondary':
        return {
          backgroundColor: colors.bg.card,
          borderColor: colors.border.strong,
          borderWidth: 1,
        }
      case 'danger':
        return {
          backgroundColor: colors.redDim,
          borderColor: colors.red,
          borderWidth: 1,
        }
      case 'ghost':
        return {
          backgroundColor: 'transparent',
          borderColor: 'transparent',
          borderWidth: 0,
        }
    }
  }

  const getTextColor = () => {
    if (disabled || loading) return colors.text.tertiary
    switch (variant) {
      case 'primary':
        return colors.text.inverse
      case 'secondary':
        return colors.sand.bright
      case 'danger':
        return colors.red
      case 'ghost':
        return colors.text.secondary
    }
  }

  const paddingVertical = size === 'sm' ? spacing.sm : size === 'md' ? spacing.md : spacing.base
  const paddingHorizontal = size === 'sm' ? spacing.md : size === 'md' ? spacing.lg : spacing.xl
  const textVariant = size === 'sm' ? 'sm' : size === 'md' ? 'base' : 'md'

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      style={[
        styles.button,
        getButtonStyles(),
        { paddingVertical, paddingHorizontal },
        (disabled || loading) && styles.disabled,
        style,
      ]}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={getTextColor()} size="small" />
      ) : (
        <VaaniText size={textVariant} weight="semibold" color={getTextColor()} align="center">
          {title}
        </VaaniText>
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  button: {
    borderRadius: radii.md,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  disabled: {
    opacity: 0.5,
  },
})
