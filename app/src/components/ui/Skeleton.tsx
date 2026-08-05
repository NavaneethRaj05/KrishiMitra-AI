/**
 * KM Skeleton — shimmer loading placeholder.
 * Use for cards, text blocks, and list items while data loads.
 */

import React, { useEffect } from 'react'
import { View, StyleSheet, ViewStyle } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated'
import { useTheme } from '../../hooks/useTheme'
import { radii, spacing } from '../../theme/tokens'

interface SkeletonProps {
  width?: number | string
  height?: number
  radius?: number
  style?: ViewStyle
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 16,
  radius = radii.md,
  style,
}) => {
  const { theme } = useTheme()
  const opacity = useSharedValue(0.45)

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(1,    { duration: 650 }),
        withTiming(0.35, { duration: 650 }),
      ),
      -1,
    )
  }, [])

  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }))

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius: radius,
          backgroundColor: theme.skeleton.base,
        },
        animStyle,
        style,
      ]}
    />
  )
}

/** Pre-composed skeleton for an answer card */
export const AnswerCardSkeleton: React.FC = () => (
  <View style={s.answerWrap}>
    <Skeleton width="35%" height={12} style={{ marginBottom: 12 }} />
    <View style={s.sourceRow}>
      {[80, 100, 70].map((w, i) => (
        <Skeleton key={i} width={w} height={24} radius={radii.full} style={{ marginRight: 8 }} />
      ))}
    </View>
    <Skeleton height={14} style={{ marginBottom: 8 }} />
    <Skeleton height={14} width="92%" style={{ marginBottom: 8 }} />
    <Skeleton height={14} width="85%" style={{ marginBottom: 8 }} />
    <Skeleton height={14} style={{ marginBottom: 8 }} />
    <Skeleton height={14} width="78%" style={{ marginBottom: 16 }} />
    <Skeleton height={80} radius={radii.lg} style={{ marginBottom: 16 }} />
    <Skeleton height={14} width="60%" style={{ marginBottom: 8 }} />
    <Skeleton height={14} width="40%" />
  </View>
)

/** Pre-composed skeleton for a thread card */
export const ThreadCardSkeleton: React.FC = () => (
  <View style={s.threadWrap}>
    <Skeleton width={40} height={40} radius={radii.full} />
    <View style={s.threadText}>
      <Skeleton height={14} width="65%" style={{ marginBottom: 8 }} />
      <Skeleton height={12} width="45%" />
    </View>
  </View>
)

const s = StyleSheet.create({
  answerWrap:  { padding: spacing.lg },
  sourceRow:   { flexDirection: 'row', marginBottom: 16 },
  threadWrap:  {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  threadText: { flex: 1 },
})
