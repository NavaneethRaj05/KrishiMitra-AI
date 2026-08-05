/**
 * KM EmptyState — polished empty / error / offline state card.
 *
 * Variants:
 *   empty    — no data found
 *   error    — something went wrong
 *   offline  — no network, using cache
 *   search   — no search results
 *
 * Every state has a clear icon, title, body, and optional CTA.
 */

import React from 'react'
import { View, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native'
import { useTheme } from '../../hooks/useTheme'
import { spacing, radii, shadows } from '../../theme/tokens'
import { KMText } from './Text'

type Variant = 'empty' | 'error' | 'offline' | 'search' | 'task'

const VARIANT_CONFIG: Record<Variant, { emoji: string; defaultTitle: string; defaultBody: string }> = {
  empty:   { emoji: '🌾', defaultTitle: 'Nothing here yet',     defaultBody: 'Your activity will appear here once you start using KrishiMitra.' },
  error:   { emoji: '⚠️', defaultTitle: 'Something went wrong',  defaultBody: 'We could not load this content. Please try again.' },
  offline: { emoji: '⚡', defaultTitle: 'Using cached knowledge', defaultBody: 'No internet connection. Answers are from your local knowledge base.' },
  search:  { emoji: '🔍', defaultTitle: 'No results found',      defaultBody: 'Try a different question or check your spelling.' },
  task:    { emoji: '✅', defaultTitle: 'All done!',             defaultBody: 'No tasks in this category right now.' },
}

interface EmptyStateProps {
  variant?: Variant
  emoji?: string
  title?: string
  body?: string
  ctaLabel?: string
  onCta?: () => void
  style?: ViewStyle
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  variant = 'empty',
  emoji,
  title,
  body,
  ctaLabel,
  onCta,
  style,
}) => {
  const { theme } = useTheme()
  const config = VARIANT_CONFIG[variant]

  const isOffline = variant === 'offline'
  const isError   = variant === 'error'

  const bgColor = isError
    ? theme.status.errorBg
    : isOffline
    ? theme.status.warningBg
    : theme.bg.subtle

  const borderColor = isError
    ? theme.status.error + '30'
    : isOffline
    ? theme.status.warning + '30'
    : theme.border.subtle

  return (
    <View style={[
      styles.wrap,
      { backgroundColor: bgColor, borderColor },
      isError || isOffline ? shadows.sm : {},
      style,
    ]}>
      <KMText size="3xl" align="center" style={styles.emoji}>
        {emoji ?? config.emoji}
      </KMText>
      <KMText size="lg" weight="bold" align="center" style={styles.title}>
        {title ?? config.defaultTitle}
      </KMText>
      <KMText size="base" color={theme.text.secondary} align="center" style={styles.body}>
        {body ?? config.defaultBody}
      </KMText>
      {ctaLabel && onCta && (
        <TouchableOpacity
          onPress={onCta}
          style={[styles.cta, { backgroundColor: theme.accent.primary, ...shadows.sm }]}
          activeOpacity={0.8}
        >
          <KMText size="sm" weight="bold" color={theme.text.inverse}>
            {ctaLabel}
          </KMText>
        </TouchableOpacity>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: radii.xl,
    borderWidth: 1,
    padding: spacing.xl,
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
  emoji:  { marginBottom: spacing.md },
  title:  { marginBottom: spacing.sm },
  body:   { maxWidth: 280, lineHeight: 22 },
  cta: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radii.full,
  },
})

export default EmptyState
