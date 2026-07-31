import React from 'react'
import { StyleSheet, View } from 'react-native'
import { WifiOff } from 'lucide-react-native'
import { colors, spacing } from './tokens'
import { VaaniText } from './VaaniText'
import { t } from '../../i18n'
import { useOfflineStore } from '../../store/useOfflineStore'

export const OfflineBanner: React.FC = () => {
  const isConnected = useOfflineStore((state) => state.isConnected)

  if (isConnected) return null

  return (
    <View style={styles.banner}>
      <WifiOff size={16} color={colors.text.inverse} style={styles.icon} />
      <VaaniText size="sm" weight="semibold" color={colors.text.inverse}>
        {t('search.offline_banner')}
      </VaaniText>
    </View>
  )
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.amber.bright,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.base,
    width: '100%',
  },
  icon: {
    marginRight: spacing.sm,
  },
})
export default OfflineBanner;
