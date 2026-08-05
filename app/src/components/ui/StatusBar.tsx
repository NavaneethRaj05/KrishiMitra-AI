/**
 * KM StatusBar — offline / sync status indicator.
 * Shows a subtle persistent banner when offline or syncing.
 */

import React from 'react'
import { View, StyleSheet, Animated } from 'react-native'
import { Wifi, WifiOff, RefreshCw } from 'lucide-react-native'
import { useTheme } from '../../hooks/useTheme'
import { useOfflineStore } from '../../store/useOfflineStore'
import { spacing, typography } from '../../theme/tokens'
import { KMText } from './Text'

export const KMStatusBar: React.FC = () => {
  const { theme } = useTheme()
  const { isConnected, isSyncing, offlineQueueSize } = useOfflineStore()

  if (isConnected && !isSyncing) return null

  const isOffline = !isConnected
  const bgColor = isOffline
    ? theme.sync.offlineBg
    : theme.sync.syncingBg
  const textColor = isOffline
    ? theme.sync.offline
    : theme.sync.syncing
  const borderColor = isOffline
    ? theme.sync.offline + '50'
    : theme.sync.syncing + '50'

  return (
    <View style={[styles.bar, { backgroundColor: bgColor, borderBottomColor: borderColor }]}>
      {isOffline ? (
        <WifiOff size={13} color={textColor} />
      ) : (
        <RefreshCw size={13} color={textColor} />
      )}
      <KMText size="xs" weight="semibold" color={textColor} style={styles.label}>
        {isOffline
          ? offlineQueueSize > 0
            ? `Offline · ${offlineQueueSize} actions pending sync`
            : 'Offline · Using cached knowledge'
          : 'Syncing your farm data…'}
      </KMText>
    </View>
  )
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.base,
    borderBottomWidth: 1,
    gap: spacing.xs,
  },
  label: {
    marginLeft: 5,
  },
})

export default KMStatusBar
