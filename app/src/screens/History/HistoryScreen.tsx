/**
 * HistoryScreen — full-screen conversation history.
 * Accessible from stack nav (Settings, deep links).
 * The tab version lives in RecordsScreen.
 */

import React from 'react'
import { SafeAreaView, TouchableOpacity, StyleSheet, View } from 'react-native'
import { ArrowLeft } from 'lucide-react-native'
import { useTheme } from '../../hooks/useTheme'
import { spacing } from '../../theme/tokens'
import { KMText } from '../../components/ui/Text'
import { KMStatusBar } from '../../components/ui/StatusBar'
import RecordsScreen from '../Records/RecordsScreen'

export default function HistoryScreen({ navigation }: any) {
  const { theme } = useTheme()

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.bg.base }]}>
      <KMStatusBar />
      <View style={[styles.appBar, { borderBottomColor: theme.border.subtle }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={22} color={theme.text.primary} />
        </TouchableOpacity>
        <KMText size="md" weight="semibold">History</KMText>
        <View style={{ width: 40 }} />
      </View>
      {/* Reuse RecordsScreen content */}
      <RecordsScreen navigation={navigation} />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root:   { flex: 1 },
  appBar: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    height:  56,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 40, height: 40,
    justifyContent: 'center', alignItems: 'center',
  },
})
