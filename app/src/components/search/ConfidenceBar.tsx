import React, { useEffect } from 'react'
import { StyleSheet, View } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated'
import { colors, spacing, radii } from '../ui/tokens'
import { KrishiMitraAIText } from '../ui/KrishiMitraAIText'

interface ConfidenceBarProps {
  score: number // 0 to 1
}

const getConfidenceLabel = (score: number): string => {
  if (score >= 0.9) return 'Very High'
  if (score >= 0.75) return 'High'
  if (score >= 0.55) return 'Moderate'
  if (score >= 0.35) return 'Low'
  return 'Very Low'
}

const getConfidenceColor = (score: number): string => {
  if (score >= 0.9) return '#4CAF50'
  if (score >= 0.75) return colors.green.bright
  if (score >= 0.55) return colors.amber.bright
  if (score >= 0.35) return '#E67E22'
  return colors.red
}

const getConfidenceGradientBg = (score: number): string => {
  if (score >= 0.75) return colors.green.dim
  if (score >= 0.55) return colors.amber.dim
  return colors.redDim
}

export const ConfidenceBar: React.FC<ConfidenceBarProps> = ({ score }) => {
  const animatedWidth = useSharedValue(0)
  const percentage = Math.round(score * 100)
  const label = getConfidenceLabel(score)
  const barColor = getConfidenceColor(score)
  const bgColor = getConfidenceGradientBg(score)

  useEffect(() => {
    animatedWidth.value = withTiming(score * 100, {
      duration: 1000,
      easing: Easing.bezierFn(0.25, 0.46, 0.45, 0.94),
    })
  }, [score])

  const barStyle = useAnimatedStyle(() => ({
    width: `${animatedWidth.value}%` as any,
  }))

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <View style={styles.header}>
        <KrishiMitraAIText size="xs" weight="semibold" color={colors.text.secondary}>
          Confidence
        </KrishiMitraAIText>
        <View style={styles.scoreContainer}>
          <KrishiMitraAIText size="sm" weight="bold" color={barColor}>
            {label} ({percentage}%)
          </KrishiMitraAIText>
        </View>
      </View>
      <View style={styles.trackContainer}>
        <View style={styles.track}>
          <Animated.View
            style={[
              styles.fill,
              { backgroundColor: barColor },
              barStyle,
            ]}
          />
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trackContainer: {
    width: '100%',
  },
  track: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: radii.full,
    height: 6,
    overflow: 'hidden',
    width: '100%',
  },
  fill: {
    borderRadius: radii.full,
    height: '100%',
  },
})
export default ConfidenceBar
