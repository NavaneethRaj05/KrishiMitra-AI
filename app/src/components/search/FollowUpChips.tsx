import React from 'react'
import { StyleSheet, View, TouchableOpacity, ScrollView } from 'react-native'
import { colors, spacing, radii } from '../ui/tokens'
import { VaaniText } from '../ui/VaaniText'
import { ArrowRight } from 'lucide-react-native'

interface FollowUpChipsProps {
  chips: string[]
  onChipPress: (chip: string) => void
}

export const FollowUpChips: React.FC<FollowUpChipsProps> = ({ chips, onChipPress }) => {
  if (!chips || chips.length === 0) return null

  return (
    <View style={styles.container}>
      <VaaniText size="sm" weight="semibold" color={colors.text.secondary} style={styles.title}>
        Suggested Follow-up Questions:
      </VaaniText>
      
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {chips.map((chip, idx) => (
          <TouchableOpacity
            key={idx}
            onPress={() => onChipPress(chip)}
            style={styles.chip}
          >
            <VaaniText size="sm" color={colors.green.bright} style={styles.chipText}>
              {chip}
            </VaaniText>
            <ArrowRight size={14} color={colors.green.bright} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.md,
    width: '100%',
  },
  title: {
    marginBottom: spacing.sm,
  },
  scrollContent: {
    paddingRight: spacing.xl,
  },
  chip: {
    alignItems: 'center',
    backgroundColor: colors.green.dim,
    borderColor: colors.green.dark,
    borderRadius: radii.full,
    borderWidth: 1,
    flexDirection: 'row',
    marginRight: spacing.sm,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
  },
  chipText: {
    marginRight: spacing.xs,
  },
})
export default FollowUpChips;
