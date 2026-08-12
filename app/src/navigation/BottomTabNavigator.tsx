/**
 * KrishiMitra AI — Premium Navigation
 *
 * Mobile: Frosted glass bottom tab bar with floating Ask button
 * Desktop: Clean frosted sidebar with logo, nav items, user card
 *
 * Design: Zolve-inspired — warm whites, subtle borders, clean icons
 */

import React, { useRef } from 'react'
import {
  View,
  Pressable,
  StyleSheet,
  Platform,
  Animated,
  useWindowDimensions,
} from 'react-native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Home, Mic, CheckSquare, BookOpen, User } from 'lucide-react-native'
import { useTheme } from '../hooks/useTheme'
import { useAuthStore } from '../store/useAuthStore'
import { spacing, radii } from '../theme/tokens'
import { KMText } from '../components/ui/Text'
import HomeScreen from '../screens/Home/HomeScreen'
import AskScreen from '../screens/Ask/AskScreen'
import TasksScreen from '../screens/Tasks/TasksScreen'
import RecordsScreen from '../screens/Records/RecordsScreen'
import ProfileScreen from '../screens/Profile/ProfileScreen'

export type BottomTabParamList = {
  HomeTab:    undefined
  AskTab:     undefined
  TasksTab:   undefined
  RecordsTab: undefined
  ProfileTab: undefined
}

const Tab = createBottomTabNavigator<BottomTabParamList>()

const TABS = [
  { name: 'HomeTab',    label: 'Home',    Icon: Home        },
  { name: 'AskTab',     label: 'Ask',     Icon: Mic         },
  { name: 'TasksTab',   label: 'Tasks',   Icon: CheckSquare },
  { name: 'RecordsTab', label: 'Records', Icon: BookOpen    },
  { name: 'ProfileTab', label: 'Profile', Icon: User        },
] as const

const TEAL = '#1D9E75'

// ── Tab Button ─────────────────────────────────────────────────────────────────
function TabButton({ isFocused, isAsk, tabConfig, onPress, isDark, isDesktop }: any) {
  const { Icon, label } = tabConfig
  const scale = useRef(new Animated.Value(1)).current

  const onIn  = () => Animated.spring(scale, { toValue: 0.88, useNativeDriver: true, speed: 50 }).start()
  const onOut = () => Animated.spring(scale, { toValue: 1,    useNativeDriver: true, speed: 50 }).start()

  const INACTIVE  = isDark ? '#6B6760' : '#9E9B96'
  const ACTIVE    = TEAL
  const BG        = isDark ? '#1E1C18' : '#FFFFFF'
  const SUBTLE    = isDark ? '#252320' : '#F5F2EE'

  if (isAsk) {
    // Floating mic FAB — mobile only
    if (isDesktop) return null
    return (
      <Animated.View style={[styles.fabWrap, { transform: [{ scale }] }]}>
        <Pressable
          onPress={onPress}
          onPressIn={onIn}
          onPressOut={onOut}
          style={[styles.fab, { backgroundColor: TEAL,
            ...Platform.select({
              ios:     { shadowColor: TEAL, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.45, shadowRadius: 16 },
              android: { elevation: 12 },
              web:     { boxShadow: `0 8px 24px ${TEAL}60` },
            }),
          }]}
        >
          <Icon size={26} color="#fff" strokeWidth={2} />
        </Pressable>
      </Animated.View>
    )
  }

  if (isDesktop) {
    // Sidebar nav item
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [
        styles.sideNavItem,
        isFocused && { backgroundColor: TEAL + '12' },
        pressed && { opacity: 0.75 },
      ]}>
        <View style={[styles.sideNavIcon,
          isFocused && { backgroundColor: TEAL + '20' },
        ]}>
          <Icon size={19} color={isFocused ? ACTIVE : INACTIVE} strokeWidth={isFocused ? 2.5 : 1.8} />
        </View>
        <KMText size="sm" weight={isFocused ? 'semibold' : 'medium'}
          color={isFocused ? ACTIVE : INACTIVE}
        >{label}</KMText>
        {isFocused && (
          <View style={[styles.sideActiveBar, { backgroundColor: TEAL }]} />
        )}
      </Pressable>
    )
  }

  // Mobile tab item
  return (
    <Animated.View style={[styles.tabItem, { transform: [{ scale }] }]}>
      <Pressable onPress={onPress} onPressIn={onIn} onPressOut={onOut}
        style={styles.tabItemInner}
      >
        <View style={[styles.tabIconWrap,
          isFocused && { backgroundColor: TEAL + '14' },
        ]}>
          <Icon size={22} color={isFocused ? ACTIVE : INACTIVE} strokeWidth={isFocused ? 2.5 : 1.8} />
        </View>
        <KMText size="xs" weight={isFocused ? 'semibold' : 'medium'}
          color={isFocused ? ACTIVE : INACTIVE}
          style={styles.tabLabel}
        >{label}</KMText>
      </Pressable>
    </Animated.View>
  )
}

// ── Custom Tab Bar ─────────────────────────────────────────────────────────────
function KMTabBar({ state, descriptors, navigation }: any) {
  const { theme, isDark } = useTheme()
  const farmer = useAuthStore((s) => s.farmer)
  const insets = useSafeAreaInsets()
  const { width } = useWindowDimensions()
  const isDesktop = width >= 768

  const BG      = isDark ? '#161512' : '#FFFFFF'
  const BORDER  = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'
  const SUBTLE  = isDark ? '#252320' : '#F5F2EE'

  const tabs = state.routes.map((route: any, index: number) => {
    const isFocused = state.index === index
    const tabConfig = TABS[index]
    const onPress = () => {
      const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true })
      if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name)
    }
    return { route, isFocused, tabConfig, onPress, index }
  })

  if (isDesktop) {
    return (
      <View style={[styles.sidebar, { backgroundColor: BG, borderRightColor: BORDER }]}>
        {/* Logo */}
        <View style={styles.sideLogoRow}>
          <View style={[styles.sideLogoMark, { backgroundColor: TEAL }]}>
            <KMText style={{ fontSize: 18 }}>🌾</KMText>
          </View>
          <View>
            <KMText size="base" weight="bold" color={TEAL} style={{ letterSpacing: -0.3 }}>KrishiMitra</KMText>
            <KMText size="xs" color={isDark ? '#6B6760' : '#9E9B96'} style={{ marginTop: -1 }}>AI Companion</KMText>
          </View>
        </View>

        {/* Divider */}
        <View style={[styles.divider, { backgroundColor: BORDER }]} />

        {/* Nav */}
        <View style={styles.sideNav}>
          {tabs.map(({ route, isFocused, tabConfig, onPress }: any) => (
            tabConfig.label !== 'Ask' && (
              <TabButton key={route.key} isFocused={isFocused} isAsk={false}
                tabConfig={tabConfig} onPress={onPress} isDark={isDark} isDesktop />
            )
          ))}
        </View>

        {/* Ask button in sidebar */}
        <Pressable onPress={() => navigation.navigate('AskTab')}
          style={[styles.sideAskBtn, { backgroundColor: TEAL }]}
        >
          <Mic size={18} color="#fff" strokeWidth={2} />
          <KMText size="sm" weight="bold" color="#fff" style={{ marginLeft: 8 }}>Ask KrishiMitra</KMText>
        </Pressable>

        <View style={{ flex: 1 }} />

        {/* User card at bottom */}
        <Pressable onPress={() => navigation.navigate('ProfileTab')}
          style={[styles.sideUserCard, { backgroundColor: SUBTLE, borderColor: BORDER }]}
        >
          <View style={[styles.sideAvatar, { backgroundColor: TEAL + '20' }]}>
            <KMText style={{ fontSize: 18 }}>👨‍🌾</KMText>
          </View>
          <View style={{ flex: 1 }}>
            <KMText size="sm" weight="semibold" color={isDark ? '#F0EDE8' : '#1A1A18'} numberOfLines={1}>
              {farmer?.name ?? 'Demo Farmer'}
            </KMText>
            <KMText size="xs" color={isDark ? '#6B6760' : '#9E9B96'} numberOfLines={1}>
              {farmer?.district ?? 'Your Farm'}
            </KMText>
          </View>
          <KMText size="sm" color={isDark ? '#6B6760' : '#9E9B96'}>›</KMText>
        </Pressable>
      </View>
    )
  }

  // Mobile bottom tab bar
  return (
    <View style={[styles.tabBar, {
      backgroundColor: BG,
      borderTopColor: BORDER,
      paddingBottom: Math.max(insets.bottom, 8),
      ...Platform.select({
        web: { boxShadow: '0 -2px 20px rgba(0,0,0,0.06)' },
        ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.06, shadowRadius: 12 },
        default: { elevation: 8 },
      }),
    }]}>
      {tabs.map(({ route, isFocused, tabConfig, onPress }: any) => (
        <TabButton key={route.key} isFocused={isFocused} isAsk={tabConfig.label === 'Ask'}
          tabConfig={tabConfig} onPress={onPress} isDark={isDark} isDesktop={false} />
      ))}
    </View>
  )
}

// ── Navigator ─────────────────────────────────────────────────────────────────
export function BottomTabNavigator() {
  const { width } = useWindowDimensions()
  const isDesktop = width >= 768

  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator
        tabBar={(props) => <KMTabBar {...props} />}
        screenOptions={{ headerShown: false }}
        sceneContainerStyle={isDesktop ? { marginLeft: 220 } : {}}
      >
        <Tab.Screen name="HomeTab"    component={HomeScreen}    />
        <Tab.Screen name="AskTab"     component={AskScreen}     />
        <Tab.Screen name="TasksTab"   component={TasksScreen}   />
        <Tab.Screen name="RecordsTab" component={RecordsScreen} />
        <Tab.Screen name="ProfileTab" component={ProfileScreen} />
      </Tab.Navigator>
    </View>
  )
}

const styles = StyleSheet.create({
  // ── Mobile tab bar
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    alignItems: 'center',
    minHeight: 60,
    paddingHorizontal: 8,
    paddingTop: 6,
  },
  tabItem: { flex: 1 },
  tabItemInner: { alignItems: 'center', paddingBottom: 2 },
  tabIconWrap: {
    width: 40, height: 34, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center', marginBottom: 2,
  },
  tabLabel: { fontSize: 10, letterSpacing: 0.1 },
  // ── FAB
  fabWrap: { flex: 1, alignItems: 'center' },
  fab: {
    width: 54, height: 54, borderRadius: 99,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 10,
  },
  // ── Sidebar
  sidebar: {
    position: 'absolute',
    left: 0, top: 0, bottom: 0,
    width: 220,
    borderRightWidth: 1,
    flexDirection: 'column',
    zIndex: 100,
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  sideLogoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  sideLogoMark: { width: 38, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  divider: { height: 1, marginVertical: 16 },
  sideNav: { gap: 2 },
  sideNavItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    height: 46, borderRadius: 12, paddingHorizontal: 10,
    position: 'relative',
  },
  sideNavIcon: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  sideActiveBar: {
    position: 'absolute', right: 0, top: 10, bottom: 10,
    width: 3, borderRadius: 99,
  },
  sideAskBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    height: 44, borderRadius: 14, marginTop: 16,
    ...Platform.select({ web: { boxShadow: `0 4px 16px #1D9E7540` }, default: {} }),
  },
  sideUserCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 12, borderRadius: 14, borderWidth: 1, marginBottom: 4,
  },
  sideAvatar: { width: 36, height: 36, borderRadius: 99, justifyContent: 'center', alignItems: 'center' },
})

export default BottomTabNavigator
