import React, { useState } from 'react'
import { TextInput, TextInputProps, StyleSheet, View } from 'react-native'
import { colors, spacing, radii, typography } from './tokens'
import { VaaniText } from './VaaniText'

interface VaaniInputProps extends TextInputProps {
  label?: string
  error?: string
}

export const VaaniInput: React.FC<VaaniInputProps> = ({
  label,
  error,
  style,
  onFocus,
  onBlur,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false)

  return (
    <View style={styles.container}>
      {label && (
        <VaaniText size="sm" weight="medium" color={colors.text.secondary} style={styles.label}>
          {label}
        </VaaniText>
      )}
      <TextInput
        placeholderTextColor={colors.text.tertiary}
        onFocus={(e) => {
          setIsFocused(true)
          onFocus?.(e)
        }}
        onBlur={(e) => {
          setIsFocused(false)
          onBlur?.(e)
        }}
        style={[
          styles.input,
          isFocused && styles.focused,
          error ? styles.errorInput : undefined,
          style,
        ]}
        {...props}
      />
      {error && (
        <VaaniText size="xs" color={colors.red} style={styles.errorText}>
          {error}
        </VaaniText>
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
    backgroundColor: colors.bg.input,
    borderColor: colors.border.default,
    borderWidth: 1,
    borderRadius: radii.md,
    color: colors.text.primary,
    fontFamily: typography.families.sans,
    fontSize: typography.sizes.base,
    padding: spacing.md,
  },
  focused: {
    borderColor: colors.border.focus,
  },
  errorInput: {
    borderColor: colors.red,
  },
  errorText: {
    marginTop: spacing.xs,
  },
})
