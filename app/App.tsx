import React, { useEffect } from 'react'
import { Platform } from 'react-native'
import { NavigationContainer } from '@react-navigation/native'
import { createStackNavigator } from '@react-navigation/stack'
import { useAuthStore } from './src/store/useAuthStore'
import WelcomeScreen from './src/screens/Auth/WelcomeScreen'
import LoginScreen from './src/screens/Auth/LoginScreen'
import RegisterScreen from './src/screens/Auth/RegisterScreen'
import OnboardingScreen from './src/screens/Auth/OnboardingScreen'
import HomeScreen from './src/screens/Home/HomeScreen'
import SearchResultScreen from './src/screens/Search/SearchResultScreen'
import ThreadScreen from './src/screens/Search/ThreadScreen'
import HistoryScreen from './src/screens/History/HistoryScreen'
import SettingsScreen from './src/screens/Settings/SettingsScreen'
import { connectivityManager } from './src/utils/connectivity'
import { syncService } from './src/services/syncService'
import { View, ActivityIndicator } from 'react-native'
import { colors } from './src/components/ui/tokens'

const Stack = createStackNavigator()

export default function App() {
  const { initialize, isLoading, isAuthenticated, isOnboarded } = useAuthStore()

  useEffect(() => {
    initialize()
    
    // ── Suppress known third-party deprecation warnings we cannot fix ──
    // react-navigation/stack uses shadow* props (web-only), react-native-web
    // emits pointerEvents warning for internal components. These are cosmetic
    // and do not affect functionality.
    if (Platform.OS === 'web') {
      const originalWarn = console.warn.bind(console)
      console.warn = (...args: any[]) => {
        const msg = args[0]?.toString?.() || ''
        if (
          msg.includes('shadow') ||
          msg.includes('pointerEvents') ||
          msg.includes('deprecated')
        ) return
        originalWarn(...args)
      }
    }
    
    // Start network status monitoring
    const stopConnectivity = connectivityManager.startMonitoring()
    
    // Register background fetch tasks
    syncService.registerBackgroundSync()
    
    return () => {
      if (stopConnectivity) stopConnectivity()
    }
  }, [])

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg.base, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.green.bright} />
      </View>
    )
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          cardStyle: { backgroundColor: colors.bg.base }
        }}
        initialRouteName={isAuthenticated ? (isOnboarded ? 'Home' : 'FarmerSetup') : 'Welcome'}
      >
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="FarmerSetup" component={OnboardingScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="SearchResult" component={SearchResultScreen} />
        <Stack.Screen name="Thread" component={ThreadScreen} />
        <Stack.Screen name="History" component={HistoryScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  )
}
