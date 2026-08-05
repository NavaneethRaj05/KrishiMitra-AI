/**
 * SettingsScreen — detailed farm profile editor + preferences.
 */

import React, { useState } from 'react'
import {
  StyleSheet,
  View,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Alert,
} from 'react-native'
import { ArrowLeft, Save, LogOut } from 'lucide-react-native'
import { useTheme } from '../../hooks/useTheme'
import { spacing, radii } from '../../theme/tokens'
import { KMText } from '../../components/ui/Text'
import { KMInput } from '../../components/ui/Input'
import { KMButton } from '../../components/ui/Button'
import { KMStatusBar } from '../../components/ui/StatusBar'
import { useAuthStore } from '../../store/useAuthStore'
import { authService } from '../../services/authService'
import { setLanguage, getLanguage, getLanguagesList, t } from '../../i18n'

export default function SettingsScreen({ navigation }: any) {
  const { theme } = useTheme()
  const authStore = useAuthStore()
  const farmer = authStore.farmer

  const [name, setName] = useState(farmer?.name ?? '')
  const [district, setDistrict] = useState(farmer?.district ?? '')
  const [block, setBlock] = useState(farmer?.block ?? '')
  const [selectedLang, setSelectedLang] = useState(getLanguage())

  const handleLangChange = (code: string) => {
    setSelectedLang(code)
    setLanguage(code)
    if (farmer) authStore.setFarmer({ preferredLanguage: code })
  }

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Name cannot be empty.')
      return
    }
    const updated = { ...farmer!, name: name.trim(), district, block, preferredLanguage: selectedLang }
    const ok = await authService.saveSetup(updated)
    if (ok) {
      Alert.alert('Saved', 'Profile updated.')
      navigation.goBack()
    } else {
      authStore.setFarmer(updated)
      navigation.goBack()
    }
  }

  const handleLogout = () => {
    Alert.alert('Log out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out', style: 'destructive',
        onPress: () => {
          authStore.logout()
          navigation.replace('Welcome')
        },
      },
    ])
  }

  const languages = getLanguagesList()

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.bg.base }]}>
      <KMStatusBar />

      {/* App bar */}
      <View style={[styles.appBar, { borderBottomColor: theme.border.subtle }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={22} color={theme.text.primary} />
        </TouchableOpacity>
        <KMText size="md" weight="semibold">Settings</KMText>
        <TouchableOpacity onPress={handleSave} style={[styles.saveBtn, { backgroundColor: theme.accent.primaryDim }]}>
          <Save size={16} color={theme.accent.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Profile section */}
        <KMText size="xs" weight="semibold" color={theme.text.tertiary} style={styles.sectionLabel}>
          FARM PROFILE
        </KMText>
        <KMInput
          label="Full Name"
          value={name}
          onChangeText={setName}
          placeholder="e.g. Rajesh Gowda"
        />
        <KMInput
          label="Phone"
          value={farmer?.phone ?? ''}
          editable={false}
          style={{ opacity: 0.6 }}
        />

        {/* Location section */}
        <KMText size="xs" weight="semibold" color={theme.text.tertiary} style={[styles.sectionLabel, { marginTop: spacing.md }]}>
          LOCATION
        </KMText>
        <KMInput
          label="District"
          value={district}
          onChangeText={setDistrict}
          placeholder="e.g. Mandya"
        />
        <KMInput
          label="Block / Village"
          value={block}
          onChangeText={setBlock}
          placeholder="e.g. Maddur Block"
        />

        {/* Language section */}
        <KMText size="xs" weight="semibold" color={theme.text.tertiary} style={[styles.sectionLabel, { marginTop: spacing.md }]}>
          LANGUAGE
        </KMText>
        <View style={styles.langGrid}>
          {languages.map((lang) => {
            const isActive = selectedLang === lang.code
            return (
              <TouchableOpacity
                key={lang.code}
                onPress={() => handleLangChange(lang.code)}
                style={[styles.langCard, {
                  backgroundColor: isActive ? theme.accent.primaryDim : theme.bg.surface,
                  borderColor: isActive ? theme.accent.primary : theme.border.default,
                }]}
              >
                <KMText size="base" style={{ marginRight: spacing.sm }}>{lang.flag}</KMText>
                <KMText
                  size="sm"
                  weight={isActive ? 'semibold' : 'regular'}
                  color={isActive ? theme.accent.primary : theme.text.primary}
                >
                  {lang.name}
                </KMText>
              </TouchableOpacity>
            )
          })}
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <KMButton title="Save Changes" onPress={handleSave} fullWidth size="lg" />

          <TouchableOpacity onPress={handleLogout} style={[styles.logoutRow, {
            backgroundColor: theme.status.errorBg,
            borderColor: theme.status.error + '40',
          }]}>
            <LogOut size={16} color={theme.status.error} />
            <KMText size="base" weight="semibold" color={theme.status.error} style={{ marginLeft: spacing.sm }}>
              Log out
            </KMText>
          </TouchableOpacity>
        </View>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  appBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 56,
    paddingHorizontal: spacing.base,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtn: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scroll: {
    padding: spacing.base,
    paddingBottom: spacing.xxl,
  },
  sectionLabel: {
    letterSpacing: 0.8,
    marginBottom: spacing.md,
  },
  langGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  langCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.md,
    minWidth: '47%',
  },
  actions: {
    marginTop: spacing.md,
    gap: spacing.md,
  },
  logoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.base,
  },
})
