/**
 * KM Card — semantic surface container.
 *
 * Elevation variants:
 *   flat     — no shadow, subtle border
 *   raised   — light shadow
 *   elevated — stronger shadow (modals, key content)
 *
 * Usage:
 *   <KMCard elevation="raised" padding="md">...</KMCard>
 */

import React from 'react'
import { View, ViewProps, StyleSheet, ViewStyle } from 'react-native'
import { useTheme } from '../../hooks/useTheme'
import { spacing, radii, shadows } from '../../theme/tokens'

type Elevation = 'flat' | 'raised' | 'elevated'
type Padding = 'none' | 'xs' | 'sm' | 'md' | 'base' | 'lg'

interface KMCardProps extends ViewProps {
  elevation?: Elevation
  padding?: Padding
  radius?: keyof typeof radii
  /** Override background color */
  bg?: string
  /** Show accent left border */
  accentBorder?: boolean
  /** Accent border color */
  accentColor?: string
}

const paddingMap: Record<Padding, number> = {
  none: 0,
  xs:   spacing.xs,
  sm:   spacing.sm,
  md:   spacing.md,
  base: spacing.base,
  lg:   spacing.lg,
}

export const KMCard: React.FC<KMCardProps> = ({
  children,
  elevation = 'flat',
  padding = 'base',
  radius = 'lg',
  bg,
  accentBorder = false,
  accentColor,
  style,
  ...rest
}) => {
  const { theme } = useTheme()

  const shadowStyle = elevation === 'raised'
    ? shadows.sm
    : elevation === 'elevated'
    ? shadows.md
    : {}

  const cardStyle: ViewStyle = {
    backgroundColor: bg ?? theme.bg.surface,
    borderRadius: radii[radius],
    borderWidth: 1,
    borderColor: theme.border.default,
    padding: paddingMap[padding],
    ...(accentBorder
      ? {
          borderLeftWidth: 3,
          borderLeftColor: accentColor ?? theme.accent.primary,
        }
      : {}),
    ...shadowStyle,
  }

  return (
    <View style={[cardStyle, style]} {...rest}>
      {children}
    </View>
  )
}

export default KMCard
