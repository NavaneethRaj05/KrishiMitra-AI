/**
 * KrishiMitra AI — Bottom Tab Navigator
 *
 * 5 tabs: Home · Ask · Tasks · Records · Profile
 *
 * Design:
 *  - Themed tab bar that adapts light/dark
 *  - Custom tab bar renders icons + labels with correct colors
 *  - Active tab has accent top-border indicator
 *  - Safe area aware
 *  - Smooth scale animations on press
 */

import React, { useRef } from 'react'
import {
  View,
  Pressable,
  StyleSheet,
  Platform,
  Animated,
} from 'react-native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Home, Mic, CheckSquare, BookOpen, User } from 'lucide-react-native'
import { useTheme } from '../hooks/useTheme'
import { spacing, radii, typography } from '../theme/tokens'
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

// ── Custom Tab Bar ────────────────────────────────────────────────────────────
const TABS = [
  { name: 'HomeTab',    label: 'Home',    Icon: Home           },
  { name: 'AskTab',     label: 'Ask',     Icon: Mic            }, // Mic icon for voice-first Ask
  { name: 'TasksTab',   label: 'Tasks',   Icon: CheckSquare    },
  { name: 'RecordsTab', label: 'Records', Icon: BookOpen       },
  { name: 'ProfileTab', label: 'Profile', Icon: User           },
] as const

function TabButton({ isFocused, isAsk, tabConfig, onPress, theme }: any) {
  const { Icon, label } = tabConfig
  const scaleAnim = useRef(new Animated.Value(1)).current

  const iconColor = isFocused ? theme.tab.active : theme.tab.inactive

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.9,
      useNativeDriver: true,
      speed: 50,
    }).start()
  }

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
    }).start()
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      accessibilityLabel={label}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        // Only apply flex:1 to non-Ask tabs — Ask needs a fixed circular size
        !isAsk && styles.tabItem,
        isAsk && {
          flex: 0,                          // do NOT stretch
          backgroundColor: theme.accent.primary,
          borderRadius: radii.full,
          marginHorizontal: spacing.md,
          marginTop: -22,                   // lift above tab bar
          width: 60,
          height: 60,
          justifyContent: 'center',
          alignItems: 'center',
          alignSelf: 'center',
          ...Platform.select({
            ios: {
              shadowColor: theme.accent.primary,
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.55,
              shadowRadius: 16,
            },
            android: { elevation: 12 },
            web: {
              boxShadow: '0 8px 24px rgba(29,158,117,0.45)',
            },
          }),
        },
      ]}
    >
      <Animated.View
        style={[
          styles.tabContent,
          { transform: [{ scale: scaleAnim }] },
          isAsk && { justifyContent: 'center' }
        ]}
      >
        {!isAsk && isFocused && (
          <View style={[styles.activeIndicator, { backgroundColor: theme.tab.active }]} />
        )}
        <View style={[
          styles.iconWrap,
          !isAsk && isFocused && { backgroundColor: theme.accent.primaryDim },
        ]}>
          <Icon
            size={isAsk ? 28 : 22}
            color={isAsk ? theme.text.inverse : iconColor}
            strokeWidth={isFocused ? 2.5 : 1.8}
          />
        </View>
        {!isAsk && (
          <KMText
            size="xs"
            weight={isFocused ? 'bold' : 'medium'}
            color={iconColor}
            style={styles.tabLabel}
          >
            {label}
          </KMText>
        )}
      </Animated.View>
    </Pressable>
  )
}

function KMTabBar({ state, descriptors, navigation }: any) {
  const { theme } = useTheme()
  const insets = useSafeAreaInsets()

  return (
    <View
      style={[
        styles.tabBar,
        {
          backgroundColor: theme.tab.background,
          borderTopColor: theme.tab.border,
          paddingBottom: Math.max(insets.bottom, spacing.md),
        },
      ]}
    >
      {state.routes.map((route: any, index: number) => {
        const { options } = descriptors[route.key]
        const isFocused = state.index === index
        const tabConfig = TABS[index]
        const { label } = tabConfig

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          })
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name)
          }
        }

        const isAsk = label === 'Ask'

        return (
          <TabButton
            key={route.key}
            isFocused={isFocused}
            isAsk={isAsk}
            tabConfig={tabConfig}
            onPress={onPress}
            theme={theme}
          />
        )
      })}
    </View>
  )
}

// ── Navigator ─────────────────────────────────────────────────────────────────
export function BottomTabNavigator() {
  return (
    <Tab.Navigator
      tabBar={(props) => <KMTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="HomeTab"    component={HomeScreen}    />
      <Tab.Screen name="AskTab"     component={AskScreen}     />
      <Tab.Screen name="TasksTab"   component={TasksScreen}   />
      <Tab.Screen name="RecordsTab" component={RecordsScreen} />
      <Tab.Screen name="ProfileTab" component={ProfileScreen} />
    </Tab.Navigator>
  )
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: 0,
    alignItems: 'center',      // vertically center all items so raised CTA aligns correctly
    minHeight: 64,
    paddingHorizontal: spacing.xs,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing.xs,
  },
  activeIndicator: {
    width: 20,
    height: 3,
    borderRadius: radii.full,
    marginBottom: 4,
  },
  iconWrap: {
    width: 40,
    height: 32,
    borderRadius: radii.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  tabLabel: {
    marginTop: 2,
    fontSize: 10,
  },
})

export default BottomTabNavigator

