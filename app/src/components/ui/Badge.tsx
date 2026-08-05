/**
 * KM Badge — status, intent, and confidence badges.
 */

import React from 'react'
import { View, StyleSheet, ViewStyle } from 'react-native'
import { useTheme } from '../../hooks/useTheme'
import { spacing, radii } from '../../theme/tokens'
import { KMText } from './Text'

export type BadgeVariant =
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'accent'
  | 'neutral'
  | 'gold'
  | 'silver'
  | 'bronze'

interface KMBadgeProps {
  label: string
  variant?: BadgeVariant
  size?: 'xs' | 'sm'
  icon?: string
  style?: ViewStyle
}

export const KMBadge: React.FC<KMBadgeProps> = ({
  label,
  variant = 'neutral',
  size = 'sm',
  icon,
  style,
}) => {
  const { theme } = useTheme()

  const colorMap: Record<BadgeVariant, { bg: string; text: string; border: string }> = {
    success: { bg: theme.status.successBg, text: theme.status.success, border: theme.status.success + '40' },
    warning: { bg: theme.status.warningBg, text: theme.status.warning, border: theme.status.warning + '40' },
    error:   { bg: theme.status.errorBg, text: theme.status.error, border: theme.status.error + '40' },
    info:    { bg: theme.status.infoBg, text: theme.status.info, border: theme.status.info + '40' },
    accent:  { bg: theme.accent.primaryDim, text: theme.accent.primary, border: theme.accent.primary + '40' },
    neutral: { bg: theme.bg.subtle, text: theme.text.secondary, border: theme.border.default },
    gold:    { bg: theme.citation.goldBg, text: theme.citation.gold, border: theme.citation.goldBorder },
    silver:  { bg: theme.citation.silverBg, text: theme.citation.silver, border: theme.citation.silverBorder },
    bronze:  { bg: theme.citation.bronzeBg, text: theme.citation.bronze, border: theme.citation.bronzeBorder },
  }

  const { bg, text, border } = colorMap[variant]

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: bg,
          borderColor: border,
          paddingHorizontal: size === 'xs' ? spacing.xs : spacing.sm,
          paddingVertical: size === 'xs' ? 1 : 3,
        },
        style,
      ]}
    >
      <KMText size={size} weight="semibold" color={text}>
        {icon ? `${icon} ${label}` : label}
      </KMText>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: radii.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
})

export default KMBadge
