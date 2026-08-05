/**
 * KrishiMitraAIInput — legacy theme-aware text input.
 * Kept for backward compatibility; new code should use KMInput.
 */

import React, { useState } from 'react'
import { TextInput, TextInputProps, StyleSheet, View } from 'react-native'
import { typography, spacing, radii } from '../../theme/tokens'
import { useTheme } from '../../hooks/useTheme'
import { KrishiMitraAIText } from './KrishiMitraAIText'

interface KrishiMitraAIInputProps extends TextInputProps {
  label?: string
  error?: string
}

export const KrishiMitraAIInput: React.FC<KrishiMitraAIInputProps> = ({
  label,
  error,
  style,
  onFocus,
  onBlur,
  ...rest
}) => {
  const { theme } = useTheme()
  const [isFocused, setIsFocused] = useState(false)

  return (
    <View style={styles.container}>
      {label && (
        <KrishiMitraAIText size="sm" weight="medium" color={theme.text.secondary} style={styles.label}>
          {label}
        </KrishiMitraAIText>
      )}
      <TextInput
        placeholderTextColor={theme.text.tertiary}
        onFocus={e => { setIsFocused(true); onFocus?.(e) }}
        onBlur={e  => { setIsFocused(false); onBlur?.(e) }}
        style={[
          styles.input,
          {
            backgroundColor: theme.bg.input,
            borderColor: error
              ? theme.status.error
              : isFocused
              ? theme.border.focus
              : theme.border.default,
            color: theme.text.primary,
            borderWidth: isFocused ? 1.5 : 1,
          },
          style,
        ]}
        {...rest}
      />
      {error && (
        <KrishiMitraAIText size="xs" color={theme.status.error} style={styles.errorText}>
          {error}
        </KrishiMitraAIText>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.base,
    width: '100%',
  },
  label: {
    marginBottom: spacing.sm,
  },
  input: {
    borderRadius: radii.md,
    fontFamily: typography.families.sans,
    fontSize: typography.sizes.base,
    padding: spacing.md,
    minHeight: 48,
  },
  errorText: {
    marginTop: spacing.xs,
  },
})

export default KrishiMitraAIInput
