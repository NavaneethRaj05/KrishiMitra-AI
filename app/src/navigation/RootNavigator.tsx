/**
 * RootNavigator — app-level navigation structure.
 *
 * Stack:
 *   Auth flow   → Welcome → Onboarding
 *   Main        → BottomTabs (with full-screen modals stacked on top)
 *   Modals      → AskResult, Thread, History, Settings
 */

import React, { useEffect } from 'react'
import { Platform, View, ActivityIndicator } from 'react-native'
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native'
import { createStackNavigator } from '@react-navigation/stack'
import { useColorScheme } from 'react-native'
import { useThemeModeStore } from '../store/useThemeModeStore'
import { useAuthStore } from '../store/useAuthStore'
import { useTheme } from '../hooks/useTheme'
import { lightTheme, darkTheme } from '../theme'
import { BottomTabNavigator } from './BottomTabNavigator'

// Screens
import WelcomeScreen from '../screens/Auth/WelcomeScreen'
import OnboardingScreen from '../screens/Auth/OnboardingScreen'
import AskResultScreen from '../screens/Ask/AskResultScreen'
import ThreadScreen from '../screens/Search/ThreadScreen'
import HistoryScreen from '../screens/History/HistoryScreen'
import SettingsScreen from '../screens/Settings/SettingsScreen'

export type RootStackParamList = {
  Welcome:     undefined
  Onboarding:  undefined
  MainTabs:    undefined
  AskResult:   { query: string; threadId?: string | null; imageUri?: string | null; imageB64?: string | null; detectedLanguage?: string }
  Thread:      { threadId: string; threadTitle?: string; initialFollowUpQuery?: string; imageUri?: string | null; imageB64?: string | null }
  History:     undefined
  Settings:    undefined
}

const Stack = createStackNavigator<RootStackParamList>()

function LoadingScreen() {
  const { theme } = useTheme()
  return (
    <View style={{ flex: 1, backgroundColor: theme.bg.base, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color={theme.accent.primary} />
    </View>
  )
}

export function RootNavigator() {
  const { isLoading, isAuthenticated, isOnboarded, initialize } = useAuthStore()
  const { themeMode } = useThemeModeStore()
  const systemScheme = useColorScheme() ?? 'light'
  const resolvedScheme = themeMode === 'system' ? systemScheme : themeMode

  useEffect(() => {
    initialize()
    if (Platform.OS === 'web') {
      // Suppress react-navigation shadow* warnings on web
      const orig = console.warn.bind(console)
      console.warn = (...args: any[]) => {
        const msg = args[0]?.toString?.() ?? ''
        if (msg.includes('shadow') || msg.includes('pointerEvents') || msg.includes('deprecated')) return
        orig(...args)
      }
    }
    const { connectivityManager } = require('../utils/connectivity')
    const { syncService } = require('../services/syncService')
    const stop = connectivityManager.startMonitoring()
    syncService.registerBackgroundSync()
    return () => stop?.()
  }, [])

  if (isLoading) return <LoadingScreen />

  // Build nav theme
  const navTheme = resolvedScheme === 'dark'
    ? {
        ...DarkTheme,
        colors: {
          ...DarkTheme.colors,
          background: darkTheme.bg.base,
          card:       darkTheme.bg.surface,
          text:       darkTheme.text.primary,
          border:     darkTheme.border.default,
          primary:    darkTheme.accent.primary,
        },
      }
    : {
        ...DefaultTheme,
        colors: {
          ...DefaultTheme.colors,
          background: lightTheme.bg.base,
          card:       lightTheme.bg.surface,
          text:       lightTheme.text.primary,
          border:     lightTheme.border.default,
          primary:    lightTheme.accent.primary,
        },
      }

  const initialRoute = isAuthenticated
    ? isOnboarded ? 'MainTabs' : 'Onboarding'
    : 'Welcome'

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator
        screenOptions={{ headerShown: false }}
        initialRouteName={initialRoute as any}
      >
        {/* Auth */}
        <Stack.Screen name="Welcome"    component={WelcomeScreen}   />
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />

        {/* Main app with bottom tabs */}
        <Stack.Screen
          name="MainTabs"
          component={BottomTabNavigator}
          options={{ animationEnabled: false }}
        />

        {/* Full-screen overlays */}
        <Stack.Screen
          name="AskResult"
          component={AskResultScreen}
          options={{
            presentation: Platform.OS === 'ios' ? 'card' : 'card',
            gestureEnabled: true,
          }}
        />
        <Stack.Screen
          name="Thread"
          component={ThreadScreen}
        />
        <Stack.Screen
          name="History"
          component={HistoryScreen}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
        />
      </Stack.Navigator>
    </NavigationContainer>
  )
}

export default RootNavigator
