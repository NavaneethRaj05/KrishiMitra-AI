/**
 * FollowUpChips — themed follow-up question chips.
 */

import React from 'react'
import { StyleSheet, View, ScrollView, TouchableOpacity } from 'react-native'
import { ArrowRight } from 'lucide-react-native'
import { useTheme } from '../../hooks/useTheme'
import { spacing, radii } from '../../theme/tokens'
import { KMText } from '../ui/Text'

interface Props {
  chips: string[]
  onChipPress: (chip: string) => void
}

export const FollowUpChips: React.FC<Props> = ({ chips, onChipPress }) => {
  const { theme } = useTheme()
  if (!chips?.length) return null

  return (
    <View style={styles.wrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {chips.map((chip, i) => (
          <TouchableOpacity
            key={i}
            onPress={() => onChipPress(chip)}
            style={[styles.chip, {
              backgroundColor: theme.accent.primaryDim,
              borderColor: theme.accent.primary + '50',
            }]}
            activeOpacity={0.75}
          >
            <KMText size="sm" color={theme.accent.primary} style={{ flex: 1, marginRight: spacing.xs }}>
              {chip}
            </KMText>
            <ArrowRight size={13} color={theme.accent.primary} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
  },
  scroll: {
    gap: spacing.sm,
    paddingRight: spacing.xl,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.xl,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    maxWidth: 280,
  },
})

export default FollowUpChips
