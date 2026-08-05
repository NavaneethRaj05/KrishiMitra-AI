/**
 * ProfileScreen — farm profile + settings.
 * Shows farmer details, language, theme, and account controls.
 */

import React, { useState } from 'react'
import {
  StyleSheet,
  View,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  Switch,
} from 'react-native'
import {
  User, MapPin, Leaf, Droplet, Globe, Moon, Sun, Laptop,
  Bell, Download, LogOut, ChevronRight, Edit3, Shield,
} from 'lucide-react-native'
import { useTheme } from '../../hooks/useTheme'
import { spacing, radii, shadows } from '../../theme/tokens'
import { KMText } from '../../components/ui/Text'
import { KMCard } from '../../components/ui/Card'
import { KMBadge } from '../../components/ui/Badge'
import { KMStatusBar } from '../../components/ui/StatusBar'
import { useAuthStore } from '../../store/useAuthStore'
import { getLanguage, setLanguage, getLanguagesList, t } from '../../i18n'

export default function ProfileScreen({ navigation }: any) {
  const { theme, themeMode, setThemeMode } = useTheme()
  const authStore = useAuthStore()
  const farmer = authStore.farmer
  const [currentLang, setCurrentLang] = useState(getLanguage())

  const handleLangChange = (code: string) => {
    setCurrentLang(code)
    setLanguage(code)
    authStore.setFarmer({ preferredLanguage: code })
  }

  const handleLogout = () => {
    Alert.alert(
      'Log out',
      'Your farm data will remain stored on this device.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log out',
          style: 'destructive',
          onPress: () => {
            authStore.logout()
            navigation.replace('Welcome')
          },
        },
      ],
    )
  }

  const themeOptions: { mode: typeof themeMode; Icon: any; label: string }[] = [
    { mode: 'light',  Icon: Sun,    label: 'Light'  },
    { mode: 'dark',   Icon: Moon,   label: 'Dark'   },
    { mode: 'system', Icon: Laptop, label: 'Auto'   },
  ]

  const languages = getLanguagesList()

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.bg.base }]}>
      <KMStatusBar />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border.subtle }]}>
        <KMText size="2xl" weight="bold">Profile</KMText>
        <TouchableOpacity
          onPress={() => navigation.navigate('Settings')}
          style={[styles.editBtn, { backgroundColor: theme.bg.surface, borderColor: theme.border.default }]}
          activeOpacity={0.7}
        >
          <Edit3 size={16} color={theme.text.secondary} />
          <KMText size="sm" weight="semibold" color={theme.text.secondary} style={{ marginLeft: 6 }}>Edit</KMText>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Farmer identity card */}
        <KMCard elevation="raised" padding="lg" style={styles.identityCard}>
          <View style={styles.avatarRow}>
            <View style={[styles.avatar, { backgroundColor: theme.accent.primaryMid }]}>
              <User size={36} color={theme.accent.primary} />
            </View>
            <View style={styles.identityInfo}>
              <KMText size="xl" weight="bold">{farmer?.name ?? 'Farmer'}</KMText>
              <View style={styles.identityMeta}>
                <MapPin size={14} color={theme.text.tertiary} />
                <KMText size="sm" color={theme.text.secondary} weight="medium" style={{ marginLeft: 6 }}>
                  {farmer?.district ?? 'District'}, {farmer?.state ?? 'State'}
                </KMText>
              </View>
            </View>
          </View>

          {/* Farm details chips */}
          <View style={styles.chipsRow}>
            {(farmer?.registeredCrops ?? []).map((crop, i) => (
              <View key={i} style={[styles.chip, { backgroundColor: theme.accent.primaryDim, borderColor: theme.accent.primary + '40' }]}>
                <Leaf size={12} color={theme.accent.primary} />
                <KMText size="sm" color={theme.accent.primary} weight="bold" style={{ marginLeft: 4 }}>{crop}</KMText>
              </View>
            ))}
            {farmer?.irrigationType && (
              <View style={[styles.chip, { backgroundColor: '#0284C718', borderColor: '#0284C740' }]}>
                <Droplet size={12} color="#0284C7" />
                <KMText size="sm" color="#0284C7" weight="bold" style={{ marginLeft: 4 }}>{farmer.irrigationType}</KMText>
              </View>
            )}
            {farmer?.soilType && (
              <View style={[styles.chip, { backgroundColor: theme.bg.subtle, borderColor: theme.border.default }]}>
                <KMText size="sm" color={theme.text.secondary} weight="medium">{farmer.soilType}</KMText>
              </View>
            )}
            {farmer?.landAcres && (
              <View style={[styles.chip, { backgroundColor: theme.bg.subtle, borderColor: theme.border.default }]}>
                <KMText size="sm" color={theme.text.secondary} weight="medium">{farmer.landAcres} acres</KMText>
              </View>
            )}
          </View>
        </KMCard>

        {/* Language selector */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Globe size={18} color={theme.text.secondary} />
            <KMText size="base" weight="bold" color={theme.text.secondary} style={{ marginLeft: 8 }}>
              Language
            </KMText>
          </View>
          <View style={styles.langGrid}>
            {languages.map((lang) => {
              const isActive = currentLang === lang.code
              return (
                <TouchableOpacity
                  key={lang.code}
                  onPress={() => handleLangChange(lang.code)}
                  style={[styles.langCard, {
                    backgroundColor: isActive ? theme.accent.primaryDim : theme.bg.surface,
                    borderColor: isActive ? theme.accent.primary : theme.border.default,
                    ...(isActive ? {} : shadows.sm),
                  }]}
                  activeOpacity={0.8}
                >
                  <KMText size="xl" style={{ marginRight: 8 }}>{lang.flag}</KMText>
                  <KMText
                    size="base"
                    weight={isActive ? 'bold' : 'medium'}
                    color={isActive ? theme.accent.primary : theme.text.primary}
                  >
                    {lang.name}
                  </KMText>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>

        {/* Theme selector */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Sun size={18} color={theme.text.secondary} />
            <KMText size="base" weight="bold" color={theme.text.secondary} style={{ marginLeft: 8 }}>
              Display Theme
            </KMText>
          </View>
          <View style={styles.themeRow}>
            {themeOptions.map(({ mode, Icon, label }) => {
              const isActive = themeMode === mode
              return (
                <TouchableOpacity
                  key={mode}
                  onPress={() => setThemeMode(mode)}
                  style={[styles.themeCard, {
                    backgroundColor: isActive ? theme.accent.primaryDim : theme.bg.surface,
                    borderColor: isActive ? theme.accent.primary : theme.border.default,
                    ...(isActive ? {} : shadows.sm),
                    flex: 1,
                  }]}
                  activeOpacity={0.8}
                >
                  <Icon size={20} color={isActive ? theme.accent.primary : theme.text.tertiary} />
                  <KMText
                    size="sm"
                    weight={isActive ? 'bold' : 'medium'}
                    color={isActive ? theme.accent.primary : theme.text.tertiary}
                    style={{ marginTop: 8 }}
                  >
                    {label}
                  </KMText>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>

        {/* Settings rows */}
        <View style={styles.section}>
          <KMText size="sm" weight="bold" color={theme.text.secondary} style={styles.sectionTitle}>
            MORE SETTINGS
          </KMText>
          {[
            { icon: Bell,     label: 'Notifications',        onPress: () => {} },
            { icon: Download, label: 'Download Offline Packs', onPress: () => {} },
            { icon: Shield,   label: 'Privacy & Data',        onPress: () => {} },
          ].map(({ icon: Icon, label, onPress }, i) => (
            <TouchableOpacity
              key={i}
              onPress={onPress}
              style={[styles.settingsRow, {
                backgroundColor: theme.bg.surface,
                borderColor: theme.border.default,
                ...shadows.sm,
              }]}
              activeOpacity={0.7}
            >
              <View style={[styles.settingsIcon, { backgroundColor: theme.bg.subtle }]}>
                <Icon size={18} color={theme.text.secondary} />
              </View>
              <KMText size="base" weight="semibold" style={{ flex: 1 }}>{label}</KMText>
              <ChevronRight size={18} color={theme.text.tertiary} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout */}
        <TouchableOpacity
          onPress={handleLogout}
          style={[styles.logoutBtn, {
            backgroundColor: theme.status.errorBg,
            borderColor: theme.status.error + '40',
          }]}
          activeOpacity={0.7}
        >
          <LogOut size={20} color={theme.status.error} />
          <KMText size="lg" weight="bold" color={theme.status.error} style={{ marginLeft: spacing.sm }}>
            Log out
          </KMText>
        </TouchableOpacity>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
    borderWidth: 1,
  },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  identityCard: {
    marginBottom: spacing.xl,
    borderRadius: radii.xl,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    marginBottom: spacing.md,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  identityInfo: { flex: 1 },
  identityMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.full,
    borderWidth: 1,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    marginBottom: spacing.md,
    letterSpacing: 1,
  },
  langGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  langCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.xl,
    borderWidth: 1,
  },
  themeRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  themeCard: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    borderRadius: radii.xl,
    borderWidth: 1,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.xl,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  settingsIcon: {
    width: 44,
    height: 44,
    borderRadius: radii.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.xl,
    borderWidth: 1,
    padding: spacing.lg,
    marginTop: spacing.md,
  },
})
