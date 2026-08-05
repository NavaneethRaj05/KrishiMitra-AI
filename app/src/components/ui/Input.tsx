/**
 * KM Input — themed text input with focus ring.
 */

import React, { useState } from 'react'
import {
  TextInput,
  TextInputProps,
  View,
  StyleSheet,
  TouchableOpacity,
} from 'react-native'
import { useTheme } from '../../hooks/useTheme'
import { spacing, radii, typography } from '../../theme/tokens'
import { KMText } from './Text'

interface KMInputProps extends TextInputProps {
  label?: string
  hint?: string
  error?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  onRightIconPress?: () => void
}

export const KMInput: React.FC<KMInputProps> = ({
  label,
  hint,
  error,
  leftIcon,
  rightIcon,
  onRightIconPress,
  style,
  ...rest
}) => {
  const { theme } = useTheme()
  const [focused, setFocused] = useState(false)

  return (
    <View style={styles.wrapper}>
      {label && (
        <KMText size="sm" weight="medium" color={theme.text.secondary} style={styles.label}>
          {label}
        </KMText>
      )}

      <View
        style={[
          styles.container,
          {
            backgroundColor: theme.bg.input,
            borderColor: error
              ? theme.status.error
              : focused
              ? theme.border.focus
              : theme.border.default,
            borderWidth: focused ? 1.5 : 1,
          },
        ]}
      >
        {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}

        <TextInput
          style={[
            styles.input,
            {
              color: theme.text.primary,
              flex: 1,
            },
            style,
          ]}
          placeholderTextColor={theme.text.tertiary}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...rest}
        />

        {rightIcon && (
          <TouchableOpacity
            onPress={onRightIconPress}
            disabled={!onRightIconPress}
            style={styles.rightIcon}
          >
            {rightIcon}
          </TouchableOpacity>
        )}
      </View>

      {(hint || error) && (
        <KMText
          size="xs"
          color={error ? theme.status.error : theme.text.tertiary}
          style={styles.hint}
        >
          {error ?? hint}
        </KMText>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing.base,
  },
  label: {
    marginBottom: spacing.xs,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    minHeight: 48,
  },
  input: {
    fontSize: typography.sizes.base,
    paddingVertical: spacing.md,
  },
  leftIcon: {
    marginRight: spacing.sm,
  },
  rightIcon: {
    marginLeft: spacing.sm,
    padding: spacing.xs,
  },
  hint: {
    marginTop: spacing.xs,
    marginLeft: spacing.xs,
  },
})

export default KMInput
