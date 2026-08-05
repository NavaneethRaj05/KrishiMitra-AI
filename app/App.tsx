/**
 * KrishiMitra AI — App Entry Point
 *
 * Renders the RootNavigator which handles:
 *  - Auth flow (Welcome → Onboarding)
 *  - Main app with bottom tab navigation
 *  - Full-screen modal stack (AskResult, Thread, Settings, History)
 *  - System/light/dark theme via useThemeModeStore
 */

import 'react-native-gesture-handler'
import React from 'react'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { StyleSheet } from 'react-native'
import { RootNavigator } from './src/navigation/RootNavigator'

export default function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <RootNavigator />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
})
