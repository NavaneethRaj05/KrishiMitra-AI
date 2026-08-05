/**
 * KM Text — theme-aware typography component
 * Drop-in replacement for KrishiMitraAIText with semantic sizing.
 */

import React from 'react'
import { Text, TextProps, StyleSheet } from 'react-native'
import { useTheme } from '../../hooks/useTheme'
import { typography } from '../../theme/tokens'

type Size = keyof typeof typography.sizes
type Weight = keyof typeof typography.weights

interface KMTextProps extends TextProps {
  /** Size token */
  size?: Size
  /** Weight token */
  weight?: Weight
  /** Hex / rgba color. Defaults to theme.text.primary */
  color?: string
  /** Alignment */
  align?: 'auto' | 'left' | 'right' | 'center' | 'justify'
  /** Italic */
  italic?: boolean
  /** Dimmed opacity variant — useful for placeholders */
  dim?: boolean
}

export const KMText: React.FC<KMTextProps> = ({
  children,
  style,
  size = 'base',
  weight = 'regular',
  color,
  align = 'left',
  italic = false,
  dim = false,
  ...rest
}) => {
  const { theme } = useTheme()
  const resolvedColor = color ?? theme.text.primary

  return (
    <Text
      style={[
        styles.base,
        {
          fontSize: typography.sizes[size],
          fontWeight: typography.weights[weight],
          color: resolvedColor,
          textAlign: align,
          lineHeight: typography.sizes[size] * typography.lineHeights.normal,
          fontStyle: italic ? 'italic' : 'normal',
          opacity: dim ? 0.55 : 1,
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

export default KMText
