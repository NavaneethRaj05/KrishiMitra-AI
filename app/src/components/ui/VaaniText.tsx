import React from 'react'
import { Text, TextProps, StyleSheet } from 'react-native'
import { colors, typography } from './tokens'

interface VaaniTextProps extends TextProps {
  size?: keyof typeof typography.sizes
  weight?: keyof typeof typography.weights
  color?: string
  align?: 'auto' | 'left' | 'right' | 'center' | 'justify'
  lineHeight?: keyof typeof typography.lineHeights
}

export const VaaniText: React.FC<VaaniTextProps> = ({
  children,
  style,
  size = 'base',
  weight = 'regular',
  color = colors.text.primary,
  align = 'left',
  lineHeight = 'normal',
  ...props
}) => {
  return (
    <Text
      style={[
        styles.text,
        {
          fontSize: typography.sizes[size],
          fontWeight: typography.weights[weight],
          color,
          textAlign: align,
          lineHeight: typography.sizes[size] * typography.lineHeights[lineHeight],
        },
        style,
      ]}
      {...props}
    >
      {children}
    </Text>
  )
}

const styles = StyleSheet.create({
  text: {
    fontFamily: typography.families.sans,
  },
})
