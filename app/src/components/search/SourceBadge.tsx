import React from 'react'
import { StyleSheet, TouchableOpacity, Linking } from 'react-native'
import { colors, spacing, radii } from '../ui/tokens'
import { KrishiMitraAIText } from '../ui/KrishiMitraAIText'

interface SourceBadgeProps {
  index: number
  name: string
  url: string
}

export const SourceBadge: React.FC<SourceBadgeProps> = ({ index, name, url }) => {
  const handlePress = () => {
    if (url && url !== '#') {
      Linking.openURL(url).catch((err) => console.error('Failed to open citation URL:', err))
    }
  }

  return (
    <TouchableOpacity onPress={handlePress} style={styles.badge} activeOpacity={0.7}>
      <KrishiMitraAIText size="xs" weight="semibold" color={colors.sand.bright}>
        [{index}] {name}
      </KrishiMitraAIText>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: colors.bg.input,
    borderColor: colors.border.strong,
    borderRadius: radii.sm,
    borderWidth: 1,
    marginRight: spacing.sm,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
})
export default SourceBadge;
