/**
 * KrishiMitraAIText — legacy theme-aware text component.
 * Kept for backward compatibility; new code should use KMText.
 * Now reads text color from the active theme when no explicit color is passed.
 */

import React from 'react'
import { Text, TextProps, StyleSheet } from 'react-native'
import { typography } from '../../theme/tokens'
import { useTheme } from '../../hooks/useTheme'

// Extend the size keys to include both old ('xxl') and new token names
type LegacySize = 'xs' | 'sm' | 'base' | 'md' | 'lg' | 'xl' | 'xxl' | '2xl' | '3xl'

const SIZE_MAP: Record<LegacySize, number> = {
  xs:   11,
  sm:   13,
  base: 15,
  md:   17,
  lg:   20,
  xl:   24,
  xxl:  30, // legacy alias → not in new tokens
  '2xl': 28,
  '3xl': 34,
}

interface KrishiMitraAITextProps extends TextProps {
  size?: LegacySize
  weight?: keyof typeof typography.weights
  color?: string
  align?: 'auto' | 'left' | 'right' | 'center' | 'justify'
  lineHeight?: 'tight' | 'normal' | 'loose'
}

export const KrishiMitraAIText: React.FC<KrishiMitraAITextProps> = ({
  children,
  style,
  size = 'base',
  weight = 'regular',
  color,
  align = 'left',
  lineHeight = 'normal',
  ...rest
}) => {
  const { theme } = useTheme()
  const resolvedColor = color ?? theme.text.primary
  const fontSize = SIZE_MAP[size] ?? 15
  const lineHeightMultiplier =
    lineHeight === 'tight' ? 1.2 : lineHeight === 'loose' ? 1.8 : 1.6

  return (
    <Text
      style={[
        styles.base,
        {
          fontSize,
          fontWeight: typography.weights[weight],
          color: resolvedColor,
          textAlign: align,
          lineHeight: fontSize * lineHeightMultiplier,
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </Text>
  )
}

const styles = StyleSheet.create({
  base: {
    fontFamily: typography.families.sans,
  },
})

export default KrishiMitraAIText
