import React from 'react'
import { StyleSheet, View } from 'react-native'
import { WifiOff } from 'lucide-react-native'
import { useTheme } from '../../hooks/useTheme'
import { spacing, radii, shadows } from '../../theme/tokens'
import { KMText } from './Text'
import { useOfflineStore } from '../../store/useOfflineStore'

export const OfflineBanner: React.FC = () => {
  const isConnected = useOfflineStore((state) => state.isConnected)
  const { theme } = useTheme()

  if (isConnected) return null

  return (
    <View style={styles.container}>
      <View style={[styles.pill, { backgroundColor: theme.status.warning, ...shadows.sm }]}>
        <WifiOff size={14} color={theme.text.inverse} style={styles.icon} />
        <KMText size="xs" weight="bold" color={theme.text.inverse}>
          OFFLINE MODE
        </KMText>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: spacing.md,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 100,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    borderRadius: radii.full,
  },
  icon: {
    marginRight: 6,
  },
})

export default OfflineBanner
